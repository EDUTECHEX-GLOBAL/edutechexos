'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Camera } from 'lucide-react';

interface VideoCallModalProps {
  channelName: string;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function VideoCallModal({ channelName, onClose }: VideoCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) setCameraPermissionDenied(true);
      }
    })();

    // Start timer
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    return () => {
      cancelled = true;
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopStream]);

  const handleToggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !micEnabled;
    });
    setMicEnabled((v) => !v);
  };

  const handleToggleCamera = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !cameraEnabled;
    });
    setCameraEnabled((v) => !v);
  };

  const handleEndCall = () => {
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-900">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">#{channelName}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200">
            {formatDuration(duration)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Users size={16} strokeWidth={2} />
          <span className="text-xs font-medium text-slate-400">1 participant</span>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-900">
        {cameraPermissionDenied ? (
          /* Permission denied placeholder */
          <div className="flex flex-col items-center justify-center gap-5 text-center px-8">
            <div className="h-24 w-24 rounded-3xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Camera size={40} className="text-slate-500" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-base font-bold text-slate-300">Camera access denied</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-xs">
                Allow camera and microphone access in your browser settings to start the video
                call.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          /* Local video */
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraEnabled ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Camera off overlay */}
        {!cameraPermissionDenied && !cameraEnabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-black text-white">You</span>
            </div>
            <p className="text-sm font-medium text-slate-400">Camera is off</p>
          </div>
        )}

        {/* Waiting message */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 whitespace-nowrap">
          <p className="text-xs font-semibold text-slate-300">Waiting for others to join…</p>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-4 py-6 bg-slate-950/60 backdrop-blur-sm flex-shrink-0">
        {/* Mic toggle */}
        <button
          onClick={handleToggleMic}
          title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-white/30 ${
            micEnabled
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 ring-1 ring-red-500/50'
          }`}
        >
          {micEnabled ? <Mic size={22} strokeWidth={2} /> : <MicOff size={22} strokeWidth={2} />}
        </button>

        {/* End call */}
        <button
          onClick={handleEndCall}
          title="End call"
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 flex items-center justify-center transition-all shadow-xl shadow-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-400/50"
        >
          <PhoneOff size={24} className="text-white" strokeWidth={2.5} />
        </button>

        {/* Camera toggle */}
        <button
          onClick={handleToggleCamera}
          title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          disabled={cameraPermissionDenied}
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-40 disabled:cursor-not-allowed ${
            cameraEnabled
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 ring-1 ring-red-500/50'
          }`}
        >
          {cameraEnabled ? (
            <Video size={22} strokeWidth={2} />
          ) : (
            <VideoOff size={22} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
