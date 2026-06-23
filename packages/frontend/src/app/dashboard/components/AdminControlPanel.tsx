'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, Users, CalendarOff, Hash, BarChart2,
  Settings, Bell, Shield, Trash2, RefreshCw,
  TrendingUp, Activity, Clock, UserCheck,
  Search, ChevronRight, Plus, X, Check,
  AlertTriangle, Circle, CheckCircle2, XCircle,
  Loader2, Mail, Zap, Lock, Globe, Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

function getToken() {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}

type AdminTab = 'overview' | 'users' | 'attendance' | 'leave' | 'channels' | 'analytics' | 'notifications' | 'settings';

interface UserRecord { id: string; name: string; email: string; role: string; status?: string; source?: string; createdAt?: string; }
interface LeaveRequest {
  id: string; email: string; name?: string;
  startDate: string; endDate?: string; reason: string; type: string; leaveCategory?: string;
  status: 'pending' | 'approved' | 'rejected'; requestedAt?: string;
}
interface AttendanceRecord {
  email: string; name: string; date: string;
  attendance: 'full' | 'half' | 'absent' | 'pending'; hoursWorked: number;
  loginAt?: string;
}
interface Channel { _id?: string; id: string; name: string; description?: string; isPrivate?: boolean; }

const NAV: { id: AdminTab; label: string; icon: React.ElementType; accent: string }[] = [
  { id: 'overview',      label: 'Overview',        icon: BarChart2,   accent: '#0AE8D0' },
  { id: 'users',         label: 'Users',           icon: Users,       accent: '#7C5CFC' },
  { id: 'attendance',    label: 'Attendance',      icon: UserCheck,   accent: '#0EA5E9' },
  { id: 'leave',         label: 'Leave',           icon: CalendarOff, accent: '#F59E0B' },
  { id: 'channels',      label: 'Channels',        icon: Hash,        accent: '#10B981' },
  { id: 'analytics',     label: 'Analytics',       icon: TrendingUp,  accent: '#EF4444' },
  { id: 'notifications', label: 'Broadcast',       icon: Bell,        accent: '#8B5CF6' },
  { id: 'settings',      label: 'Settings',        icon: Settings,    accent: '#64748B' },
];

