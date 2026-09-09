import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { compressImage } from '../../utils/imageCompressor';

export const CameraCaptureModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');

  // Clean stop video tracks
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start webcam
  const startCamera = async (deviceId = null) => {
    stopStream();
    setIsInitializing(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera capture is not supported by your browser.');
      }

      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Enumerate camera devices for multi-camera support (e.g. front / back)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
      } catch {
        // Enumerate fallback
      }
    } catch (err) {
      console.warn('Camera access failed:', err);
      let msg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser or select an image file to upload.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system. Please upload an image file instead.';
      } else {
        msg = err.message || 'Unable to open camera feed.';
      }
      setCameraError(msg);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(activeCameraId || null);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, activeCameraId]);

  const handleSnap = async () => {
    if (!videoRef.current || !streamRef.current) return;

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCameraError('Failed to capture photo frame.');
          return;
        }

        try {
          const compressed = await compressImage(blob, 1920, 0.85);
          onCapture(compressed);
          stopStream();
          onClose();
        } catch (compErr) {
          setCameraError('Failed to process captured image.');
        }
      }, 'image/jpeg', 0.9);
    } catch (snapErr) {
      console.error('Snap error:', snapErr);
      setCameraError('Error capturing photo.');
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-gray-900 border border-gray-700 text-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">photo_camera</span>
            <h3 className="font-bold text-sm tracking-wide">Capture Receipt Photo</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[440px] overflow-hidden">
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
              <span className="inline-block animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></span>
              <span>Starting camera...</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 text-center text-xs text-red-300 max-w-xs space-y-3">
              <span className="material-symbols-outlined text-red-400 text-[36px] block">videocam_off</span>
              <p className="leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  onClose();
                }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg text-xs cursor-pointer"
              >
                Close & Upload File
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain max-h-[440px]"
            />
          )}

          {/* Guidelines Overlay */}
          {!cameraError && !isInitializing && (
            <div className="absolute inset-6 border border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-2">
              <span className="text-[10px] text-white/70 bg-black/50 px-2 py-0.5 rounded w-fit">
                Align receipt inside frame
              </span>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gray-950 border-t border-gray-800">
          {/* Switch Camera if multi available */}
          {cameras.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                const currentIndex = cameras.findIndex((c) => c.deviceId === activeCameraId);
                const nextCamera = cameras[(currentIndex + 1) % cameras.length];
                setActiveCameraId(nextCamera.deviceId);
              }}
              title="Switch camera"
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">switch_camera</span>
            </button>
          ) : (
            <div className="w-8" />
          )}

          {/* Shutter Button */}
          <button
            type="button"
            onClick={handleSnap}
            disabled={Boolean(cameraError) || isInitializing}
            className="w-14 h-14 rounded-full bg-white hover:bg-primary text-black flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-4 border-gray-800"
            title="Take Photo"
          >
            <span className="material-symbols-outlined text-[28px]">camera</span>
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="text-xs font-semibold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
