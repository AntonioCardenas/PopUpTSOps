"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Automatically redirect to POS page
    router.push("/pos")
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center">
        <div className="animate-pulse">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">PopUpTicketsSystem</h1>
          <p className="text-gray-600 mb-4">Redirecting to POS Scanner...</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
