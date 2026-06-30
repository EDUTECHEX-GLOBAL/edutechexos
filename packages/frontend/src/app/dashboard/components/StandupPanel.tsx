'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

interface StandupPanelProps {
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

function getToken(): string | null {
  const raw = localStorage.getItem('edutechex_token');
  if (!raw) return null;
  try { return JSON.parse(raw).token; } catch { return null; }
}

function formatTimeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m ago`;
}

export default function StandupPanel({ onClose }: StandupPanelProps) {
  const members = useDashboardStore((s) => s.members);

  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [teamReplies, setTeamReplies] = useState<Array<{
    email: string;
    yesterday: string;
    today: string;
    blockers: string;
    createdAt: string;
  }>>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const fetchTeam = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/standup/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTeamReplies(data.replies);
    } catch { /* ignore */ }
    finally { setLoadingTeam(false); }
  }, []);

  const fetchOwn = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/standup/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setYesterday(data.reply.yesterday || '');
        setToday(data.reply.today || '');
        setBlockers(data.reply.blockers || '');
        setSubmitted(true);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTeam();
    fetchOwn();
  }, [fetchTeam, fetchOwn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/standup/today`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ yesterday, today, blockers }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        fetchTeam();
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  }

  function getMemberInfo(email: string) {
    const m = members.find((mm) => mm.email.toLowerCase() === email.toLowerCase());
    return m ? { name: m.name, initials: m.initials, color: m.color } : null;
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: '#0D1025', border: '1px solid rgba(62,74,137,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(10,232,208,0.15)' }}
            >
              <Clock size={18} style={{ color: '#0AE8D0' }} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Daily Standup</h2>
              <p className="text-[11px]" style={{ color: '#8B94B0' }}>What are you working on?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: '#8B94B0' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Form ── */}
          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: '#8B94B0' }}>
                  What did you do yesterday?
                </label>
                <textarea
                  value={yesterday}
                  onChange={(e) => setYesterday(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm text-white outline-none transition-colors focus:ring-2"
                  style={{
                    background: '#1E2245',
                    borderColor: 'rgba(62,74,137,0.25)',
                    borderWidth: '1.5px',
                  }}
                  placeholder="Wrote tests for the new API..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: '#8B94B0' }}>
                  What will you do today?
                </label>
                <textarea
                  value={today}
                  onChange={(e) => setToday(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm text-white outline-none transition-colors focus:ring-2"
                  style={{
                    background: '#1E2245',
                    borderColor: 'rgba(62,74,137,0.25)',
                    borderWidth: '1.5px',
                  }}
                  placeholder="Working on the dashboard redesign..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: '#8B94B0' }}>
                  Any blockers?
                </label>
                <textarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm text-white outline-none transition-colors focus:ring-2"
                  style={{
                    background: '#1E2245',
                    borderColor: 'rgba(62,74,137,0.25)',
                    borderWidth: '1.5px',
                  }}
                  placeholder="Waiting on design review..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0AE8D0, #07C8B2)' }}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {submitting ? 'Saving...' : 'Submit Standup'}
              </button>
            </form>
          )}

          {/* ── Submitted state ── */}
          {submitted && (
            <div className="px-5 pt-4 pb-2">
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  background: 'rgba(10,232,208,0.08)',
                  border: '1px solid rgba(10,232,208,0.2)',
                }}
              >
                <CheckCircle2 size={20} style={{ color: '#0AE8D0' }} />
                <div>
                  <p className="text-sm font-bold text-white">Standup submitted for today</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs font-semibold underline underline-offset-2"
                    style={{ color: '#0AE8D0' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Team standups ── */}
          <div className="px-5 pb-5">
            <h3 className="mb-3 mt-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#8B94B0' }}>
              Team Standups Today
            </h3>
            {loadingTeam ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin" style={{ color: '#8B94B0' }} />
              </div>
            ) : teamReplies.length === 0 ? (
              <p className="py-6 text-center text-sm italic" style={{ color: '#5A6487' }}>
                No standups submitted yet today.
              </p>
            ) : (
              <div className="space-y-3">
                {teamReplies.map((reply, i) => {
                  const info = getMemberInfo(reply.email);
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-4"
                      style={{ background: '#1E2245', border: '1px solid rgba(62,74,137,0.15)' }}
                    >
                      <div className="mb-2 flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: info?.color || '#3E4A89' }}
                        >
                          {info?.initials || reply.email.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-white">
                          {info?.name || reply.email.split('@')[0]}
                        </span>
                        <span className="ml-auto text-[10px]" style={{ color: '#5A6487' }}>
                          {formatTimeAgo(reply.createdAt)}
                        </span>
                      </div>
                      {reply.yesterday && (
                        <p className="mb-1 text-[12.5px] leading-relaxed" style={{ color: '#B0B9D6' }}>
                          <span className="font-semibold" style={{ color: '#0AE8D0' }}>Yesterday:</span> {reply.yesterday}
                        </p>
                      )}
                      {reply.today && (
                        <p className="mb-1 text-[12.5px] leading-relaxed" style={{ color: '#B0B9D6' }}>
                          <span className="font-semibold" style={{ color: '#818CF8' }}>Today:</span> {reply.today}
                        </p>
                      )}
                      {reply.blockers && (
                        <p className="text-[12.5px] leading-relaxed" style={{ color: '#FCA5A5' }}>
                          <span className="font-semibold text-red-400">Blockers:</span> {reply.blockers}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
