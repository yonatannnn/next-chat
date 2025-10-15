import React, { useState, useRef, useCallback } from 'react';
import { Camera as CameraIcon, X, RotateCcw, Check } from 'lucide-react';
import { Button } from './Button';

interface CameraProps {
  onPhotoCapture: (file: File) => void;
  disabled?: boolean;
}

export const Camera: React.FC<CameraProps> = ({ onPhotoCapture, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure) {
        alert('Camera access requires HTTPS. Please use https://localhost:3000 or deploy to a secure domain.');
        setIsOpen(false);
        return;
      }

      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera by default
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      console.log('Camera access granted');
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported in this browser.';
        } else {
          errorMessage += `Error: ${error.message}`;
        }
      } else {
        errorMessage += 'An unknown error occurred.';
      }
      
      alert(errorMessage);
      setIsOpen(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    console.log('Capturing photo...');
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        console.log('Image drawn to canvas');
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
        stopCamera();
        console.log('Photo captured successfully');
      } else {
        console.error('Could not get canvas context');
      }
    } else {
      console.error('Video or canvas ref not available');
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    console.log('Confirming photo...');
    if (capturedImage && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          console.log('Photo file created:', file.name, file.size, 'bytes');
          onPhotoCapture(file);
          setIsOpen(false);
          setCapturedImage(null);
        } else {
          console.error('Failed to create blob from canvas');
        }
      }, 'image/jpeg', 0.8);
    } else {
      console.error('No captured image or canvas available');
    }
  }, [capturedImage, onPhotoCapture]);

  const openCamera = useCallback(() => {
    setIsOpen(true);
    startCamera();
  }, [startCamera]);

  const closeCamera = useCallback(() => {
    stopCamera();
    setIsOpen(false);
    setCapturedImage(null);
  }, [stopCamera]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={openCamera}
        disabled={disabled}
        className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 flex-shrink-0"
        title="Take photo"
      >
        <CameraIcon size={18} className="md:w-5 md:h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg overflow-hidden max-w-md w-full mx-4">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Take Photo</h3>
            <button
              onClick={closeCamera}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Camera/Preview */}
          <div className="relative bg-black">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
            ) : (
              <img
                src={capturedImage}
                alt="Captured photo"
                className="w-full h-64 object-cover"
              />
            )}
            
            {/* Hidden canvas for photo capture */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Camera controls overlay */}
            {!capturedImage && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                </button>
              </div>
            )}

            {/* Photo preview controls */}
            {capturedImage && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  onClick={retakePhoto}
                  className="p-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={confirmPhoto}
                  className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
                  <Check size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-4 text-center text-sm text-gray-600">
            {!capturedImage ? (
              <p>Position your camera and tap the button to take a photo</p>
            ) : (
              <p>Review your photo and confirm or retake</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
