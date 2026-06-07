'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Settings,
  Monitor, Users, Wifi, ChevronRight, X, AlertCircle,
  Loader2, CheckCircle2,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   StartMeetCard
   Pre-call lobby that appears before joining/starting a meeting.
   Shows: camera preview · mic/camera toggles · meeting selector · participants

   Usage:
     <StartMeetCard
       channelName="general"
       onJoinGoogleMeet={() => window.open(meetLink, '_blank')}
       onStartVideoCall={() => setVideoCallOpen(true)}
       onClose={() => setStartMeetOpen(false)}
       currentUserName="Aditya"
       participants={[{ name:'Ram', initials:'RK', color:'#7c3aed' }]}
     />
───────────────────────────────────────────────────────────────────────────── */

export interface MeetParticipant {
  name: string;
  initials: string;
  color: string;
}

interface StartMeetCardProps {
  channelName: string;
  onJoinGoogleMeet?: () => void;
  onStartVideoCall?: () => void;
  onClose: () => void;
  currentUserName?: string;
  currentUserInitials?: string;
  meetLink?: string | null;
  participants?: MeetParticipant[];
}

/* ── Utility ────────────────────────────────────────────────────────────────── */
function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Volume-level visualiser ─────────────────────────────────────────────── */
function MicLevelBar({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !active) { setLevel(0); return; }
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setLevel(Math.min(100, avg * 2.5));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* noop */ }
    return () => {
      cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {/* noop */});
    };
  }, [stream, active]);

  const bars = 12;
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i / bars) * 100;
        const lit = active && level > threshold;
        return (
          <div key={i} style={{
            width: 3, borderRadius: 2,
            height: 6 + (i % 3) * 4,
            background: lit
              ? `hsl(${160 - i * 6}, 90%, ${55 - i * 1.5}%)`
              : 'rgba(255,255,255,0.10)',
            transition: 'background 0.08s ease',
          }} />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function StartMeetCard({
  channelName,
  onJoinGoogleMeet,
  onStartVideoCall,
  onClose,
  currentUserName = 'You',
  currentUserInitials,
  meetLink,
  participants = [],
}: StartMeetCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [camDenied, setCamDenied] = useState(false);
  const [camLoading, setCamLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [deviceList, setDeviceList] = useState<{ mic: string; cam: string }>({ mic: 'Default mic', cam: 'Default camera' });
  const [showSettings, setShowSettings] = useState(false);
  const [joining, setJoining] = useState<'google' | 'internal' | null>(null);

  const userInitials = currentUserInitials || initials(currentUserName);

  /* ── Acquire camera + microphone ───────────────────────────────────────── */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCamLoading(true);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Label devices
        const devs = await navigator.mediaDevices.enumerateDevices();
        const mic = devs.find((d) => d.kind === 'audioinput')?.label || 'Default mic';
        const cam = devs.find((d) => d.kind === 'videoinput')?.label || 'Default camera';
        if (!cancelled) setDeviceList({ mic, cam });
      } catch {
        if (!cancelled) setCamDenied(true);
      } finally {
        if (!cancelled) setCamLoading(false);
      }
    })();

    const timer = setInterval(() => setDuration((d) => d + 1), 1000);

    return () => {
      cancelled = true;
      stopStream();
      clearInterval(timer);
    };
  }, [stopStream]);

  /* ── Toggle helpers ─────────────────────────────────────────────────────── */
  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !micOn; });
    setMicOn((v) => !v);
  };
  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !camOn; });
    setCamOn((v) => !v);
  };

  /* ── Join handlers ──────────────────────────────────────────────────────── */
  const handleGoogleMeet = () => {
    setJoining('google');
    setTimeout(() => {
      onJoinGoogleMeet?.();
      onClose();
    }, 900);
  };
  const handleVideoCall = () => {
    setJoining('internal');
    setTimeout(() => {
      onStartVideoCall?.();
      onClose();
    }, 700);
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────────*/
  return (
    <>
      {/* ── Global keyframes ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes sm-fadeIn   { from{opacity:0}to{opacity:1} }
        @keyframes sm-slideUp  { from{opacity:0;transform:translateY(32px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes sm-pulse    { 0%,100%{opacity:1}50%{opacity:.45} }
        @keyframes sm-orbFloat { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
        @keyframes sm-scan     { 0%{top:0%;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0} }
        @keyframes sm-ripple   { 0%{transform:scale(.8);opacity:.7}100%{transform:scale(2.2);opacity:0} }
        @keyframes sm-shimmer  { 0%{background-position:-400px 0}100%{background-position:400px 0} }

        .sm-backdrop {
          animation: sm-fadeIn .22s ease both;
        }
        .sm-card {
          animation: sm-slideUp .38s cubic-bezier(.19,1,.22,1) both;
        }
        .sm-cam-label {
          background: linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0) 100%);
          background-size: 400px 100%;
          animation: sm-shimmer 2.4s ease infinite;
        }

        /* Ripple on recording dot */
        .sm-rec-ring {
          position:absolute;inset:-4px;border-radius:50%;
          border:1.5px solid rgba(239,68,68,0.6);
          animation:sm-ripple 1.8s ease-out infinite;
        }
        .sm-btn-glow:hover {
          box-shadow: 0 0 22px rgba(0,212,255,0.30), 0 4px 16px rgba(0,0,0,0.35);
        }
        .sm-btn-red:hover {
          box-shadow: 0 0 22px rgba(239,68,68,0.35), 0 4px 12px rgba(0,0,0,0.3);
        }
        .sm-option-card:hover {
          border-color: rgba(0,212,255,0.35) !important;
          background: rgba(0,212,255,0.07) !important;
        }
        .sm-toggle:hover { opacity:.85; }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className="sm-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(4,7,18,0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* ── Card ────────────────────────────────────────────────────────── */}
        <div
          className="sm-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 840,
            background: 'linear-gradient(145deg,#0d1117 0%,#0a0f1c 60%,#0d1117 100%)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: [
              '0 0 0 1px rgba(0,212,255,0.06)',
              '0 40px 80px rgba(0,0,0,0.70)',
              '0 0 120px rgba(0,212,255,0.04)',
              'inset 0 1px 0 rgba(255,255,255,0.07)',
            ].join(', '),
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Subtle aurora glow inside card */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: [
              'radial-gradient(ellipse at 10% 0%,rgba(0,212,255,0.07) 0%,transparent 50%)',
              'radial-gradient(ellipse at 90% 100%,rgba(124,58,237,0.07) 0%,transparent 50%)',
            ].join(','),
          }} />

          {/* ── Header bar ──────────────────────────────────────────────── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            {/* Left — recording indicator + channel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 10, height: 10 }}>
                <div className="sm-rec-ring" />
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                  animation: 'sm-pulse 2s ease-in-out infinite',
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
                Meeting · #{channelName}
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: 999,
                background: 'rgba(0,212,255,0.09)',
                border: '1px solid rgba(0,212,255,0.18)',
                fontSize: 10, fontWeight: 800, letterSpacing: '.10em',
                textTransform: 'uppercase', color: '#00d4ff',
              }}>Lobby</span>
            </div>

            {/* Right — timer + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'sm-pulse 1.4s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '.06em' }}>
                  {fmt(duration)}
                </span>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.45)', transition: 'background .15s,color .15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0,
          }}>

            {/* ── LEFT: Camera preview ────────────────────────────────── */}
            <div style={{ padding: 20, borderRight: '1px solid rgba(255,255,255,0.055)' }}>

              {/* Camera viewport */}
              <div style={{
                position: 'relative', borderRadius: 14,
                overflow: 'hidden', aspectRatio: '16/9',
                background: '#080c18',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                {/* Scan line animation */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 1.5, zIndex: 9,
                  background: 'linear-gradient(90deg,transparent,rgba(0,212,255,0.5),rgba(124,58,237,0.5),transparent)',
                  animation: 'sm-scan 7s linear infinite',
                  top: 0, pointerEvents: 'none',
                }} />

                {/* Corner ornaments */}
                {[
                  { top: 8, left: 8, borderTop: '1.5px solid #00d4ff', borderLeft: '1.5px solid #00d4ff' },
                  { top: 8, right: 8, borderTop: '1.5px solid #00d4ff', borderRight: '1.5px solid #00d4ff' },
                  { bottom: 8, left: 8, borderBottom: '1.5px solid #00d4ff', borderLeft: '1.5px solid #00d4ff' },
                  { bottom: 8, right: 8, borderBottom: '1.5px solid #00d4ff', borderRight: '1.5px solid #00d4ff' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s, zIndex: 10, borderRadius: 2 }} />
                ))}

                {/* Loading state */}
                {camLoading && !camDenied && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 8,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 12, background: '#080c18',
                  }}>
                    <Loader2 size={28} style={{ color: '#00d4ff', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Starting camera…</span>
                  </div>
                )}

                {/* Denied state */}
                {camDenied && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 8,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 14, background: '#080c18', padding: 24,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: 'rgba(239,68,68,0.10)',
                      border: '1px solid rgba(239,68,68,0.20)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AlertCircle size={26} style={{ color: '#ef4444' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.80)', marginBottom: 6 }}>
                        Camera access denied
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 220 }}>
                        Allow camera &amp; mic in your browser settings, then refresh.
                      </p>
                    </div>
                  </div>
                )}

                {/* Video element */}
                <video
                  ref={videoRef}
                  autoPlay muted playsInline
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    opacity: (!camLoading && !camDenied && camOn) ? 1 : 0,
                    transition: 'opacity .3s',
                  }}
                />

                {/* Camera-off avatar overlay */}
                {!camLoading && !camDenied && !camOn && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 7,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 12, background: '#080c18',
                  }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 900, color: '#fff',
                      boxShadow: '0 0 30px rgba(0,212,255,0.25)',
                    }}>{userInitials}</div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Camera is off</p>
                  </div>
                )}

                {/* Name badge */}
                {!camLoading && !camDenied && (
                  <div style={{
                    position: 'absolute', bottom: 10, left: 10, zIndex: 10,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 7,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{currentUserName}</span>
                    {!micOn && (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <MicOff size={11} style={{ color: '#ef4444' }} />
                      </span>
                    )}
                  </div>
                )}

                {/* Camera label shimmer */}
                {!camLoading && !camDenied && camOn && (
                  <div
                    className="sm-cam-label"
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 10,
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '3px 9px', borderRadius: 6,
                      background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(6px)',
                    }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                      {deviceList.cam}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Device controls row ────────────────────────────────── */}
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                {/* Mic + level */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    className="sm-toggle"
                    onClick={toggleMic}
                    title={micOn ? 'Mute mic' : 'Unmute mic'}
                    style={{
                      width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: micOn
                        ? 'rgba(0,212,255,0.12)'
                        : 'rgba(239,68,68,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: micOn ? '#00d4ff' : '#ef4444',
                      boxShadow: micOn
                        ? '0 0 0 1px rgba(0,212,255,0.22)'
                        : '0 0 0 1px rgba(239,68,68,0.30)',
                      transition: 'all .2s',
                    }}>
                    {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 10, color: micOn ? '#00d4ff' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                      {micOn ? 'Mic on' : 'Muted'}
                    </span>
                    <MicLevelBar stream={streamRef.current} active={micOn} />
                  </div>
                </div>

                {/* Camera toggle */}
                <button
                  className="sm-toggle"
                  onClick={toggleCam}
                  disabled={camDenied}
                  title={camOn ? 'Turn off camera' : 'Turn on camera'}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none', cursor: camDenied ? 'not-allowed' : 'pointer',
                    background: camOn
                      ? 'rgba(0,212,255,0.12)'
                      : 'rgba(239,68,68,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: camOn ? '#00d4ff' : '#ef4444',
                    boxShadow: camOn
                      ? '0 0 0 1px rgba(0,212,255,0.22)'
                      : '0 0 0 1px rgba(239,68,68,0.30)',
                    transition: 'all .2s',
                    opacity: camDenied ? 0.4 : 1,
                  }}>
                  {camOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>

                {/* Screen share (coming soon) */}
                <button
                  title="Screen share (coming soon)"
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'not-allowed',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.25)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                    opacity: 0.5,
                  }}>
                  <Monitor size={18} />
                </button>

                {/* Settings toggle */}
                <button
                  className="sm-toggle"
                  onClick={() => setShowSettings((v) => !v)}
                  title="Device settings"
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: showSettings ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.55)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                    transition: 'all .2s',
                  }}>
                  <Settings size={17} />
                </button>
              </div>

              {/* Settings panel */}
              {showSettings && (
                <div style={{
                  marginTop: 12, padding: 14, borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                  animation: 'sm-fadeIn .18s ease',
                }}>
                  {([
                    { icon: <Mic size={13} />, label: 'Microphone', value: deviceList.mic },
                    { icon: <Video size={13} />, label: 'Camera', value: deviceList.cam },
                  ] as const).map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: 'rgba(0,212,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#00d4ff',
                      }}>{row.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 2 }}>{row.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.value}</div>
                      </div>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: Options ───────────────────────────────────────── */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Greeting */}
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-.02em', marginBottom: 4 }}>
                  Ready to meet?
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
                  Choose how you want to connect with #{channelName}.
                </p>
              </div>

              {/* ── Option cards ─────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Google Meet option */}
                <button
                  className="sm-option-card"
                  onClick={handleGoogleMeet}
                  disabled={!meetLink || joining !== null}
                  style={{
                    width: '100%', cursor: meetLink ? 'pointer' : 'not-allowed',
                    padding: '14px 16px', borderRadius: 14,
                    background: joining === 'google' ? 'rgba(0,212,255,0.10)' : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${joining === 'google' ? 'rgba(0,212,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'all .22s', textAlign: 'left',
                    opacity: !meetLink ? 0.45 : 1,
                  }}>
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg,#00d4ff22,#7c3aed22)',
                    border: '1px solid rgba(0,212,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {joining === 'google' ? (
                      <Loader2 size={18} style={{ color: '#00d4ff', animation: 'spin 1s linear infinite' }} />
                    ) : '📹'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 3 }}>
                      Join Google Meet
                    </div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                      {meetLink ? 'Opens your scheduled team meeting' : 'No meeting scheduled today'}
                    </div>
                  </div>
                  {meetLink && joining !== 'google' && (
                    <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.30)', flexShrink: 0 }} />
                  )}
                  {joining === 'google' && (
                    <CheckCircle2 size={16} style={{ color: '#00d4ff', flexShrink: 0 }} />
                  )}
                </button>

                {/* Internal video call option */}
                {onStartVideoCall && (
                  <button
                    className="sm-option-card"
                    onClick={handleVideoCall}
                    disabled={joining !== null}
                    style={{
                      width: '100%', cursor: 'pointer',
                      padding: '14px 16px', borderRadius: 14,
                      background: joining === 'internal' ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.035)',
                      border: `1px solid ${joining === 'internal' ? 'rgba(124,58,237,0.40)' : 'rgba(255,255,255,0.07)'}`,
                      display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'all .22s', textAlign: 'left',
                    }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg,#7c3aed22,#00ffaa18)',
                      border: '1px solid rgba(124,58,237,0.20)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                    }}>
                      {joining === 'internal' ? (
                        <Loader2 size={18} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
                      ) : '📞'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 3 }}>
                        Start Video Call
                      </div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                        In-app call with camera &amp; mic
                      </div>
                    </div>
                    {joining !== 'internal' && (
                      <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.30)', flexShrink: 0 }} />
                    )}
                    {joining === 'internal' && (
                      <CheckCircle2 size={16} style={{ color: '#7c3aed', flexShrink: 0 }} />
                    )}
                  </button>
                )}
              </div>

              {/* ── Divider ──────────────────────────────────────────── */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.055)' }} />

              {/* ── Participants in call ─────────────────────────────── */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
                  }}>In this channel</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={11} style={{ color: 'rgba(255,255,255,0.30)' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 600 }}>
                      {participants.length + 1} members
                    </span>
                  </div>
                </div>

                {/* You */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 900, color: '#fff',
                      boxShadow: '0 0 14px rgba(0,212,255,0.25)',
                    }}>{userInitials}</div>
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #0d1117' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{currentUserName}</div>
                    <div style={{ fontSize: 10, color: '#00d4ff', fontWeight: 600 }}>You</div>
                  </div>
                  {/* Mic/cam status */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span style={{ color: micOn ? '#00d4ff' : '#ef4444', opacity: micOn ? 1 : 0.7 }}>
                      {micOn ? <Mic size={13} /> : <MicOff size={13} />}
                    </span>
                    <span style={{ color: camOn ? '#00d4ff' : '#ef4444', opacity: camOn ? 1 : 0.7 }}>
                      {camOn ? <Video size={13} /> : <VideoOff size={13} />}
                    </span>
                  </div>
                </div>

                {/* Other participants */}
                {participants.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: p.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 900, color: '#fff',
                      }}>{p.initials}</div>
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #0d1117' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>Waiting in lobby</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, color: 'rgba(255,255,255,0.25)' }}>
                      <Mic size={13} /> <Video size={13} />
                    </div>
                  </div>
                ))}

                {participants.length === 0 && (
                  <div style={{
                    padding: '14px', borderRadius: 10, textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.07)',
                  }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                      No one else is here yet.<br />Be the first to join!
                    </p>
                  </div>
                )}
              </div>

              {/* ── Connection status ─────────────────────────────────── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 12px', borderRadius: 9,
                background: 'rgba(34,197,94,0.07)',
                border: '1px solid rgba(34,197,94,0.15)',
                marginTop: 'auto',
              }}>
                <Wifi size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>Connection ready</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>Your network looks good</div>
                </div>
                <div style={{
                  padding: '2px 7px', borderRadius: 999,
                  background: 'rgba(34,197,94,0.12)',
                  fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                  color: '#22c55e',
                }}>HD</div>
              </div>
            </div>
          </div>

          {/* ── Footer bar ──────────────────────────────────────────────── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255,255,255,0.055)',
            background: 'rgba(255,255,255,0.015)',
          }}>
            <button
              onClick={onClose}
              className="sm-btn-red"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.22)',
                color: '#ef4444', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'all .2s',
              }}>
              <PhoneOff size={14} /> Leave lobby
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Quick mic toggle in footer */}
              <button
                onClick={toggleMic}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: micOn ? 'rgba(0,212,255,0.08)' : 'rgba(239,68,68,0.10)',
                  border: `1px solid ${micOn ? 'rgba(0,212,255,0.18)' : 'rgba(239,68,68,0.22)'}`,
                  color: micOn ? '#00d4ff' : '#ef4444',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  transition: 'all .2s',
                }}>
                {micOn ? <Mic size={13} /> : <MicOff size={13} />}
                {micOn ? 'Mic on' : 'Muted'}
              </button>

              {/* Primary join button */}
              <button
                className="sm-btn-glow"
                onClick={meetLink ? handleGoogleMeet : handleVideoCall}
                disabled={joining !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 24px', borderRadius: 10,
                  background: joining ? 'rgba(0,212,255,0.15)' : 'linear-gradient(135deg,#00d4ff,#7c3aed)',
                  border: '1px solid rgba(0,212,255,0.30)',
                  color: joining ? '#00d4ff' : '#04080f',
                  fontSize: 13, fontWeight: 800, cursor: joining ? 'not-allowed' : 'pointer',
                  transition: 'all .22s', letterSpacing: '.01em',
                }}>
                {joining ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Joining…</>
                ) : (
                  <>
                    <Video size={14} style={{ flexShrink: 0 }} />
                    Start Meet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
