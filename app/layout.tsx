import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import './globals.css'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VivaCity - Longevity & Wellness",
  description: "Mobile-first food ordering app with identity verification",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {

  children: React.ReactNode
}) {
  return (
    <html lang="en"
      suppressHydrationWarning={true}
      data-qb-installed="true">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
