'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, X, Clock, Download, Bell } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

type SlotStatus = 'available' | 'busy' | 'ooo';
type Slot = { time: string; status: SlotStatus; label: string };
type DayRecord = { date: string; adminEmail: string; slots: Slot[]; _id?: string };
type MeetingRequest = {
  _id: string; userEmail: string; userName: string; date: string;
  time: string; purpose: string; status: 'pending' | 'confirmed' | 'declined';
};

const TIME_OPTIONS = [
  'All Day', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

const STATUS_CONFIG: Record<SlotStatus, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  busy:      { label: 'Busy',      color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200',       dot: 'bg-rose-500'    },
  ooo:       { label: 'Out of Office', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',  dot: 'bg-amber-500'   },
};

function getToken(): string | null {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function AdminAvailabilityCalendar() {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [records, setRecords]     = useState<Record<string, DayRecord>>({});
  const [selected, setSelected]   = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState<Slot[]>([]);
  const [saving, setSaving]       = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [newTime, setNewTime]     = useState('09:00');
  const [newStatus, setNewStatus] = useState<SlotStatus>('available');
  const [newLabel, setNewLabel]   = useState('');
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [activeView, setActiveView] = useState<'calendar' | 'requests'>('calendar');

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/availability?month=${monthKey}`, {
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

  const loadMeetingRequests = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/meeting-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMeetingRequests(data.requests);
    } catch { /* non-fatal */ }
  }, []);

  async function updateRequestStatus(id: string, status: 'confirmed' | 'declined') {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/meeting-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setMeetingRequests((prev) => prev.map((r) => r._id === id ? { ...r, status } : r));
        toast.success(`Meeting ${status}.`);
      } else toast.error(data.error ?? 'Failed to update.');
    } catch { toast.error('Network error.'); }
  }

  useEffect(() => { loadMonth(); }, [loadMonth]);
  useEffect(() => { loadMeetingRequests(); }, [loadMeetingRequests]);

  function openDay(dateStr: string) {
    setSelected(dateStr);
    setEditSlots(records[dateStr]?.slots ? [...records[dateStr].slots] : []);
    setShowSlotForm(false);
  }

  async function saveDay() {
    if (!selected) return;
    setSaving(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ date: selected, slots: editSlots }),
      });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => ({ ...prev, [selected]: data.record }));
        toast.success('Availability saved.');
        setSelected(null);
      } else toast.error(data.error ?? 'Failed to save.');
    } catch { toast.error('Network error.'); }
    finally { setSaving(false); }
  }

  async function clearDay(dateStr: string) {
    const token = getToken();
    try {
      await fetch(`${API_BASE}/api/availability/${dateStr}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      setRecords((prev) => { const next = { ...prev }; delete next[dateStr]; return next; });
      toast.success('Day cleared.');
    } catch { toast.error('Failed to clear.'); }
  }

  function addSlot() {
    if (editSlots.some((s) => s.time === newTime)) {
      toast.error('That time slot already exists.');
      return;
    }
    setEditSlots((prev) => [...prev, { time: newTime, status: newStatus, label: newLabel }]);
    setNewLabel('');
    setShowSlotForm(false);
  }

  function removeSlot(idx: number) {
    setEditSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  async function downloadExcel() {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/members/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error('Export failed.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edutechexos-members-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Members list downloaded.');
    } catch { toast.error('Download failed.'); }
  }

  // Build calendar grid
  const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  function daySummary(dateStr: string) {
    const rec = records[dateStr];
    if (!rec || !rec.slots.length) return null;
    const hasAvail = rec.slots.some((s) => s.status === 'available');
    const hasBusy  = rec.slots.some((s) => s.status === 'busy');
    const hasOoo   = rec.slots.some((s) => s.status === 'ooo');
    if (hasOoo) return 'ooo';
    if (hasBusy && !hasAvail) return 'busy';
    if (hasAvail) return 'available';
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1E2636]">Availability &amp; Meetings</h2>
          <p className="text-sm text-[#9BA6D3] mt-0.5">Set your available slots and manage meeting requests from users</p>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3E4A89] text-white text-sm font-medium hover:bg-[#2A3568] transition-colors"
        >
          <Download size={15} /> Export Members Excel
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[#F0F2FF] p-1 rounded-xl w-fit">
        {([
          { key: 'calendar' as const, label: 'My Calendar', badge: 0 },
          { key: 'requests' as const, label: 'Booking Requests', badge: meetingRequests.filter(r => r.status === 'pending').length },
        ]).map(({ key, label, badge }) => (
          <button key={key} onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === key ? 'bg-white text-[#3E4A89] shadow-sm' : 'text-[#9BA6D3] hover:text-[#4A5578]'}`}>
            {label}
            {badge > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Meeting requests view */}
      {activeView === 'requests' && (
        <div className="space-y-3">
          {meetingRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8EAF6]">
              <Bell size={32} className="text-[#C5CAE0] mx-auto mb-3" />
              <p className="text-sm text-[#9BA6D3]">No meeting requests yet.</p>
            </div>
          ) : (
            meetingRequests.map((req) => (
              <div key={req._id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E8EAF6] shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-[#1E2636]">{req.userName}</span>
                    <span className="text-xs text-[#9BA6D3]">{req.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#4A5578]">
                      {new Date(req.date + 'T12:00:00').toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })} at {req.time}
                    </span>
                  </div>
                  {req.purpose && <p className="text-xs text-[#9BA6D3] mt-1">{req.purpose}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'pending' ? (
                    <>
                      <button onClick={() => updateRequestStatus(req._id, 'confirmed')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 border border-emerald-200">
                        <Check size={12} /> Confirm
                      </button>
                      <button onClick={() => updateRequestStatus(req._id, 'declined')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 border border-rose-200">
                        <X size={12} /> Decline
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      req.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}>{req.status === 'confirmed' ? 'Confirmed' : 'Declined'}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Calendar */}
      {activeView === 'calendar' && (<><div className="bg-white rounded-2xl border border-[#E8EAF6] shadow-sm overflow-hidden">
        {/* Nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EAF6]">
          <button onClick={() => { const d = new Date(viewYear, viewMonth - 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
            className="p-2 rounded-lg hover:bg-[#F0F2FF] transition-colors">
            <ChevronLeft size={18} className="text-[#3E4A89]" />
          </button>
          <h3 className="font-semibold text-[#1E2636]">{monthName}</h3>
          <button onClick={() => { const d = new Date(viewYear, viewMonth + 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
            className="p-2 rounded-lg hover:bg-[#F0F2FF] transition-colors">
            <ChevronRight size={18} className="text-[#3E4A89]" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-[#E8EAF6]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-[#9BA6D3]">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="h-20 border-b border-r border-[#F0F2FF]" />;
            const dateStr = toYMD(viewYear, viewMonth, day);
            const summary = daySummary(dateStr);
            const isToday = dateStr === toYMD(today.getFullYear(), today.getMonth(), today.getDate());
            const isPast  = new Date(dateStr) < new Date(toYMD(today.getFullYear(), today.getMonth(), today.getDate()));
            const slots   = records[dateStr]?.slots ?? [];
            return (
              <div
                key={idx}
                onClick={() => openDay(dateStr)}
                className={`h-20 border-b border-r border-[#F0F2FF] p-2 cursor-pointer transition-colors group ${
                  isToday ? 'bg-[#F0F2FF]' : isPast ? 'bg-[#FAFAFA]' : 'hover:bg-[#F8F9FF]'
                }`}
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                  isToday ? 'bg-[#3E4A89] text-white' : 'text-[#1E2636]'
                }`}>{day}</div>
                {summary && (
                  <div className="space-y-0.5">
                    <div className={`flex items-center gap-1`}>
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[summary].dot}`} />
                      <span className={`text-[10px] font-medium ${STATUS_CONFIG[summary].color}`}>
                        {slots.length === 1 && slots[0].time !== 'All Day' ? slots[0].time : STATUS_CONFIG[summary].label}
                      </span>
                    </div>
                    {slots.length > 1 && (
                      <span className="text-[10px] text-[#9BA6D3]">+{slots.length - 1} more</span>
                    )}
                  </div>
                )}
                {!summary && !isPast && (
                  <span className="text-[10px] text-[#C5CAE0] group-hover:text-[#9BA6D3] transition-colors">+ Add</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-[#9BA6D3]">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>
      </>)}

      {/* Day editor modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EAF6]">
              <h3 className="font-bold text-[#1E2636]">
                {new Date(selected + 'T12:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[#F0F2FF]">
                <X size={16} className="text-[#9BA6D3]" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {editSlots.length === 0 && (
                <p className="text-sm text-[#9BA6D3] text-center py-4">No slots set. Add one below.</p>
              )}
              {editSlots.map((slot, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${STATUS_CONFIG[slot.status].bg}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[slot.status].dot}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1E2636]">{slot.time}</span>
                        <span className={`text-xs font-medium ${STATUS_CONFIG[slot.status].color}`}>{STATUS_CONFIG[slot.status].label}</span>
                      </div>
                      {slot.label && <p className="text-xs text-[#9BA6D3] mt-0.5">{slot.label}</p>}
                    </div>
                  </div>
                  <button onClick={() => removeSlot(idx)} className="p-1 rounded hover:bg-white/70">
                    <Trash2 size={14} className="text-[#9BA6D3]" />
                  </button>
                </div>
              ))}

              {showSlotForm ? (
                <div className="border border-[#E8EAF6] rounded-xl p-4 space-y-3 bg-[#F8F9FF]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#4A5578] mb-1 block">Time</label>
                      <select value={newTime} onChange={(e) => setNewTime(e.target.value)}
                        className="w-full border border-[#E8EAF6] rounded-lg px-3 py-2 text-sm text-[#1E2636] bg-white focus:outline-none focus:border-[#3E4A89]">
                        {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#4A5578] mb-1 block">Status</label>
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as SlotStatus)}
                        className="w-full border border-[#E8EAF6] rounded-lg px-3 py-2 text-sm text-[#1E2636] bg-white focus:outline-none focus:border-[#3E4A89]">
                        <option value="available">Available</option>
                        <option value="busy">Busy</option>
                        <option value="ooo">Out of Office</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#4A5578] mb-1 block">Label (optional)</label>
                    <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Team standup"
                      className="w-full border border-[#E8EAF6] rounded-lg px-3 py-2 text-sm text-[#1E2636] bg-white focus:outline-none focus:border-[#3E4A89]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSlot} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#3E4A89] text-white text-sm font-medium hover:bg-[#2A3568]">
                      <Check size={14} /> Add Slot
                    </button>
                    <button onClick={() => setShowSlotForm(false)} className="px-4 py-2 rounded-lg border border-[#E8EAF6] text-sm text-[#9BA6D3] hover:bg-[#F0F2FF]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowSlotForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[#C5CAE0] text-sm text-[#9BA6D3] hover:border-[#3E4A89] hover:text-[#3E4A89] transition-colors">
                  <Plus size={15} /> Add Time Slot
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E8EAF6]">
              {records[selected] && (
                <button onClick={() => { clearDay(selected); setSelected(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-600 text-sm hover:bg-rose-50">
                  <Trash2 size={14} /> Clear Day
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-xl border border-[#E8EAF6] text-sm text-[#9BA6D3] hover:bg-[#F0F2FF]">
                Discard
              </button>
              <button onClick={saveDay} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3E4A89] text-white text-sm font-medium hover:bg-[#2A3568] disabled:opacity-60">
                {saving ? <Clock size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
