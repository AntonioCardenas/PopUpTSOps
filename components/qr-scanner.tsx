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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleDecode = useCallback(
    (result: string) => {
      // Stop camera before processing result
      stopCamera();
      onScanSuccess(result);
      onClose();
    },
    [onScanSuccess, onClose]
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera(); // Stop any existing camera first

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (error) {
      console.error("Error starting camera:", error);
      setHasPermission(false);
      setIsCameraActive(false);
    }
  }, [stopCamera]);

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
      // Stop any existing camera stream first
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Store the stream reference
      streamRef.current = stream;
      setIsCameraActive(true);
      setHasPermission(true);
      setErrorMessage(null);
      localStorage.setItem("cameraPermission", "granted");

      // Stop the stream after a brief moment to test permission
      setTimeout(() => {
        if (streamRef.current === stream) {
          stopCamera();
        }
      }, 100);

    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasPermission(false);
      setIsCameraActive(false);
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
        variant: "warning",
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        scannerRef.current &&
        !scannerRef.current.contains(event.target as Node)
      ) {
        stopCamera();
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, stopCamera]);

  useEffect(() => {
    const storedPermission = localStorage.getItem("cameraPermission");
    if (storedPermission === "granted") {
      setHasPermission(true);
    } else if (storedPermission === "denied") {
      setHasPermission(false);
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Auto-start camera when permission is granted
  useEffect(() => {
    if (hasPermission === true && !isCameraActive) {
      startCamera();
    }
  }, [hasPermission, isCameraActive, startCamera]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={scannerRef}
        className="w-full max-w-sm sm:w-96 px-4 sm:px-8 py-4 bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] grid place-content-center"
      >
        <div>
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">Scan QR Code</h2>
            <button
              onClick={onClose}
              className="text-base hover:text-gray-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {hasPermission === null ? (
            <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
              <Camera className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
              <p className="text-center text-xs sm:text-sm text-gray-700">
                Camera access is required to scan QR codes
              </p>
              <button
                onClick={requestCameraPermission}
                className="h-12 sm:h-12 border-black border-2 p-2.5 bg-[#A4FCF6] hover:bg-[#81a8f8] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#D0C4fB] rounded-full font-medium text-sm sm:text-base"
              >
                Allow Camera Access
              </button>
            </div>
          ) : hasPermission === false ? (
            <div className="text-center">
              <p className="text-xs sm:text-sm text-red-600 mb-2">
                Camera access was denied. Please grant permission and try again.
              </p>
              {errorMessage && (
                <p className="text-xs text-gray-500">
                  Error details: {errorMessage}
                </p>
              )}
              <button
                onClick={requestCameraPermission}
                className="mt-4 h-12 border-black border-2 p-2.5 bg-[#A4FCF6] hover:bg-[#81a8f8] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#D0C4fB] rounded-full font-medium text-sm sm:text-base"
              >
                Retry Camera Access
              </button>
            </div>
          ) : (
            <div className="aspect-square w-full overflow-hidden rounded-lg border-2 border-black">
              {isCameraActive ? (
                <Scanner
                  onScan={(result) => handleDecode(result[0].rawValue)}
                  onError={handleError}
                  constraints={{
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <Camera className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
                  <p className="text-center text-xs sm:text-sm text-gray-700">
                    Starting camera...
                  </p>
                  <button
                    onClick={startCamera}
                    className="h-12 border-black border-2 p-2.5 bg-[#A4FCF6] hover:bg-[#81a8f8] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#D0C4fB] rounded-full font-medium text-sm sm:text-base"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMessage && hasPermission && (
            <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
