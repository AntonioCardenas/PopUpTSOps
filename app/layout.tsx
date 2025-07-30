import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { CriticalCSS } from "@/components/critical-css"
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
  title: "Tickets POS",
  description: "Tickets POS",
  other: {
    'google-fonts': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,

  maximumScale: 5,
  userScalable: true,
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
      <head>
        {/* Preload critical resources */}
        <link rel="preload" href="/api/luma" as="fetch" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//public-api.luma.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Critical CSS */}
        <CriticalCSS />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
