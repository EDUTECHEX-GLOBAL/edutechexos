'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, CalendarOff, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('edutechex_token');
    if (!raw) return null;
    return JSON.parse(raw).token;
  } catch { return null; }
}

type LeaveRecord = {
  _id: string;
  email: string;
  name: string;
  startDate: string;
  endDate?: string;
  leaveType: string;
  status: string;
  category?: string;
};

function isOnLeaveToday(leave: LeaveRecord): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (!leave.endDate) return leave.startDate === today;
  return today >= leave.startDate && today <= leave.endDate;
}

type Props = {
  onClose: () => void;
};

export default function PeopleStatusPanel({ onClose }: Props) {
  const members = useDashboardStore((s) => s.members);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  useEffect(() => {
    async function fetchLeaves() {
      const token = getToken();
      if (!token) { setLoadingLeaves(false); return; }
      try {
        const res = await fetch(`${API_BASE}/api/leaves`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setLeaves(data.leaves);
      } catch { /* offline */ }
      finally { setLoadingLeaves(false); }
    }
    fetchLeaves();
  }, []);

  const availableMembers = members.filter((m) => m.isAvailable);
  const onLeaveEmails = new Set(
    leaves
      .filter((l) => l.status === 'approved' && isOnLeaveToday(l))
      .map((l) => l.email.toLowerCase())
  );
  const onLeaveMembers = members.filter((m) => onLeaveEmails.has(m.email.toLowerCase()));
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
                {availableMembers.map((m) => (
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
                      <p className="text-[10px] font-semibold text-slate-500">{m.role}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 rounded-md px-1.5 py-0.5">
                      Available
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
