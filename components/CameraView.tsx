import React, { useRef, useEffect, useState } from 'react';
import { CloseIcon } from './icons';

interface CameraViewProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  prompt: string;
  facingMode: 'user' | 'environment';
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose, prompt, facingMode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  return (
    <div className="fixed inset-0 bg-core-bg/90 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fadeIn">
      <div className="bg-daemon-bg w-full max-w-lg border border-accent-cyan/30 rounded-lg shadow-lg p-4 m-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-mono text-accent-cyan tracking-wider">// Visual Input Requested</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-accent-cyan transition-colors">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm font-mono text-text-secondary bg-core-bg/50 p-3 rounded-md border border-panel-border">
            <span className="text-accent-cyan/80">// Core's Request:</span> "{prompt}"
        </p>

        <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden border border-panel-border">
          {error ? (
            <div className="w-full h-full flex items-center justify-center text-red-400 font-mono text-sm p-4 text-center">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <button
          onClick={handleCapture}
          disabled={!!error}
          className="w-full bg-accent-magenta/80 hover:bg-accent-magenta text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Capture and Send to Core
        </button>
      </div>
    </div>
  );
};

export default CameraView;