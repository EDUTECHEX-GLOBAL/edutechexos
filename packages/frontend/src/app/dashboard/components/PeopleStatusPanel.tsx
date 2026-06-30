'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, CalendarOff, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('edutechex_token');
    if (!raw) return null;
    return JSON.parse(raw).token;
  } catch { return null; }
}

type OnLeaveRecord = {
  email: string;
  name: string;
  startDate: string;
  endDate?: string;
  type?: string;
  duration?: string;
};

type Props = {
  onClose: () => void;
};

type ScheduledRecord = { email: string; slots: Array<{ time: string; status?: string }> };

export default function PeopleStatusPanel({ onClose }: Props) {
  const members = useDashboardStore((s) => s.members);
  const [onLeaveList, setOnLeaveList] = useState<OnLeaveRecord[]>([]);
  const [scheduledToday, setScheduledToday] = useState<ScheduledRecord[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoadingLeaves(false); return; }
    const headers = { Authorization: `Bearer ${token}` };

    async function fetchLeaves() {
      try {
        // Team-wide list of who is on leave today (works for non-admins too).
        const res = await fetch(`${API_BASE}/api/leaves/on-leave-today`, { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.onLeave)) setOnLeaveList(data.onLeave);
      } catch { /* offline */ }
      finally { setLoadingLeaves(false); }
    }

    async function fetchScheduled() {
      try {
        // Everyone's date-based availability for today (set from the calendar).
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const today = `${month}-${String(now.getDate()).padStart(2, '0')}`;
        const res = await fetch(`${API_BASE}/api/availability?month=${month}`, { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setScheduledToday(
            data.records
              .filter((r: { date?: string; slots?: unknown[] }) => r.date === today && (r.slots?.length ?? 0) > 0)
              .map((r: { adminEmail?: string; email?: string; slots: ScheduledRecord['slots'] }) => ({
                email: (r.adminEmail || r.email || '').toLowerCase(),
                slots: r.slots || [],
              })),
          );
        }
      } catch { /* offline */ }
    }

    fetchLeaves();
    fetchScheduled();
  }, []);

  // Does a set of calendar slots cover the current moment?
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const slotsCoverNow = (slots: Array<{ time: string }>) =>
    slots.some((s) => {
      if (s.time === 'all-day') return true;
      const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(s.time);
      if (!m) return false;
      const from = +m[1] * 60 + +m[2];
      const to = +m[3] * 60 + +m[4];
      return nowMin >= from && nowMin <= to;
    });

  const scheduledByEmail = new Map<string, string>();   // email -> label (all today)
  const activeNowEmails = new Set<string>();             // scheduled & covering right now
  scheduledToday.forEach((r) => {
    const label = r.slots.some((s) => s.time === 'all-day')
      ? 'All day'
      : r.slots.map((s) => s.time.replace('-', ' – ')).join(', ');
    if (!r.email) return;
    scheduledByEmail.set(r.email, label);
    if (slotsCoverNow(r.slots)) activeNowEmails.add(r.email);
  });

  const onLeaveEmails = new Set(onLeaveList.map((l) => l.email.toLowerCase()));
  // "Available now" = live toggle OR a calendar slot that covers this moment.
  const availableMembers = members.filter(
    (m) =>
      (m.isAvailable || activeNowEmails.has(m.email.toLowerCase())) &&
      !onLeaveEmails.has(m.email.toLowerCase())
  );
  // "Scheduled today" shows people set for LATER today (not already shown above).
  const scheduledLater = Array.from(scheduledByEmail.entries()).filter(
    ([email]) => !activeNowEmails.has(email) && !onLeaveEmails.has(email)
  );
  // Show every on-leave person from the API, even if they aren't in the
  // members list yet — fall back to the record's own name/email.
  const onLeaveMembers = onLeaveList.map((l) => {
    const m = members.find((mm) => mm.email.toLowerCase() === l.email.toLowerCase());
    return m ?? {
      id: l.email,
      email: l.email,
      name: l.name,
      role: '',
      initials: (l.name || l.email).split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2),
      color: '#94A3B8',
    };
  });
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16 sm:pt-24">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl border overflow-hidden"
        style={{ background: '#FFFFFF', borderColor: 'rgba(62,74,137,0.12)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #0D9488, #0891B2)' }}
        >
          <div className="flex items-center gap-2.5">
            <Users size={16} strokeWidth={2.5} className="text-white/80" />
            <div>
              <h2 className="text-sm font-black text-white tracking-wide">People Status</h2>
              <p className="text-[10px] font-bold text-teal-100/80">{todayStr}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-all"
          >
            <X size={14} strokeWidth={2.5} className="text-white" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-5">
          {/* Available Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} strokeWidth={2.5} className="text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Available Now
              </h3>
              <span className="text-[10px] font-bold text-slate-400 ml-auto">
                {availableMembers.length}
              </span>
            </div>
            {availableMembers.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">No one is currently marked available.</p>
            ) : (
              <div className="space-y-1.5">
                {availableMembers.map((m) => {
                  const schedLabel = scheduledByEmail.get(m.email.toLowerCase());
                  const viaSchedule = activeNowEmails.has(m.email.toLowerCase()) && !m.isAvailable;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                        style={{ background: m.color }}
                      >
                        {m.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{m.name}</p>
                        <p className="text-[10px] font-semibold text-slate-500 truncate">
                          {viaSchedule && schedLabel ? `Scheduled · ${schedLabel}` : m.role}
                        </p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 rounded-md px-1.5 py-0.5">
                        Available
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scheduled availability for LATER today (set from the calendar) */}
          {scheduledLater.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} strokeWidth={2.5} className="text-sky-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Scheduled Later
                </h3>
                <span className="text-[10px] font-bold text-slate-400 ml-auto">
                  {scheduledLater.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {scheduledLater.map(([email, label]) => {
                  const m = members.find((mm) => mm.email.toLowerCase() === email);
                  const name = m?.name ?? email;
                  const initials = m?.initials ?? name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
                  const color = m?.color ?? '#0EA5E9';
                  return (
                    <div
                      key={email}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                        style={{ background: color }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                        <p className="text-[10px] font-semibold text-sky-600">{label}</p>
                      </div>
                      <Clock size={13} className="shrink-0 text-sky-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* On Leave Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarOff size={14} strokeWidth={2.5} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                On Leave Today
              </h3>
              <span className="text-[10px] font-bold text-slate-400 ml-auto">
                {onLeaveMembers.length}
              </span>
            </div>
            {loadingLeaves ? (
              <p className="text-xs text-slate-400 italic px-1">Loading...</p>
            ) : onLeaveMembers.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">No one is on leave today.</p>
            ) : (
              <div className="space-y-1.5">
                {onLeaveMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                      style={{ background: m.color }}
                    >
                      {m.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{m.name}</p>
                      <p className="text-[10px] font-semibold text-slate-500">{m.role}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-100 rounded-md px-1.5 py-0.5">
                      On Leave
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
