"use client"

import { useState, useEffect } from 'react'
import { collection, query, getDocs, addDoc, doc, getDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import QRScanner from '@/components/qr-scanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Coffee, Utensils, Camera, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

// Environment variables
const DRINKS_LIMIT = parseInt(process.env.NEXT_PUBLIC_MAX_DRINKS_PER_GUEST || '3')
const MEALS_LIMIT = parseInt(process.env.NEXT_PUBLIC_MAX_MEALS_PER_GUEST || '1')

interface ScannedData {
    email: string
    attendeeId: string
    validFrom?: string
    validTo?: string
    drinksAllowed: number
    mealsAllowed: number
    generatedAt: string
    lumaUrl?: string
    eventId?: string
    publicKey?: string
}

interface ScanRecord {
    id: string
    email: string
    attendeeName: string
    scannedAt: string
    lumaVerified: boolean
    remainingDrinks: number
    remainingMeals: number
    publicKey: string
    eventId?: string
    lastRedemptionType?: 'drink' | 'meal'
    lastRedemptionAt?: string
}

interface GuestRecordResult {
    record: ScanRecord
    isNewGuest: boolean
}

interface LumaGuest {
    api_id: string
    guest: {
        api_id: string
        approval_status: string
        user_email: string
        user_name: string
        checked_in_at: string | null
        event_ticket: {
            name: string
            checked_in_at: string | null
        }
    }
}

export default function POSPage() {
    const [isScanning, setIsScanning] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [redemptionType, setRedemptionType] = useState<'drink' | 'meal'>('drink')
    const [scanRecord, setScanRecord] = useState<ScanRecord | null>(null)
    const [lumaData, setLumaData] = useState<LumaGuest | null>(null)
    const [scanHistory, setScanHistory] = useState<ScanRecord[]>([])
    const [todayScans, setTodayScans] = useState(0)
    const { toast } = useToast()

    // Audio for success sound
    const [audio] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const audioElement = new Audio('/beep.mp3')
                audioElement.preload = 'auto'
                audioElement.volume = 0.5
                return audioElement
            } catch (error) {
                return null
            }
        }
        return null
    })

    const safeFormatDate = (dateString: string | undefined, fallback: string = 'Date unavailable'): string => {
        if (!dateString) return fallback
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return fallback
            return date.toLocaleString()
        } catch {
            return fallback
        }
    }

    const obfuscateName = (fullName: string): string => {
        if (!fullName || typeof fullName !== 'string') return 'Unknown Guest'
        const nameParts = fullName.trim().split(' ')
        if (nameParts.length <= 1) return fullName
        const firstName = nameParts[0]
        const lastName = nameParts[nameParts.length - 1]
        return `${firstName} ${lastName.charAt(0)}.`
    }

    const obfuscateEmail = (email: string | undefined): string => {
        if (!email || typeof email !== 'string') return 'unknown@email.com'
        const [local, domain] = email.split('@')
        if (!local || !domain) return 'unknown@email.com'
        if (local.length <= 2) return email
        return local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1) + '@' + domain
    }

    const getErrorMessage = (error: any, context: string = ''): { title: string; description: string } => {
        console.error(`❌ Error in ${context}:`, error)

        // Network errors
        if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
            return {
                title: "🌐 Network Connection Issue",
                description: "Unable to connect to Lu.ma servers. Please check your internet connection and try again."
            }
        }

        // API errors
        if (error?.status === 401) {
            return {
                title: "🔑 Authentication Error",
                description: "Lu.ma API key is invalid or expired. Please contact support."
            }
        }

        if (error?.status === 403) {
            return {
                title: "🚫 Access Denied",
                description: "This event is not accessible or you don't have permission to access it."
            }
        }

        if (error?.status === 404) {
            return {
                title: "🔍 Guest Not Found",
                description: "This Lu.ma check-in URL is invalid or the guest is not registered for this event."
            }
        }

        if (error?.status === 429) {
            return {
                title: "⏱️ Too Many Requests",
                description: "Too many requests to Lu.ma. Please wait a moment and try again."
            }
        }

        if (error?.status >= 500) {
            return {
                title: "🔧 Lu.ma Service Unavailable",
                description: "Lu.ma servers are experiencing issues. Please try again in a few minutes."
            }
        }

        // Firebase errors
        if (error?.code === 'permission-denied') {
            return {
                title: "🔒 Database Access Denied",
                description: "Unable to save guest data. Please contact support."
            }
        }

        if (error?.code === 'unavailable') {
            return {
                title: "🔥 Database Unavailable",
                description: "Database is temporarily unavailable. Please try again in a moment."
            }
        }

        // Generic error with more context
        return {
            title: "⚠️ Processing Error",
            description: `Unable to process the check-in. ${error?.message || 'Please try again or contact support if the issue persists.'}`
        }
    }

    const findOrCreateGuestRecord = async (publicKey: string, email: string, attendeeName: string, lumaVerified: boolean, eventId?: string): Promise<GuestRecordResult> => {
        try {
            console.log('🔥 Firebase: Starting findOrCreateGuestRecord with:', { publicKey, email, attendeeName, lumaVerified, eventId })

            // Try to find existing record by publicKey
            console.log('🔥 Firebase: Querying for existing record with publicKey:', publicKey)
            const guestQuery = query(
                collection(db, "redemptionScans"),
                where("publicKey", "==", publicKey)
            )
            const guestSnapshot = await getDocs(guestQuery)
            console.log('🔥 Firebase: Query result - empty:', guestSnapshot.empty, 'docs count:', guestSnapshot.docs.length)

            if (!guestSnapshot.empty) {
                // Return existing record
                const existingDoc = guestSnapshot.docs[0]
                const existingRecord = { id: existingDoc.id, ...existingDoc.data() } as ScanRecord
                console.log('🔥 Firebase: Found existing record:', existingRecord)
                return { record: existingRecord, isNewGuest: false }
            }

            // Create new record if not found
            console.log('🔥 Firebase: No existing record found, creating new record...')
            const newRecord = {
                email: email.toLowerCase(),
                attendeeName: attendeeName,
                scannedAt: new Date().toISOString(),
                lumaVerified: lumaVerified,
                remainingDrinks: DRINKS_LIMIT,
                remainingMeals: MEALS_LIMIT,
                publicKey: publicKey,
                eventId: eventId
            }
            console.log('🔥 Firebase: New record data to create:', newRecord)

            console.log('🔥 Firebase: Adding document to collection...')
            const docRef = await addDoc(collection(db, "redemptionScans"), newRecord)
            console.log('🔥 Firebase: Document created successfully with ID:', docRef.id)

            const createdRecord = { id: docRef.id, ...newRecord }
            console.log('🔥 Firebase: Created record result:', createdRecord)
            return { record: createdRecord, isNewGuest: true }
        } catch (error) {
            console.error('🔥 Firebase: Error in findOrCreateGuestRecord:', error)
            const errorInfo = getErrorMessage(error, 'Firebase findOrCreateGuestRecord')
            throw new Error(`${errorInfo.title}: ${errorInfo.description}`)
        }
    }

    const updateGuestRedemption = async (recordId: string, redemptionType: 'drink' | 'meal'): Promise<ScanRecord> => {
        try {
            console.log('🔥 Firebase: Starting updateGuestRedemption with:', { recordId, redemptionType })

            const recordRef = doc(db, "redemptionScans", recordId)
            console.log('🔥 Firebase: Getting document reference for ID:', recordId)

            console.log('🔥 Firebase: Fetching current document...')
            const recordDoc = await getDoc(recordRef)
            console.log('🔥 Firebase: Document exists:', recordDoc.exists())

            if (!recordDoc.exists()) {
                console.error('🔥 Firebase: Record not found for ID:', recordId)
                throw new Error('Record not found')
            }

            const currentData = recordDoc.data() as ScanRecord
            console.log('🔥 Firebase: Current record data:', currentData)

            const updateData: Partial<ScanRecord> = {
                lastRedemptionType: redemptionType,
                lastRedemptionAt: new Date().toISOString()
            }

            // Decrement the appropriate counter
            if (redemptionType === 'drink') {
                updateData.remainingDrinks = Math.max(0, currentData.remainingDrinks - 1)
                console.log('🔥 Firebase: Updating drinks - current:', currentData.remainingDrinks, 'new:', updateData.remainingDrinks)
            } else {
                updateData.remainingMeals = Math.max(0, currentData.remainingMeals - 1)
                console.log('🔥 Firebase: Updating meals - current:', currentData.remainingMeals, 'new:', updateData.remainingMeals)
            }

            console.log('🔥 Firebase: Update data to apply:', updateData)
            console.log('🔥 Firebase: Updating document...')
            await updateDoc(recordRef, updateData)
            console.log('🔥 Firebase: Document updated successfully')

            // Return updated record
            const updatedRecord = { ...currentData, ...updateData }
            console.log('🔥 Firebase: Updated record result:', updatedRecord)
            return updatedRecord
        } catch (error) {
            console.error('🔥 Firebase: Error in updateGuestRedemption:', error)
            throw error
        }
    }

    const handleScanSuccess = async (scannedText: string) => {
        setIsScanning(false)
        setIsProcessing(true)

        try {
            // Check if it's a Lu.ma URL
            if (scannedText.includes('https://lu.ma/check-in/')) {
                // Decode URL first to handle encoded characters
                const decodedUrl = decodeURIComponent(scannedText)

                // Extract event ID and proxy key from Lu.ma URL
                const urlMatch = decodedUrl.match(/https:\/\/lu\.ma\/check-in\/([^?]+)\?pk=([^&]+)/)
                if (urlMatch) {
                    const [, eventId, proxyKey] = urlMatch

                    // Validate event ID against environment variable
                    const configuredEventId = process.env.NEXT_PUBLIC_EVENT_ID
                    if (configuredEventId && eventId !== configuredEventId) {
                        toast({
                            title: "Invalid Event",
                            description: `This QR code is for a different event. Expected: ${configuredEventId}, Got: ${eventId}`,
                            variant: "destructive",
                        })
                        setIsProcessing(false)
                        return
                    }

                    // Make API request to local /api/luma endpoint
                    try {
                        console.log('Starting API call to /api/luma with:', { eventId, proxyKey })

                        const response = await fetch(`/api/luma?event_api_id=${eventId}&proxy_key=${proxyKey}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        })

                        console.log('API response status:', response.status, response.ok)

                        if (!response.ok) {
                            const errorText = await response.text()
                            console.error('API response not ok:', errorText)
                            throw new Error(`/api/luma responded with status: ${response.status} - ${errorText}`)
                        }

                        const lumaData = await response.json()

                        // Debug: Log the response data
                        console.log('Lu.ma API Response:', lumaData)
                        console.log('Response structure check:', {
                            hasData: !!lumaData,
                            hasGuest: !!(lumaData && lumaData.guest),
                            guestKeys: lumaData?.guest ? Object.keys(lumaData.guest) : [],
                            hasUserEmail: !!(lumaData && lumaData.guest && lumaData.guest.user_email),
                            hasUserName: !!(lumaData && lumaData.guest && lumaData.guest.user_name),
                            userEmail: lumaData?.guest?.user_email,
                            userName: lumaData?.guest?.user_name
                        })

                        // Check if we have guest data - directly use user_email from Lu.ma API
                        if (lumaData && lumaData.guest && lumaData.guest.user_email) {
                            console.log('✅ Valid guest data found, processing...')

                            const guestEmail = lumaData.guest.user_email.toLowerCase().trim()
                            const guestName = (lumaData.guest.user_name || guestEmail.split('@')[0] || 'Unknown Guest').trim()

                            // Debug: Log the extracted data
                            console.log('Extracted guest data:', { guestEmail, guestName })

                            // Validate email format
                            if (!guestEmail || !guestEmail.includes('@')) {
                                console.error('❌ Invalid email format:', guestEmail)
                                toast({
                                    title: "Invalid Guest Data",
                                    description: "The guest email from Lu.ma is invalid.",
                                    variant: "destructive",
                                })
                                setIsProcessing(false)
                                return
                            }

                            console.log('✅ Email validation passed, creating guest object...')

                            // Create LumaGuest object
                            const lumaGuest: LumaGuest = {
                                api_id: eventId,
                                guest: {
                                    api_id: eventId,
                                    approval_status: lumaData.guest.approval_status || "approved",
                                    user_email: guestEmail,
                                    user_name: guestName,
                                    checked_in_at: lumaData.guest.checked_in_at || new Date().toISOString(),
                                    event_ticket: {
                                        name: lumaData.guest.event_ticket?.name || "Lu.ma Event Ticket",
                                        checked_in_at: lumaData.guest.checked_in_at || new Date().toISOString()
                                    }
                                }
                            }
                            setLumaData(lumaGuest)

                            console.log('✅ LumaGuest object created:', lumaGuest)

                            // Create data object using actual guest data from Lu.ma
                            const data: ScannedData = {
                                email: guestEmail,
                                attendeeId: eventId,
                                validFrom: new Date().toISOString(),
                                validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                                drinksAllowed: DRINKS_LIMIT,
                                mealsAllowed: MEALS_LIMIT,
                                generatedAt: new Date().toISOString(),
                                lumaUrl: scannedText,
                                eventId: eventId,
                                publicKey: proxyKey
                            }

                            console.log('✅ ScannedData object created:', data)

                            // Find or create guest record using actual guest data
                            console.log('🔄 Calling findOrCreateGuestRecord...')
                            const { record: guestRecord, isNewGuest } = await findOrCreateGuestRecord(
                                data.publicKey!,
                                data.email,
                                lumaGuest.guest.user_name,
                                true, // Always verified for Lu.ma guests
                                data.eventId
                            )

                            console.log('✅ Guest record result:', { guestRecord, isNewGuest })

                            // Show welcome toast for new guests
                            if (isNewGuest) {
                                console.log('🎉 New guest detected, showing welcome toast')
                                toast({
                                    title: `👋 Welcome ${obfuscateName(lumaGuest.guest.user_name)}!`,
                                    description: `You have ${DRINKS_LIMIT} drinks and ${MEALS_LIMIT} meals available.`,
                                    variant: "success",
                                })
                            }

                            // Show available entitlements if guest has remaining drinks or meals
                            if (guestRecord.remainingDrinks > 0 || guestRecord.remainingMeals > 0) {
                                const availableItems = []
                                if (guestRecord.remainingDrinks > 0) {
                                    availableItems.push(`${guestRecord.remainingDrinks} drink${guestRecord.remainingDrinks > 1 ? 's' : ''}`)
                                }
                                if (guestRecord.remainingMeals > 0) {
                                    availableItems.push(`${guestRecord.remainingMeals} meal${guestRecord.remainingMeals > 1 ? 's' : ''}`)
                                }

                                console.log('🍹 Available items:', availableItems)
                                toast({
                                    title: `🍹 Available for ${obfuscateName(lumaGuest.guest.user_name)}`,
                                    description: `Ready to claim: ${availableItems.join(' and ')}`,
                                    variant: "success",
                                })
                            }

                            // Check if redemption is allowed
                            if (redemptionType === 'drink' && guestRecord.remainingDrinks <= 0) {
                                console.log('❌ No drinks remaining')
                                toast({
                                    title: "🍹 No drinks remaining",
                                    description: `${obfuscateName(lumaGuest.guest.user_name)} has already claimed all ${DRINKS_LIMIT} drinks.`,
                                    variant: "warning",
                                })
                                setScanRecord(guestRecord)
                                setIsProcessing(false)
                                return
                            }

                            if (redemptionType === 'meal' && guestRecord.remainingMeals <= 0) {
                                console.log('❌ No meals remaining')
                                toast({
                                    title: "🍽️ No meals remaining",
                                    description: `${obfuscateName(lumaGuest.guest.user_name)} has already claimed all ${MEALS_LIMIT} meals.`,
                                    variant: "warning",
                                })
                                setScanRecord(guestRecord)
                                setIsProcessing(false)
                                return
                            }

                            // Special case: if guest has no remaining drinks or meals at all
                            if (guestRecord.remainingDrinks <= 0 && guestRecord.remainingMeals <= 0) {
                                console.log('❌ All entitlements claimed')
                                toast({
                                    title: "🎭 All entitlements claimed",
                                    description: `${obfuscateName(lumaGuest.guest.user_name)} has claimed all available drinks and meals.`,
                                    variant: "warning",
                                })
                                setScanRecord(guestRecord)
                                setIsProcessing(false)
                                return
                            }

                            // Update the redemption
                            console.log('🔄 Updating guest redemption...')
                            const updatedRecord = await updateGuestRedemption(guestRecord.id, redemptionType)
                            console.log('✅ Redemption updated:', updatedRecord)

                            setScanRecord(updatedRecord)

                            // Update scan history
                            setScanHistory(prev => [updatedRecord, ...prev.filter(r => r.id !== updatedRecord.id).slice(0, 9)])

                            // Update today's scan count
                            setTodayScans(prev => prev + 1)

                            // Play success sound with proper error handling
                            if (audio) {
                                try {
                                    // Reset audio to beginning
                                    audio.currentTime = 0
                                    // Play with proper error handling
                                    const playPromise = audio.play()
                                    if (playPromise !== undefined) {
                                        playPromise.catch((error) => {
                                            // Only log if it's not an abort error (which is expected when component unmounts)
                                            if (error.name !== 'AbortError') {
                                                // Handle error silently
                                            }
                                        })
                                    }
                                } catch (error) {
                                    // Ignore audio errors as they're not critical
                                }
                            }

                            const itemType = redemptionType === 'drink' ? 'drink' : 'meal'
                            const remainingCount = redemptionType === 'drink' ? updatedRecord.remainingDrinks : updatedRecord.remainingMeals

                            console.log('🎉 Showing celebration toast for successful redemption')
                            // Show celebration toast for successful redemption
                            toast({
                                title: `🎉 ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Claimed Successfully!`,
                                description: `${obfuscateName(lumaGuest.guest.user_name)} - ${remainingCount} ${itemType}s remaining`,
                                variant: "celebration",
                            })

                            console.log('✅ Scan process completed successfully')
                            setIsProcessing(false)
                            return
                        } else {
                            // Debug: Log what's missing
                            console.log('❌ Missing data in response:', {
                                hasLumaData: !!lumaData,
                                hasGuest: !!(lumaData && lumaData.guest),
                                hasUserEmail: !!(lumaData && lumaData.guest && lumaData.guest.user_email),
                                guestData: lumaData?.guest
                            })

                            toast({
                                title: "Guest not found",
                                description: "This Lu.ma check-in could not be verified. No guest user_email found in response.",
                                variant: "destructive",
                            })
                            setIsProcessing(false)
                            return
                        }
                    } catch (apiError) {
                        const errorInfo = getErrorMessage(apiError, 'Lu.ma API call')
                        toast({
                            title: errorInfo.title,
                            description: errorInfo.description,
                            variant: "destructive",
                        })
                        setIsProcessing(false)
                        return
                    }
                } else {
                    toast({
                        title: "🔗 Invalid Lu.ma URL",
                        description: "The scanned URL doesn't appear to be a valid Lu.ma check-in link. Please scan the correct QR code from your Lu.ma event.",
                        variant: "destructive",
                    })
                    setIsProcessing(false)
                    return
                }
            }

            // Only Lu.ma URLs are supported
            toast({
                title: "Invalid QR Code",
                description: "Please scan a valid Lu.ma check-in URL.",
                variant: "destructive",
            })
            setIsProcessing(false)
            return

        } catch (error) {
            toast({
                title: "Scan failed",
                description: "Invalid QR code or processing error.",
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const resetScan = () => {
        setLumaData(null)
        setScanRecord(null)
        // Small delay to ensure UI updates before opening scanner
        setTimeout(() => {
            setIsScanning(true) // Open camera scanner for next scan
        }, 100)
    }

    const loadRecentScans = async () => {
        try {
            console.log('🔥 Firebase: Starting loadRecentScans...')
            const scansQuery = query(collection(db, "redemptionScans"))
            console.log('🔥 Firebase: Executing query for all redemption scans...')
            const scansSnapshot = await getDocs(scansQuery)
            console.log('🔥 Firebase: Query completed, docs count:', scansSnapshot.docs.length)

            const scans = scansSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord))
                .filter(scan => {
                    // Filter out records with invalid dates
                    try {
                        const date1 = scan.lastRedemptionAt ? new Date(scan.lastRedemptionAt) : new Date(scan.scannedAt)
                        const date2 = new Date(scan.scannedAt)
                        return !isNaN(date1.getTime()) && !isNaN(date2.getTime())
                    } catch {
                        console.log('🔥 Firebase: Filtered out scan with invalid dates:', scan.id)
                        return false
                    }
                })
                .sort((a, b) => {
                    try {
                        const dateA = new Date(b.lastRedemptionAt || b.scannedAt)
                        const dateB = new Date(a.lastRedemptionAt || a.scannedAt)
                        return dateA.getTime() - dateB.getTime()
                    } catch {
                        console.log('🔥 Firebase: Error sorting scans, using default order')
                        return 0
                    }
                })
                .slice(0, 10)

            console.log('🔥 Firebase: Processed scans count:', scans.length)
            setScanHistory(scans)

            // Calculate today's scans (based on lastRedemptionAt)
            const today = new Date().toISOString().slice(0, 10)
            const todayScansCount = scansSnapshot.docs.filter(doc => {
                try {
                    const data = doc.data()
                    const redemptionDate = data.lastRedemptionAt
                        ? new Date(data.lastRedemptionAt).toISOString().slice(0, 10)
                        : new Date(data.scannedAt).toISOString().slice(0, 10)
                    return redemptionDate === today
                } catch {
                    console.log('🔥 Firebase: Error calculating today scans for doc:', doc.id)
                    return false
                }
            }).length

            console.log('🔥 Firebase: Today scans count:', todayScansCount)
            setTodayScans(todayScansCount)
        } catch (error) {
            console.error('🔥 Firebase: Error in loadRecentScans:', error)
            // Handle error silently
        }
    }

    // Load recent scans on component mount
    useEffect(() => {
        loadRecentScans()
    }, [])

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audio) {
                try {
                    audio.pause()
                    audio.currentTime = 0
                } catch (error) {
                    // Handle error silently
                }
            }
        }
    }, [audio])

    return (
        <div className="min-h-screen bg-[#81a8f8] p-2 sm:p-4">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-8">
                    <p className="text-sm sm:text-base mb-2 sm:mb-4 text-slate-800">Redemption System</p>
                    <h1 className="text-2xl sm:text-[32px] mb-2 sm:mb-4 font-bold text-black">POS Scanner</h1>
                    <p className="text-xs sm:text-sm mb-3 sm:mb-4 text-slate-900 max-w-2xl mx-auto">
                        Scan Lu.ma check-in URLs to redeem drinks and meals.
                        Real-time guest verification with secure server-side API handling.
                        Track redemptions with configurable limits per guest.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <div className="w-full h-full border-black border-2 rounded-md hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white transition-all">
                        <div className="p-3 sm:p-6 text-center">
                            <p className="text-lg sm:text-2xl font-bold text-purple-700">{todayScans}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Today's Redemptions</p>
                        </div>
                    </div>
                    <div className="w-full h-full border-black border-2 rounded-md hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white transition-all">
                        <div className="p-3 sm:p-6 text-center">
                            <p className="text-lg sm:text-2xl font-bold text-cyan-600">{scanHistory.filter(s => s.lumaVerified).length}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Luma Verified</p>
                        </div>
                    </div>
                    <div className="w-full h-full border-black border-2 rounded-md hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white transition-all">
                        <div className="p-3 sm:p-6 text-center">
                            <p className="text-lg sm:text-2xl font-bold text-blue-600">{scanHistory.filter(s => s.lastRedemptionType === 'drink').length}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Drinks Redeemed</p>
                        </div>
                    </div>
                    <div className="w-full h-full border-black border-2 rounded-md hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white transition-all">
                        <div className="p-3 sm:p-6 text-center">
                            <p className="text-lg sm:text-2xl font-bold text-purple-700">{scanHistory.filter(s => s.lastRedemptionType === 'meal').length}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Meals Redeemed</p>
                        </div>
                    </div>
                </div>

                {/* Redemption Type Selector */}
                <div className="w-full border-black border-2 rounded-md bg-white">
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-blue-700">Redemption Type</h2>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                            <button
                                onClick={() => setRedemptionType('drink')}
                                className={`flex-1 h-14 sm:h-12 border-black border-2 p-2.5 rounded-md transition-all font-medium ${redemptionType === 'drink'
                                    ? 'bg-[#A4FCF6] shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                                    : 'bg-white hover:bg-[#A4FCF6] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                                    }`}
                            >
                                <div className="flex items-center justify-center">
                                    <Coffee className="h-4 w-4 mr-2" />
                                    <span className="text-sm sm:text-base">Drinks ({DRINKS_LIMIT} per guest)</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setRedemptionType('meal')}
                                className={`flex-1 h-14 sm:h-12 border-black border-2 p-2.5 rounded-md transition-all font-medium ${redemptionType === 'meal'
                                    ? 'bg-[#A4FCF6] shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                                    : 'bg-white hover:bg-[#A4FCF6] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                                    }`}
                            >
                                <div className="flex items-center justify-center">
                                    <Utensils className="h-4 w-4 mr-2" />
                                    <span className="text-sm sm:text-base">Meals ({MEALS_LIMIT} per guest)</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scan Button */}
                <div className="w-full border-black border-2 rounded-md bg-white">
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-blue-700">
                            <Camera className="h-5 w-5" />
                            QR Code Scanner
                        </h2>
                        <button
                            onClick={() => setIsScanning(true)}
                            disabled={isProcessing}
                            className="w-full h-14 sm:h-12 border-black border-2 p-2.5 bg-[#A4FCF6] hover:bg-[#81a8f8] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#D0C4fB] rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                            {isProcessing ? "Processing..." : `Start Scanning for ${redemptionType}s`}
                        </button>
                    </div>
                </div>

                {/* Scan Results */}
                {scanRecord && (
                    <Card className="bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                {scanRecord.lumaVerified ? (
                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                                )}
                                Scan Result
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-700">Guest</h4>
                                    <p className="text-lg font-medium">{obfuscateName(scanRecord.attendeeName)}</p>
                                    <p className="text-sm text-gray-600">{obfuscateEmail(scanRecord.email)}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-700">Redemption Status</h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant={scanRecord.lumaVerified ? "default" : "secondary"}>
                                            {scanRecord.lumaVerified ? "Luma Verified" : "Not in Luma"}
                                        </Badge>
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Coffee className="h-3 w-3" />
                                            {scanRecord.remainingDrinks} drinks
                                        </Badge>
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Utensils className="h-3 w-3" />
                                            {scanRecord.remainingMeals} meals
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Luma Information */}
                            {lumaData && (
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Event Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p><span className="font-medium">Ticket Type:</span> {lumaData.guest.event_ticket.name}</p>
                                            <p><span className="font-medium">Status:</span> {lumaData.guest.approval_status}</p>
                                        </div>
                                        <div>
                                            <p><span className="font-medium">Checked In:</span> {lumaData.guest.checked_in_at ? 'Yes' : 'No'}</p>
                                            {lumaData.guest.checked_in_at && (
                                                <p><span className="font-medium">Check-in Time:</span> {new Date(lumaData.guest.checked_in_at).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Redemption Status Display */}
                                    <div className="mt-3 space-y-2">
                                        <div className={`p-3 rounded-lg border ${scanRecord.remainingDrinks > 0
                                            ? 'bg-[#A4FCF6]/20 border-[#A4FCF6] text-[#D0C4fB]'
                                            : 'bg-red-50 border-red-200 text-red-800'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <Coffee className="h-4 w-4" />
                                                <span className="font-medium">
                                                    {scanRecord.remainingDrinks > 0
                                                        ? `${scanRecord.remainingDrinks} drinks remaining`
                                                        : 'No drinks remaining'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded-lg border ${scanRecord.remainingMeals > 0
                                            ? 'bg-[#A4FCF6]/20 border-[#A4FCF6] text-[#D0C4fB]'
                                            : 'bg-red-50 border-red-200 text-red-800'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <Utensils className="h-4 w-4" />
                                                <span className="font-medium">
                                                    {scanRecord.remainingMeals > 0
                                                        ? `${scanRecord.remainingMeals} meals remaining`
                                                        : 'No meals remaining'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Last Redemption Info */}
                            {scanRecord.lastRedemptionAt && (
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold text-sm text-gray-700">Last Redemption</h4>
                                    <p className="text-sm">
                                        {safeFormatDate(scanRecord.lastRedemptionAt)}
                                    </p>
                                    {scanRecord.lastRedemptionType && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Last redeemed: {scanRecord.lastRedemptionType}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <Button onClick={resetScan} variant="outline" className="flex-1 h-14 sm:h-12 text-sm sm:text-base bg-black text-white">
                                    Scan Another
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recent Scans */}
                {scanHistory.length > 0 && (
                    <div className="w-full border-black border-2 rounded-md bg-white">
                        <div className="p-4 sm:p-6">
                            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-blue-700">Recent Redemptions</h2>
                            <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                                {scanHistory.map((scan, index) => (
                                    <div key={`${scan.id}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 sm:gap-0">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm sm:text-base">{obfuscateName(scan.attendeeName)}</p>
                                            <p className="text-xs sm:text-sm text-gray-600">{obfuscateEmail(scan.email)}</p>
                                            <p className="text-xs text-gray-500">
                                                {safeFormatDate(scan.lastRedemptionAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {scan.lumaVerified ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            {scan.lastRedemptionType && (
                                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                    {scan.lastRedemptionType === 'drink' ? (
                                                        <Coffee className="h-3 w-3" />
                                                    ) : (
                                                        <Utensils className="h-3 w-3" />
                                                    )}
                                                    {scan.lastRedemptionType}
                                                </Badge>
                                            )}
                                            <div className="flex gap-1">
                                                <Badge variant="outline" className="text-xs">
                                                    D:{scan.remainingDrinks}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    M:{scan.remainingMeals}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* QR Scanner Modal */}
            {isScanning && (
                <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setIsScanning(false)}
                />
            )}
        </div>
    )
} 