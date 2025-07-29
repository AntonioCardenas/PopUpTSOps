"use client"

import { useEffect, useRef } from "react"
import QRCode from "qrcode"

interface QRCodeGeneratorProps {
  value: string
  size?: number
  className?: string
}

export function QRCodeGenerator({ value, size = 200, className }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
    }
  }, [value, size])

  return <canvas ref={canvasRef} className={className} style={{ maxWidth: "100%", height: "auto" }} />
}
