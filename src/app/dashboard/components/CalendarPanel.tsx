'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, CalendarDays, Video, Clock, Users, Link2,
  ExternalLink, ChevronRight, AlertCircle, Lock, ShieldCheck,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import type { Message } from '@/store/dashboardStore';
import { GOOGLE_MEET_LINKS } from '@/lib/meetLinks';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

interface CalendarPanelProps {
  onClose: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function parseScheduledMeet(text: string) {
  if (!text.startsWith('Meeting Scheduled:')) return null;
  const title   = text.match(/Meeting Scheduled:\s*(.+)/)?.[1]?.trim()          ?? 'Team meeting';
  const timeStr = text.match(/Time:\s*(.+)/)?.[1]?.trim()                        ?? '';
  const people  = text.match(/Mentioned people:\s*(.+)/)?.[1]?.trim()            ?? '';
  const link    = text.match(/Join Link:\s*(https?:\/\/\S+)/)?.[1]?.trim()       ?? '';
  return { title, timeStr, people, link };
}

function parseDateTime(timeStr: string): Date | null {
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d;
    // Try "YYYY-MM-DD at HH:MM" format
    const m = timeStr.match(/(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2})/);
    if (m) return new Date(`${m[1]}T${m[2]}:00`);
  } catch { /* */ }
  return null;
}

function isUpcoming(timeStr: string): boolean {
  const d = parseDateTime(timeStr);
  return d ? d.getTime() > Date.now() - 60 * 60 * 1000 : false; // within last hour or future
}

