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
                            const guestEmail = lumaData.guest.user_email.toLowerCase();
                            const guestName = lumaData.guest.user_name || guestEmail.split('@')[0];

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
                                description: `${lumaGuest.guest.name} - ${remainingCount} ${itemType}s remaining`,
                                variant: "default",
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
                .sort((a, b) => new Date(b.lastRedemptionAt || b.scannedAt).getTime() - new Date(a.lastRedemptionAt || a.scannedAt).getTime())
                .slice(0, 10)

            setScanHistory(scans)

            // Calculate today's scans (based on lastRedemptionAt)
            const today = new Date().toISOString().slice(0, 10)
            const todayScansCount = scansSnapshot.docs.filter(doc => {
                const data = doc.data()
                const redemptionDate = data.lastRedemptionAt ? new Date(data.lastRedemptionAt).toISOString().slice(0, 10) : new Date(data.scannedAt).toISOString().slice(0, 10)
                return redemptionDate === today
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
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">POS - Redemption System</h1>
                    <p className="text-gray-600 mt-2">Scan QR codes to redeem drinks and meals</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{todayScans}</p>
                                <p className="text-sm text-gray-600">Today's Redemptions</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{scanHistory.filter(s => s.lumaVerified).length}</p>
                                <p className="text-sm text-gray-600">Luma Verified</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-orange-600">{scanHistory.filter(s => s.lastRedemptionType === 'drink').length}</p>
                                <p className="text-sm text-gray-600">Drinks Redeemed</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600">{scanHistory.filter(s => s.lastRedemptionType === 'meal').length}</p>
                                <p className="text-sm text-gray-600">Meals Redeemed</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Redemption Type Selector */}
                <Card>
                    <CardHeader>
                        <CardTitle>Redemption Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Button
                                onClick={() => setRedemptionType('drink')}
                                variant={redemptionType === 'drink' ? 'default' : 'outline'}
                                className="flex-1"
                            >
                                <Coffee className="h-4 w-4 mr-2" />
                                Drinks ({DRINKS_LIMIT} per guest)
                            </Button>
                            <Button
                                onClick={() => setRedemptionType('meal')}
                                variant={redemptionType === 'meal' ? 'default' : 'outline'}
                                className="flex-1"
                            >
                                <Utensils className="h-4 w-4 mr-2" />
                                Meals ({MEALS_LIMIT} per guest)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Scan Button */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5" />
                            QR Code Scanner
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => setIsScanning(true)}
                            disabled={isProcessing}
                            className="w-full h-12 text-lg btn bg-slate-900 text-white"
                        >
                            {isProcessing ? "Processing..." : `Start Scanning for ${redemptionType}s`}
                        </Button>
                    </CardContent>
                </Card>

                {/* Scan Results */}
                {scanRecord && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {scanRecord.lumaVerified ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                                )}
                                Scan Result
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-600">Guest</h3>
                                    <p className="text-lg font-medium">{scanRecord.attendeeName}</p>
                                    <p className="text-sm text-gray-500">{scanRecord.email}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-600">Redemption Status</h3>
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
                                    <h3 className="font-semibold text-sm text-gray-600 mb-2">Event Information</h3>
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
                                            ? 'bg-green-50 border-green-200 text-green-800'
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
                                            ? 'bg-green-50 border-green-200 text-green-800'
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

                            <div>
                                <h3 className="font-semibold text-sm text-gray-600">Last Redemption</h3>
                                <p className="text-sm">{new Date(scanRecord.lastRedemptionAt || scanRecord.scannedAt).toLocaleString()}</p>
                                {scanRecord.lastRedemptionType && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Last redeemed: {scanRecord.lastRedemptionType}
                                    </p>
                                )}
                            </div>

                            <Button onClick={resetScan} variant="outline" className="w-full">
                                Scan Another
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Recent Scans */}
                {scanHistory.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Redemptions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {scanHistory.map((scan, index) => (
                                    <div key={`${scan.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{scan.attendeeName}</p>
                                            <p className="text-sm text-gray-500">{scan.email}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(scan.lastRedemptionAt || scan.scannedAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
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
                        </CardContent>
                    </Card>
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