function initials(name: string) {
  return (name ?? '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  const colors = ['#7C5CFC','#0AE8D0','#FF6B7F','#F59E0B','#10B981','#0EA5E9'];
  const bg = color ?? colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: '#06080F', letterSpacing: '-0.02em' }}>
      {initials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending' },
    approved: { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  label: 'Approved' },
    rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Rejected' },
    full:     { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  label: 'Full Day' },
    half:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Half Day' },
    absent:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Absent' },
    Admin:    { color: '#7C5CFC', bg: 'rgba(124,92,252,0.12)',  label: 'Admin' },
    Member:   { color: '#0AE8D0', bg: 'rgba(10,232,208,0.10)',  label: 'Member' },
  };
  const s = map[status] ?? { color: '#8896B0', bg: 'rgba(136,150,176,0.10)', label: status };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
      color: s.color, background: s.bg, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(13,16,37,0.80)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(148,163,184,0.08)', borderRadius: 16, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: '#EEF2F6', margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: '#4B5678', marginTop: 3 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export default function AdminControlPanel({
  onDashboard,
  currentUser,
}: {
  onDashboard?: () => void;
  currentUser?: { name: string; email: string; role: string; initials: string } | null;
}) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');

  const token = typeof window !== 'undefined' ? getToken() : null;
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`${API}/api/admin/users`, { headers }).catch(() => null);
    if (res?.ok) { const d = await res.json(); setUsers(Array.isArray(d) ? d : d.users ?? []); }
  }, []);
  const fetchLeaves = useCallback(async () => {
    const res = await fetch(`${API}/api/leaves`, { headers }).catch(() => null);
    if (res?.ok) { const d = await res.json(); setLeaves(Array.isArray(d) ? d : d.leaves ?? []); }
  }, []);
  const fetchAttendance = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${API}/api/activity/attendance?date=${today}`, { headers }).catch(() => null);
    if (res?.ok) { const d = await res.json(); setAttendance(Array.isArray(d) ? d : d.records ?? []); }
  }, []);
  const fetchChannels = useCallback(async () => {
    const res = await fetch(`${API}/api/channels`, { headers }).catch(() => null);
    if (res?.ok) { const d = await res.json(); setChannels(Array.isArray(d) ? d : d.channels ?? []); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchLeaves(), fetchAttendance(), fetchChannels()]).finally(() => setLoading(false));
  }, []);

  const handleLeaveAction = async (id: string, action: 'approved' | 'rejected') => {
    const res = await fetch(`${API}/api/leaves/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: action }) }).catch(() => null);
    if (res?.ok) { toast.success(`Leave ${action}`); setLeaves(p => p.map(l => l.id === id ? { ...l, status: action } : l)); }
    else toast.error('Action failed');
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const res = await fetch(`${API}/api/admin/users/${userId}/role`, { method: 'PATCH', headers, body: JSON.stringify({ role: newRole }) }).catch(() => null);
    if (res?.ok) { toast.success('Role updated'); setUsers(p => p.map(u => u.id === userId ? { ...u, role: newRole } : u)); }
    else toast.error('Failed');
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    const res = await fetch(`${API}/api/admin/users/${userId}`, { method: 'DELETE', headers }).catch(() => null);
    if (res?.ok) { toast.success('User removed'); setUsers(p => p.filter(u => u.id !== userId)); }
    else toast.error('Failed');
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) { toast.error('Channel name required'); return; }
    const res = await fetch(`${API}/api/channels`, { method: 'POST', headers, body: JSON.stringify({ name: newChannelName.trim(), description: newChannelDesc.trim() }) }).catch(() => null);
    if (res?.ok) { toast.success('Channel created'); setNewChannelName(''); setNewChannelDesc(''); fetchChannels(); }
    else toast.error('Failed');
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`Delete #${name}?`)) return;
    const res = await fetch(`${API}/api/channels/${id}`, { method: 'DELETE', headers }).catch(() => null);
    if (res?.ok) { toast.success('Channel deleted'); setChannels(p => p.filter(c => (c._id ?? c.id) !== id)); }
  };

  const presentCount = attendance.filter(a => a.attendance === 'full' || a.attendance === 'half').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const totalAdmins = users.filter(u => u.role === 'Admin').length;
  const filteredUsers = users.filter(u =>
    userSearch === '' ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100%', background: '#06080F', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'rgba(13,16,37,0.95)', borderRight: '1px solid rgba(148,163,184,0.07)',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#0AE8D0,#06B8A5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={15} color="#06080F" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#EEF2F6', lineHeight: 1 }}>Admin Panel</div>
              <div style={{ fontSize: 10, color: '#4B5678', marginTop: 2 }}>EduTechExOS</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV.map(({ id, label, icon: Icon, accent }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
                borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                background: active ? `${accent}18` : 'transparent',
                transition: 'background .15s',
              }}
                onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.background = 'rgba(148,163,184,0.05)')}
                onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: active ? `${accent}22` : 'rgba(148,163,184,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} color={active ? accent : '#4B5678'} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? '#EEF2F6' : '#8896B0', flex: 1 }}>
                  {label}
                </span>
                {id === 'leave' && pendingLeaves > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#06080F', background: '#F59E0B', padding: '1px 6px', borderRadius: 20 }}>
                    {pendingLeaves}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(148,163,184,0.06)' }}>
          <button onClick={onDashboard} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(148,163,184,0.05)',
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(148,163,184,0.09)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(148,163,184,0.05)')}
          >
            <ArrowLeft size={13} color="#4B5678" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#4B5678' }}>Back to Dashboard</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

        {/* ════ OVERVIEW ════ */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader
              title="Overview"
              sub={`Platform snapshot · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            />

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Users',    value: users.length,    icon: Users,      accent: '#7C5CFC', sub: `${totalAdmins} admins` },
                { label: 'Present Today',  value: presentCount,    icon: UserCheck,  accent: '#0AE8D0', sub: `${users.length ? Math.round(presentCount/users.length*100) : 0}% rate` },
                { label: 'Leave Pending',  value: pendingLeaves,   icon: CalendarOff,accent: '#F59E0B', sub: 'Action needed' },
                { label: 'Channels',       value: channels.filter(c => (c as any).type !== 'dm').length, icon: Hash, accent: '#10B981', sub: 'Active' },
              ].map(({ label, value, icon: Icon, accent, sub }, i) => (
                <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <Card style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: -10, top: -10, width: 70, height: 70, borderRadius: '50%', background: `${accent}0d` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#4B5678' }}>{label}</span>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={13} color={accent} />
                      </div>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: '#EEF2F6', lineHeight: 1, marginBottom: 5 }}>
                      {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#4B5678" /> : value}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: accent }}>{sub}</div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Two column lower */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Recent members */}
              <Card>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(148,163,184,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#EEF2F6' }}>Recent Members</span>
                  <button onClick={() => setTab('users')} style={{ fontSize: 11, color: '#0AE8D0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    View all →
                  </button>
                </div>
                <div style={{ padding: '8px 10px' }}>
                  {users.slice(0, 5).map((u, i) => (
                    <motion.div key={u.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10, marginBottom: 2,
                        transition: 'background .12s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(148,163,184,0.04)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <Avatar name={u.name} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#EEF2F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                        <div style={{ fontSize: 10.5, color: '#4B5678', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      </div>
                      <StatusBadge status={u.role} />
                    </motion.div>
                  ))}
                </div>
              </Card>

              {/* Pending leaves */}
              <Card>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(148,163,184,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#EEF2F6' }}>Pending Approvals</span>
                  {pendingLeaves > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '2px 10px', borderRadius: 20 }}>
                      {pendingLeaves} waiting
                    </span>
                  )}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  {leaves.filter(l => l.status === 'pending').slice(0, 3).length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#4B5678', fontSize: 12 }}>
                      <CheckCircle2 size={24} style={{ margin: '0 auto 8px', color: '#10B981' }} />
                      All caught up!
                    </div>
                  ) : leaves.filter(l => l.status === 'pending').slice(0, 3).map(l => (
                    <div key={l.id} style={{
                      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
                      borderRadius: 12, padding: '10px 12px', marginBottom: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#EEF2F6' }}>{l.name ?? l.email}</span>
                        <span style={{ fontSize: 10, color: '#4B5678' }}>{l.requestedAt?.slice(0, 10) ?? ''}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#8896B0', marginBottom: 8 }}>
                        {l.startDate?.slice(0, 10)} → {l.endDate?.slice(0, 10)} · {l.leaveCategory ?? l.type}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleLeaveAction(l.id, 'approved')} style={{
                          flex: 1, padding: '5px 0', background: 'rgba(16,185,129,0.15)', color: '#10B981',
                          border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>
                          Approve
                        </button>
                        <button onClick={() => handleLeaveAction(l.id, 'rejected')} style={{
                          flex: 1, padding: '5px 0', background: 'rgba(239,68,68,0.10)', color: '#EF4444',
                          border: '1px solid rgba(239,68,68,0.20)', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ════ USERS ════ */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader
              title="User Management"
              sub={`${users.length} members · ${totalAdmins} admins`}
              action={
                <button onClick={fetchUsers} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  background: 'rgba(10,232,208,0.10)', color: '#0AE8D0', border: '1px solid rgba(10,232,208,0.20)',
                  borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              }
            />

            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12,
              background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.08)', marginBottom: 16 }}>
              <Search size={13} color="#4B5678" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: '#EEF2F6', caretColor: '#0AE8D0' }} />
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px 80px 40px', gap: 0,
              padding: '6px 14px', marginBottom: 4 }}>
              {['Name', 'Email', 'Role', 'Joined', 'Source', ''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#4B5678' }}>{h}</span>
              ))}
            </div>

            {filteredUsers.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card style={{ marginBottom: 6, borderRadius: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px 80px 40px', gap: 0,
                    padding: '10px 14px', alignItems: 'center' }}>
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.name} size={30} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#EEF2F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                    </div>
                    {/* Email */}
                    <span style={{ fontSize: 11.5, color: '#4B5678', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                    {/* Role */}
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} style={{
                      padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.12)',
                      fontSize: 11.5, color: '#EEF2F6', background: 'rgba(148,163,184,0.06)', cursor: 'pointer', fontWeight: 600, outline: 'none',
                    }}>
                      <option value="Member" style={{ background: '#0D1025' }}>Member</option>
                      <option value="Admin" style={{ background: '#0D1025' }}>Admin</option>
                    </select>
                    {/* Joined */}
                    <span style={{ fontSize: 11, color: '#4B5678' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                    {/* Source */}
                    <span style={{ fontSize: 10, fontWeight: 600, color: u.source === 'system' ? '#7C5CFC' : '#0AE8D0',
                      background: u.source === 'system' ? 'rgba(124,92,252,0.10)' : 'rgba(10,232,208,0.08)',
                      padding: '2px 8px', borderRadius: 20 }}>
                      {u.source ?? 'db'}
                    </span>
                    {/* Delete */}
                    <button onClick={() => handleDeleteUser(u.id, u.name)} title="Remove"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
                        background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                      <Trash2 size={12} color="#EF4444" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ════ ATTENDANCE ════ */}
        {tab === 'attendance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader
              title="Today's Attendance"
              sub={`${presentCount} present · ${attendance.filter(a => a.attendance === 'absent').length} absent · ${new Date().toLocaleDateString()}`}
              action={
                <button onClick={fetchAttendance} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  background: 'rgba(10,232,208,0.10)', color: '#0AE8D0', border: '1px solid rgba(10,232,208,0.20)',
                  borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              }
            />

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Full Day',  count: attendance.filter(a => a.attendance === 'full').length,   accent: '#10B981' },
                { label: 'Half Day',  count: attendance.filter(a => a.attendance === 'half').length,   accent: '#F59E0B' },
                { label: 'Absent',    count: attendance.filter(a => a.attendance === 'absent').length, accent: '#EF4444' },
              ].map(({ label, count, accent }) => (
                <Card key={label} style={{ padding: '14px 18px', borderTop: `2px solid ${accent}` }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8896B0', marginTop: 4 }}>{label}</div>
                </Card>
              ))}
            </div>

            {attendance.map((a, i) => (
              <motion.div key={`${a.email}-${a.loginAt ?? i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card style={{ marginBottom: 6, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <Avatar name={a.name ?? a.email} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#EEF2F6' }}>{a.name ?? a.email}</div>
                      <div style={{ fontSize: 10.5, color: '#4B5678' }}>{a.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4B5678', fontSize: 11.5 }}>
                      <Clock size={11} />
                      <span>{a.hoursWorked ? `${a.hoursWorked.toFixed(1)}h` : '—'}</span>
                    </div>
                    <StatusBadge status={a.attendance} />
                  </div>
                </Card>
              </motion.div>
            ))}

            {attendance.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#4B5678' }}>
                <Activity size={36} style={{ margin: '0 auto 10px', opacity: .4 }} />
                <div style={{ fontSize: 13 }}>No attendance records for today</div>
              </div>
            )}
          </motion.div>
        )}

        {/* ════ LEAVE ════ */}
        {tab === 'leave' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader title="Leave Approvals" sub={`${pendingLeaves} requests awaiting your action`} />

            {(['pending', 'approved', 'rejected'] as const).map(status => {
              const filtered = leaves.filter(l => l.status === status);
              if (filtered.length === 0) return null;
              const cfg = {
                pending:  { accent: '#F59E0B', label: 'Awaiting Approval' },
                approved: { accent: '#10B981', label: 'Approved' },
                rejected: { accent: '#EF4444', label: 'Declined' },
              }[status];
              return (
                <div key={status} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: cfg.accent }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: cfg.accent }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 10, color: '#4B5678', fontWeight: 600 }}>({filtered.length})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 10 }}>
                    {filtered.map((l, i) => (
                      <motion.div key={l.id} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                        <Card style={{ padding: '14px 16px', borderTop: `2px solid ${cfg.accent}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar name={l.name ?? l.email} size={28} />
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#EEF2F6' }}>{l.name ?? l.email}</div>
                                <div style={{ fontSize: 10, color: '#4B5678' }}>{l.email}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: 9.5, color: '#4B5678' }}>{l.requestedAt?.slice(0, 10) ?? ''}</span>
                          </div>
                          <div style={{ background: 'rgba(148,163,184,0.05)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#8896B0', marginBottom: 3 }}>
                              {l.leaveCategory ?? l.type} · {l.startDate?.slice(0, 10)} → {l.endDate?.slice(0, 10)}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#EEF2F6' }}>{l.reason}</div>
                          </div>
                          {status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleLeaveAction(l.id, 'approved')} style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                padding: '6px 0', background: 'rgba(16,185,129,0.12)', color: '#10B981',
                                border: '1px solid rgba(16,185,129,0.25)', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              }}>
                                <Check size={11} /> Approve
                              </button>
                              <button onClick={() => handleLeaveAction(l.id, 'rejected')} style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                padding: '6px 0', background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                                border: '1px solid rgba(239,68,68,0.18)', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              }}>
                                <X size={11} /> Decline
                              </button>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ════ CHANNELS ════ */}
        {tab === 'channels' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader title="Channel Management" sub={`${channels.filter(c => (c as any).type !== 'dm').length} workspace channels`} />

            {/* Create */}
            <Card style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#EEF2F6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} color="#0AE8D0" /> Create New Channel
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  placeholder="channel-name"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.12)',
                    background: 'rgba(148,163,184,0.05)', color: '#EEF2F6', fontSize: 12.5, outline: 'none' }} />
                <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  style={{ flex: 2, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.12)',
                    background: 'rgba(148,163,184,0.05)', color: '#EEF2F6', fontSize: 12.5, outline: 'none' }} />
                <button onClick={handleCreateChannel} style={{
                  padding: '8px 18px', background: 'linear-gradient(135deg,#0AE8D0,#06B8A5)',
                  color: '#06080F', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  Create
                </button>
              </div>
            </Card>

            {channels.filter(c => (c as any).type !== 'dm').map((ch, i) => (
              <motion.div key={ch._id ?? ch.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card style={{ marginBottom: 6, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(16,185,129,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Hash size={14} color="#10B981" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#EEF2F6' }}>{ch.name}</div>
                      <div style={{ fontSize: 11, color: '#4B5678' }}>{ch.description ?? 'No description'}</div>
                    </div>
                    {ch.isPrivate !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {ch.isPrivate ? <Lock size={11} color="#F59E0B" /> : <Globe size={11} color="#10B981" />}
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: ch.isPrivate ? '#F59E0B' : '#10B981' }}>
                          {ch.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>
                    )}
                    <button onClick={() => handleDeleteChannel(ch._id ?? ch.id, ch.name)} style={{
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 8, cursor: 'pointer',
                    }}>
                      <Trash2 size={12} color="#EF4444" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ════ ANALYTICS ════ */}
        {tab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader title="Platform Analytics" sub="Usage metrics and workspace health" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Members', value: users.length, icon: Users, accent: '#7C5CFC' },
                { label: 'Active Channels', value: channels.filter(c => (c as any).type !== 'dm').length, icon: Hash, accent: '#10B981' },
                { label: 'Attendance Rate', value: users.length ? `${Math.round(presentCount/users.length*100)}%` : '—', icon: Activity, accent: '#0AE8D0' },
                { label: 'Leave Pending', value: pendingLeaves, icon: CalendarOff, accent: '#F59E0B' },
                { label: 'Admins', value: totalAdmins, icon: Shield, accent: '#EF4444' },
                { label: 'Half Day', value: attendance.filter(a => a.attendance === 'half').length, icon: Clock, accent: '#8B5CF6' },
              ].map(({ label, value, icon: Icon, accent }, i) => (
                <motion.div key={label} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
                  <Card style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Icon size={18} color={accent} />
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#EEF2F6', lineHeight: 1, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 11.5, color: '#4B5678', fontWeight: 500 }}>{label}</div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Role distribution */}
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#EEF2F6', marginBottom: 14 }}>Role Distribution</div>
              {[
                { role: 'Admin', accent: '#7C5CFC' },
                { role: 'Member', accent: '#0AE8D0' },
              ].map(({ role, accent }) => {
                const count = users.filter(u => u.role === role).length;
                const pct = users.length ? (count / users.length) * 100 : 0;
                return (
                  <div key={role} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#8896B0' }}>{role}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(148,163,184,0.08)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 3, background: accent }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          </motion.div>
        )}

        {/* ════ NOTIFICATIONS ════ */}
        {tab === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader title="Broadcast Message" sub="Send an announcement to all workspace members" />

            <Card style={{ padding: 20, maxWidth: 560 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#4B5678', display: 'block', marginBottom: 7 }}>Title</label>
                  <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                    placeholder="e.g. Team meeting at 3 PM today"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.12)',
                      background: 'rgba(148,163,184,0.05)', color: '#EEF2F6', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#4B5678', display: 'block', marginBottom: 7 }}>Message</label>
                  <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} rows={4}
                    placeholder="Write your announcement…"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.12)',
                      background: 'rgba(148,163,184,0.05)', color: '#EEF2F6', fontSize: 13, outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => { toast.success('Broadcast sent!'); setNotifTitle(''); setNotifBody(''); }} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px 20px', background: 'linear-gradient(135deg,#0AE8D0,#06B8A5)',
                  color: '#06080F', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: 'fit-content',
                }}>
                  <Zap size={13} /> Send to All Members
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ════ SETTINGS ════ */}
        {tab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <SectionHeader title="Workspace Settings" sub="Configure your EduTechExOS workspace" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
              {[
                { label: 'Workspace Name', desc: 'Displayed to all members', val: 'EduTechExOS', icon: Edit3 },
                { label: 'Admin Email', desc: 'Primary contact address', val: currentUser?.email ?? '', icon: Mail },
              ].map(({ label, desc, val, icon: Icon }) => (
                <Card key={label} style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(10,232,208,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color="#0AE8D0" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#EEF2F6', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#4B5678', marginBottom: 10 }}>{desc}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input defaultValue={val} style={{ flex: 1, padding: '8px 12px', borderRadius: 9,
                          border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(148,163,184,0.05)',
                          color: '#EEF2F6', fontSize: 12.5, outline: 'none' }} />
                        <button onClick={() => toast.success('Saved!')} style={{
                          padding: '7px 16px', background: 'rgba(10,232,208,0.12)', color: '#0AE8D0',
                          border: '1px solid rgba(10,232,208,0.20)', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Danger zone */}
              <Card style={{ padding: '16px 18px', borderColor: 'rgba(239,68,68,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#EF4444" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>Danger Zone</span>
                </div>
                <p style={{ fontSize: 11.5, color: '#4B5678', margin: '0 0 12px' }}>
                  These actions are destructive and cannot be undone.
                </p>
                <button onClick={() => toast.error('Contact platform support to reset workspace.')} style={{
                  padding: '7px 16px', background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.18)', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  Reset Workspace Data
                </button>
              </Card>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
