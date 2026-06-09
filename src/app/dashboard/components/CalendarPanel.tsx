'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CalendarDays, Video, Clock, Users, Link2, ExternalLink,
  AlertCircle, ShieldCheck, Check, ArrowRight, CalendarCheck,
  History, Target, RefreshCw, Plus, Hash,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import type { Message } from '@/store/dashboardStore';
import { GOOGLE_MEET_LINKS } from '@/lib/meetLinks';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
// Per-user keys so each team member's calendar and deadline cache are isolated.
function gcalEmailKey(userEmail: string)  { return `edutechex_gcal_email_${userEmail}`; }
function deadlinesKey(userEmail: string)  { return `edutechex_deadlines_v2_${userEmail}`; }
const CACHE_TTL        = 24 * 60 * 60 * 1000;

interface CalendarPanelProps { onClose: () => void; }

interface DeadlineRecord {
  id: string; task: string; dateMs: number | null; rawDate: string;
  sender: string; channel: string; snippet: string;
}

/* ─────────────── Date extraction ────────────────────────────── */
function extractDate(text: string): { date: Date | null; raw: string } {
  const now = new Date();
  const MO = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';

  let m = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) { const d = new Date(m[1]); if (!isNaN(d.getTime())) return { date: d, raw: m[1] }; }

  m = text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MO})`, 'i'));
  if (m) { const d = new Date(`${m[2]} ${m[1]} ${now.getFullYear()}`); if (!isNaN(d.getTime())) return { date: d, raw: m[0] }; }

  m = text.match(new RegExp(`(${MO})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i'));
  if (m) { const d = new Date(`${m[1]} ${m[2]} ${now.getFullYear()}`); if (!isNaN(d.getTime())) return { date: d, raw: m[0] }; }

  if (/\btomorrow\b/i.test(text))  { const d = new Date(now); d.setDate(d.getDate() + 1); return { date: d, raw: 'tomorrow' }; }
  if (/\btoday\b/i.test(text))     return { date: new Date(now), raw: 'today' };
  if (/\btonight\b/i.test(text))   { const d = new Date(now); d.setHours(20, 0, 0, 0); return { date: d, raw: 'tonight' }; }

  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayRe = DAYS.join('|');

  m = text.match(new RegExp(`\\bnext\\s+(${dayRe})\\b`, 'i'));
  if (m) {
    const target = DAYS.indexOf(m[1].toLowerCase());
    const d = new Date(now); let diff = target - d.getDay();
    if (diff <= 0) diff += 7; d.setDate(d.getDate() + diff + 7); return { date: d, raw: m[0] };
  }
  m = text.match(new RegExp(`\\b(?:this\\s+)?(${dayRe})\\b`, 'i'));
  if (m) {
    const target = DAYS.indexOf(m[1].toLowerCase());
    const d = new Date(now); let diff = target - d.getDay();
    if (diff <= 0) diff += 7; d.setDate(d.getDate() + diff); return { date: d, raw: m[0] };
  }
  if (/\bend\s+of\s+(?:this\s+)?week\b/i.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); return { date: d, raw: 'end of week' };
  }
  if (/\bend\s+of\s+(?:this\s+)?month\b/i.test(text)) {
    return { date: new Date(now.getFullYear(), now.getMonth() + 1, 0), raw: 'end of month' };
  }
  m = text.match(/\bin\s+(\d+)\s+days?\b/i);
  if (m) { const d = new Date(now); d.setDate(d.getDate() + parseInt(m[1])); return { date: d, raw: m[0] }; }
  m = text.match(/\bin\s+(\d+)\s+weeks?\b/i);
  if (m) { const d = new Date(now); d.setDate(d.getDate() + parseInt(m[1]) * 7); return { date: d, raw: m[0] }; }

  return { date: null, raw: '' };
}

