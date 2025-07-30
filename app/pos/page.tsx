"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import QRScanner from "@/components/qr-scanner"
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, AlertCircle, Camera, Coffee } from "lucide-react"
import { loadLumaData, findGuestByEmail, type LumaGuest } from "@/lib/luma-utils"

interface ScannedData {
    email: string
    attendeeId: string
    validFrom?: string
    validTo?: string
    drinksAllowed: number
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
    drinksRedeemed: boolean
    scanCount: number
    remainingDrinks: number
}

export default function POSPage() {
    const [isScanning, setIsScanning] = useState(false)
    const [scannedData, setScannedData] = useState<ScannedData | null>(null)
    const [lumaData, setLumaData] = useState<LumaGuest | null>(null)
    const [scanRecord, setScanRecord] = useState<ScanRecord | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [scanHistory, setScanHistory] = useState<ScanRecord[]>([])
    const [audio] = useState(typeof window !== 'undefined' ? new Audio('/beep.mp3') : null)
    const [todayScans, setTodayScans] = useState(0)

    const checkLumaData = async (email: string): Promise<LumaGuest | null> => {
        try {
            const lumaData = await loadLumaData()
            if (!lumaData) {
                return null
            }

            return findGuestByEmail(lumaData, email)
        } catch (error) {
            console.error('Error checking Luma data:', error)
            return null
        }
    }

    const checkScanHistory = async (email: string): Promise<ScanRecord | null> => {
        try {
            const scansQuery = query(
                collection(db, "drinksScans"),
                where("email", "==", email.toLowerCase())
            )
            const scansSnapshot = await getDocs(scansQuery)

            if (!scansSnapshot.empty) {
                const latestScan = scansSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord))
                    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())[0]

                return latestScan
            }

            return null
        } catch (error) {
            console.error('Error checking scan history:', error)
            return null
        }
    }

    const getScanCount = async (email: string): Promise<number> => {
        try {
            const scansQuery = query(
                collection(db, "drinksScans"),
                where("email", "==", email.toLowerCase())
            )
            const scansSnapshot = await getDocs(scansQuery)
            return scansSnapshot.size
        } catch (error) {
            console.error('Error getting scan count:', error)
            return 0
        }
    }

    const saveScanRecord = async (data: ScannedData, lumaGuest: LumaGuest | null, scanCount: number, remainingDrinks: number) => {
        try {
            const scanRecord = {
                email: data.email.toLowerCase(),
                attendeeName: lumaGuest?.guest.name || 'Unknown',
                scannedAt: new Date().toISOString(),
                lumaVerified: !!lumaGuest,
                drinksRedeemed: true,
                scanCount: scanCount,
                remainingDrinks: remainingDrinks,
                qrData: data
            }

            const docRef = await addDoc(collection(db, "drinksScans"), scanRecord)
            return { id: docRef.id, ...scanRecord }
        } catch (error) {
            console.error('Error saving scan record:', error)
            throw error
        }
    }

    const processLumaCheckIn = async (data: ScannedData, lumaGuest: LumaGuest) => {
        try {
            // Check scan history for this Lu.ma event
            const scanCount = await getScanCount(data.email)
            const remainingDrinks = Math.max(0, 3 - scanCount)

            if (remainingDrinks <= 0) {
                toast({
                    title: "Drink limit reached",
                    description: "This Lu.ma guest has already redeemed all 3 drinks.",
                    variant: "destructive",
                })
                setIsProcessing(false)
                return
            }

            // Save the scan record
            const newScanRecord = await saveScanRecord(data, lumaGuest, scanCount + 1, remainingDrinks - 1)
            setScanRecord(newScanRecord)

            // Play success sound
            if (audio) {
                audio.play().catch(console.error)
            }

            // Show success message
            toast({
                title: "Lu.ma check-in successful",
                description: `Lu.ma Guest (${data.eventId}) - ${remainingDrinks - 1} drinks remaining`,
                variant: "default",
            })

            // Update scan history
            await loadRecentScans()
            setIsProcessing(false)
        } catch (error) {
            console.error('Error processing Lu.ma check-in:', error)
            toast({
                title: "Error processing check-in",
                description: "Failed to process Lu.ma check-in. Please try again.",
                variant: "destructive",
            })
            setIsProcessing(false)
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

                // Extract event ID and public key from Lu.ma URL (handles both encoded and non-encoded)
                const urlMatch = decodedUrl.match(/https:\/\/lu\.ma\/check-in\/([^?]+)\?pk=([^&]+)/)
                if (urlMatch) {
                    const [, eventId, publicKey] = urlMatch
                    console.log('Lu.ma URL detected:', { eventId, publicKey })

                    // Check if we have a configured event ID, otherwise use the one from URL
                    const configuredEventId = process.env.NEXT_PUBLIC_EVENT_ID
                    const finalEventId = configuredEventId || eventId

                    console.log('Event ID validation:', {
                        configuredEventId,
                        urlEventId: eventId,
                        finalEventId,
                        usingConfigured: !!configuredEventId
                    })

                    // Create a data object from Lu.ma URL
                    const data: ScannedData = {
                        email: `luma-${eventId}@checkin.com`, // Use original eventId for email
                        attendeeId: eventId,
                        validFrom: new Date().toISOString(),
                        validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Valid for 24 hours
                        drinksAllowed: 3, // Default 3 drinks for Lu.ma check-ins
                        generatedAt: new Date().toISOString(),
                        lumaUrl: scannedText,
                        eventId: finalEventId, // Use final event ID for validation
                        publicKey
                    }

                    setScannedData(data)

                    // Create a mock LumaGuest for Lu.ma check-ins
                    const mockLumaGuest: LumaGuest = {
                        api_id: eventId,
                        guest: {
                            api_id: eventId,
                            approval_status: "approved",
                            email: data.email,
                            name: `Lu.ma Guest (${eventId})`,
                            checked_in_at: new Date().toISOString(),
                            event_ticket: {
                                name: "Lu.ma Event Ticket",
                                checked_in_at: new Date().toISOString()
                            }
                        }
                    }
                    setLumaData(mockLumaGuest)

                    // Process the Lu.ma check-in
                    await processLumaCheckIn(data, mockLumaGuest)
                    return
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

            // Try to parse as JSON
            let data: ScannedData
            try {
                data = JSON.parse(scannedText)
                console.log('Parsed QR data:', data)
            } catch (parseError) {
                console.error('Failed to parse QR code as JSON:', parseError)
                toast({
                    title: "Invalid QR Code",
                    description: "The scanned QR code is not in the expected format. Please scan a valid drinks QR code.",
                    variant: "destructive",
                })
                setIsProcessing(false)
                return
            }

            setScannedData(data)

            // Check Luma data
            const lumaGuest = await checkLumaData(data.email)
            console.log(lumaGuest)
            setLumaData(lumaGuest)

            if (!lumaGuest) {
                toast({
                    title: "Guest not found",
                    description: "This email is not registered in the event.",
                    variant: "destructive",
                })
                return
            }

            // Check scan history
            const existingScan = await checkScanHistory(data.email)
            const currentScanCount = existingScan ? existingScan.scanCount : 0
            const remainingDrinks = 3 - currentScanCount

            if (currentScanCount >= 3) {
                toast({
                    title: "No drinks remaining",
                    description: "This guest has already redeemed all 3 drinks.",
                    variant: "destructive",
                })
                setScanRecord(existingScan)
                return
            }

            // Save the scan record
            const newScanCount = currentScanCount + 1
            const newRemainingDrinks = remainingDrinks - 1
            const savedRecord = await saveScanRecord(data, lumaGuest, newScanCount, newRemainingDrinks)
            setScanRecord(savedRecord)

            // Update scan history
            setScanHistory(prev => [savedRecord, ...prev.slice(0, 9)]) // Keep last 10 scans

            // Update today's scan count
            setTodayScans(prev => prev + 1)

            // Play success sound
            if (audio) {
                audio.play().catch(console.error)
            }

            toast({
                title: "Drink redeemed successfully",
                description: `${lumaGuest?.guest.name || data.email} - ${newRemainingDrinks} drinks remaining`,
                variant: "default",
            })

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
        setScannedData(null)
        setLumaData(null)
        setScanRecord(null)
    }

    const loadRecentScans = async () => {
        try {
            const scansQuery = query(collection(db, "drinksScans"))
            const scansSnapshot = await getDocs(scansQuery)

            const scans = scansSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord))
                .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
                .slice(0, 10)

            setScanHistory(scans)

            // Calculate today's scans
            const today = new Date().toISOString().slice(0, 10)
            const todayScansCount = scansSnapshot.docs.filter(doc => {
                const scanDate = new Date(doc.data().scannedAt).toISOString().slice(0, 10)
                return scanDate === today
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
                    <h1 className="text-3xl font-bold text-gray-900">POS - Drinks Redemption</h1>
                    <p className="text-gray-600 mt-2">Scan QR codes to redeem drinks (3 per guest)</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{todayScans}</p>
                                <p className="text-sm text-gray-600">Today's Drinks</p>
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
                                <p className="text-2xl font-bold text-orange-600">{scanHistory.length}</p>
                                <p className="text-sm text-gray-600">Total Recent</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                            {isProcessing ? "Processing..." : "Start Scanning"}
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
                                    <h3 className="font-semibold text-sm text-gray-600">Drinks Status</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={scanRecord.lumaVerified ? "default" : "secondary"}>
                                            {scanRecord.lumaVerified ? "Luma Verified" : "Not in Luma"}
                                        </Badge>
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Coffee className="h-3 w-3" />
                                            {scanRecord.remainingDrinks} remaining
                                        </Badge>
                                        {scannedData?.lumaUrl && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Lu.ma Check-in
                                            </Badge>
                                        )}
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

                                    {/* Drinks Remaining Display */}
                                    <div className={`mt-3 p-3 rounded-lg border ${scanRecord.remainingDrinks > 0
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
                                        <p className="text-sm mt-1">
                                            {scanRecord.remainingDrinks > 0
                                                ? `This guest can redeem ${scanRecord.remainingDrinks} more drinks.`
                                                : 'This guest has used all their drink allocations.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="font-semibold text-sm text-gray-600">Scan Time</h3>
                                <p className="text-sm">{new Date(scanRecord.scannedAt).toLocaleString()}</p>
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
                            <CardTitle>Recent Drinks Redemptions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {scanHistory.map((scan) => (
                                    <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{scan.attendeeName}</p>
                                            <p className="text-sm text-gray-500">{scan.email}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(scan.scannedAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {scan.lumaVerified ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                <Coffee className="h-3 w-3" />
                                                {scan.remainingDrinks}
                                            </Badge>
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