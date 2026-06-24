'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, ClipboardList, CalendarOff, Hash, BarChart2,
  Settings, Bell, Shield, ChevronRight, CheckCircle2,
  XCircle, AlertCircle, UserPlus, Trash2, RefreshCw,
  TrendingUp, Activity, Clock, UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

function getToken() {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}

type AdminSection = 'overview' | 'users' | 'attendance' | 'leave' | 'channels' | 'analytics' | 'notifications' | 'settings';

interface UserRecord {
  _id: string; name: string; email: string; role: string; createdAt: string;
}
interface LeaveRequest {
  _id: string; employeeEmail: string; employeeName?: string;
  startDate: string; endDate: string; reason: string; leaveType: string;
  status: 'pending' | 'approved' | 'rejected'; createdAt: string;
}
interface AttendanceRecord {
  _id: string; email: string; name: string; date: string;
  attendance: 'full' | 'half' | 'absent' | 'pending'; hoursWorked: number;
}
interface Channel {
  _id?: string; id: string; name: string; description?: string; isPrivate?: boolean; memberCount?: number;
}

const NAV_ITEMS: { id: AdminSection; icon: React.ElementType; label: string; color: string }[] = [
  { id: 'overview',       icon: BarChart2,    label: 'Overview',      color: '#0F766E' },
  { id: 'users',          icon: Users,         label: 'Users',         color: '#7C3AED' },
  { id: 'attendance',     icon: UserCheck,     label: 'Attendance',    color: '#0EA5E9' },
  { id: 'leave',          icon: CalendarOff,   label: 'Leave Approvals', color: '#F59E0B' },
  { id: 'channels',       icon: Hash,          label: 'Channels',      color: '#10B981' },
  { id: 'analytics',      icon: TrendingUp,    label: 'Analytics',     color: '#EF4444' },
  { id: 'notifications',  icon: Bell,          label: 'Notifications', color: '#8B5CF6' },
  { id: 'settings',       icon: Settings,      label: 'Settings',      color: '#64748B' },
];

