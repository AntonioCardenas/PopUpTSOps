"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Scanner } from "@yudiel/react-qr-scanner";

interface QRScannerProps {
  onScanSuccess: (scannedData: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  const handleDecode = useCallback(
    (result: string) => {
      onScanSuccess(result);
      onClose();
    },
    [onScanSuccess, onClose]
  );

  const handleError = (error: unknown) => {
    console.error("QR Code scanning failed:", error);
    setErrorMessage(`Scanning error: ${error?.toString()}`);
    toast({
      title: "Scanning Error",
      description: "Failed to scan QR code. Please try again.",
      variant: "destructive",
    });
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop the stream immediately
      setHasPermission(true);
      setErrorMessage(null);
      localStorage.setItem("cameraPermission", "granted");
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasPermission(false);
      localStorage.setItem("cameraPermission", "denied");
      if (error instanceof DOMException) {
        setErrorMessage(
          `Camera access error: ${error.name} - ${error.message}`
        );
      } else {
        setErrorMessage(`Unexpected error: ${JSON.stringify(error)}`);
      }
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to scan QR codes.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        scannerRef.current &&
        !scannerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const storedPermission = localStorage.getItem("cameraPermission");
    if (storedPermission === "granted") {
      setHasPermission(true);
    } else if (storedPermission === "denied") {
      setHasPermission(false);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div
        ref={scannerRef}
        className="relative w-full max-w-lg rounded-lg bg-background p-6 shadow-lg"
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="mb-4 text-lg font-semibold">Scan QR Code</h2>

        {hasPermission === null ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Camera className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-sm text-muted-foreground">
              Camera access is required to scan QR codes
            </p>
            <Button onClick={requestCameraPermission}>
              Allow Camera Access
            </Button>
          </div>
        ) : hasPermission === false ? (
          <div className="text-center">
            <p className="text-sm text-destructive mb-2">
              Camera access was denied. Please grant permission and try again.
            </p>
            {errorMessage && (
              <p className="text-xs text-muted-foreground">
                Error details: {errorMessage}
              </p>
            )}
            <Button onClick={requestCameraPermission} className="mt-4">
              Retry Camera Access
            </Button>
          </div>
        ) : (
          <div className="aspect-square w-full overflow-hidden rounded-lg">
            <Scanner
              onScan={(result) => handleDecode(result[0].rawValue)}
              onError={handleError}
              constraints={{ facingMode: "environment" }}
            />
          </div>
        )}

        {errorMessage && hasPermission && (
          <p className="mt-2 text-xs text-destructive">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
