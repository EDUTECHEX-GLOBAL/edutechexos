'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarCheck, X, Clock, Send,
  CheckCircle2, XCircle, AlertCircle, Sparkles, Calendar, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

type SlotStatus = 'available' | 'busy' | 'ooo';
type Slot       = { time: string; status: SlotStatus; label: string };
type DayRecord  = { date: string; adminEmail: string; slots: Slot[] };
type MeetingRequest = {
  _id: string; date: string; time: string; timeEnd: string; purpose: string;
  status: 'pending' | 'confirmed' | 'declined'; createdAt: string;
};

const STATUS_CONFIG: Record<SlotStatus, { label: string; color: string; bg: string; dot: string; border: string; ring: string }> = {
  available: { label: 'Available',     color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500', border: 'border-emerald-200', ring: 'ring-emerald-400' },
  busy:      { label: 'Busy',          color: 'text-rose-700',    bg: 'bg-rose-50',     dot: 'bg-rose-500',    border: 'border-rose-200',   ring: 'ring-rose-400'    },
  ooo:       { label: 'Out of Office', color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500',   border: 'border-amber-200',  ring: 'ring-amber-400'   },
};

const REQUEST_STATUS: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:   { label: 'Pending',   icon: <AlertCircle  size={13} />, cls: 'bg-amber-50 text-amber-700 border-amber-200'   },
  confirmed: { label: 'Confirmed', icon: <CheckCircle2 size={13} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  declined:  { label: 'Declined',  icon: <XCircle      size={13} />, cls: 'bg-rose-50 text-rose-700 border-rose-200'      },
};

function getToken(): string | null {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}
function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function fmt(dateStr: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('default', opts);
}

interface Props { onClose: () => void; }

type Tab = 'calendar' | 'my-requests';

export default function AdminAvailabilityView({ onClose }: Props) {
  const today = new Date();
  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear]     = useState(today.getFullYear());
  const [viewMonth, setViewMonth]   = useState(today.getMonth());
  const [records, setRecords]       = useState<Record<string, DayRecord>>({});
  const [selected, setSelected]     = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<MeetingRequest[]>([]);
  const [tab, setTab]               = useState<Tab>('calendar');

  // Request flow
  const [requestSlot, setRequestSlot] = useState<Slot | null>(null);
  const [requestDate, setRequestDate] = useState<string>('');
  const [requestTimeEnd, setRequestTimeEnd] = useState('');
  const [purpose, setPurpose]         = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res  = await fetch(`${API_BASE}/api/availability?month=${monthKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const map: Record<string, DayRecord> = {};
        data.records.forEach((r: DayRecord) => { map[r.date] = r; });
        setRecords(map);
      }
    } catch { /* non-fatal */ }
  }, [monthKey]);

  const loadMyRequests = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res  = await fetch(`${API_BASE}/api/meeting-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMyRequests(data.requests);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadMonth(); },       [loadMonth]);
  useEffect(() => { loadMyRequests(); }, [loadMyRequests]);
  useEffect(() => {
    const socket = getSocket();
    const onReviewed = () => { loadMyRequests(); };
    socket.on('meeting_request_reviewed', onReviewed);
    return () => { socket.off('meeting_request_reviewed', onReviewed); };
  }, [loadMyRequests]);

  function computeEndOptions(start: string): string[] {
    const [h, m] = start.split(':').map(Number);
    const opts: string[] = [];
    for (let mins = 30; mins <= 240; mins += 30) {
      const total = h * 60 + m + mins;
      const eh = Math.floor(total / 60);
      const em = total % 60;
      if (eh >= 24) break;
      opts.push(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
    }
    return opts;
  }

  async function sendRequest() {
    if (!requestDate || !requestSlot) return;
    setSubmitting(true);
    const token = getToken();
    try {
      const res  = await fetch(`${API_BASE}/api/meeting-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ date: requestDate, time: requestSlot.time, timeEnd: requestTimeEnd || undefined, purpose }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Request sent — admin will confirm shortly.');
        setPurpose(''); setRequestSlot(null); setRequestDate(''); setRequestTimeEnd(''); setSelected(null);
        loadMyRequests();
      } else toast.error(data.error ?? 'Failed to send request.');
    } catch { toast.error('Network error.'); }
    finally { setSubmitting(false); }
  }

  // Calendar grid
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  function getDayStatus(dateStr: string): SlotStatus | null {
    const rec = records[dateStr];
    if (!rec?.slots.length) return null;
    if (rec.slots.some((s) => s.status === 'ooo'))       return 'ooo';
    if (rec.slots.some((s) => s.status === 'available')) return 'available';
    return 'busy';
  }

  // Today's status for header badge
  const todayStatus = getDayStatus(todayStr);

  // Upcoming available slots across all loaded records (future only)
  const upcomingSlots = useMemo(() => {
    const result: { date: string; slot: Slot }[] = [];
    Object.entries(records)
      .filter(([d]) => d >= todayStr)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, rec]) => {
        rec.slots
          .filter((s) => s.status === 'available')
          .forEach((slot) => result.push({ date, slot }));
      });
    return result.slice(0, 5);
  }, [records, todayStr]);

  const selectedSlots   = selected ? (records[selected]?.slots ?? []) : [];
  const availableInDay  = selectedSlots.filter((s) => s.status === 'available');
  const pendingCount    = myRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[92vh]">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EAF6] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0F2FF] flex items-center justify-center">
              <CalendarCheck size={18} className="text-[#3E4A89]" />
            </div>
            <div>
              <h2 className="font-bold text-[#1E2636] text-base leading-tight">Admin Availability</h2>
              <p className="text-xs text-[#9BA6D3]">Schedule & availability overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {todayStatus && (
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_CONFIG[todayStatus].bg} ${STATUS_CONFIG[todayStatus].color} ${STATUS_CONFIG[todayStatus].border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[todayStatus].dot}`} />
                Today: {STATUS_CONFIG[todayStatus].label}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0F2FF] transition-colors">
              <X size={16} className="text-[#9BA6D3]" />
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="flex border-b border-[#E8EAF6] shrink-0 px-6">
          {([
            { key: 'calendar'    as Tab, label: 'Calendar',    icon: <Calendar size={13} /> },
            { key: 'my-requests' as Tab, label: 'My Requests', icon: <MessageSquare size={13} />, badge: pendingCount },
          ]).map(({ key, label, icon, badge }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'text-[#3E4A89] border-[#3E4A89]' : 'text-[#9BA6D3] border-transparent hover:text-[#4A5578]'
              }`}>
              {icon}{label}
              {badge != null && badge > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">{badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ════════════ CALENDAR TAB ════════════ */}
          {tab === 'calendar' && (
            <div className="p-6 space-y-5">

              {/* Upcoming available slots */}
              {upcomingSlots.length > 0 && (
                <div className="bg-gradient-to-br from-[#F0F2FF] to-[#F8F9FF] rounded-xl p-4 border border-[#E0E4F8]">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={13} className="text-[#3E4A89]" />
                    <span className="text-xs font-semibold text-[#3E4A89] uppercase tracking-wide">Next Available</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {upcomingSlots.map(({ date, slot }, i) => (
                      <button key={i}
                        onClick={() => { setRequestDate(date); setRequestSlot(slot); setSelected(date); }}
                        className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs hover:border-[#3E4A89] hover:shadow-sm transition-all group">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-[#1E2636]">
                          {date === todayStr ? 'Today' : fmt(date, { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[#9BA6D3]">{slot.time}</span>
                        {slot.label && <span className="text-[#9BA6D3] hidden group-hover:inline">· {slot.label}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Month nav */}
              <div className="flex items-center justify-between">
                <button onClick={() => { const d = new Date(viewYear, viewMonth - 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setSelected(null); }}
                  className="p-2 rounded-lg hover:bg-[#F0F2FF] transition-colors">
                  <ChevronLeft size={17} className="text-[#3E4A89]" />
                </button>
                <span className="font-semibold text-[#1E2636]">{monthName}</span>
                <button onClick={() => { const d = new Date(viewYear, viewMonth + 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setSelected(null); }}
                  className="p-2 rounded-lg hover:bg-[#F0F2FF] transition-colors">
                  <ChevronRight size={17} className="text-[#3E4A89]" />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="rounded-xl overflow-hidden border border-[#E8EAF6]">
                <div className="grid grid-cols-7 bg-[#F8F9FF] border-b border-[#E8EAF6]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-[#9BA6D3]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {cells.map((day, idx) => {
                    if (!day) return <div key={idx} className="h-14 border-t border-r border-[#F0F2FF]" />;
                    const dateStr    = toYMD(viewYear, viewMonth, day);
                    const status     = getDayStatus(dateStr);
                    const isToday    = dateStr === todayStr;
                    const isPast     = dateStr < todayStr;
                    const isSelected = dateStr === selected;
                    const slots      = records[dateStr]?.slots ?? [];
                    const availCount = slots.filter((s) => s.status === 'available').length;
                    return (
                      <div key={idx}
                        onClick={() => !isPast && setSelected(isSelected ? null : dateStr)}
                        className={`h-14 border-t border-r border-[#F0F2FF] p-1.5 flex flex-col transition-colors ${
                          isPast ? 'opacity-35 cursor-default' : status ? 'cursor-pointer hover:bg-[#F8F9FF]' : 'cursor-default'
                        } ${isSelected ? 'bg-[#EEF0FB] ring-2 ring-inset ring-[#3E4A89]' : ''}`}>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                          isToday ? 'bg-[#3E4A89] text-white' : 'text-[#1E2636]'
                        }`}>{day}</div>
                        {status && (
                          <div className="mt-auto flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[status].dot}`} />
                            {availCount > 0 && (
                              <span className="text-[9px] text-emerald-600 font-semibold">{availCount} open</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs text-[#9BA6D3]">
                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                ))}
              </div>

              {/* Selected day detail */}
              {selected && (
                <div className="border border-[#E8EAF6] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#F8F9FF] border-b border-[#E8EAF6]">
                    <h4 className="font-semibold text-[#1E2636] text-sm">
                      {fmt(selected, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h4>
                    {availableInDay.length > 0 && !requestSlot && (
                      <span className="text-xs text-emerald-600 font-medium">{availableInDay.length} slot{availableInDay.length > 1 ? 's' : ''} open</span>
                    )}
                  </div>

                  {selectedSlots.length === 0 ? (
                    <div className="py-8 text-center">
                      <CalendarCheck size={24} className="text-[#C5CAE0] mx-auto mb-2" />
                      <p className="text-sm text-[#9BA6D3]">No availability set for this day.</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {selectedSlots.map((slot, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${STATUS_CONFIG[slot.status].bg} ${STATUS_CONFIG[slot.status].border}`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[slot.status].dot}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#1E2636]">{slot.time}</span>
                                <span className={`text-xs font-medium ${STATUS_CONFIG[slot.status].color}`}>{STATUS_CONFIG[slot.status].label}</span>
                              </div>
                              {slot.label && <p className="text-xs text-[#9BA6D3] mt-0.5">{slot.label}</p>}
                            </div>
                          </div>
                          {slot.status === 'available' && (
                            <button
                              onClick={() => { setRequestDate(selected); setRequestSlot(slot); }}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#3E4A89] text-white hover:bg-[#2A3568] transition-colors"
                            >
                              Request
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Request meeting form */}
              {requestSlot && requestDate && (
                <div className="border border-[#3E4A89]/20 rounded-xl p-4 bg-[#F8F9FF] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#1E2636] text-sm">Request a Meeting</p>
                      <p className="text-xs text-[#9BA6D3] mt-0.5">
                        {fmt(requestDate, { weekday: 'short', month: 'short', day: 'numeric' })} · {requestSlot.time}
                        {requestSlot.label && ` · ${requestSlot.label}`}
                      </p>
                    </div>
                    <button onClick={() => { setRequestSlot(null); setRequestDate(''); setRequestTimeEnd(''); setPurpose(''); }}
                      className="p-1 rounded hover:bg-[#E8EAF6]">
                      <X size={14} className="text-[#9BA6D3]" />
                    </button>
                  </div>
                  {(() => {
                    const endOpts = computeEndOptions(requestSlot.time);
                    if (!requestTimeEnd && endOpts.length > 0 && endOpts[0]) {
                      setTimeout(() => { if (!requestTimeEnd) setRequestTimeEnd(endOpts[0]); }, 0);
                    }
                    return null;
                  })()}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-[#4A5578] mb-1 block">Start</label>
                      <div className="border border-[#E8EAF6] rounded-lg px-3 py-2 text-sm font-semibold text-[#1E2636] bg-white">
                        {requestSlot.time}
                      </div>
                    </div>
                    <div className="flex items-center pt-5 text-[#9BA6D3]">→</div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-[#4A5578] mb-1 block">End</label>
                      <select value={requestTimeEnd} onChange={(e) => setRequestTimeEnd(e.target.value)}
                        className="w-full border border-[#E8EAF6] rounded-lg px-3 py-2 text-sm text-[#1E2636] bg-white focus:outline-none focus:border-[#3E4A89]">
                        {computeEndOptions(requestSlot.time).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="What would you like to discuss? (optional)"
                    rows={3}
                    className="w-full border border-[#E8EAF6] rounded-xl px-4 py-3 text-sm text-[#1E2636] bg-white resize-none focus:outline-none focus:border-[#3E4A89] transition-colors"
                  />
                  <button onClick={sendRequest} disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3E4A89] text-white text-sm font-semibold hover:bg-[#2A3568] disabled:opacity-60 transition-colors">
                    {submitting ? <Clock size={14} className="animate-spin" /> : <Send size={14} />}
                    {submitting ? 'Sending…' : 'Send Request'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════ MY REQUESTS TAB ════════════ */}
          {tab === 'my-requests' && (
            <div className="p-6 space-y-3">
              {myRequests.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare size={32} className="text-[#C5CAE0] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#9BA6D3]">No meeting requests yet.</p>
                  <p className="text-xs text-[#C5CAE0] mt-1">
                    Go to the Calendar tab, pick an available slot, and hit <strong>Request</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#9BA6D3] font-medium uppercase tracking-wide">
                    {myRequests.length} request{myRequests.length > 1 ? 's' : ''}
                    {pendingCount > 0 && ` · ${pendingCount} awaiting response`}
                  </p>
                  {myRequests
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((req) => {
                      const rs = REQUEST_STATUS[req.status];
                      return (
                        <div key={req._id} className="flex items-start justify-between p-4 rounded-xl border border-[#E8EAF6] bg-white hover:border-[#C5CAE0] transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#1E2636]">
                                {fmt(req.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-xs text-[#9BA6D3]">{req.timeEnd ? `${req.time} – ${req.timeEnd}` : `at ${req.time}`}</span>
                            </div>
                            {req.purpose && (
                              <p className="text-xs text-[#4A5578] leading-relaxed max-w-xs">{req.purpose}</p>
                            )}
                            <p className="text-[10px] text-[#C5CAE0]">
                              Sent {new Date(req.createdAt).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${rs.cls}`}>
                            {rs.icon}{rs.label}
                          </span>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
