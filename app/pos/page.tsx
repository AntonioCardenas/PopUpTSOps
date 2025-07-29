"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import QRScanner from "@/components/qr-scanner"
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, AlertCircle, Camera, Info } from "lucide-react"
import { loadLumaData, findGuestByEmail, validateGuestAccess, formatGuestInfo, type LumaGuest } from "@/lib/luma-utils"

interface ScannedData {
    email: string
    attendeeId: string
    validFrom: string
    validTo: string
    mealsAllowed: number
    generatedAt: string
}

interface ScanRecord {
    id: string
    email: string
    attendeeName: string
    scannedAt: string
    lumaVerified: boolean
    mealRedeemed: boolean
    scanCount: number
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
                collection(db, "mealScans"),
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

    const saveScanRecord = async (data: ScannedData, lumaGuest: LumaGuest | null, scanCount: number) => {
        try {
            const scanRecord = {
                email: data.email.toLowerCase(),
                attendeeName: lumaGuest?.guest.name || 'Unknown',
                scannedAt: new Date().toISOString(),
                lumaVerified: !!lumaGuest,
                mealRedeemed: true,
                scanCount: scanCount,
                qrData: data
            }

            const docRef = await addDoc(collection(db, "mealScans"), scanRecord)
            return { id: docRef.id, ...scanRecord }
        } catch (error) {
            console.error('Error saving scan record:', error)
            throw error
        }
    }

    const handleScanSuccess = async (scannedText: string) => {
        setIsScanning(false)
        setIsProcessing(true)

        try {
            // Parse the scanned QR code data
            const data: ScannedData = JSON.parse(scannedText)
            setScannedData(data)

            // Check Luma data
            const lumaGuest = await checkLumaData(data.email)
            setLumaData(lumaGuest)

            // Check scan history
            const existingScan = await checkScanHistory(data.email)
            const currentScanCount = existingScan ? existingScan.scanCount : 0

            if (currentScanCount >= 3) {
                toast({
                    title: "Maximum scans reached",
                    description: "This email has already been scanned 3 times.",
                    variant: "destructive",
                })
                setScanRecord(existingScan)
                return
            }

            // Save the scan record
            const newScanCount = currentScanCount + 1
            const savedRecord = await saveScanRecord(data, lumaGuest, newScanCount)
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
                title: "Scan successful",
                description: `Meal redeemed for ${lumaGuest?.guest.name || data.email} (Scan ${newScanCount}/3)`,
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
            const scansQuery = query(collection(db, "mealScans"))
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
                    <h1 className="text-3xl font-bold text-gray-900">POS - Meal Redemption</h1>
                    <p className="text-gray-600 mt-2">Scan QR codes to redeem meals</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{todayScans}</p>
                                <p className="text-sm text-gray-600">Today's Scans</p>
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
                            className="w-full h-12 text-lg"
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
                                    <h3 className="font-semibold text-sm text-gray-600">Attendee</h3>
                                    <p className="text-lg font-medium">{scanRecord.attendeeName}</p>
                                    <p className="text-sm text-gray-500">{scanRecord.email}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-600">Scan Status</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={scanRecord.lumaVerified ? "default" : "secondary"}>
                                            {scanRecord.lumaVerified ? "Luma Verified" : "Not in Luma"}
                                        </Badge>
                                        <Badge variant="outline">
                                            Scan {scanRecord.scanCount}/3
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Luma Information */}
                            {lumaData && (
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold text-sm text-gray-600 mb-2">Luma Information</h3>
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

                                    {/* Access Validation */}
                                    {(() => {
                                        const access = validateGuestAccess(lumaData)
                                        return (
                                            <div className={`mt-3 p-3 rounded-lg border ${access.hasAccess
                                                ? 'bg-green-50 border-green-200 text-green-800'
                                                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                                }`}>
                                                <div className="flex items-center gap-2">
                                                    <Info className="h-4 w-4" />
                                                    <span className="font-medium">
                                                        {access.hasAccess ? 'Food Access Available' : 'Limited Access'}
                                                    </span>
                                                </div>
                                                <p className="text-sm mt-1">
                                                    {access.hasAccess
                                                        ? 'This guest can redeem complementary food.'
                                                        : access.reason || 'This guest has limited food access.'
                                                    }
                                                </p>
                                            </div>
                                        )
                                    })()}
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
                            <CardTitle>Recent Scans</CardTitle>
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
                                            <Badge variant="outline" className="text-xs">
                                                {scan.scanCount}/3
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