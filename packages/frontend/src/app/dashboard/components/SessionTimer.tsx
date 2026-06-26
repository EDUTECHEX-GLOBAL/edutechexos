'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Clock, X } from 'lucide-react';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

function formatLoginTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function SessionTimer() {
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raw = localStorage.getItem('edutechex_session_start');
    if (!raw) {
      // Fallback for users already logged in before this feature was added
      raw = new Date().toISOString();
      localStorage.setItem('edutechex_session_start', raw);
    }
    setSessionStart(raw);
    setElapsed(Date.now() - new Date(raw).getTime());
  }, []);

  useEffect(() => {
    if (!sessionStart) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - new Date(sessionStart).getTime());
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!sessionStart) return null;

  const durationLabel = formatDuration(elapsed);

  return (
    <div className="relative w-full" ref={popupRef}>
      {/* Sidebar button — full width, matches sidebar style */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Session time"
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all"
        style={{
          background: open ? 'rgba(108,123,245,0.12)' : 'transparent',
          color: open ? '#6C7BF5' : '#555555',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <Clock size={13} strokeWidth={2.5} style={{ flexShrink: 0, color: open ? '#6C7BF5' : '#888' }} />
        <span className="min-w-0 flex-1 truncate text-left">{durationLabel}</span>
      </button>

      {/* Popup — opens upward so it doesn't go off-screen at the bottom of the sidebar */}
      {open && (
        <div
          className="absolute left-0 bottom-10 z-[400] w-64 rounded-2xl shadow-2xl"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(108,123,245,0.14)',
            boxShadow: '0 -8px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(108,123,245,0.10)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg,#6C7BF5,#5055E8)', borderRadius: '16px 16px 0 0' }}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} strokeWidth={2.5} className="text-white opacity-80" />
              <span className="text-[12px] font-black text-white tracking-wide">Session Time</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <X size={12} strokeWidth={2.5} className="text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4 flex flex-col gap-3">
            <div className="flex flex-col items-center py-3 rounded-xl" style={{ background: 'rgba(108,123,245,0.06)', border: '1px solid rgba(108,123,245,0.12)' }}>
              <span className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
                Time in session
              </span>
              <span className="text-[28px] font-black tabular-nums" style={{ color: '#4F46E5', letterSpacing: '-0.02em' }}>
                {durationLabel}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl px-3 py-2.5" style={{ background: '#F8FAFC', border: '1px solid rgba(108,123,245,0.08)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Logged in at</span>
              <span className="text-[13px] font-bold" style={{ color: '#1E293B' }}>
                {formatLoginTime(sessionStart)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