function formatFull(timeStr: string): string {
  const d = parseDateTime(timeStr);
  if (!d) return timeStr;
  return d.toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function relativeLabel(timeStr: string): string {
  const d = parseDateTime(timeStr);
  if (!d) return '';
  const diff = d.getTime() - Date.now();
  const m = Math.round(diff / 60000);
  if (m < 0)  return `${Math.abs(m)}m ago`;
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.round(h / 24)}d`;
}

// GOOGLE_MEET_LINKS imported from @/lib/meetLinks

/* ── Component ───────────────────────────────────────────────────────── */
function getCurrentUser(): { name: string; email: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('edutechex_token');
    if (!raw) return null;
    const { user } = JSON.parse(raw);
    return user ?? null;
  } catch {
    return null;
  }
}

function userCanJoinMeeting(meeting: { sender: string; people: string }, currentUser: { name: string; email: string; role: string } | null): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'Admin' || currentUser.role === 'Manager') return true;
  // Host (sender) always has access
  if (meeting.sender.toLowerCase() === currentUser.name.toLowerCase()) return true;
  // Check mentioned people list
  if (!meeting.people) return false;
  const peopleList = meeting.people.split(/[,;]/).map((p) => p.trim().toLowerCase());
  const nameMatch = peopleList.some((p) => currentUser.name.toLowerCase().includes(p) || p.includes(currentUser.name.toLowerCase()));
  const emailHandle = currentUser.email.split('@')[0].toLowerCase();
  const emailMatch = peopleList.some((p) => p.includes(emailHandle) || emailHandle.includes(p));
  return nameMatch || emailMatch;
}

export default function CalendarPanel({ onClose }: CalendarPanelProps) {
  const { messages } = useDashboardStore();
  const [gcalEmail, setGcalEmail] = useState('');
  const [gcalEmbedSrc, setGcalEmbedSrc] = useState('');
  const [showGcal, setShowGcal] = useState(false);
  const [gcalError, setGcalError] = useState('');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [grantingAccessFor, setGrantingAccessFor] = useState<string | null>(null); // meetingId
  const [grantEmail, setGrantEmail] = useState('');
  const [grantingInProgress, setGrantingInProgress] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  /* Collect all scheduled meetings from every channel */
  const allMeetings = useMemo(() => {
    const result: Array<{
      id: string; channel: string; sender: string; color: string;
      title: string; timeStr: string; people: string; link: string;
      timestamp: string;
    }> = [];
    Object.entries(messages).forEach(([channelId, msgs]) => {
      msgs.forEach((msg: Message) => {
        const parsed = parseScheduledMeet(msg.text ?? '');
        if (parsed) {
          result.push({
            id: msg.id,
            channel: channelId,
            sender: msg.sender,
            color: msg.color,
            ...parsed,
            timestamp: msg.timestamp,
          });
        }
      });
    });
    return result.sort((a, b) => {
      const da = parseDateTime(a.timeStr)?.getTime() ?? 0;
      const db = parseDateTime(b.timeStr)?.getTime() ?? 0;
      return da - db;
    });
  }, [messages]);

  const upcomingMeetings = allMeetings.filter((m) => isUpcoming(m.timeStr));
  const pastMeetings     = allMeetings.filter((m) => !isUpcoming(m.timeStr));

  function loadGcal() {
    const email = gcalEmail.trim();
    if (!email || !email.includes('@')) { setGcalError('Enter a valid Google account email.'); return; }
    const src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&ctz=Asia%2FKolkata&showNav=1&showPrint=0&showTabs=0&showCalendars=0&mode=WEEK`;
    setGcalEmbedSrc(src);
    setShowGcal(true);
    setGcalError('');
  }

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl  dark:bg-[#191E2F]"
        style={{ height: '88vh' }}
        initial={{ opacity: 0, y: 50, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360, mass: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[rgba(62,74,137,0.12)]  bg-gradient-to-r from-[#191E2F] to-[#1E2538] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <CalendarDays size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Team Calendar</h2>
              <p className="text-[10px] text-white/60">Scheduled meetings · Google Calendar embed</p>
            </div>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left: meeting list ─────────────────────────────── */}
          <div className="flex w-72 shrink-0 flex-col border-r border-[rgba(62,74,137,0.12)]  overflow-y-auto">
            {/* Fixed Google Meet links */}
            <div className="border-b border-[rgba(62,74,137,0.12)]  p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#7C859E]">Recurring meets</p>
              <div className="space-y-2">
                {GOOGLE_MEET_LINKS.map((m) => (
                  <a key={m.link} href={m.link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-[rgba(62,74,137,0.08)]  bg-white dark:bg-slate-800 px-3 py-2.5 hover:border-[#C4CAE0] hover:bg-[#1E2538] dark:hover:bg-indigo-900/20 group transition-all">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
                      <Video size={12} className="text-[#C4CAE0] dark:text-[#9BA6D3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#4A5578] group-hover:text-[#3E4A89] dark:group-hover:text-indigo-300 transition-colors">{m.label}</p>
                      <p className="text-[10px] text-[#7C859E]">{m.days}</p>
                    </div>
                    <ExternalLink size={11} className="shrink-0 text-[#9BA6D3] group-hover:text-[#9BA6D3] transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Upcoming scheduled */}
            <div className="flex-1 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#7C859E]">
                Upcoming ({upcomingMeetings.length})
              </p>
              {upcomingMeetings.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CalendarDays size={28} className="text-slate-200 dark:text-[#4A5578]" />
                  <p className="text-xs text-[#7C859E] leading-relaxed">No upcoming meetings scheduled.<br />Use Schedule Meet in the chat to add one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingMeetings.map((m) => {
                    const canJoin = userCanJoinMeeting(m, currentUser);
                    const isHost = currentUser && m.sender.toLowerCase() === currentUser.name.toLowerCase();
                    return (
                      <div key={m.id}
                        className={`rounded-xl border p-3 ${canJoin ? 'border-green-100 bg-green-50 dark:bg-indigo-900/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/10'}`}>
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${canJoin ? 'bg-[#C4CAE0] animate-pulse' : 'bg-amber-400'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-[#1E2636] leading-snug">{m.title}</p>
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-[#7C859E]">
                              <Clock size={9} /> {formatFull(m.timeStr)}
                            </div>
                            {m.people && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#4A5578] dark:text-[#9BA6D3]">
                                <Users size={12} className="shrink-0 text-[#9BA6D3]" /> {m.people}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <span className="rounded-full bg-indigo-200 dark:bg-indigo-800 px-2 py-0.5 text-[9px] font-black text-[#3E4A89] dark:text-indigo-300">
                                {relativeLabel(m.timeStr)}
                              </span>
                              {canJoin ? (
                                m.link && (
                                  <a href={m.link} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:text-green-900 transition-colors">
                                    Join <ChevronRight size={10} />
                                  </a>
                                )
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                                  <Lock size={9} /> Meeting in progress
                                </span>
                              )}
                            </div>
                            {/* Host can grant access to others */}
                            {isHost && (
                              <div className="mt-2">
                                {grantingAccessFor === m.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="email"
                                      value={grantEmail}
                                      onChange={(e) => setGrantEmail(e.target.value)}
                                      placeholder="email to grant access"
                                      className="flex-1 rounded border border-indigo-200 bg-white px-2 py-1 text-[10px] outline-none focus:border-indigo-400"
                                    />
                                    <button
                                      disabled={grantingInProgress}
                                      onClick={async () => {
                                        if (!grantEmail.trim()) return;
                                        setGrantingInProgress(true);
                                        try {
                                          const token = JSON.parse(localStorage.getItem('edutechex_token') || '{}')?.token;
                                          await fetch(`${API_BASE}/api/meeting-access/${m.id}/grant`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ email: grantEmail.trim() }),
                                          });
                                          setGrantEmail('');
                                          setGrantingAccessFor(null);
                                        } finally {
                                          setGrantingInProgress(false);
                                        }
                                      }}
                                      className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                      Grant
                                    </button>
                                    <button onClick={() => setGrantingAccessFor(null)} className="text-[#7C859E] hover:text-red-500">
                                      <X size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setGrantingAccessFor(m.id)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                                  >
                                    <ShieldCheck size={9} /> Grant access
                                  </button>
                                )}
                              </div>
                            )}
                            {/* Non-host, no access: show who to contact */}
                            {!canJoin && !isHost && (
                              <p className="mt-1 text-[10px] text-amber-600">
                                Contact <strong>{m.sender}</strong> to request access.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {pastMeetings.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#9BA6D3] dark:text-[#4A5578]">Past ({pastMeetings.length})</p>
                  <div className="space-y-1.5">
                    {pastMeetings.slice(0, 5).map((m) => (
                      <div key={m.id}
                        className="rounded-lg border border-[rgba(62,74,137,0.08)] dark:border-[rgba(62,74,137,0.15)] bg-[#FAF8F5] dark:bg-slate-800/30 px-3 py-2 opacity-60">
                        <p className="text-xs font-semibold text-[#4A5578] dark:text-[#7C859E] truncate">{m.title}</p>
                        <p className="text-[10px] text-[#7C859E]">{formatFull(m.timeStr)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Google Calendar embed ───────────────────── */}
          <div className="flex flex-1 min-h-0 flex-col">
            {!showGcal ? (
              /* Connect prompt */
              <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-indigo-900/30 dark:to-blue-900/20">
                  {/* Google Calendar logo colours */}
                  <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
                    <rect x="3" y="3" width="18" height="5" rx="2" fill="#4285f4"/>
                    <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1a1a1a">31</text>
                    <circle cx="8" cy="5.5" r="1.5" fill="#fff"/>
                    <circle cx="16" cy="5.5" r="1.5" fill="#fff"/>
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-[#1E2636]">Google Calendar</h3>
                  <p className="mt-1 max-w-sm text-sm text-[#7C859E] dark:text-[#7C859E] leading-relaxed">
                    Enter your Google account email to embed your personal calendar here — no sign-in required for public calendars.
                  </p>
                </div>

                <div className="flex w-full max-w-sm flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 px-3 py-2.5">
                    <Link2 size={14} className="shrink-0 text-[#7C859E]" />
                    <input
                      type="email"
                      value={gcalEmail}
                      onChange={(e) => { setGcalEmail(e.target.value); setGcalError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && loadGcal()}
                      placeholder="you@gmail.com"
                      className="flex-1 bg-transparent text-sm font-semibold text-[#1E2636] placeholder-slate-400 outline-none"
                    />
                  </div>
                  {gcalError && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
                      <AlertCircle size={12} /> {gcalError}
                    </div>
                  )}
                  <button onClick={loadGcal}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 transition-colors">
                    <CalendarDays size={15} /> Embed My Calendar
                  </button>
                  <p className="text-center text-[11px] text-[#7C859E] leading-relaxed">
                    💡 Your calendar must be set to <strong>public</strong> in Google Calendar settings for this to work.
                  </p>
                </div>

                <a href="https://calendar.google.com" target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  Open Google Calendar <ExternalLink size={13} />
                </a>
              </div>
            ) : (
              /* iframe embed */
              <div className="relative flex-1 min-h-0">
                <div className="absolute top-3 right-3 z-10">
                  <button onClick={() => { setShowGcal(false); setGcalEmbedSrc(''); setGcalEmail(''); }}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(62,74,137,0.12)] bg-white px-3 py-1.5 text-xs font-bold text-[#4A5578] shadow-sm hover:bg-[rgba(62,74,137,0.06)] transition-colors">
                    <X size={11} /> Disconnect
                  </button>
                </div>
                <iframe
                  key={gcalEmbedSrc}
                  src={gcalEmbedSrc}
                  title="Google Calendar"
                  className="h-full w-full border-0"
                  frameBorder="0"
                  scrolling="no"
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}





