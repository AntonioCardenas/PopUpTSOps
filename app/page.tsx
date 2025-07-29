"use client"

import { QRRedemption } from "@/components/qr-redemption"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, QrCode } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PopUpTicketsSystem</h1>
          <p className="text-gray-600">Choose your action below</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <QrCode className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <CardTitle>Generate QR Code</CardTitle>
              <p className="text-sm text-muted-foreground">
                For attendees to generate their drinks QR codes
              </p>
            </CardHeader>
            <CardContent>
              <QRRedemption />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Camera className="h-12 w-12 mx-auto text-green-600 mb-2" />
              <CardTitle>POS Scanner</CardTitle>
              <p className="text-sm text-muted-foreground">
                For staff to scan and redeem drinks QR codes
              </p>
            </CardHeader>
            <CardContent>
              <Link href="/pos" className="block">
                <Button className="btn bg-slate-600 text-white w-full h-12 text-lg ">
                  Go to POS Scanner
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
