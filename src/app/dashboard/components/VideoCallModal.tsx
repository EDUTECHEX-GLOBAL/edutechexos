'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Camera,
  Monitor,
  MonitorOff,
  Wifi,
  WifiOff,
  Settings,
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  TrackLoop,
  ParticipantTile,
  useRoomContext,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

interface VideoCallModalProps {
  channelName: string;
  onClose: () => void;
  currentUserName?: string;
}

// â”€â”€ Fallback local-only call (no LiveKit credentials) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LocalOnlyCall({ channelName, onClose }: { channelName: string; onClose: () => void }) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setCameraPermissionDenied(true);
      }
    })();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      cancelled = true;
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopStream]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#191E2F]">
      <div className="flex items-center justify-between px-6 py-4 bg-[rgba(25,30,47,0.60)] backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">#{channelName}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200">{fmt(duration)}</span>
        </div>
        <div className="flex items-center gap-2 text-[#7C859E]">
          <Users size={16} />
          <span className="text-xs font-medium">1 participant</span>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#191E2F]">
        {cameraPermissionDenied ? (
          <div className="flex flex-col items-center justify-center gap-5 text-center px-8">
            <div className="h-24 w-24 rounded-3xl bg-slate-800 flex items-center justify-center border border-[rgba(62,74,137,0.15)]">
              <Camera size={40} className="text-[#7C859E]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-base font-bold text-[#9BA6D3]">Camera access denied</p>
              <p className="text-sm text-[#7C859E] mt-1 max-w-xs leading-relaxed">
                Allow camera and microphone access in your browser settings to start the video call.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-[#C4CAE0] max-w-xs">
              <strong>Tip:</strong> Add <code>LIVEKIT_API_KEY</code> and{' '}
              <code>LIVEKIT_API_SECRET</code> to enable multi-participant calls via LiveKit.
            </div>
          </div>
        ) : (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity ${cameraEnabled ? 'opacity-100' : 'opacity-0'}`}
            style={{ transform: 'scaleX(-1)' }}
          />
        )}
        {!cameraPermissionDenied && !cameraEnabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#191E2F]">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-black text-white">You</span>
            </div>
            <p className="text-sm font-medium text-[#7C859E]">Camera is off</p>
          </div>
        )}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-slate-800/80 backdrop-blur-sm border border-[rgba(62,74,137,0.15)]/50">
          <p className="text-xs font-semibold text-[#9BA6D3]">Waiting for others to join...</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 py-6 bg-[rgba(25,30,47,0.60)] backdrop-blur-sm shrink-0">
        <button
          onClick={() => {
            streamRef.current?.getAudioTracks().forEach((t) => {
              t.enabled = !micEnabled;
            });
            setMicEnabled((v) => !v);
          }}
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-lg ${micEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'}`}
        >
          {micEnabled ? <Mic size={22} strokeWidth={2} /> : <MicOff size={22} strokeWidth={2} />}
        </button>
        <button
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-xl shadow-red-900/50"
        >
          <PhoneOff size={24} className="text-white" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => {
            streamRef.current?.getVideoTracks().forEach((t) => {
              t.enabled = !cameraEnabled;
            });
            setCameraEnabled((v) => !v);
          }}
          disabled={cameraPermissionDenied}
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-40 ${cameraEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'}`}
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

// â”€â”€ LiveKit-powered multi-participant call â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LiveKitCall({
  token,
  serverUrl,
  channelName,
  onClose,
}: {
  token: string;
  serverUrl: string;
  channelName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#191E2F]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[rgba(25,30,47,0.80)] backdrop-blur-sm shrink-0 border-b border-[rgba(62,74,137,0.15)]">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">#{channelName}</span>
          <span className="rounded-full bg-[rgba(62,74,137,0.08)]0/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wide">
            LiveKit
          </span>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors"
        >
          <PhoneOff size={16} className="text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* LiveKit VideoConference "” full-featured UI with grid, controls, chat */}
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        onDisconnected={onClose}
        className="flex-1"
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// â”€â”€ Main component "” detects LiveKit credentials, falls back gracefully â”€â”€â”€â”€â”€â”€â”€â”€
export default function VideoCallModal({
  channelName,
  onClose,
  currentUserName,
}: VideoCallModalProps) {
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitError, setLiveKitError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  useEffect(() => {
    if (!serverUrl) {
      setLiveKitError(true);
      setIsConnecting(false);
      return;
    }

    const roomName = `channel-${channelName}`;
    const participantName = currentUserName || `User-${Math.floor(Math.random() * 1000)}`;

    fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.token) setLiveKitToken(data.token);
        else setLiveKitError(true);
      })
      .catch(() => setLiveKitError(true))
      .finally(() => setIsConnecting(false));
  }, [channelName, currentUserName, serverUrl]);

  if (isConnecting) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#191E2F]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-[#9BA6D3]">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (liveKitToken && serverUrl) {
    return (
      <LiveKitCall
        token={liveKitToken}
        serverUrl={serverUrl}
        channelName={channelName}
        onClose={onClose}
      />
    );
  }

  return <LocalOnlyCall channelName={channelName} onClose={onClose} />;
}
