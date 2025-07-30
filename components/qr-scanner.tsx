"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Scanner } from "@yudiel/react-qr-scanner";

interface QRScannerProps {
  onScanSuccess: (scannedData: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerInstanceRef = useRef<any>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsScanning(false);
  }, []);

  const checkCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Check if we can query permissions
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return permission.state === 'granted';
      }

      // Fallback: try to get user media without showing camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Stop any existing camera first
      stopCamera();

      // Check permission first
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      setHasPermission(true);
      setIsLoading(false);
      localStorage.setItem("cameraPermission", "granted");
    } catch (error) {
      console.error("Camera start error:", error);
      setHasPermission(false);
      setIsCameraActive(false);
      setIsLoading(false);
      localStorage.setItem("cameraPermission", "denied");

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage("Camera access was denied. Please allow camera access in your browser settings.");
        } else if (error.name === 'NotFoundError') {
          setErrorMessage("No camera found on this device.");
        } else {
          setErrorMessage(`Camera error: ${error.message}`);
        }
      } else {
        setErrorMessage("Failed to start camera. Please try again.");
      }
    }
  }, [stopCamera, checkCameraPermission]);

  const handleDecode = useCallback(
    (result: string) => {
      // Prevent multiple scans
      if (isScanning) {
        return;
      }

      setIsScanning(true);

      // Stop camera immediately
      stopCamera();

      // Process the result
      try {
        onScanSuccess(result);
      } catch (error) {
        console.error("Scan processing error:", error);
      } finally {
        // Always close the scanner
        onClose();
      }
    },
    [onScanSuccess, onClose, stopCamera, isScanning]
  );

  const handleError = (error: unknown) => {
    // Don't show error if we're already processing a scan
    if (isScanning) return;

    console.error("Scanner error:", error);
    setErrorMessage(`Scanning error: ${error?.toString()}`);
  };

  const requestCameraPermission = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Clear any stored permission state first
      localStorage.removeItem("cameraPermission");
      setHasPermission(null);

      // Force a fresh permission request by trying to get user media
      console.log("Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // If we get here, permission was granted
      console.log("Camera permission granted!");
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream

      // Now start the actual camera
      await startCamera();
    } catch (error) {
      console.error("Permission request error:", error);
      setIsLoading(false);

      // If permission is denied, provide specific instructions
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage("Camera access was denied. Please click the camera icon in your browser's address bar and select 'Allow', or check your browser settings to enable camera access for this site.");
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        setErrorMessage("No camera found on this device. Please ensure you have a working camera connected.");
      } else {
        setErrorMessage("Failed to access camera. Please check your browser settings and try again.");
      }
    }
  };

  // Handle click outside to close
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

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopCamera();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, stopCamera]);

  // Initialize camera on mount
  useEffect(() => {
    const initializeCamera = async () => {
      const storedPermission = localStorage.getItem("cameraPermission");

      if (storedPermission === "granted") {
        // Auto-start camera if permission was previously granted
        await startCamera();
      } else if (storedPermission === "denied") {
        setHasPermission(false);
        setErrorMessage("Camera access was previously denied. Please click 'Retry Camera Access' to try again.");
      } else {
        // Check current permission status
        const hasPermission = await checkCameraPermission();
        if (hasPermission) {
          await startCamera();
        } else {
          setHasPermission(false);
        }
      }
    };

    initializeCamera();
  }, [startCamera, checkCameraPermission]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-base hover:text-gray-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 animate-spin" />
              <p className="text-center text-xs sm:text-sm text-gray-700">
                Requesting camera access...
              </p>
            </div>
          ) : hasPermission === null ? (
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
                <p className="text-xs text-gray-500 mb-3">
                  {errorMessage}
                </p>
              )}
              <div className="space-y-2">
                <button
                  onClick={requestCameraPermission}
                  className="w-full h-12 border-black border-2 p-2.5 bg-[#A4FCF6] hover:bg-[#81a8f8] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#D0C4fB] rounded-full font-medium text-sm sm:text-base"
                >
                  Retry Camera Access
                </button>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>If the permission prompt doesn't appear:</p>
                  <ul className="list-disc list-inside text-left">
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Select "Allow" for camera access</li>
                    <li>Refresh the page and try again</li>
                  </ul>
                </div>
              </div>
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
                    Camera ready
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

          {errorMessage && hasPermission && !isLoading && (
            <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
