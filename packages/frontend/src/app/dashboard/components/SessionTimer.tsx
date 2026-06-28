'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Clock, X, Coffee } from 'lucide-react';

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

function isLunchTime(): boolean {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = istTime.getHours(), m = istTime.getMinutes();
  const inMins = h * 60 + m;
  return inMins >= 12 * 60 + 45 && inMins < 13 * 60 + 15;
}

function isSameDayIST(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const d2 = new Date(date2.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

export default function SessionTimer() {
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState(false);
  const [onLunch, setOnLunch] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const lunchPausedRef = useRef(0);

  useEffect(() => {
    let raw = localStorage.getItem('edutechex_session_start');
    const now = new Date();
    if (raw) {
      const storedDate = new Date(raw);
      if (!isSameDayIST(storedDate, now)) {
        // Different day — fresh start
        localStorage.removeItem('edutechex_session_start');
        localStorage.removeItem('edutechex_lunch_pause_ms');
        raw = null;
      }
    }
    if (!raw) {
      raw = now.toISOString();
      localStorage.setItem('edutechex_session_start', raw);
    }
    setSessionStart(raw);
    const totalMs = Date.now() - new Date(raw).getTime();
    const lunchMs = parseInt(localStorage.getItem('edutechex_lunch_pause_ms') ?? '0', 10);
    setElapsed(totalMs - lunchMs);
  }, []);

  useEffect(() => {
    if (!sessionStart) return;
    const id = setInterval(() => {
      const now = Date.now();
      const totalMs = now - new Date(sessionStart).getTime();
      const lunchMs = parseInt(localStorage.getItem('edutechex_lunch_pause_ms') ?? '0', 10);
      if (isLunchTime()) {
        if (!lunchPausedRef.current) {
          lunchPausedRef.current = now;
          setOnLunch(true);
        }
      } else {
        if (lunchPausedRef.current) {
          const pauseDuration = now - lunchPausedRef.current;
          const newTotal = parseInt(localStorage.getItem('edutechex_lunch_pause_ms') ?? '0', 10) + pauseDuration;
          localStorage.setItem('edutechex_lunch_pause_ms', String(newTotal));
          lunchPausedRef.current = 0;
          setOnLunch(false);
        }
      }
      setElapsed(totalMs - lunchMs);
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
      <button
        onClick={() => setOpen(v => !v)}
        title={onLunch ? 'On lunch break — timer paused' : 'Session time'}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all"
        style={{
          background: open ? 'rgba(108,123,245,0.12)' : onLunch ? 'rgba(245,158,11,0.08)' : 'transparent',
          color: open ? '#6C7BF5' : onLunch ? '#D97706' : '#555555',
        }}
        onMouseEnter={e => { if (!open && !onLunch) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; }}
        onMouseLeave={e => { if (!open && !onLunch) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        {onLunch ? <Coffee size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> : <Clock size={13} strokeWidth={2.5} style={{ flexShrink: 0, color: open ? '#6C7BF5' : '#888' }} />}
        <span className="min-w-0 flex-1 truncate text-left">{onLunch ? 'Lunch break' : durationLabel}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 bottom-10 z-[400] w-64 rounded-2xl shadow-2xl"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(108,123,245,0.14)',
            boxShadow: '0 -8px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(108,123,245,0.10)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg,#6C7BF5,#5055E8)', borderRadius: '16px 16px 0 0' }}
          >
            <div className="flex items-center gap-2">
              {onLunch ? <Coffee size={14} strokeWidth={2.5} className="text-white opacity-80" /> : <Clock size={14} strokeWidth={2.5} className="text-white opacity-80" />}
              <span className="text-[12px] font-black text-white tracking-wide">{onLunch ? 'Lunch Break' : 'Session Time'}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <X size={12} strokeWidth={2.5} className="text-white" />
            </button>
          </div>

          <div className="px-4 py-4 flex flex-col gap-3">
            <div className="flex flex-col items-center py-3 rounded-xl" style={{ background: onLunch ? 'rgba(245,158,11,0.06)' : 'rgba(108,123,245,0.06)', border: `1px solid ${onLunch ? 'rgba(245,158,11,0.12)' : 'rgba(108,123,245,0.12)'}` }}>
              <span className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
                {onLunch ? 'Paused for lunch (12:45—1:15)' : 'Time in session'}
              </span>
              <span className="text-[28px] font-black tabular-nums" style={{ color: onLunch ? '#D97706' : '#4F46E5', letterSpacing: '-0.02em' }}>
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
