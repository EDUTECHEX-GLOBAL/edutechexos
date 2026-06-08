'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CalendarDays, Video, Clock, Users, Link2,
  ExternalLink, AlertCircle, ShieldCheck, Check,
  ArrowRight, CalendarCheck, History,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import type { Message } from '@/store/dashboardStore';
import { GOOGLE_MEET_LINKS } from '@/lib/meetLinks';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

interface CalendarPanelProps { onClose: () => void; }

/* ── Helpers ─────────────────────────────────────────────────── */
function parseScheduledMeet(text: string) {
  if (!text.startsWith('Meeting Scheduled:')) return null;
  const title   = text.match(/Meeting Scheduled:\s*(.+)/)?.[1]?.trim()    ?? 'Team meeting';
  const timeStr = text.match(/Time:\s*(.+)/)?.[1]?.trim()                  ?? '';
  const people  = text.match(/Mentioned people:\s*(.+)/)?.[1]?.trim()      ?? '';
  const link    = text.match(/Join Link:\s*(https?:\/\/\S+)/)?.[1]?.trim() ?? '';
  return { title, timeStr, people, link };
}

function parseDateTime(timeStr: string): Date | null {
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d;
    const m = timeStr.match(/(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2})/);
    if (m) return new Date(`${m[1]}T${m[2]}:00`);
  } catch { /* */ }
  return null;
}

function isUpcoming(timeStr: string): boolean {
  const d = parseDateTime(timeStr);
  return d ? d.getTime() > Date.now() - 60 * 60 * 1000 : false;
}

function formatTime(timeStr: string): string {
  const d = parseDateTime(timeStr);
  if (!d) return timeStr;
  return d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateLabel(timeStr: string): string {
  const d = parseDateTime(timeStr);
  if (!d) return timeStr;
  return d.toLocaleString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getDateBlock(timeStr: string): { month: string; day: string } {
  const d = parseDateTime(timeStr);
  if (!d) return { month: '—', day: '—' };
  return {
    month: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
  };
}

function relativeLabel(timeStr: string): string {
  const d = parseDateTime(timeStr);
  if (!d) return '';
  const diff = d.getTime() - Date.now();
  const m = Math.round(diff / 60000);
  if (m < 0)   return `${Math.abs(m)}m ago`;
  if (m < 60)  return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24)  return `in ${h}h`;
  return `in ${Math.round(h / 24)}d`;
}

function getCurrentUser(): { name: string; email: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('edutechex_token');
    if (!raw) return null;
    const { user } = JSON.parse(raw);
    return user ?? null;
  } catch { return null; }
}

function canJoin(meeting: { sender: string; people: string }, user: { name: string; email: string; role: string } | null): boolean {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Manager') return true;
  if (meeting.sender.toLowerCase() === user.name.toLowerCase()) return true;
  if (!meeting.people) return false;
  const list = meeting.people.split(/[,;]/).map(p => p.trim().toLowerCase());
  const handle = user.email.split('@')[0].toLowerCase();
  return list.some(p => user.name.toLowerCase().includes(p) || p.includes(user.name.toLowerCase()) || p.includes(handle) || handle.includes(p));
}

function attendeeChips(people: string): string[] {
  if (!people) return [];
  return people.split(/[,;]/).map(p => p.replace(/^@/, '').trim()).filter(Boolean);
}

type Tab = 'upcoming' | 'past' | 'mycal';

