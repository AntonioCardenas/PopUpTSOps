"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { QRCodeGenerator } from "./qr-code-generator"
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Calendar } from "lucide-react"

interface QRPayload {
  email: string
  attendeeId: string
  validFrom: string
  validTo: string
  generatedAt: string
  drinksAllowed?: number
}

interface Attendee {
  id: string
  email: string
  fullName: string
  category: string
  mealEntitlements: MealEntitlement[]
  qrRedeemed: boolean
}

interface MealEntitlement {
  id: string
  mealType: string
  validFrom: string
  validTo: string
  claimed: boolean
  claimedAt?: string
}



export function QRRedemption() {
  const [email, setEmail] = useState("")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchingEmail, setIsSearchingEmail] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [attendeeInfo, setAttendeeInfo] = useState<any | null>(null)
  // Computed values
  const buttonText = qrCodeDataUrl ? "Use Another Email" : "Check DrinksEntitlements"
  const showForm = !qrCodeDataUrl

  const isValidEmail = useCallback((email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }, [])

  const checkAttendeeEligibility = async (email: string) => {
    const usersQuery = query(collection(db, "ethpartyparticipants"), where("email", "==", email))
    const usersSnapshot = await getDocs(usersQuery)
    if (usersSnapshot.empty) {
      return { error: "Email not found in our database." }
    }
    const attendeeDoc = usersSnapshot.docs[0]
    const attendeeData = attendeeDoc.data()
    if (!attendeeData.role) {
      return { error: "This email does not have a role assigned." }
    }
    return { attendee: { ...attendeeData, id: attendeeDoc.id } }
  }

  const onEmailInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim().toLowerCase()
    setEmail(value)
    setEmailTouched(true)
    setError(null)
    setAttendeeInfo(null)
  }

  const clearForm = () => {
    setEmail("")
    setQrCodeDataUrl(null)
    setError(null)
    setRedeemMsg(null)
    setIsLoading(false)
    setIsSearchingEmail(false)
    setEmailTouched(false)
    setAttendeeInfo(null)
  }

  const handleGenerateQR = async (attendee: any) => {
    // California time
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))
    const qrPayload: QRPayload = {
      email: attendee.email,
      attendeeId: attendee.id,
      validFrom: attendee.validFrom,
      validTo: attendee.validTo,
      drinksAllowed: attendee.drinksAllowed || 3,
      generatedAt: now.toISOString(),
    }
    setQrCodeDataUrl(JSON.stringify(qrPayload))
    setRedeemMsg("Show this QR code to an admin or volunteer to redeem your drinks.")
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (qrCodeDataUrl) {
      clearForm()
      return
    }
    setError(null)
    setQrCodeDataUrl(null)
    setRedeemMsg(null)
    setIsLoading(true)
    setIsSearchingEmail(true)
    setEmailTouched(true)
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Please enter your email.")
      setIsLoading(false)
      setIsSearchingEmail(false)
      return
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.")
      setIsLoading(false)
      setIsSearchingEmail(false)
      return
    }
    try {
      const result = await checkAttendeeEligibility(trimmedEmail)
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        setIsSearchingEmail(false)
        return
      }
      setAttendeeInfo(result.attendee)
      setIsSearchingEmail(false)
      await handleGenerateQR(result.attendee)
    } catch (err) {
      setError("Error checking eligibility. Please try again.")
    } finally {
      setIsLoading(false)
      setIsSearchingEmail(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!showForm && qrCodeDataUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Your Drinks QR Code</CardTitle>
            <p className="text-sm text-muted-foreground">Show this code to an admin or volunteer to redeem your drinks</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <QRCodeGenerator value={qrCodeDataUrl} size={200} />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">{attendeeInfo?.fullName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              {redeemMsg && <p className="text-sm text-green-700">{redeemMsg}</p>}
              <p className="text-xs text-muted-foreground">This QR code is valid for one-time use</p>
            </div>
            <Button onClick={onSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {buttonText}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-4">Redeem Your Drinks</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Enter your email:
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={onEmailInput}
                name="email"
                required
                className={`text-center ${emailTouched && !isValidEmail(email) ? "border-red-500" : ""}`}
                placeholder="you@email.com"
                autoComplete="email"
              />
              <div className="text-xs text-gray-600">
                We'll check your drinks entitlements for today.
              </div>
              {emailTouched && !isValidEmail(email) && (
                <div className="text-sm text-red-600">Please enter a valid email address.</div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!email || !isValidEmail(email) || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Checking...
                </span>
              ) : (
                buttonText
              )}
            </Button>
          </form>

          {error && <div className="mt-2 text-sm text-red-600 text-center">{error}</div>}

          {isSearchingEmail && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Checking drinks entitlements...
            </div>
          )}

          {isLoading && !isSearchingEmail && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Generating QR code...
            </div>
          )}

          {/* Show attendee info and available drinks */}
          {attendeeInfo && (
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <h3 className="font-semibold">{attendeeInfo.fullName}</h3>
                <p className="text-sm text-muted-foreground">{attendeeInfo.email}</p>
                <Badge variant="outline" className="mt-1">Attendee</Badge>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Available Drinks:</h4>
                {attendeeInfo.drinksAllowed > 0 && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Drinks</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(attendeeInfo.validFrom)} - {formatDate(attendeeInfo.validTo)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleGenerateQR(attendeeInfo)}
                      disabled={isLoading}
                    >
                      Generate QR
                    </Button>
                  </div>
                )}
                {attendeeInfo.drinksAllowed <= 0 && (
                  <p className="text-sm text-red-600">No drinks available for this attendee.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
