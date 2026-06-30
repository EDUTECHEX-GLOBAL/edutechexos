'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarX, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

type LeaveStatus   = 'pending' | 'approved' | 'rejected';
type LeaveCategory = 'sick' | 'vacation' | 'personal' | 'emergency' | 'other';
type SlotStatus    = 'available' | 'busy' | 'ooo';

interface LeaveRecord {
  id: string; name: string; email: string;
  leaveCategory: LeaveCategory; type: string;
  startDate: string; endDate?: string; duration?: string;
  reason: string; status: LeaveStatus; adminNote?: string;
  requestedAt: string;
}
interface Slot   { time: string; status: SlotStatus; label: string }
interface DayRec { date: string; slots: Slot[] }

const CAT_COLOR: Record<LeaveCategory, string> = {
  sick: '#EF476F', vacation: '#10C98A', personal: '#5B4FDB',
  emergency: '#F59E0B', other: '#9BA6D3',
};
const CAT_EMOJI: Record<LeaveCategory, string> = {
  sick: '🤒', vacation: '🌴', personal: '👤', emergency: '⚡', other: '📋',
};
const SLOT_CFG: Record<SlotStatus, { label: string; color: string; bg: string }> = {
  available: { label: 'Available', color: '#10C98A', bg: 'rgba(16,201,138,0.12)' },
  busy:      { label: 'Busy',      color: '#EF476F', bg: 'rgba(239,71,111,0.10)' },
  ooo:       { label: 'Out of Office', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
};
const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function getToken() {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}
function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminLeaveCalendar() {
  const today    = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [leaves, setLeaves]       = useState<LeaveRecord[]>([]);
  const [avail, setAvail]         = useState<Record<string, DayRec>>({});
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<string | null>(null);
  const [viewMode, setViewMode]   = useState<'day' | 'user'>('day');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2,'0')}`;

  const fetchAll = useCallback(async () => {
    const token = getToken(); if (!token) return;
    setLoading(true);
    try {
      const [lRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/api/leaves`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/availability?month=${monthKey}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const lData = await lRes.json();
      const aData = await aRes.json();
      if (lData.success) setLeaves(lData.leaves ?? []);
      if (aData.success) {
        const map: Record<string, DayRec> = {};
        (aData.records ?? []).forEach((r: DayRec) => { map[r.date] = r; });
        setAvail(map);
      }
    } finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build a map of date → approved leaves for that day
  const leavesOnDay = useMemo(() => {
    const map: Record<string, LeaveRecord[]> = {};
    leaves.filter(l => l.status === 'approved').forEach(l => {
      const start = new Date(l.startDate + 'T00:00:00');
      const end   = l.endDate ? new Date(l.endDate + 'T00:00:00') : start;
      const cur   = new Date(start);
      while (cur <= end) {
        const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        if (!map[k]) map[k] = [];
        map[k].push(l);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [leaves]);

  // Unique users extracted from all leaves
  const users = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    leaves.forEach(l => {
      if (!map.has(l.email)) map.set(l.email, { name: l.name, email: l.email });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [leaves]);

  // Leaves grouped by user
  const leavesByUser = useMemo(() => {
    const map: Record<string, LeaveRecord[]> = {};
    leaves.forEach(l => {
      if (!map[l.email]) map[l.email] = [];
      map[l.email].push(l);
    });
    return map;
  }, [leaves]);

  const selectedUserLeaves = selectedUser ? (leavesByUser[selectedUser] ?? []) : [];

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelected(null); setSelectedUser(null); }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0);  } else setMonth(m => m + 1); setSelected(null); setSelectedUser(null); }

  const selectedLeaves = selected ? (leavesOnDay[selected] ?? []) : [];
  const selectedAvail  = selected ? avail[selected] : null;
  const pendingLeaves  = leaves.filter(l => l.status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#1A1B3A', margin: 0, letterSpacing: '-0.02em' }}>
            Leave & Availability Calendar
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'rgba(90,95,128,0.60)' }}>
            Monthly view of approved leaves and admin availability.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Summary chips */}
          <span style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)', fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>
            {pendingLeaves.length} pending
          </span>
          <span style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(16,201,138,0.10)', border: '1px solid rgba(16,201,138,0.22)', fontSize: 11, fontWeight: 700, color: '#10C98A' }}>
            {leaves.filter(l => l.status === 'approved').length} approved
          </span>
          <button onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', background: '#fff', fontSize: 12, fontWeight: 600, color: 'rgba(90,95,128,0.70)', cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* ── Calendar ── */}
        <div style={{ borderRadius: 20, border: '1.5px solid rgba(26,27,58,0.08)', background: '#fff', boxShadow: '0 2px 20px rgba(26,27,58,0.05)', overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(26,27,58,0.06)' }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.10)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={15} color="#5A5F80" />
            </button>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1B3A', letterSpacing: '-0.01em' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.10)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={15} color="#5A5F80" />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'rgba(26,27,58,0.02)', borderBottom: '1px solid rgba(26,27,58,0.05)' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: 10.5, fontWeight: 700, color: 'rgba(90,95,128,0.50)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} style={{ minHeight: 80, borderBottom: '1px solid rgba(26,27,58,0.04)', borderRight: '1px solid rgba(26,27,58,0.04)' }} />;
              const dateStr   = toYMD(year, month, day);
              const dayLeaves = leavesOnDay[dateStr] ?? [];
              const dayAvail  = avail[dateStr];
              const isToday   = dateStr === todayStr;
              const isSelected= dateStr === selected;
              const hasLeave  = dayLeaves.length > 0;
              const hasAvail  = !!dayAvail?.slots?.length;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  style={{
                    minHeight: 80, padding: '8px 6px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(26,27,58,0.04)',
                    borderRight: '1px solid rgba(26,27,58,0.04)',
                    background: isSelected ? 'rgba(91,79,219,0.06)' : hasLeave ? 'rgba(245,158,11,0.03)' : '#fff',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(26,27,58,0.03)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = hasLeave ? 'rgba(245,158,11,0.03)' : '#fff'; }}
                >
                  {/* Day number */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: isToday ? 800 : 500,
                      background: isToday ? '#5B4FDB' : 'transparent',
                      color: isToday ? '#fff' : isSelected ? '#5B4FDB' : '#1A1B3A',
                    }}>
                      {day}
                    </span>
                    {/* Availability dot */}
                    {hasAvail && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10C98A', flexShrink: 0 }} title="Admin has availability set" />
                    )}
                  </div>

                  {/* Leave chips (max 3) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayLeaves.slice(0, 3).map(l => (
                      <div key={l.id} style={{
                        display: 'flex', alignItems: 'center', gap: 3, padding: '1px 5px', borderRadius: 4,
                        background: `${CAT_COLOR[l.leaveCategory]}18`, fontSize: 9.5, fontWeight: 700,
                        color: CAT_COLOR[l.leaveCategory], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        <span>{CAT_EMOJI[l.leaveCategory]}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name.split(' ')[0]}</span>
                      </div>
                    ))}
                    {dayLeaves.length > 3 && (
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(90,95,128,0.55)', paddingLeft: 4 }}>
                        +{dayLeaves.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderTop: '1px solid rgba(26,27,58,0.06)', flexWrap: 'wrap' }}>
            {(Object.entries(CAT_COLOR) as [LeaveCategory, string][]).map(([k, c]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'rgba(90,95,128,0.70)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </span>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'rgba(90,95,128,0.70)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10C98A', display: 'inline-block' }} />
              Availability set
            </span>
          </div>
        </div>

        {/* ── Side panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* View mode toggle */}
          <div style={{ display: 'flex', borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.08)', background: '#F8F9FC', padding: 3 }}>
            {(['day', 'user'] as const).map(mode => (
              <button key={mode} onClick={() => { setViewMode(mode); setSelectedUser(null); }}
                style={{
                  flex: 1, padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                  border: 'none', fontSize: 11, fontWeight: 700,
                  background: viewMode === mode ? '#fff' : 'transparent',
                  color: viewMode === mode ? '#5B4FDB' : 'rgba(90,95,128,0.55)',
                  boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all .15s',
                }}>
                {mode === 'day' ? '📅 Day View' : '👥 User View'}
              </button>
            ))}
          </div>

          {/* ── Day View ── */}
          {viewMode === 'day' && (
            selected ? (
              <div style={{ borderRadius: 18, border: '1.5px solid rgba(91,79,219,0.15)', background: '#fff', boxShadow: '0 2px 20px rgba(91,79,219,0.07)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(26,27,58,0.06)', background: 'rgba(91,79,219,0.04)' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1A1B3A' }}>{fmtDate(selected)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(90,95,128,0.55)' }}>
                    {selectedLeaves.length} on leave · {selectedAvail?.slots?.length ?? 0} slots
                  </p>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
                  {selectedLeaves.length === 0 && !selectedAvail && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(90,95,128,0.45)', padding: '24px 0' }}>No leaves or availability on this day.</p>
                  )}
                  {selectedLeaves.map(l => (
                    <div key={l.id} style={{ borderRadius: 12, border: `1.5px solid ${CAT_COLOR[l.leaveCategory]}28`, background: `${CAT_COLOR[l.leaveCategory]}08`, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{CAT_EMOJI[l.leaveCategory]}</span>
                        <div>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1A1B3A' }}>{l.name}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(90,95,128,0.55)' }}>{l.email}</p>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#4A5578' }}>
                        <strong>Category:</strong> {l.leaveCategory} · <strong>Type:</strong> {l.type}
                      </p>
                      {l.reason && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#4A5578', lineHeight: 1.5 }}>{l.reason}</p>}
                    </div>
                  ))}
                  {selectedAvail?.slots?.length ? (
                    <div style={{ borderRadius: 12, border: '1.5px solid rgba(16,201,138,0.22)', background: 'rgba(16,201,138,0.04)', padding: '10px 12px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#10C98A', textTransform: 'uppercase', letterSpacing: '.08em' }}>Admin Availability</p>
                      {selectedAvail.slots.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < selectedAvail.slots.length - 1 ? 6 : 0 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: SLOT_CFG[s.status].color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1A1B3A' }}>{s.time === 'All Day' ? 'All Day' : s.time}</span>
                          <span style={{ fontSize: 11, color: 'rgba(90,95,128,0.55)' }}>{s.label || SLOT_CFG[s.status].label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div style={{ borderRadius: 18, border: '1.5px dashed rgba(26,27,58,0.12)', background: 'rgba(26,27,58,0.02)', padding: '32px 20px', textAlign: 'center' }}>
                <CalendarX size={28} style={{ color: 'rgba(90,95,128,0.25)', marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'rgba(90,95,128,0.50)' }}>Click a day to see details</p>
              </div>
            )
          )}

          {/* ── User View ── */}
          {viewMode === 'user' && (
            selectedUser ? (
              <div style={{ borderRadius: 18, border: '1.5px solid rgba(91,79,219,0.15)', background: '#fff', boxShadow: '0 2px 20px rgba(91,79,219,0.07)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(26,27,58,0.06)', background: 'rgba(91,79,219,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1A1B3A' }}>
                      {selectedUserLeaves[0]?.name ?? 'Unknown User'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(90,95,128,0.55)' }}>
                      {selectedUser} · {selectedUserLeaves.length} leave{selectedUserLeaves.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button onClick={() => setSelectedUser(null)}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1.5px solid rgba(26,27,58,0.10)', background: '#fff', fontSize: 11, fontWeight: 600, color: 'rgba(90,95,128,0.60)', cursor: 'pointer' }}>
                    Back
                  </button>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                  {selectedUserLeaves.length === 0 && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(90,95,128,0.45)', padding: '24px 0' }}>No leave records for this user.</p>
                  )}
                  {selectedUserLeaves
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map(l => (
                    <div key={l.id} style={{ borderRadius: 12, border: `1.5px solid ${CAT_COLOR[l.leaveCategory]}28`, background: `${CAT_COLOR[l.leaveCategory]}08`, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{CAT_EMOJI[l.leaveCategory]}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1A1B3A' }}>
                            {l.leaveCategory} {l.type ? `· ${l.type}` : ''}
                          </span>
                        </div>
                        <span style={{
                          padding: '2px 7px', borderRadius: 5, fontSize: 9.5, fontWeight: 700,
                          color: l.status === 'approved' ? '#10C98A' : l.status === 'rejected' ? '#EF476F' : '#F59E0B',
                          background: l.status === 'approved' ? 'rgba(16,201,138,0.12)' : l.status === 'rejected' ? 'rgba(239,71,111,0.10)' : 'rgba(245,158,11,0.12)',
                        }}>
                          {l.status}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#4A5578' }}>
                        <strong>Dates:</strong> {fmtDate(l.startDate)}{l.endDate ? ` – ${fmtDate(l.endDate)}` : ''} {l.duration ? `(${l.duration})` : ''}
                      </p>
                      {l.reason && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#4A5578', lineHeight: 1.5 }}><strong>Reason:</strong> {l.reason}</p>}
                      {l.adminNote && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'rgba(90,95,128,0.60)', fontStyle: 'italic' }}>Note: {l.adminNote}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ borderRadius: 18, border: '1.5px solid rgba(26,27,58,0.08)', background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(26,27,58,0.06)' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(90,95,128,0.45)', textTransform: 'uppercase', letterSpacing: '.10em' }}>
                    All Users ({users.length})
                  </p>
                </div>
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 380, overflowY: 'auto' }}>
                  {users.length === 0 && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(90,95,128,0.45)', padding: '24px 0' }}>No leave data available.</p>
                  )}
                  {users.map(u => {
                    const userLeaves = leavesByUser[u.email] ?? [];
                    const approved = userLeaves.filter(l => l.status === 'approved').length;
                    const pending = userLeaves.filter(l => l.status === 'pending').length;
                    return (
                      <div key={u.email}
                        onClick={() => setSelectedUser(u.email)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10,
                          background: selectedUser === u.email ? 'rgba(91,79,219,0.06)' : 'transparent',
                          cursor: 'pointer', transition: 'background .15s',
                        }}
                        onMouseEnter={e => { if (selectedUser !== u.email) (e.currentTarget as HTMLElement).style.background = 'rgba(26,27,58,0.03)'; }}
                        onMouseLeave={e => { if (selectedUser !== u.email) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#5B4FDB,#7C6EEB)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(90,95,128,0.50)' }}>{u.email}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {approved > 0 && <span style={{ padding: '2px 6px', borderRadius: 5, background: 'rgba(16,201,138,0.10)', fontSize: 9.5, fontWeight: 700, color: '#10C98A' }}>{approved}✓</span>}
                          {pending > 0 && <span style={{ padding: '2px 6px', borderRadius: 5, background: 'rgba(245,158,11,0.10)', fontSize: 9.5, fontWeight: 700, color: '#F59E0B' }}>{pending}⏳</span>}
                          <ChevronRight size={13} color="rgba(90,95,128,0.30)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Pending leaves list */}
          {pendingLeaves.length > 0 && viewMode === 'day' && (
            <div style={{ borderRadius: 18, border: '1.5px solid rgba(245,158,11,0.18)', background: '#FFFDF5', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(245,158,11,0.10)', background: 'rgba(245,158,11,0.05)' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '.10em' }}>
                  Pending Approvals · {pendingLeaves.length}
                </p>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {pendingLeaves.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#fff', border: '1px solid rgba(245,158,11,0.12)' }}>
                    <span style={{ fontSize: 16 }}>{CAT_EMOJI[l.leaveCategory]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</p>
                      <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(90,95,128,0.55)' }}>{fmtDate(l.startDate)}</p>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', fontSize: 9.5, fontWeight: 700, color: '#F59E0B', whiteSpace: 'nowrap' }}>Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Month summary */}
          <div style={{ borderRadius: 18, border: '1.5px solid rgba(26,27,58,0.08)', background: '#fff', padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(90,95,128,0.45)', textTransform: 'uppercase', letterSpacing: '.10em' }}>
              {MONTHS[month]} Summary
            </p>
            {([
              { label: 'Approved leaves',  val: leaves.filter(l => l.status === 'approved').length, color: '#10C98A' },
              { label: 'Pending requests', val: pendingLeaves.length,                               color: '#F59E0B' },
              { label: 'Rejected',         val: leaves.filter(l => l.status === 'rejected').length, color: '#EF476F' },
              { label: 'Total users',    val: users.length,                                       color: '#5B4FDB' },
              { label: 'Days with availability', val: Object.keys(avail).length,                   color: '#6366f1' },
            ] as {label:string;val:number;color:string}[]).map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(26,27,58,0.05)' }}>
                <span style={{ fontSize: 12, color: '#4A5578' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