/* ── Component ───────────────────────────────────────────────── */
export default function CalendarPanel({ onClose }: CalendarPanelProps) {
  const { messages } = useDashboardStore();
  const [tab, setTab]               = useState<Tab>('upcoming');
  const [gcalEmail, setGcalEmail]   = useState('');
  const [gcalSrc, setGcalSrc]       = useState('');
  const [gcalActive, setGcalActive] = useState(false);
  const [gcalError, setGcalError]   = useState('');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [grantFor, setGrantFor]     = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [granting, setGranting]     = useState(false);

  useEffect(() => { setCurrentUser(getCurrentUser()); }, []);

  const allMeetings = useMemo(() => {
    const result: Array<{
      id: string; channel: string; sender: string; color: string;
      title: string; timeStr: string; people: string; link: string; timestamp: string;
    }> = [];
    Object.entries(messages).forEach(([channelId, msgs]) => {
      (msgs as Message[]).forEach(msg => {
        const parsed = parseScheduledMeet(msg.text ?? '');
        if (parsed) result.push({ id: msg.id, channel: channelId, sender: msg.sender, color: msg.color, ...parsed, timestamp: msg.timestamp });
      });
    });
    return result.sort((a, b) => (parseDateTime(a.timeStr)?.getTime() ?? 0) - (parseDateTime(b.timeStr)?.getTime() ?? 0));
  }, [messages]);

  const upcoming = allMeetings.filter(m => isUpcoming(m.timeStr));
  const past     = allMeetings.filter(m => !isUpcoming(m.timeStr)).reverse();

  function loadGcal() {
    const email = gcalEmail.trim();
    if (!email || !email.includes('@')) { setGcalError('Enter a valid Gmail address.'); return; }
    setGcalSrc(`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&ctz=Asia%2FKolkata&showNav=1&showPrint=0&showTabs=0&showCalendars=0&mode=WEEK`);
    setGcalActive(true);
    setGcalError('');
  }

  const TABS: { id: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length, icon: <CalendarCheck size={14} /> },
    { id: 'past',     label: 'Past',     count: past.length,     icon: <History size={14} /> },
    { id: 'mycal',    label: 'My Calendar',                      icon: <CalendarDays size={14} /> },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }} onClick={onClose}
    >
      <motion.div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl"
        style={{ height: '86vh' }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.7 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.10)] bg-gradient-to-r from-[#191E2F] to-[#252D45] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <CalendarDays size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Team Calendar</h2>
              <p className="text-[10px] text-white/50">Meetings &amp; Google Calendar</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex shrink-0 gap-1 border-b border-[rgba(62,74,137,0.10)] bg-white px-4 pt-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-bold transition-all ${tab === t.id ? 'border-b-2 border-[#3E4A89] text-[#3E4A89]' : 'text-[#7C859E] hover:text-[#3E4A89]'}`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${tab === t.id ? 'bg-[#3E4A89] text-white' : 'bg-[#F0F1F7] text-[#7C859E]'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Recurring Meet Quick Links ── */}
        {(tab === 'upcoming' || tab === 'past') && (
          <div className="shrink-0 border-b border-[rgba(62,74,137,0.08)] bg-[#F5F4F0] px-4 py-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">Quick Join — Recurring Meets</p>
            <div className="flex gap-2 flex-wrap">
              {GOOGLE_MEET_LINKS.map(m => (
                <a key={m.link} href={m.link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-3 py-1.5 text-xs font-bold text-[#4A5578] shadow-sm hover:border-[#3E4A89] hover:text-[#3E4A89] hover:shadow-md transition-all group">
                  <Video size={12} className="text-[#9BA6D3] group-hover:text-[#3E4A89] transition-colors" />
                  {m.label}
                  <span className="rounded-full bg-[#F0F1F7] px-1.5 py-0.5 text-[9px] text-[#9BA6D3]">{m.days}</span>
                  <ExternalLink size={10} className="text-[#C4CAE0] group-hover:text-[#3E4A89] transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab Content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* Upcoming */}
            {tab === 'upcoming' && (
              <motion.div key="upcoming" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }} className="p-4 space-y-3">
                {upcoming.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                      <CalendarDays size={28} className="text-indigo-200" />
                    </div>
                    <div>
                      <p className="font-bold text-[#4A5578]">No upcoming meetings</p>
                      <p className="mt-1 text-xs text-[#9BA6D3]">Ask the AI assistant to schedule a meeting — it will appear here automatically.</p>
                    </div>
                  </div>
                ) : upcoming.map(m => {
                  const userCanJoin = canJoin(m, currentUser);
                  const isHost = currentUser?.name.toLowerCase() === m.sender.toLowerCase();
                  const { month, day } = getDateBlock(m.timeStr);
                  const chips = attendeeChips(m.people);
                  return (
                    <div key={m.id} className={`flex gap-4 rounded-2xl border p-4 transition-all ${userCanJoin ? 'border-emerald-100 bg-white shadow-sm' : 'border-amber-100 bg-amber-50/50'}`}>
                      {/* Date block */}
                      <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 ${userCanJoin ? 'bg-[#3E4A89]' : 'bg-amber-400'}`}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/70">{month}</span>
                        <span className="text-2xl font-black leading-none text-white">{day}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-black text-[#1E2636] leading-tight">{m.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${userCanJoin ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {relativeLabel(m.timeStr)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[#7C859E]">
                          <span className="flex items-center gap-1"><Clock size={10} />{formatDateLabel(m.timeStr)}</span>
                          <span className="font-bold text-[#4A5578]">{formatTime(m.timeStr)}</span>
                        </div>

                        <div className="mt-1 flex items-center gap-1 text-[11px] text-[#7C859E]">
                          <Users size={10} className="shrink-0" />
                          <span className="font-semibold">Host:</span>
                          <span className="font-bold text-[#4A5578]">{m.sender}</span>
                        </div>

                        {chips.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {chips.slice(0, 6).map((name, i) => (
                              <span key={i} className="rounded-full bg-[#F0F1F7] px-2 py-0.5 text-[10px] font-bold text-[#4A5578]">{name}</span>
                            ))}
                            {chips.length > 6 && (
                              <span className="rounded-full bg-[#F0F1F7] px-2 py-0.5 text-[10px] font-bold text-[#9BA6D3]">+{chips.length - 6} more</span>
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          {userCanJoin && m.link ? (
                            <a href={m.link} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-xl bg-[#3E4A89] px-4 py-1.5 text-xs font-black text-white hover:bg-[#2F3970] transition-colors">
                              <Video size={12} /> Join Meeting <ArrowRight size={11} />
                            </a>
                          ) : !userCanJoin ? (
                            <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                              Contact {m.sender} for access
                            </span>
                          ) : null}

                          {isHost && (
                            grantFor === m.id ? (
                              <div className="flex flex-1 items-center gap-1">
                                <input type="email" value={grantEmail}
                                  onChange={e => setGrantEmail(e.target.value)}
                                  placeholder="colleague@email.com"
                                  className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-[#3E4A89]"
                                />
                                <button disabled={granting} onClick={async () => {
                                  if (!grantEmail.trim()) return;
                                  setGranting(true);
                                  try {
                                    const token = JSON.parse(localStorage.getItem('edutechex_token') || '{}')?.token;
                                    await fetch(`${API_BASE}/api/meeting-access/${m.id}/grant`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ email: grantEmail.trim() }),
                                    });
                                    setGrantEmail(''); setGrantFor(null);
                                  } finally { setGranting(false); }
                                }} className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#3E4A89] text-white hover:bg-[#2F3970] disabled:opacity-50">
                                  <Check size={12} />
                                </button>
                                <button onClick={() => setGrantFor(null)} className="flex h-7 w-7 items-center justify-center rounded-xl text-[#9BA6D3] hover:bg-red-50 hover:text-red-500">
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setGrantFor(m.id)}
                                className="flex items-center gap-1 rounded-xl border border-[rgba(62,74,137,0.15)] px-3 py-1.5 text-[11px] font-bold text-[#3E4A89] hover:bg-indigo-50 transition-colors">
                                <ShieldCheck size={12} /> Grant Access
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Past */}
            {tab === 'past' && (
              <motion.div key="past" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }} className="p-4">
                {past.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <History size={28} className="text-slate-200" />
                    <p className="text-sm font-bold text-[#7C859E]">No past meetings yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {past.map(m => {
                      const { month, day } = getDateBlock(m.timeStr);
                      const chips = attendeeChips(m.people);
                      return (
                        <div key={m.id} className="flex items-center gap-3 rounded-xl border border-[rgba(62,74,137,0.07)] bg-white px-4 py-3 opacity-70 hover:opacity-100 transition-opacity">
                          <div className="flex w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F0F1F7] py-1">
                            <span className="text-[8px] font-black uppercase text-[#9BA6D3]">{month}</span>
                            <span className="text-base font-black leading-none text-[#7C859E]">{day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-black text-[#4A5578]">{m.title}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#9BA6D3]">
                              <span>{formatTime(m.timeStr)}</span>
                              {chips.length > 0 && <span>· {chips.length} attendee{chips.length !== 1 ? 's' : ''}</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-[#9BA6D3]">{m.sender}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* My Calendar */}
            {tab === 'mycal' && (
              <motion.div key="mycal" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }} className="flex h-full flex-col">
                {!gcalActive ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
                    {/* Icon */}
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100">
                      <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
                        <rect x="3" y="3" width="18" height="5" rx="2" fill="#4285f4"/>
                        <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1a1a1a">31</text>
                        <circle cx="8" cy="5.5" r="1.5" fill="#fff"/>
                        <circle cx="16" cy="5.5" r="1.5" fill="#fff"/>
                      </svg>
                    </div>

                    <div className="text-center">
                      <h3 className="text-base font-black text-[#1E2636]">View Your Google Calendar</h3>
                      <p className="mt-1 max-w-xs text-sm text-[#7C859E] leading-relaxed">
                        See your personal schedule right here — no sign-in needed.
                      </p>
                    </div>

                    {/* Steps */}
                    <div className="w-full max-w-sm rounded-2xl border border-[rgba(62,74,137,0.10)] bg-white p-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#9BA6D3]">How it works</p>
                      <div className="space-y-3">
                        {[
                          { n: '1', text: 'Open Google Calendar → Settings → your calendar → "Access permissions" → tick Make available to public' },
                          { n: '2', text: 'Come back and enter your Gmail address below' },
                        ].map(s => (
                          <div key={s.n} className="flex items-start gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3E4A89] text-[9px] font-black text-white">{s.n}</span>
                            <p className="text-[11px] leading-relaxed text-[#4A5578]">{s.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Email input */}
                    <div className="flex w-full max-w-sm flex-col gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-3 py-2.5 focus-within:border-[#3E4A89] transition-colors">
                        <Link2 size={14} className="shrink-0 text-[#9BA6D3]" />
                        <input type="email" value={gcalEmail}
                          onChange={e => { setGcalEmail(e.target.value); setGcalError(''); }}
                          onKeyDown={e => e.key === 'Enter' && loadGcal()}
                          placeholder="yourname@gmail.com"
                          className="flex-1 bg-transparent text-sm font-semibold text-[#1E2636] placeholder-slate-300 outline-none"
                        />
                      </div>
                      {gcalError && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                          <AlertCircle size={12} /> {gcalError}
                        </div>
                      )}
                      <button onClick={loadGcal}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3E4A89] text-sm font-black text-white hover:bg-[#2F3970] transition-colors">
                        <CalendarDays size={15} /> Show My Calendar
                      </button>
                    </div>

                    <a href="https://calendar.google.com" target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors">
                      Open Google Calendar <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  <div className="relative flex-1 min-h-0">
                    <div className="absolute right-3 top-3 z-10">
                      <button onClick={() => { setGcalActive(false); setGcalSrc(''); setGcalEmail(''); }}
                        className="flex items-center gap-1.5 rounded-lg border border-[rgba(62,74,137,0.12)] bg-white px-3 py-1.5 text-xs font-bold text-[#4A5578] shadow hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                        <X size={11} /> Disconnect
                      </button>
                    </div>
                    <iframe key={gcalSrc} src={gcalSrc} title="Google Calendar" className="h-full w-full border-0" />
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