const DEADLINE_TRIGGERS = [
  /\bdeadline\b/i,
  /\bdue\s+(?:by|date|on)\b/i,
  /\bsubmit(?:ted)?\s+by\b/i,
  /\bcomplete(?:d)?\s+by\b/i,
  /\bfinish(?:ed)?\s+by\b/i,
  /\bdeliver(?:ed)?\s+by\b/i,
  /\bmust\s+(?:be\s+)?done\s+by\b/i,
  /\bneeds?\s+to\s+be\s+(?:done|submitted|completed|finished)\b/i,
  /\bby\s+(?:eod|end\s+of\s+(?:day|week|month)|tomorrow|tonight)\b/i,
  /\btarget\s+date\b/i,
  /\baction\s+item\b/i,
  /\btask[:\s]+.+\bby\b/i,
];

function isDeadlineMessage(text: string): boolean {
  if (!text || text.startsWith('Meeting Scheduled:') || text.length < 12) return false;
  return DEADLINE_TRIGGERS.some(re => re.test(text));
}

function extractTaskTitle(text: string): string {
  let t = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const m = t.match(/(?:deadline[:\s]+|due\s+(?:by\s+|date[:\s]+)|submit\s+by[:\s]+|complete\s+by[:\s]+|action\s+item[:\s]+)(.{4,80})/i);
  if (m) t = m[1].trim();
  return t.length > 80 ? t.slice(0, 77) + '…' : t || 'Task';
}