export default function AdminPanelV2({ currentUser }: { currentUser: { name: string; email: string; role: string; initials: string } | null }) {
  const [section, setSection] = useState<AdminSection>('overview');
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
      if (res.ok) setUsers(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/leave/all`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaves(Array.isArray(data) ? data : data.leaves ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API}/api/attendance/admin/all?date=${today}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : data.records ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/channels`, { headers });
      if (res.ok) setChannels(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchLeaves(), fetchAttendance(), fetchChannels()])
      .finally(() => setLoading(false));
  }, []);

  const handleLeaveAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`${API}/api/leave/${id}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        toast.success(`Leave ${action}`);
        setLeaves(prev => prev.map(l => l._id === id ? { ...l, status: action } : l));
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
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      } else toast.error('Failed to update role');
    } catch { toast.error('Network error'); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}`, { method: 'DELETE', headers });
      if (res.ok) { toast.success('User removed'); setUsers(prev => prev.filter(u => u._id !== userId)); }
      else toast.error('Failed to delete user');
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
        toast.success(`#${newChannelName} created`);
        setNewChannelName(''); setNewChannelDesc('');
        fetchChannels();
      } else toast.error('Failed to create channel');
    } catch { toast.error('Network error'); }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`Delete #${name}?`)) return;
    try {
      const res = await fetch(`${API}/api/channels/${id}`, { method: 'DELETE', headers });
      if (res.ok) { toast.success(`#${name} deleted`); setChannels(prev => prev.filter(c => (c._id ?? c.id) !== id)); }
      else toast.error('Failed to delete channel');
    } catch { toast.error('Network error'); }
  };

  const presentCount = attendance.filter(a => a.attendance === 'full' || a.attendance === 'half').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const totalAdmins = users.filter(u => u.role === 'Admin').length;

  const statCards = [
    { label: 'Total Users', value: users.length, icon: Users, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Present Today', value: presentCount, icon: UserCheck, color: '#0F766E', bg: '#F0FDF9' },
    { label: 'Leave Pending', value: pendingLeaves, icon: CalendarOff, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Admins', value: totalAdmins, icon: Shield, color: '#EF4444', bg: '#FEF2F2' },
  ];

  return (
    <div className="flex h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`
        .adm-section-btn { display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:500;color:#64748B;transition:all .15s;border:none;background:transparent;width:100%;text-align:left; }
        .adm-section-btn:hover { background:#F1F5F9;color:#0C2340; }
        .adm-section-btn.active { background:#F0FDF9;color:#0F766E;font-weight:700; }
        .adm-card { background:#fff;border-radius:12px;border:1px solid #E2E8F0;padding:16px; }
        .adm-table-row { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:#F8FAFC;border:1px solid #E2E8F0;margin-bottom:6px; }
        .adm-badge { display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px; }
        .adm-btn { display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;border:none;transition:all .15s; }
        .adm-btn:hover { opacity:.88; }
        .adm-input { width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid #E2E8F0;font-size:12px;background:#F8FAFC;color:#0C2340;outline:none; }
        .adm-input:focus { border-color:#0F766E;background:#fff; }
      `}</style>

      {/* Sub-sidebar */}
      <div style={{ width: 200, background: '#fff', borderRight: '1px solid #E2E8F0', flexShrink: 0, padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: '#CBD5E1', padding: '4px 6px 8px' }}>Admin Panel</div>
        {NAV_ITEMS.map(({ id, icon: Icon, label, color }) => (
          <button key={id} className={`adm-section-btn ${section === id ? 'active' : ''}`} onClick={() => setSection(id)}>
            <Icon size={15} style={{ color: section === id ? color : '#94A3B8', flexShrink: 0 }} />
            {label}
            {id === 'leave' && pendingLeaves > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, background: '#F59E0B', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>{pendingLeaves}</span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#F8FAFC' }}>

        {/* ── Overview ── */}
        {section === 'overview' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 4 }}>Admin Overview</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 18 }}>Platform health at a glance</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="adm-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} style={{ color }} />
                    </span>
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#0C2340', lineHeight: 1 }}>{loading ? '…' : value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="adm-card">
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0C2340', marginBottom: 12 }}>Recent Users</div>
                {users.slice(0, 5).map(u => (
                  <div key={u._id} className="adm-table-row">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#0F766E', flexShrink: 0 }}>
                      {u.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0C2340' }}>{u.name}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>{u.email}</div>
                    </div>
                    <span className="adm-badge" style={{ background: u.role === 'Admin' ? '#F5F3FF' : '#F0FDF9', color: u.role === 'Admin' ? '#7C3AED' : '#0F766E' }}>{u.role}</span>
                  </div>
                ))}
                {users.length === 0 && <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>Loading users…</div>}
              </div>

              <div className="adm-card">
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0C2340', marginBottom: 12 }}>Pending Leave Requests</div>
                {leaves.filter(l => l.status === 'pending').slice(0, 4).map(l => (
                  <div key={l._id} style={{ padding: '10px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0C2340' }}>{l.employeeName ?? l.employeeEmail}</span>
                      <span className="adm-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#92400E', marginBottom: 8 }}>{l.startDate?.slice(0, 10)} – {l.endDate?.slice(0, 10)} · {l.leaveType}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="adm-btn" style={{ background: '#0F766E', color: '#fff', flex: 1 }} onClick={() => handleLeaveAction(l._id, 'approved')}>
                        <CheckCircle2 size={11} /> Approve
                      </button>
                      <button className="adm-btn" style={{ background: '#FEF2F2', color: '#DC2626', flex: 1 }} onClick={() => handleLeaveAction(l._id, 'rejected')}>
                        <XCircle size={11} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
                {leaves.filter(l => l.status === 'pending').length === 0 && (
                  <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>No pending requests</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {section === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 2 }}>User Management</h2>
                <p style={{ fontSize: 11, color: '#94A3B8' }}>{users.length} members in workspace</p>
              </div>
              <button className="adm-btn" style={{ background: '#0F766E', color: '#fff' }} onClick={fetchUsers}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {users.map(u => (
              <div key={u._id} className="adm-table-row">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#0F766E', flexShrink: 0 }}>
                  {u.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0C2340' }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{u.email}</div>
                </div>
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u._id, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 11, color: '#0C2340', background: '#F8FAFC', cursor: 'pointer' }}
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
                <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 80, textAlign: 'right' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                </span>
                <button
                  className="adm-btn"
                  style={{ background: '#FEF2F2', color: '#DC2626', padding: '5px 9px' }}
                  onClick={() => handleDeleteUser(u._id)}
                  title="Remove user"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Attendance ── */}
        {section === 'attendance' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 2 }}>Today's Attendance</h2>
                <p style={{ fontSize: 11, color: '#94A3B8' }}>
                  {presentCount} present · {attendance.filter(a => a.attendance === 'absent').length} absent
                </p>
              </div>
              <button className="adm-btn" style={{ background: '#0F766E', color: '#fff' }} onClick={fetchAttendance}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Full Day', value: attendance.filter(a => a.attendance === 'full').length, color: '#0F766E', bg: '#F0FDF9' },
                { label: 'Half Day', value: attendance.filter(a => a.attendance === 'half').length, color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Absent', value: attendance.filter(a => a.attendance === 'absent').length, color: '#EF4444', bg: '#FEF2F2' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${color}30` }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color, opacity: .75, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {attendance.map(a => {
              const statusMap = { full: { label: 'Full Day', color: '#0F766E', bg: '#F0FDF9' }, half: { label: 'Half Day', color: '#F59E0B', bg: '#FFFBEB' }, absent: { label: 'Absent', color: '#EF4444', bg: '#FEF2F2' }, pending: { label: 'Pending', color: '#94A3B8', bg: '#F8FAFC' } };
              const s = statusMap[a.attendance] ?? statusMap.pending;
              return (
                <div key={a._id} className="adm-table-row">
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#0F766E', flexShrink: 0 }}>
                    {(a.name ?? a.email).split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0C2340' }}>{a.name ?? a.email}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{a.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: 11 }}>
                    <Clock size={12} /> {a.hoursWorked ? `${a.hoursWorked.toFixed(1)}h` : '—'}
                  </div>
                  <span className="adm-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                </div>
              );
            })}
            {attendance.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 12 }}>No attendance records for today</div>
            )}
          </div>
        )}

        {/* ── Leave ── */}
        {section === 'leave' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 4 }}>Leave Approvals</h2>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 18 }}>{pendingLeaves} requests awaiting approval</p>

            {['pending', 'approved', 'rejected'].map(status => {
              const filtered = leaves.filter(l => l.status === status);
              if (filtered.length === 0) return null;
              const cfgs: Record<string, { label: string; color: string; bg: string; border: string }> = {
                pending: { label: 'Pending', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
                approved: { label: 'Approved', color: '#065F46', bg: '#F0FDF9', border: '#A7F3D0' },
                rejected: { label: 'Rejected', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
              };
              const cfg = cfgs[status];
              return (
                <div key={status} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: cfg.color, marginBottom: 8 }}>{cfg.label}</div>
                  {filtered.map(l => (
                    <div key={l._id} style={{ background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.border}`, padding: 14, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0C2340' }}>{l.employeeName ?? l.employeeEmail}</span>
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>{l.createdAt?.slice(0, 10)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                        {l.startDate?.slice(0, 10)} → {l.endDate?.slice(0, 10)} · <strong>{l.leaveType}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: status === 'pending' ? 10 : 0 }}>
                        {l.reason}
                      </div>
                      {status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="adm-btn" style={{ background: '#0F766E', color: '#fff' }} onClick={() => handleLeaveAction(l._id, 'approved')}>
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button className="adm-btn" style={{ background: '#FEF2F2', color: '#DC2626' }} onClick={() => handleLeaveAction(l._id, 'rejected')}>
                            <XCircle size={12} /> Decline
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
        {section === 'channels' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 16 }}>Channel Management</h2>
            <div className="adm-card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0C2340', marginBottom: 12 }}>Create New Channel</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <input className="adm-input" placeholder="Channel name (e.g. curriculum)" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                </div>
                <div style={{ flex: 2 }}>
                  <input className="adm-input" placeholder="Description (optional)" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} />
                </div>
                <button className="adm-btn" style={{ background: '#0F766E', color: '#fff', flexShrink: 0 }} onClick={handleCreateChannel}>
                  <UserPlus size={13} /> Create
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {channels.map(ch => (
                <div key={ch._id ?? ch.id} className="adm-table-row">
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#0F766E', flexShrink: 0 }}>#</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0C2340' }}>{ch.name}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{ch.description ?? 'No description'}</div>
                  </div>
                  {ch.isPrivate !== undefined && (
                    <span className="adm-badge" style={{ background: ch.isPrivate ? '#FEF3C7' : '#F0FDF9', color: ch.isPrivate ? '#92400E' : '#0F766E' }}>
                      {ch.isPrivate ? 'Private' : 'Public'}
                    </span>
                  )}
                  <button className="adm-btn" style={{ background: '#FEF2F2', color: '#DC2626', padding: '5px 9px' }} onClick={() => handleDeleteChannel(ch._id ?? ch.id, ch.name)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {channels.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 12 }}>No channels found</div>}
            </div>
          </div>
        )}

        {/* ── Analytics ── */}
        {section === 'analytics' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 4 }}>Platform Analytics</h2>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 18 }}>Usage statistics and trends</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Members', value: users.length, icon: Users, color: '#7C3AED' },
                { label: 'Active Channels', value: channels.length, icon: Hash, color: '#10B981' },
                { label: 'Attendance Rate', value: users.length ? `${Math.round((presentCount / users.length) * 100)}%` : '—', icon: Activity, color: '#0F766E' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="adm-card" style={{ textAlign: 'center', padding: 20 }}>
                  <Icon size={24} style={{ color, margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#0C2340', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="adm-card">
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0C2340', marginBottom: 12 }}>Attendance Breakdown</div>
              {[
                { label: 'Full Day', count: attendance.filter(a => a.attendance === 'full').length, color: '#0F766E' },
                { label: 'Half Day', count: attendance.filter(a => a.attendance === 'half').length, color: '#F59E0B' },
                { label: 'Absent', count: attendance.filter(a => a.attendance === 'absent').length, color: '#EF4444' },
              ].map(({ label, count, color }) => {
                const pct = attendance.length ? Math.round((count / attendance.length) * 100) : 0;
                return (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {section === 'notifications' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 4 }}>Send Notifications</h2>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 18 }}>Broadcast messages to all members or specific users</p>
            <div className="adm-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4, display: 'block' }}>Title</label>
                  <input className="adm-input" placeholder="Notification title…" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4, display: 'block' }}>Message</label>
                  <textarea className="adm-input" placeholder="Write your message…" rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4, display: 'block' }}>Audience</label>
                  <select className="adm-input" style={{ width: 'auto' }}>
                    <option value="all">All Members</option>
                    <option value="admins">Admins Only</option>
                  </select>
                </div>
                <button className="adm-btn" style={{ background: '#0F766E', color: '#fff', width: 'fit-content' }} onClick={() => toast.success('Notification sent!')}>
                  <Bell size={13} /> Send Notification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Settings ── */}
        {section === 'settings' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C2340', marginBottom: 4 }}>Platform Settings</h2>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 18 }}>Configure your workspace preferences</p>
            {[
              { label: 'Workspace Name', desc: 'The name shown to all members', defaultVal: 'EduTechExOS' },
              { label: 'Admin Email', desc: 'Primary admin contact address', defaultVal: currentUser?.email ?? '' },
            ].map(({ label, desc, defaultVal }) => (
              <div key={label} className="adm-card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0C2340', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>{desc}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="adm-input" defaultValue={defaultVal} style={{ flex: 1 }} />
                  <button className="adm-btn" style={{ background: '#0F766E', color: '#fff' }} onClick={() => toast.success('Saved!')}>Save</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
