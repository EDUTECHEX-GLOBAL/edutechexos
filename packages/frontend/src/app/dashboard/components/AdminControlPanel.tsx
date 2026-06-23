'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Users, ClipboardList, CalendarOff, Hash, BarChart2,
  Settings, Bell, Shield, CheckCircle2, XCircle, AlertCircle,
  Trash2, RefreshCw, TrendingUp, Activity, Clock, UserCheck,
  ChevronRight, Search, Download, Filter,
} from 'lucide-react';
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
  _id: string; email: string; name: string; date: string;
  attendance: 'full' | 'half' | 'absent' | 'pending'; hoursWorked: number;
}
interface Channel { _id?: string; id: string; name: string; description?: string; isPrivate?: boolean; memberCount?: number; }

const TABS: { id: AdminTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'overview',       label: 'Overview',         icon: BarChart2,    color: '#0D9488' },
  { id: 'users',          label: 'Users',            icon: Users,        color: '#7C3AED' },
  { id: 'attendance',     label: 'Attendance',       icon: UserCheck,    color: '#0369A1' },
  { id: 'leave',          label: 'Leave Approvals',  icon: CalendarOff,  color: '#F59E0B' },
  { id: 'channels',       label: 'Channels',         icon: Hash,         color: '#10B981' },
  { id: 'analytics',      label: 'Analytics',        icon: TrendingUp,   color: '#EF4444' },
  { id: 'notifications',  label: 'Notifications',    icon: Bell,         color: '#8B5CF6' },
  { id: 'settings',       label: 'Settings',         icon: Settings,     color: '#64748B' },
];

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

  const token = typeof window !== 'undefined' ? getToken() : null;
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users ?? []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/leaves`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaves(Array.isArray(data) ? data : data.leaves ?? []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API}/api/activity/attendance?date=${today}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : data.records ?? []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/channels`, { headers });
      if (res.ok) setChannels(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchLeaves(), fetchAttendance(), fetchChannels()])
      .finally(() => setLoading(false));
  }, []);

  const handleLeaveAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`${API}/api/leaves/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        toast.success(`Leave ${action}`);
        setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: action } : l));
      } else toast.error('Action failed');
    } catch { toast.error('Network error'); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/role`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success('Role updated');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch { toast.error('Network error'); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}`, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success('User removed');
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch { toast.error('Network error'); }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) { toast.error('Channel name required'); return; }
    try {
      const res = await fetch(`${API}/api/channels`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: newChannelName.trim(), description: newChannelDesc.trim() }),
      });
      if (res.ok) {
        toast.success(`Channel created`);
        setNewChannelName(''); setNewChannelDesc('');
        fetchChannels();
      }
    } catch { toast.error('Network error'); }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`Delete #${name}?`)) return;
    try {
      const res = await fetch(`${API}/api/channels/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success(`Channel deleted`);
        setChannels(prev => prev.filter(c => (c._id ?? c.id) !== id));
      }
    } catch { toast.error('Network error'); }
  };

  const presentCount = attendance.filter(a => a.attendance === 'full' || a.attendance === 'half').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const totalAdmins = users.filter(u => u.role === 'Admin').length;

  const statCards = [
    { label: 'Total Users', value: users.length, icon: Users, color: '#7C3AED', trend: '+3 this month' },
    { label: 'Present Today', value: presentCount, icon: UserCheck, color: '#0D9488', trend: '94% rate' },
    { label: 'Leave Pending', value: pendingLeaves, icon: CalendarOff, color: '#F59E0B', trend: 'Action needed' },
    { label: 'Admins', value: totalAdmins, icon: Shield, color: '#EF4444', trend: 'This workspace' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ height: 56, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
        <button
          onClick={onDashboard}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 6,
            border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', lineHeight: 1,
          }}
          title="Back to dashboard"
        >
          <ArrowLeft size={14} /> Dashboard
        </button>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>/</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Admin Control</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#94A3B8', background: '#F1F5F9', padding: '3px 10px', borderRadius: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {currentUser?.role}
        </span>
      </header>

      {/* Tabs */}
      <div style={{ height: 48, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', overflow: 'auto', padding: '0 20px' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = tab === id;
          if (id === 'analytics' && currentUser?.role !== 'Admin') return null;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0D9488' : '#64748B', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? '2px solid #0D9488' : '2px solid transparent', lineHeight: 1, whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />
              {label}
              {id === 'leave' && pendingLeaves > 0 && (
                <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, background: '#F59E0B', color: '#fff', padding: '0 6px', borderRadius: 10 }}>{pendingLeaves}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div>
            <div style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Overview</h2>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>Platform health at a glance · {new Date().toLocaleDateString()}</p>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {statCards.map(({ label, value, icon: Icon, color, trend }) => (
                <div key={label} style={{
                  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#94A3B8' }}>{label}</span>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={13} style={{ color }} />
                    </span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', lineHeight: 1, marginBottom: 4 }}>{loading ? '…' : value}</div>
                  <div style={{ fontSize: 11, color: color, fontWeight: 600 }}>{trend}</div>
                </div>
              ))}
            </div>

            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Recent Members</span>
                  <button style={{ fontSize: 11, fontWeight: 600, color: '#0D9488', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
                </div>
                <div style={{ padding: 8 }}>
                  {users.slice(0, 4).map(u => (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                      background: '#F8FAFC', marginBottom: 6, border: '1px solid #E2E8F0',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#ECFDF5', color: '#059669',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                        fontWeight: 700, flexShrink: 0,
                      }}>
                        {u.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>{u.email}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: u.role === 'Admin' ? '#7C3AED' : '#0D9488',
                        background: u.role === 'Admin' ? '#F5F3FF' : '#F0FDF9', padding: '2px 8px', borderRadius: 4,
                      }}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Pending Approvals</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '2px 8px', borderRadius: 4 }}>
                    {pendingLeaves} waiting
                  </span>
                </div>
                <div style={{ padding: 10 }}>
                  {leaves.filter(l => l.status === 'pending').slice(0, 2).map(l => (
                    <div key={l.id} style={{
                      background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, marginBottom: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{l.name ?? l.email}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#92400E', background: '#FEF3C7', padding: '1px 7px', borderRadius: 3 }}>Pending</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#92400E', marginBottom: 8 }}>
                        {l.startDate?.slice(0, 10)} – {l.endDate?.slice(0, 10)}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleLeaveAction(l.id, 'approved')}
                          style={{
                            flex: 1, padding: '5px 10px', background: '#0D9488', color: '#fff', border: 'none',
                            borderRadius: 6, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleLeaveAction(l.id, 'rejected')}
                          style={{
                            flex: 1, padding: '5px 10px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                            borderRadius: 6, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>User Management</h2>
                <p style={{ fontSize: 12, color: '#94A3B8' }}>{users.length} members in workspace</p>
              </div>
              <button
                onClick={fetchUsers}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#0D9488', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {users.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 8,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#ECFDF5', color: '#059669',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {u.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</div>
                </div>
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 11,
                    color: '#0F172A', background: '#fff', cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  <option>Member</option>
                  <option>Admin</option>
                </select>
                <span style={{ fontSize: 11, color: '#94A3B8', minWidth: 70, textAlign: 'right' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                </span>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  style={{
                    padding: '5px 9px', background: '#FEF2F2', color: '#DC2626', border: 'none',
                    borderRadius: 6, cursor: 'pointer', fontSize: 11,
                  }}
                  title="Remove user"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Attendance ── */}
        {tab === 'attendance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Today's Attendance</h2>
                <p style={{ fontSize: 12, color: '#94A3B8' }}>
                  {presentCount} present · {attendance.filter(a => a.attendance === 'absent').length} absent
                </p>
              </div>
              <button
                onClick={fetchAttendance}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#0D9488', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Full Day', count: attendance.filter(a => a.attendance === 'full').length, color: '#0D9488', bg: '#F0FDF9' },
                { label: 'Half Day', count: attendance.filter(a => a.attendance === 'half').length, color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Absent', count: attendance.filter(a => a.attendance === 'absent').length, color: '#EF4444', bg: '#FEF2F2' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${color}30` }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color, opacity: .75, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {attendance.map(a => {
              const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                full: { label: 'Full Day', color: '#0D9488', bg: '#F0FDF9' },
                half: { label: 'Half Day', color: '#F59E0B', bg: '#FFFBEB' },
                absent: { label: 'Absent', color: '#EF4444', bg: '#FEF2F2' },
                pending: { label: 'Pending', color: '#94A3B8', bg: '#F8FAFC' },
              };
              const s = statusMap[a.attendance] ?? statusMap.pending;
              return (
                <div key={`${a.email}-${a.loginAt}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                  background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 8,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#ECFDF5', color: '#059669',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {(a.name ?? a.email).split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{a.name ?? a.email}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{a.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 11 }}>
                    <Clock size={12} /> {a.hoursWorked ? `${a.hoursWorked.toFixed(1)}h` : '—'}
                  </div>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, color: s.color, background: s.bg, padding: '2px 10px', borderRadius: 4,
                  }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Leave ── */}
        {tab === 'leave' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Leave Approvals</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>{pendingLeaves} requests awaiting approval</p>

            {['pending', 'approved', 'rejected'].map(status => {
              const filtered = leaves.filter(l => l.status === status);
              if (filtered.length === 0) return null;
              const cfg: Record<string, { label: string; color: string; bg: string; border: string }> = {
                pending: { label: 'Pending', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
                approved: { label: 'Approved', color: '#059669', bg: '#F0FDF9', border: '#A7F3D0' },
                rejected: { label: 'Rejected', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
              };
              const c = cfg[status];
              return (
                <div key={status} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: c.color, marginBottom: 10 }}>
                    {c.label} ({filtered.length})
                  </div>
                  {filtered.map(l => (
                    <div key={l.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{l.name ?? l.email}</span>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>{l.requestedAt?.slice(0, 10)}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 4 }}>
                        {l.startDate?.slice(0, 10)} → {l.endDate?.slice(0, 10)} · <strong>{l.leaveCategory ?? l.type}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: status === 'pending' ? 10 : 0 }}>{l.reason}</div>
                      {status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleLeaveAction(l.id, 'approved')}
                            style={{
                              flex: 1, padding: '6px 12px', background: '#0D9488', color: '#fff', border: 'none',
                              borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleLeaveAction(l.id, 'rejected')}
                            style={{
                              flex: 1, padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                              borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Channels ── */}
        {tab === 'channels' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Channel Management</h2>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Create New Channel</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <input
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0',
                    fontSize: 12, background: '#F8FAFC', color: '#0F172A', outline: 'none',
                  }}
                />
                <input
                  placeholder="Description (optional)"
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  style={{
                    flex: 1.5, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0',
                    fontSize: 12, background: '#F8FAFC', color: '#0F172A', outline: 'none',
                  }}
                />
                <button
                  onClick={handleCreateChannel}
                  style={{
                    padding: '6px 16px', background: '#0D9488', color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Create
                </button>
              </div>
            </div>

            {channels.map(ch => (
              <div key={ch._id ?? ch.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: '#F0FDF9', color: '#0D9488',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  #
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{ch.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{ch.description ?? 'No description'}</div>
                </div>
                {ch.isPrivate !== undefined && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, color: ch.isPrivate ? '#92400E' : '#059669',
                    background: ch.isPrivate ? '#FEF3C7' : '#F0FDF9', padding: '2px 10px', borderRadius: 4,
                  }}>
                    {ch.isPrivate ? 'Private' : 'Public'}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteChannel(ch._id ?? ch.id, ch.name)}
                  style={{
                    padding: '5px 9px', background: '#FEF2F2', color: '#DC2626', border: 'none',
                    borderRadius: 6, cursor: 'pointer', fontSize: 11,
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Analytics ── */}
        {tab === 'analytics' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Platform Analytics</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Usage statistics and trends</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Members', value: users.length, icon: Users, color: '#7C3AED' },
                { label: 'Active Channels', value: channels.length, icon: Hash, color: '#10B981' },
                { label: 'Attendance Rate', value: users.length ? `${Math.round((presentCount / users.length) * 100)}%` : '—', icon: Activity, color: '#0D9488' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18, textAlign: 'center' }}>
                  <Icon size={20} style={{ color, margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', lineHeight: 1, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === 'notifications' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Send Notifications</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Broadcast messages to members</p>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', marginBottom: 6, display: 'block' }}>Title</label>
                  <input placeholder="Notification title" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 12, background: '#F8FAFC', color: '#0F172A', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', marginBottom: 6, display: 'block' }}>Message</label>
                  <textarea placeholder="Write your message" rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 12, background: '#F8FAFC', color: '#0F172A', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                <button onClick={() => toast.success('Notification sent!')} style={{ padding: '8px 16px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Settings ── */}
        {tab === 'settings' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Settings</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Configure workspace preferences</p>
            {[
              { label: 'Workspace Name', desc: 'Shown to all members', val: 'EduTechExOS' },
              { label: 'Admin Email', desc: 'Primary contact', val: currentUser?.email ?? '' },
            ].map(({ label, desc, val }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>{desc}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input defaultValue={val} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 12, color: '#0F172A', background: '#F8FAFC', outline: 'none' }} />
                  <button onClick={() => toast.success('Saved!')} style={{ padding: '6px 14px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