function scanMessages(messages: Record<string, Message[]>): DeadlineRecord[] {
  const out: DeadlineRecord[] = [];
  const seen = new Set<string>();
  Object.entries(messages).forEach(([ch, msgs]) => {
    if (ch.startsWith('dm-')) return;
    (msgs as Message[]).forEach(msg => {
      if (msg.isDeleted) return;
      const text = msg.text ?? '';
      if (!isDeadlineMessage(text)) return;
      const key = `${ch}:${text.slice(0, 60)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const { date, raw } = extractDate(text);
      out.push({
        id: msg.id,
        task: extractTaskTitle(text),
        dateMs: date?.getTime() ?? null,
        rawDate: raw,
        sender: msg.sender,
        channel: ch,
        snippet: text.length > 130 ? text.slice(0, 127) + '…' : text,
      });
    });
  });
  return out.sort((a, b) => {
    if (a.dateMs && b.dateMs) return a.dateMs - b.dateMs;
    if (a.dateMs) return -1; if (b.dateMs) return 1; return 0;
  });
}

/* ─────────────── Meeting helpers ────────────────────────────── */
function parseScheduledMeet(text: string) {
  if (!text.startsWith('Meeting Scheduled:')) return null;
  return {
    title:   text.match(/Meeting Scheduled:\s*(.+)/)?.[1]?.trim()    ?? 'Team meeting',
    timeStr: text.match(/Time:\s*(.+)/)?.[1]?.trim()                  ?? '',
    people:  text.match(/Mentioned people:\s*(.+)/)?.[1]?.trim()      ?? '',
    link:    text.match(/Join Link:\s*(https?:\/\/\S+)/)?.[1]?.trim() ?? '',
  };
}
function parseDT(s: string): Date | null {
  try { const d = new Date(s); if (!isNaN(d.getTime())) return d; const m = s.match(/(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2})/); if (m) return new Date(`${m[1]}T${m[2]}:00`); } catch { /**/ } return null;
}
const isUpcoming = (s: string) => { const d = parseDT(s); return d ? d.getTime() > Date.now() - 3600000 : false; };
const fmtTime    = (s: string) => parseDT(s)?.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) ?? s;
const fmtDate    = (s: string) => parseDT(s)?.toLocaleString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }) ?? s;
function dateBlock(s: string) { const d = parseDT(s); if (!d) return { mo: '—', dy: '—' }; return { mo: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(), dy: String(d.getDate()) }; }
function dateBlockMs(ms: number | null) { if (!ms) return { mo: '?', dy: '?' }; const d = new Date(ms); return { mo: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(), dy: String(d.getDate()) }; }
function rel(ms: number) { const d = ms - Date.now(), m = Math.round(d / 60000); if (m < 0) return `${Math.abs(m)}m ago`; if (m < 60) return `in ${m}m`; const h = Math.round(m / 60); if (h < 24) return `in ${h}h`; return `in ${Math.round(h / 24)}d`; }
function deadlineFmtDate(ms: number | null) { if (!ms) return 'Date not specified'; return new Date(ms).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }); }
function gcalEventUrl(task: string, dateMs: number | null) {
  const title = encodeURIComponent(`[Deadline] ${task}`);
  const details = encodeURIComponent('Auto-detected from EduTechExOS chat');
  const base = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
  if (!dateMs) return base;
  const d = new Date(dateMs), p = (n: number) => String(n).padStart(2, '0');
  const s = `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`;
  const e = new Date(dateMs + 86400000); const es = `${e.getFullYear()}${p(e.getMonth()+1)}${p(e.getDate())}`;
  return `${base}&dates=${s}/${es}`;
}
function buildSrc(email: string) { return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&ctz=Asia%2FKolkata&showNav=1&showPrint=0&showTabs=0&showCalendars=0&mode=WEEK`; }
function urgencyColor(ms: number | null): string {
  if (!ms) return 'bg-[#3E4A89]';
  const d = ms - Date.now();
  if (d < 0)             return 'bg-red-500';
  if (d < 86400000)      return 'bg-orange-500';
  if (d < 3 * 86400000)  return 'bg-amber-400';
  return 'bg-[#3E4A89]';
}
function urgencyBadge(ms: number | null): string {
  if (!ms) return 'bg-slate-100 text-slate-500';
  const d = ms - Date.now();
  if (d < 0)             return 'bg-red-100 text-red-600';
  if (d < 86400000)      return 'bg-orange-100 text-orange-600';
  if (d < 3 * 86400000)  return 'bg-amber-100 text-amber-700';
  return 'bg-indigo-100 text-[#3E4A89]';
}
function getCurrentUser() { if (typeof window === 'undefined') return null; try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '')?.user ?? null; } catch { return null; } }
function canJoin(m: { sender: string; people: string }, u: { name: string; email: string; role: string } | null) {
  if (!u) return false;
  if (u.role === 'Admin' || u.role === 'Manager') return true;
  if (m.sender.toLowerCase() === u.name.toLowerCase()) return true;
  if (!m.people) return false;
  const list = m.people.split(/[,;]/).map(p => p.trim().toLowerCase());
  const h = u.email.split('@')[0].toLowerCase();
  return list.some(p => u.name.toLowerCase().includes(p) || p.includes(u.name.toLowerCase()) || p.includes(h));
}
function chips(people: string) { return people ? people.split(/[,;]/).map(p => p.replace(/^@/, '').trim()).filter(Boolean) : []; }

type Tab = 'upcoming' | 'deadlines' | 'past' | 'mycal';

/* ─────────────── Component ──────────────────────────────────── */
export default function CalendarPanel({ onClose }: CalendarPanelProps) {
  const { messages } = useDashboardStore();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [gcalEmail, setGcalEmail]   = useState('');
  const [gcalSrc, setGcalSrc]       = useState('');
  const [gcalActive, setGcalActive] = useState(false);
  const [gcalError, setGcalError]   = useState('');
  const [deadlines, setDeadlines]   = useState<DeadlineRecord[]>([]);
  const [scanning, setScanning]     = useState(false);
  const [lastScan, setLastScan]     = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [grantFor, setGrantFor]     = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [granting, setGranting]     = useState(false);

  const runScan = useCallback((msgs: Record<string, Message[]>) => {
    setScanning(true);
    setTimeout(() => {
      try {
        const found = scanMessages(msgs);
        const ts = Date.now();
        setDeadlines(found);
        setLastScan(ts);
        const userEmail = getCurrentUser()?.email?.toLowerCase() ?? 'guest';
        localStorage.setItem(deadlinesKey(userEmail), JSON.stringify({ data: found, ts }));
      } finally { setScanning(false); }
    }, 60);
  }, []);

  /* Restore persisted state on mount — all keys are scoped to the logged-in user */
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const userEmail = user?.email?.toLowerCase() ?? 'guest';

    const saved = localStorage.getItem(gcalEmailKey(userEmail));
    if (saved) { setGcalEmail(saved); setGcalSrc(buildSrc(saved)); setGcalActive(true); }

    try {
      const cached = localStorage.getItem(deadlinesKey(userEmail));
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        setDeadlines(data); setLastScan(ts);
        if (Date.now() - ts > CACHE_TTL) runScan(messages as Record<string, Message[]>);
        return;
      }
    } catch { /**/ }
    runScan(messages as Record<string, Message[]>);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allMeetings = useMemo(() => {
    const r: Array<{ id: string; channel: string; sender: string; color: string; title: string; timeStr: string; people: string; link: string; timestamp: string }> = [];
    Object.entries(messages).forEach(([ch, msgs]) => (msgs as Message[]).forEach(msg => { const p = parseScheduledMeet(msg.text ?? ''); if (p) r.push({ id: msg.id, channel: ch, sender: msg.sender, color: msg.color, ...p, timestamp: msg.timestamp }); }));
    return r.sort((a, b) => (parseDT(a.timeStr)?.getTime() ?? 0) - (parseDT(b.timeStr)?.getTime() ?? 0));
  }, [messages]);

  const upcoming        = allMeetings.filter(m => isUpcoming(m.timeStr));
  const past            = allMeetings.filter(m => !isUpcoming(m.timeStr)).reverse();
  const futureDeadlines = deadlines.filter(d => !d.dateMs || d.dateMs >= Date.now() - 3600000);
  const pastDeadlines   = deadlines.filter(d => d.dateMs && d.dateMs < Date.now() - 3600000);

  function connectGcal() {
    const email = gcalEmail.trim();
    if (!email || !email.includes('@')) { setGcalError('Enter a valid Gmail address.'); return; }
    const src = buildSrc(email);
    setGcalSrc(src); setGcalActive(true); setGcalError('');
    const userEmail = currentUser?.email?.toLowerCase() ?? 'guest';
    localStorage.setItem(gcalEmailKey(userEmail), email);
  }
  function disconnectGcal() {
    setGcalActive(false); setGcalSrc(''); setGcalEmail('');
    const userEmail = currentUser?.email?.toLowerCase() ?? 'guest';
    localStorage.removeItem(gcalEmailKey(userEmail));
  }

  const TABS = [
    { id: 'upcoming'  as Tab, label: 'Upcoming',    badge: upcoming.length,        icon: <CalendarCheck size={13} /> },
    { id: 'deadlines' as Tab, label: 'Deadlines',   badge: futureDeadlines.length, icon: <Target size={13} /> },
    { id: 'past'      as Tab, label: 'Past',        badge: past.length,            icon: <History size={13} /> },
    { id: 'mycal'     as Tab, label: 'My Calendar',                                icon: <CalendarDays size={13} /> },
  ];

  const scanAge = lastScan ? Math.round((Date.now() - lastScan) / 60000) : null;

  return (
    <motion.div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose}>
      <motion.div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl"
        style={{ height: '88vh' }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.7 }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.10)] bg-gradient-to-r from-[#191E2F] to-[#252D45] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <CalendarDays size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Team Calendar</h2>
              <p className="text-[10px] text-white/50">Meetings · Deadlines · Your calendar</p>
            </div>
          </div>
          {/* GCal status pill in header */}
          {gcalActive && (
            <span className="mr-2 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Calendar connected
            </span>
          )}
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex shrink-0 gap-0.5 border-b border-[rgba(62,74,137,0.10)] bg-white px-3 pt-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold transition-all ${tab === t.id ? 'border-b-2 border-[#3E4A89] text-[#3E4A89]' : 'text-[#7C859E] hover:text-[#4A5578]'}`}>
              {t.icon}
              {t.label}
              {t.badge !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${tab === t.id ? 'bg-[#3E4A89] text-white' : 'bg-[#F0F1F7] text-[#9BA6D3]'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Recurring Meet chips (meetings tabs only) ── */}
        {(tab === 'upcoming' || tab === 'past') && (
          <div className="shrink-0 border-b border-[rgba(62,74,137,0.07)] bg-[#F7F6F2] px-4 py-2.5">
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-[#B0B8D1]">Quick join — Recurring meets</p>
            <div className="flex flex-wrap gap-2">
              {GOOGLE_MEET_LINKS.map(m => (
                <a key={m.link} href={m.link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-[rgba(62,74,137,0.10)] bg-white px-3 py-1.5 text-xs font-bold text-[#4A5578] shadow-sm hover:border-[#3E4A89] hover:text-[#3E4A89] transition-all group">
                  <Video size={11} className="text-[#9BA6D3] group-hover:text-[#3E4A89] transition-colors" />
                  {m.label}
                  <span className="rounded-full bg-[#F0F1F7] px-1.5 py-0.5 text-[9px] text-[#9BA6D3]">{m.days}</span>
                  <ExternalLink size={9} className="text-[#C4CAE0]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── Upcoming meetings ── */}
            {tab === 'upcoming' && (
              <motion.div key="upcoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="p-4 space-y-3">
                {upcoming.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50"><CalendarDays size={24} className="text-indigo-200" /></div>
                    <div><p className="font-bold text-[#4A5578]">No upcoming meetings</p><p className="mt-1 text-xs text-[#9BA6D3]">Ask the AI assistant to schedule a meeting — it will appear here.</p></div>
                  </div>
                ) : upcoming.map(m => {
                  const ok = canJoin(m, currentUser);
                  const isHost = currentUser?.name.toLowerCase() === m.sender.toLowerCase();
                  const { mo, dy } = dateBlock(m.timeStr);
                  const cs = chips(m.people);
                  return (
                    <div key={m.id} className={`flex gap-4 rounded-2xl border p-4 ${ok ? 'border-emerald-100 bg-white shadow-sm' : 'border-amber-100 bg-amber-50/40'}`}>
                      <div className={`flex w-12 shrink-0 flex-col items-center justify-center rounded-xl py-2 ${ok ? 'bg-[#3E4A89]' : 'bg-amber-400'}`}>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/70">{mo}</span>
                        <span className="text-xl font-black leading-none text-white">{dy}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-black text-[#1E2636]">{m.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {rel(parseDT(m.timeStr)?.getTime() ?? 0)}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-[#7C859E]">
                          <Clock size={10} />{fmtDate(m.timeStr)}<span className="font-bold text-[#4A5578]">{fmtTime(m.timeStr)}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#7C859E]">
                          <Users size={10} /><span className="font-semibold">Host:</span><span className="font-bold text-[#4A5578]">{m.sender}</span>
                        </p>
                        {cs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {cs.slice(0, 6).map((n, i) => <span key={i} className="rounded-full bg-[#F0F1F7] px-2 py-0.5 text-[10px] font-bold text-[#4A5578]">{n}</span>)}
                            {cs.length > 6 && <span className="rounded-full bg-[#F0F1F7] px-2 py-0.5 text-[10px] font-bold text-[#9BA6D3]">+{cs.length - 6}</span>}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {ok && m.link && (
                            <a href={m.link} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-xl bg-[#3E4A89] px-4 py-1.5 text-xs font-black text-white hover:bg-[#2F3970] transition-colors">
                              <Video size={12} /> Join <ArrowRight size={11} />
                            </a>
                          )}
                          {!ok && <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-[11px] font-bold text-amber-700">Contact {m.sender} for access</span>}
                          {isHost && (grantFor === m.id ? (
                            <div className="flex flex-1 items-center gap-1">
                              <input type="email" value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="colleague@email.com"
                                className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:border-[#3E4A89]" />
                              <button disabled={granting} onClick={async () => {
                                if (!grantEmail.trim()) return; setGranting(true);
                                try { const tk = JSON.parse(localStorage.getItem('edutechex_token') || '{}')?.token; await fetch(`${API_BASE}/api/meeting-access/${m.id}/grant`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` }, body: JSON.stringify({ email: grantEmail.trim() }) }); setGrantEmail(''); setGrantFor(null); } finally { setGranting(false); }
                              }} className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#3E4A89] text-white hover:bg-[#2F3970] disabled:opacity-50"><Check size={12} /></button>
                              <button onClick={() => setGrantFor(null)} className="flex h-7 w-7 items-center justify-center rounded-xl text-[#9BA6D3] hover:bg-red-50 hover:text-red-500"><X size={12} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setGrantFor(m.id)} className="flex items-center gap-1 rounded-xl border border-[rgba(62,74,137,0.15)] px-3 py-1.5 text-[11px] font-bold text-[#3E4A89] hover:bg-indigo-50 transition-colors">
                              <ShieldCheck size={12} /> Grant Access
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ── Deadlines ── */}
            {tab === 'deadlines' && (
              <motion.div key="deadlines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="flex flex-col">

                {/* Scan status bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.07)] bg-white px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {scanning
                      ? <RefreshCw size={12} className="animate-spin text-[#3E4A89]" />
                      : <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                    <span className="text-[11px] font-semibold text-[#7C859E]">
                      {scanning ? 'Scanning all channels…' : scanAge !== null ? `Last scanned ${scanAge < 2 ? 'just now' : `${scanAge}m ago`} · ${deadlines.length} item${deadlines.length !== 1 ? 's' : ''} found` : 'Not yet scanned'}
                    </span>
                  </div>
                  <button onClick={() => runScan(messages as Record<string, Message[]>)} disabled={scanning}
                    className="flex items-center gap-1 rounded-lg border border-[rgba(62,74,137,0.12)] px-2.5 py-1 text-[11px] font-bold text-[#3E4A89] hover:bg-indigo-50 disabled:opacity-40 transition-colors">
                    <RefreshCw size={10} className={scanning ? 'animate-spin' : ''} /> Rescan
                  </button>
                </div>

                <div className="p-4 space-y-2">
                  {futureDeadlines.length === 0 && !scanning ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50"><Target size={24} className="text-indigo-200" /></div>
                      <div>
                        <p className="font-bold text-[#4A5578]">No deadlines detected</p>
                        <p className="mt-1 max-w-xs text-xs text-[#9BA6D3] leading-relaxed">
                          Mention words like <strong>deadline</strong>, <strong>due by</strong>, <strong>submit by</strong>, or <strong>complete by</strong> in any channel message and they will show up here automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Upcoming deadlines */}
                      {futureDeadlines.length > 0 && (
                        <>
                          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">Upcoming · {futureDeadlines.length}</p>
                          {futureDeadlines.map(d => {
                            const { mo, dy } = dateBlockMs(d.dateMs);
                            const isPast = d.dateMs && d.dateMs < Date.now();
                            return (
                              <div key={d.id} className="flex gap-3 rounded-2xl border border-[rgba(62,74,137,0.08)] bg-white p-3.5 shadow-sm">
                                {/* Date block */}
                                <div className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-xl py-1.5 ${urgencyColor(d.dateMs)}`}>
                                  <span className="text-[7px] font-black uppercase tracking-widest text-white/70">{mo}</span>
                                  <span className="text-lg font-black leading-none text-white">{dy}</span>
                                </div>
                                {/* Body */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-black text-[#1E2636] leading-snug">{d.task}</p>
                                    {d.dateMs && (
                                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${urgencyBadge(d.dateMs)}`}>
                                        {isPast ? 'overdue' : rel(d.dateMs)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-[10px] text-[#9BA6D3]">
                                    <span className="flex items-center gap-1"><Users size={9} />{d.sender}</span>
                                    <span className="flex items-center gap-1"><Hash size={9} />{d.channel}</span>
                                    {d.dateMs && <span className="flex items-center gap-1"><Clock size={9} />{deadlineFmtDate(d.dateMs)}</span>}
                                  </div>
                                  <p className="mt-1.5 rounded-lg bg-[#F7F6F2] px-2.5 py-1.5 text-[10px] leading-relaxed text-[#4A5578] italic">"{d.snippet}"</p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <a href={gcalEventUrl(d.task, d.dateMs)} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-1 rounded-lg border border-[rgba(66,133,244,0.3)] bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors">
                                      <Plus size={10} /> Add to Google Calendar
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Past deadlines */}
                      {pastDeadlines.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-[#C4CAE0]">Past deadlines · {pastDeadlines.length}</p>
                          {pastDeadlines.map(d => (
                            <div key={d.id} className="mb-1.5 flex items-center gap-3 rounded-xl border border-[rgba(62,74,137,0.06)] bg-white px-3 py-2 opacity-50">
                              <div className="flex w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 py-1">
                                <span className="text-[7px] font-black uppercase text-slate-400">{dateBlockMs(d.dateMs).mo}</span>
                                <span className="text-sm font-black leading-none text-slate-400">{dateBlockMs(d.dateMs).dy}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-xs font-bold text-[#7C859E] line-through">{d.task}</p>
                                <p className="text-[10px] text-[#9BA6D3]">{d.sender} · #{d.channel}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Past meetings ── */}
            {tab === 'past' && (
              <motion.div key="past" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="p-4">
                {past.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center"><History size={24} className="text-slate-200" /><p className="text-sm font-bold text-[#9BA6D3]">No past meetings yet</p></div>
                ) : (
                  <div className="space-y-1.5">
                    {past.map(m => {
                      const { mo, dy } = dateBlock(m.timeStr);
                      const cs = chips(m.people);
                      return (
                        <div key={m.id} className="flex items-center gap-3 rounded-xl border border-[rgba(62,74,137,0.07)] bg-white px-4 py-3 opacity-65 hover:opacity-100 transition-opacity">
                          <div className="flex w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F0F1F7] py-1">
                            <span className="text-[7px] font-black uppercase text-[#9BA6D3]">{mo}</span>
                            <span className="text-base font-black leading-none text-[#7C859E]">{dy}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-black text-[#4A5578]">{m.title}</p>
                            <p className="text-[10px] text-[#9BA6D3]">{fmtTime(m.timeStr)}{cs.length > 0 && ` · ${cs.length} attendee${cs.length !== 1 ? 's' : ''}`}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-[#B0B8D1]">{m.sender}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── My Calendar ── */}
            {tab === 'mycal' && (
              <motion.div key="mycal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="flex h-full flex-col">
                {!gcalActive ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
                    {/* Google Calendar icon */}
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
                      <h3 className="text-base font-black text-[#1E2636]">Connect Your Google Calendar</h3>
                      <p className="mt-1 max-w-xs text-sm text-[#7C859E] leading-relaxed">Once connected, your calendar stays open every time you visit this panel — until you disconnect manually.</p>
                    </div>

                    {/* Steps */}
                    <div className="w-full max-w-sm rounded-2xl border border-[rgba(62,74,137,0.10)] bg-white p-4">
                      <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-[#B0B8D1]">One-time setup</p>
                      <div className="space-y-3">
                        {[
                          { n: '1', text: 'Open Google Calendar → Settings → your calendar → "Access permissions" → tick Make available to public' },
                          { n: '2', text: 'Enter your Gmail address below and click Connect — the app will remember it.' },
                        ].map(s => (
                          <div key={s.n} className="flex items-start gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3E4A89] text-[9px] font-black text-white">{s.n}</span>
                            <p className="text-[11px] leading-relaxed text-[#4A5578]">{s.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex w-full max-w-sm flex-col gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-3 py-2.5 focus-within:border-[#3E4A89] transition-colors">
                        <Link2 size={14} className="shrink-0 text-[#9BA6D3]" />
                        <input type="email" value={gcalEmail}
                          onChange={e => { setGcalEmail(e.target.value); setGcalError(''); }}
                          onKeyDown={e => e.key === 'Enter' && connectGcal()}
                          placeholder="yourname@gmail.com"
                          className="flex-1 bg-transparent text-sm font-semibold text-[#1E2636] placeholder-slate-300 outline-none" />
                      </div>
                      {gcalError && <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500"><AlertCircle size={12} />{gcalError}</div>}
                      <button onClick={connectGcal} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3E4A89] text-sm font-black text-white hover:bg-[#2F3970] transition-colors">
                        <CalendarDays size={15} /> Connect &amp; Remember
                      </button>
                    </div>
                    <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors">
                      Open Google Calendar <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  <div className="relative flex-1 min-h-0">
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                      <span className="rounded-lg border border-[rgba(62,74,137,0.10)] bg-white px-3 py-1.5 text-[10px] font-bold text-[#7C859E] shadow-sm">
                        {gcalEmail}
                      </span>
                      <button onClick={disconnectGcal}
                        className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-[10px] font-bold text-red-400 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                        <X size={10} /> Disconnect
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
