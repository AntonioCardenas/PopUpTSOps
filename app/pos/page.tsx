"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import QRScanner from "@/components/qr-scanner"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, AlertCircle, Camera, Coffee, Utensils } from "lucide-react"
import { type LumaGuest } from "@/lib/luma-utils"

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

export default function POSPage() {
    const [isScanning, setIsScanning] = useState(false)
    const [lumaData, setLumaData] = useState<LumaGuest | null>(null)
    const [scanRecord, setScanRecord] = useState<ScanRecord | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [scanHistory, setScanHistory] = useState<ScanRecord[]>([])
    const [audio] = useState(typeof window !== 'undefined' ? new Audio('/beep.mp3') : null)
    const [todayScans, setTodayScans] = useState(0)
    const [redemptionType, setRedemptionType] = useState<'drink' | 'meal'>('drink')

    // Get limits from environment variables, default to 3 drinks and 1 meal
    const DRINKS_LIMIT = parseInt(process.env.NEXT_PUBLIC_MAX_DRINKS_PER_GUEST || '3')
    const MEALS_LIMIT = parseInt(process.env.NEXT_PUBLIC_MAX_MEALS_PER_GUEST || '1')

    // Helper function to safely format dates
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

    // Helper function to obfuscate personal information
    const obfuscateName = (fullName: string): string => {
        if (!fullName || typeof fullName !== 'string') return 'Unknown Guest'
        const nameParts = fullName.trim().split(' ')
        if (nameParts.length <= 1) return fullName
        const firstName = nameParts[0]
        const lastName = nameParts[nameParts.length - 1]
        return `${firstName} ${lastName.charAt(0)}.`
    }

    const obfuscateEmail = (email: string): string => {
        if (!email || typeof email !== 'string') return 'unknown@email.com'
        const [localPart, domain] = email.split('@')
        if (!domain) return email

        if (localPart.length <= 2) return email

        const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1)
        return `${maskedLocal}@${domain}`
    }

    const findOrCreateGuestRecord = async (publicKey: string, email: string, attendeeName: string, lumaVerified: boolean, eventId?: string): Promise<ScanRecord> => {
        try {
            // Try to find existing record by publicKey
            const guestQuery = query(
                collection(db, "redemptionScans"),
                where("publicKey", "==", publicKey)
            )
            const guestSnapshot = await getDocs(guestQuery)

            if (!guestSnapshot.empty) {
                // Return existing record
                const existingDoc = guestSnapshot.docs[0]
                return { id: existingDoc.id, ...existingDoc.data() } as ScanRecord
            }

            // Create new record if not found
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

            const docRef = await addDoc(collection(db, "redemptionScans"), newRecord)
            return { id: docRef.id, ...newRecord }
        } catch (error) {
            console.error('Error finding or creating guest record:', error)
            throw error
        }
    }

    const updateGuestRedemption = async (recordId: string, redemptionType: 'drink' | 'meal'): Promise<ScanRecord> => {
        try {
            const recordRef = doc(db, "redemptionScans", recordId)
            const recordDoc = await getDoc(recordRef)

            if (!recordDoc.exists()) {
                throw new Error('Record not found')
            }

            const currentData = recordDoc.data() as ScanRecord
            const updateData: Partial<ScanRecord> = {
                lastRedemptionType: redemptionType,
                lastRedemptionAt: new Date().toISOString()
            }

            // Decrement the appropriate counter
            if (redemptionType === 'drink') {
                updateData.remainingDrinks = Math.max(0, currentData.remainingDrinks - 1)
            } else {
                updateData.remainingMeals = Math.max(0, currentData.remainingMeals - 1)
            }

            await updateDoc(recordRef, updateData)

            // Return updated record
            return { ...currentData, ...updateData }
        } catch (error) {
            console.error('Error updating guest redemption:', error)
            throw error
        }
    }

    const handleScanSuccess = async (scannedText: string) => {
        setIsScanning(false)
        setIsProcessing(true)

        try {
            console.log('Scanned text:', scannedText)

            // Check if it's a Lu.ma URL
            if (scannedText.includes('https://lu.ma/check-in/')) {
                // Decode URL first to handle encoded characters
                const decodedUrl = decodeURIComponent(scannedText)
                console.log('Decoded URL:', decodedUrl)

                // Extract event ID and proxy key from Lu.ma URL
                const urlMatch = decodedUrl.match(/https:\/\/lu\.ma\/check-in\/([^?]+)\?pk=([^&]+)/)
                if (urlMatch) {
                    const [, eventId, proxyKey] = urlMatch
                    console.log('Lu.ma URL detected:', { eventId, proxyKey })

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
                        console.log('Making request to /api/luma:', { eventId, proxyKey });

                        const response = await fetch(`/api/luma?event_api_id=${eventId}&proxy_key=${proxyKey}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });

                        console.log('/api/luma response status:', response.status);
                        console.log('/api/luma response:', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('/api/luma error response:', {
                                status: response.status,
                                statusText: response.statusText,
                                body: errorText
                            });
                            throw new Error(`/api/luma responded with status: ${response.status} - ${errorText}`);
                        }

                        const lumaData = await response.json();
                        console.log('/api/luma response:', lumaData);

                        // Check if we have guest data - directly use user_email from Lu.ma API
                        if (lumaData && lumaData.guest && lumaData.guest.user_email) {
                            const guestEmail = lumaData.guest.user_email.toLowerCase().trim();
                            const guestName = (lumaData.guest.user_name || guestEmail.split('@')[0] || 'Unknown Guest').trim();

                            // Validate email format
                            if (!guestEmail || !guestEmail.includes('@')) {
                                toast({
                                    title: "Invalid Guest Data",
                                    description: "The guest email from Lu.ma is invalid.",
                                    variant: "destructive",
                                })
                                setIsProcessing(false)
                                return
                            }

                            console.log('Lu.ma Guest Data Retrieved:', {
                                userEmail: guestEmail,
                                name: guestName,
                                eventId,
                                proxyKey,
                                approvalStatus: lumaData.guest.approval_status,
                                source: 'Lu.ma API'
                            });

                            // Create LumaGuest object
                            const lumaGuest: LumaGuest = {
                                api_id: eventId,
                                guest: {
                                    api_id: eventId,
                                    approval_status: lumaData.guest.approval_status || "approved",
                                    email: guestEmail,
                                    name: guestName,
                                    checked_in_at: lumaData.guest.checked_in_at || new Date().toISOString(),
                                    event_ticket: {
                                        name: lumaData.guest.event_ticket?.name || "Lu.ma Event Ticket",
                                        checked_in_at: lumaData.guest.checked_in_at || new Date().toISOString()
                                    }
                                }
                            }
                            setLumaData(lumaGuest)

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

                            // Find or create guest record using actual guest data
                            const guestRecord = await findOrCreateGuestRecord(
                                data.publicKey!,
                                data.email,
                                lumaGuest.guest.name,
                                true, // Always verified for Lu.ma guests
                                data.eventId
                            )

                            // Check if redemption is allowed
                            if (redemptionType === 'drink' && guestRecord.remainingDrinks <= 0) {
                                toast({
                                    title: "No drinks remaining",
                                    description: `This guest has already redeemed all ${DRINKS_LIMIT} drinks.`,
                                    variant: "destructive",
                                })
                                setScanRecord(guestRecord)
                                setIsProcessing(false)
                                return
                            }

                            if (redemptionType === 'meal' && guestRecord.remainingMeals <= 0) {
                                toast({
                                    title: "No meals remaining",
                                    description: `This guest has already redeemed all ${MEALS_LIMIT} meals.`,
                                    variant: "destructive",
                                })
                                setScanRecord(guestRecord)
                                setIsProcessing(false)
                                return
                            }

                            // Update the redemption
                            const updatedRecord = await updateGuestRedemption(guestRecord.id, redemptionType)
                            setScanRecord(updatedRecord)

                            // Update scan history
                            setScanHistory(prev => [updatedRecord, ...prev.filter(r => r.id !== updatedRecord.id).slice(0, 9)])

                            // Update today's scan count
                            setTodayScans(prev => prev + 1)

                            // Play success sound
                            if (audio) {
                                audio.play().catch(console.error)
                            }

                            const itemType = redemptionType === 'drink' ? 'drink' : 'meal'
                            const remainingCount = redemptionType === 'drink' ? updatedRecord.remainingDrinks : updatedRecord.remainingMeals

                            toast({
                                title: `Lu.ma ${itemType} redemption successful`,
                                description: `${obfuscateName(lumaGuest.guest.name)} - ${remainingCount} ${itemType}s remaining`,
                                variant: "success",
                            })

                            setIsProcessing(false)
                            return
                        } else {
                            console.log('No guest user_email found in Lu.ma API response', {
                                hasGuest: !!lumaData.guest,
                                hasUserEmail: !!lumaData.guest?.user_email,
                                availableFields: lumaData.guest ? Object.keys(lumaData.guest) : [],
                                responseData: lumaData
                            });
                            toast({
                                title: "Guest not found",
                                description: "This Lu.ma check-in could not be verified. No guest user_email found in response.",
                                variant: "destructive",
                            })
                            setIsProcessing(false)
                            return
                        }
                    } catch (apiError) {
                        console.error('Lu.ma API request failed:', apiError);
                        if (apiError instanceof Error) {
                            console.error('API Error details:', {
                                message: apiError.message,
                                stack: apiError.stack
                            });
                        }
                        toast({
                            title: "API Error",
                            description: "Failed to verify Lu.ma check-in. Please try again.",
                            variant: "destructive",
                        })
                        setIsProcessing(false)
                        return
                    }
                } else {
                    toast({
                        title: "Invalid Lu.ma URL",
                        description: "The Lu.ma URL format is not recognized.",
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
            console.error('Error processing scan:', error)
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
    }

    const loadRecentScans = async () => {
        try {
            const scansQuery = query(collection(db, "redemptionScans"))
            const scansSnapshot = await getDocs(scansQuery)

            const scans = scansSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord))
                .filter(scan => {
                    // Filter out records with invalid dates
                    try {
                        const date1 = scan.lastRedemptionAt ? new Date(scan.lastRedemptionAt) : new Date(scan.scannedAt)
                        const date2 = new Date(scan.scannedAt)
                        return !isNaN(date1.getTime()) && !isNaN(date2.getTime())
                    } catch {
                        return false
                    }
                })
                .sort((a, b) => {
                    try {
                        const dateA = new Date(b.lastRedemptionAt || b.scannedAt)
                        const dateB = new Date(a.lastRedemptionAt || a.scannedAt)
                        return dateA.getTime() - dateB.getTime()
                    } catch {
                        return 0
                    }
                })
                .slice(0, 10)

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
                    return false
                }
            }).length

            setTodayScans(todayScansCount)
        } catch (error) {
            console.error('Error loading recent scans:', error)
        }
    }

    // Load recent scans on component mount
    useEffect(() => {
        loadRecentScans()
    }, [])

    return (
        <div className="min-h-screen bg-[#81a8f8] p-2 sm:p-4">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-8">
                    <p className="text-sm sm:text-base mb-2 sm:mb-4 text-slate-800"> Redemption System</p>
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