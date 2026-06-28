'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users, CalendarOff, Hash, Settings, Bell, Shield, Trash2,
  RefreshCw, Activity, Clock, UserCheck, Search, Plus, X, Check,
  ChevronRight, Mail, AlertTriangle, Globe, Lock, Edit3, Zap,
  UserPlus, FileText, Monitor, Calendar, BarChart2, LogOut,
  MoreHorizontal, Eye, Send, ArrowLeft, Loader2, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

function getToken() {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}

type SideTab =
  | 'people' | 'requests' | 'invite' | 'channels' | 'broadcast'
  | 'activity' | 'attendance' | 'availability'
  | 'leaves' | 'leave-calendar' | 'audit';

interface UserRecord { id: string; name: string; email: string; role: string; status?: string; source?: string; createdAt?: string; userChannels?: string[]; }
interface AccessRequest { id: string; name: string; email: string; message?: string; status: string; createdAt: string; }
interface LeaveRequest { id: string; email: string; name?: string; startDate: string; endDate?: string; reason: string; type: string; leaveCategory?: string; status: 'pending' | 'approved' | 'rejected'; requestedAt?: string; }
interface AttendanceRecord { email: string; name: string; date: string; attendance: 'full' | 'half' | 'absent' | 'pending'; hoursWorked: number; loginAt?: string; }
interface Channel { _id?: string; id: string; name: string; description?: string; isPrivate?: boolean; type?: string; }
interface AuditEntry { id?: string; action: string; by: string; target?: string; at: string; }

const COLORS = ['#7C5CFC','#0D9488','#EF4444','#F59E0B','#10B981','#0EA5E9','#8B5CF6','#EC4899'];
function avatarColor(name: string) { return COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]; }
function initials(name: string) { return (name ?? '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2); }
function fmt(date?: string) { return date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: avatarColor(name), flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em',
    }}>{initials(name)}</div>
  );
}

function LiveBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: '#059669',
      background: '#ECFDF5', padding: '2px 7px', borderRadius: 20, letterSpacing: '.04em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block',
        boxShadow: '0 0 0 2px rgba(16,185,129,.25)' }} />
      LIVE
    </span>
  );
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = { Admin: '#7C3AED', Developer: '#0284C7', Designer: '#DB2777', Member: '#0D9488', HR: '#D97706' };
  const color = map[role] ?? '#64748B';
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color, background: `${color}14`,
      padding: '3px 9px', borderRadius: 20, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
      {role}
    </span>
  );
}

function StatusDot({ online = false }: { online?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
      color: online ? '#059669' : '#94A3B8' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: online ? '#10B981' : '#CBD5E1',
        boxShadow: online ? '0 0 0 2px rgba(16,185,129,.2)' : 'none', display: 'inline-block' }} />
      {online ? 'online' : 'offline'}
    </span>
  );
}

const SIDENAV: { group: string; items: { id: SideTab; label: string; icon: React.ElementType }[] }[] = [
  { group: 'People', items: [
    { id: 'people',       label: 'People',        icon: Users },
    { id: 'requests',     label: 'Requests',      icon: UserPlus },
    { id: 'invite',       label: 'Invite',        icon: Mail },
    { id: 'channels',     label: 'Channels',      icon: Hash },
    { id: 'broadcast',    label: 'Broadcast',     icon: Send },
  ]},
  { group: 'Monitoring', items: [
    { id: 'activity',     label: 'Activity',      icon: Activity },
    { id: 'attendance',   label: 'Attendance',    icon: UserCheck },
    { id: 'availability', label: 'Availability',  icon: Calendar },
  ]},
  { group: 'Leaves', items: [
    { id: 'leaves',          label: 'Leaves',          icon: CalendarOff },
    { id: 'leave-calendar',  label: 'Leave Calendar',  icon: Calendar },
    { id: 'audit',           label: 'Audit Log',       icon: FileText },
  ]},
];

export default function AdminControlPanel({
  onDashboard,
  currentUser,
}: {
  onDashboard?: () => void;
  currentUser?: { name: string; email: string; role: string; initials: string } | null;
}) {
  const [tab, setTab] = useState<SideTab>('people');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [meetingRequests, setMeetingRequests] = useState<{ _id: string; userEmail: string; userName: string; date: string; time: string; timeEnd: string; purpose: string; status: 'pending' | 'confirmed' | 'declined' }[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [bcSubject, setBcSubject] = useState('');
  const [bcBody, setBcBody] = useState('');
  const [manageUser, setManageUser] = useState<UserRecord | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [bcSending, setBcSending] = useState(false);

  const token = typeof window !== 'undefined' ? getToken() : null;
  const h = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchUsers     = useCallback(async () => { const r = await fetch(`${API}/api/admin/users`, { headers: h }).catch(() => null); if (r?.ok) { const d = await r.json(); setUsers(Array.isArray(d) ? d : d.users ?? []); } }, []);
  const fetchRequests  = useCallback(async () => { const r = await fetch(`${API}/api/access-requests`, { headers: h }).catch(() => null); if (r?.ok) { const d = await r.json(); setRequests(Array.isArray(d) ? d : d.requests ?? []); } }, []);
  const fetchLeaves    = useCallback(async () => { const r = await fetch(`${API}/api/leaves`, { headers: h }).catch(() => null); if (r?.ok) { const d = await r.json(); setLeaves(Array.isArray(d) ? d : d.leaves ?? []); } }, []);
  const fetchAttendance= useCallback(async () => { const today = new Date().toISOString().slice(0,10); const r = await fetch(`${API}/api/activity/attendance?date=${today}`, { headers: h }).catch(() => null); if (r?.ok) { const d = await r.json(); setAttendance(Array.isArray(d) ? d : d.records ?? []); } }, []);
  const fetchChannels  = useCallback(async () => { const r = await fetch(`${API}/api/channels`, { headers: h }).catch(() => null); if (r?.ok) { const d = await r.json(); setChannels(Array.isArray(d) ? d : d.channels ?? []); } }, []);
  const fetchAudit     = useCallback(async () => { const r = await fetch(`${API}/api/admin/audit-log`, { headers: h }).catch(() => null); if (r?.ok) { const d = await r.json(); setAuditLog(Array.isArray(d) ? d : d.logs ?? []); } }, []);
  const fetchLive      = useCallback(async () => { const r = await fetch(`${API}/api/activity/live`, { headers: h }).catch(() => null); if (r?.ok) { const d = await r.json(); setLiveCount(d.count ?? d.online ?? 0); } }, []);
  const fetchMeetingRequests = useCallback(async () => {
    const r = await fetch(`${API}/api/meeting-requests`, { headers: h }).catch(() => null);
    if (r?.ok) { const d = await r.json(); setMeetingRequests(d.requests ?? []); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchRequests(), fetchLeaves(), fetchAttendance(), fetchChannels(), fetchAudit(), fetchLive(), fetchMeetingRequests()])
      .finally(() => setLoading(false));
    // Live heartbeat
    const interval = setInterval(fetchLive, 15000);
    // Socket live count
    const socket = getSocket();
    const onActivity = (d: any) => { if (d?.online !== undefined) setLiveCount(d.online); };
    socket.on('user_activity_update', onActivity);
    const onMeetingRequest = () => { fetchMeetingRequests(); };
    socket.on('meeting_request_created', onMeetingRequest);
    socket.on('meeting_request_reviewed', onMeetingRequest);
    return () => { clearInterval(interval); socket.off('user_activity_update', onActivity); socket.off('meeting_request_created', onMeetingRequest); socket.off('meeting_request_reviewed', onMeetingRequest); };
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const r = await fetch(`${API}/api/admin/users/${userId}/role`, { method: 'PATCH', headers: h, body: JSON.stringify({ role: newRole }) }).catch(() => null);
    if (r?.ok) { toast.success('Role updated'); setUsers(p => p.map(u => u.id === userId ? { ...u, role: newRole } : u)); }
    else toast.error('Failed to update role');
  };

  const handleMeetingRequest = async (id: string, status: 'confirmed' | 'declined') => {
    const r = await fetch(`${API}/api/meeting-requests/${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status }) }).catch(() => null);
    if (r?.ok) { toast.success(`Meeting ${status}.`); setMeetingRequests(p => p.map(m => m._id === id ? { ...m, status } : m)); }
    else toast.error('Failed to update.');
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    const r = await fetch(`${API}/api/admin/users/${userId}`, { method: 'DELETE', headers: h }).catch(() => null);
    if (r?.ok) { toast.success('User removed'); setUsers(p => p.filter(u => u.id !== userId)); setManageUser(null); }
    else toast.error('Failed');
  };

  const handleLeaveAction = async (id: string, action: 'approved' | 'rejected') => {
    const r = await fetch(`${API}/api/leaves/${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: action }) }).catch(() => null);
    if (r?.ok) { toast.success(`Leave ${action}`); setLeaves(p => p.map(l => l.id === id ? { ...l, status: action } : l)); }
    else toast.error('Action failed');
  };

  const handleReviewRequest = async (id: string, action: 'approved' | 'rejected') => {
    const r = await fetch(`${API}/api/access-requests/${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: action }) }).catch(() => null);
    if (r?.ok) { toast.success(action === 'approved' ? 'Access granted' : 'Request declined'); setRequests(p => p.map(req => req.id === id ? { ...req, status: action } : req)); fetchUsers(); }
    else toast.error('Failed');
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) { toast.error('Channel name required'); return; }
    const r = await fetch(`${API}/api/channels`, { method: 'POST', headers: h, body: JSON.stringify({ name: newChannelName.trim(), description: newChannelDesc.trim() }) }).catch(() => null);
    if (r?.ok) { toast.success('Channel created'); setNewChannelName(''); setNewChannelDesc(''); fetchChannels(); }
    else toast.error('Failed');
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`Delete #${name}? This cannot be undone.`)) return;
    const r = await fetch(`${API}/api/channels/${id}`, { method: 'DELETE', headers: h }).catch(() => null);
    if (!r) { toast.error('Network error — could not reach server.'); return; }
    if (r.ok) {
      toast.success(`#${name} deleted`);
      setChannels(p => p.filter(c => (c._id ?? c.id) !== id));
    } else {
      const body = await r.json().catch(() => ({}));
      toast.error(body?.error ?? `Failed to delete #${name}`);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Email required'); return; }
    setInviteSending(true);
    const r = await fetch(`${API}/api/admin/invite`, { method: 'POST', headers: h, body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) }).catch(() => null);
    if (r?.ok) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(''); }
    else toast.error('Failed to send invite');
    setInviteSending(false);
  };

  const handleBroadcast = async () => {
    if (!bcSubject.trim() || !bcBody.trim()) { toast.error('Subject and message required'); return; }
    setBcSending(true);
    const r = await fetch(`${API}/api/admin/broadcast-email`, { method: 'POST', headers: h, body: JSON.stringify({ subject: bcSubject, message: bcBody }) }).catch(() => null);
    if (r?.ok) { toast.success('Broadcast sent to all members!'); setBcSubject(''); setBcBody(''); }
    else toast.error('Failed');
    setBcSending(false);
  };

  const workspaceChannels = channels.filter(c => c.type !== 'dm');
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const presentCount = attendance.filter(a => a.attendance === 'full' || a.attendance === 'half').length;
  const filteredUsers = users.filter(u => userSearch === '' || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  // ─── style helpers ───────────────────────────────────────────────────────
  const S = {
    page: { display: 'flex', height: '100%', background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' } as React.CSSProperties,
    sidebar: { width: 210, flexShrink: 0, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    main: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    content: { flex: 1, overflowY: 'auto' as const, padding: '28px 32px' },
    card: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 } as React.CSSProperties,
    input: { width: '100%', padding: '8px 12px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
    btn: { padding: '8px 18px', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none' } as React.CSSProperties,
    btnPrimary: { background: '#0D9488', color: '#fff' } as React.CSSProperties,
    btnOutline: { background: '#fff', color: '#0D9488', border: '1.5px solid #0D9488' } as React.CSSProperties,
    label: { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 6, display: 'block' },
    sectionTitle: { fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 4 } as React.CSSProperties,
    sectionSub: { fontSize: 12.5, color: '#64748B', marginBottom: 24 } as React.CSSProperties,
  };

  return (
    <div style={S.page}>

      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>
        {/* Brand */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#0D9488,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={15} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>EduTechExOS</div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>Admin control</div>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8' }}>
            <span>Admin control</span>
            <ChevronRight size={10} />
            <span style={{ color: '#0D9488', fontWeight: 600 }}>Workspace</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {SIDENAV.map(({ group, items }) => (
            <div key={group} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#CBD5E1', padding: '0 8px', marginBottom: 4 }}>
                {group}
              </div>
              {items.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                const badge = id === 'requests' ? pendingRequests : id === 'leaves' ? pendingLeaves : 0;
                return (
                  <button key={id} onClick={() => setTab(id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
                    borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 1,
                    background: active ? '#F0FDFA' : 'transparent',
                    transition: 'background .12s',
                  }}
                    onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.background = '#F8FAFC')}
                    onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <Icon size={13} color={active ? '#0D9488' : '#94A3B8'} strokeWidth={active ? 2.5 : 2} />
                    <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? '#0D9488' : '#64748B', flex: 1 }}>{label}</span>
                    {badge > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: '#F59E0B', padding: '1px 5px', borderRadius: 20 }}>{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Back */}
        <div style={{ padding: '10px 10px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={onDashboard} style={{
            display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 10px',
            borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94A3B8', fontSize: 12.5, fontWeight: 500,
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F8FAFC')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={S.main}>

        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 28px' }}>
          {/* Live stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
            {[
              { label: 'People in app', value: users.length },
              { label: 'Online now',    value: liveCount },
              { label: 'Access requests', value: pendingRequests },
              { label: 'Project channels', value: workspaceChannels.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <LiveBadge />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{loading ? '…' : value}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1 }}>Workspace Control Center</h1>
              <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '3px 0 0', fontWeight: 400 }}>
                Manage people, channel access, broadcast emails, and monitor team activity — all in one place.
              </p>
            </div>
            <button onClick={() => setTab('invite')} style={{ ...S.btn, ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} /> Add user
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={S.content}>

          {/* ═══ PEOPLE ═══ */}
          {tab === 'people' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.card}>
                {/* Table header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Users</div>
                    <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>Manage team members, roles, and channel access.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                      <Search size={12} color="#94A3B8" />
                      <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search people"
                        style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#0F172A', width: 140 }} />
                    </div>
                    <button onClick={fetchUsers} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <RefreshCw size={11} />
                    </button>
                  </div>
                </div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 100px 1fr 90px', gap: 0,
                  padding: '8px 20px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                  {['Member', 'Role', 'Status', 'Channels', ''].map(h => (
                    <span key={h} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#94A3B8' }}>{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {filteredUsers.map((u, i) => {
                  const userChannels = workspaceChannels.slice(0, 1).map(c => c.name);
                  const isAdmin = u.role === 'Admin';
                  return (
                    <div key={u.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1.4fr 100px 1fr 90px',
                      padding: '11px 20px', borderBottom: '1px solid #F8FAFC', alignItems: 'center',
                      transition: 'background .1s',
                    }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#FAFAFA')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      {/* Member */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                        </div>
                      </div>

                      {/* Role */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <RolePill role={u.role} />
                        {!isAdmin && (
                          <button onClick={() => handleRoleChange(u.id, 'Admin')} style={{
                            fontSize: 10.5, fontWeight: 600, color: '#7C3AED', background: 'none', border: 'none',
                            cursor: 'pointer', padding: 0, textAlign: 'left',
                          }}>Make Admin</button>
                        )}
                      </div>

                      {/* Status */}
                      <StatusDot online />

                      {/* Channels */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {isAdmin ? (
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>All channels</span>
                        ) : (
                          workspaceChannels.slice(0, 2).map(c => (
                            <span key={c.id} style={{ fontSize: 10.5, fontWeight: 600, color: '#0D9488', background: '#F0FDFA', padding: '2px 7px', borderRadius: 5 }}>
                              {c.name}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Actions */}
                      <button onClick={() => setManageUser(u)} style={{
                        fontSize: 11.5, fontWeight: 600, color: '#0D9488', background: '#F0FDFA',
                        border: '1px solid #99F6E4', borderRadius: 7, padding: '4px 10px', cursor: 'pointer',
                      }}>
                        Manage
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ REQUESTS ═══ */}
          {tab === 'requests' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Access Requests</div>
              <div style={S.sectionSub}>{pendingRequests} pending approval</div>
              {requests.length === 0 ? (
                <div style={{ ...S.card, padding: '48px 0', textAlign: 'center', color: '#94A3B8' }}>
                  <UserPlus size={32} style={{ margin: '0 auto 10px', opacity: .4 }} />
                  <div style={{ fontSize: 13 }}>No access requests</div>
                </div>
              ) : requests.map(req => (
                <div key={req.id} style={{ ...S.card, padding: '14px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={req.name ?? req.email} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{req.name ?? req.email}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>{req.email}</div>
                    {req.message && <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3, fontStyle: 'italic' }}>"{req.message}"</div>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmt(req.createdAt)}</div>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleReviewRequest(req.id, 'approved')} style={{ ...S.btn, ...S.btnPrimary, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={11} /> Approve
                      </button>
                      <button onClick={() => handleReviewRequest(req.id, 'rejected')} style={{ ...S.btn, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '6px 14px' }}>
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: req.status === 'approved' ? '#059669' : '#DC2626',
                      background: req.status === 'approved' ? '#ECFDF5' : '#FEF2F2', padding: '3px 10px', borderRadius: 20 }}>
                      {req.status}
                    </span>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ═══ INVITE ═══ */}
          {tab === 'invite' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Invite Member</div>
              <div style={S.sectionSub}>Send a secure invite link to a new team member.</div>
              <div style={{ ...S.card, padding: 24, maxWidth: 500 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Email address</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com" style={S.input} type="email" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...S.input }}>
                    {['Member', 'Developer', 'Designer', 'HR', 'Admin'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleSendInvite} disabled={inviteSending} style={{
                  ...S.btn, ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 7, opacity: inviteSending ? .7 : 1,
                }}>
                  {inviteSending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={13} />}
                  Send Invite
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ CHANNELS ═══ */}
          {tab === 'channels' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Channels</div>
              <div style={S.sectionSub}>{workspaceChannels.length} workspace channels</div>

              <div style={{ ...S.card, padding: 18, marginBottom: 20, maxWidth: 600 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Create Channel</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="channel-name" style={{ ...S.input, flex: 1 }} />
                  <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} placeholder="Description (optional)" style={{ ...S.input, flex: 2 }} />
                  <button onClick={handleCreateChannel} style={{ ...S.btn, ...S.btnPrimary, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={12} /> Create
                  </button>
                </div>
              </div>

              {workspaceChannels.map(ch => (
                <div key={ch._id ?? ch.id} style={{ ...S.card, marginBottom: 6, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Hash size={13} color="#0D9488" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{ch.name}</div>
                    <div style={{ fontSize: 11.5, color: '#94A3B8' }}>{ch.description ?? 'No description'}</div>
                  </div>
                  {ch.isPrivate !== undefined && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: ch.isPrivate ? '#D97706' : '#0D9488' }}>
                      {ch.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
                      {ch.isPrivate ? 'Private' : 'Public'}
                    </span>
                  )}
                  <button onClick={() => handleDeleteChannel(ch._id ?? ch.id, ch.name)} style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#FEF2F2', border: 'none', borderRadius: 7, cursor: 'pointer',
                  }}>
                    <Trash2 size={12} color="#EF4444" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {/* ═══ BROADCAST ═══ */}
          {tab === 'broadcast' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Broadcast Email</div>
              <div style={S.sectionSub}>Send an announcement email to all {users.length} team members.</div>
              <div style={{ ...S.card, padding: 24, maxWidth: 560 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Subject</label>
                  <input value={bcSubject} onChange={e => setBcSubject(e.target.value)} placeholder="e.g. Team standup at 10 AM today" style={S.input} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Message</label>
                  <textarea value={bcBody} onChange={e => setBcBody(e.target.value)} rows={5} placeholder="Write your announcement…"
                    style={{ ...S.input, resize: 'vertical' }} />
                </div>
                <button onClick={handleBroadcast} disabled={bcSending} style={{
                  ...S.btn, ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 7, opacity: bcSending ? .7 : 1,
                }}>
                  {bcSending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                  Send to All Members
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ ACTIVITY ═══ */}
          {tab === 'activity' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Team Activity</div>
              <div style={S.sectionSub}>Real-time online status and recent logins.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Online Now', value: liveCount, color: '#10B981', bg: '#ECFDF5' },
                  { label: 'Present Today', value: presentCount, color: '#0D9488', bg: '#F0FDFA' },
                  { label: 'Total Members', value: users.length, color: '#7C3AED', bg: '#F5F3FF' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ ...S.card, padding: '18px 20px' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 5 }}>{label}</div>
                  </div>
                ))}
              </div>
              {users.map((u, i) => (
                <div key={u.id} style={{ ...S.card, marginBottom: 6, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10 }}>
                  <Avatar name={u.name} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</div>
                  </div>
                  <StatusDot online />
                  <RolePill role={u.role} />
                </div>
              ))}
            </motion.div>
          )}

          {/* ═══ ATTENDANCE ═══ */}
          {tab === 'attendance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={S.sectionTitle}>Attendance</div>
                  <div style={S.sectionSub}>{presentCount} present · {attendance.filter(a => a.attendance === 'absent').length} absent today</div>
                </div>
                <button onClick={fetchAttendance} style={{ ...S.btn, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'Full Day', count: attendance.filter(a => a.attendance === 'full').length, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
                  { label: 'Half Day', count: attendance.filter(a => a.attendance === 'half').length, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                  { label: 'Absent',   count: attendance.filter(a => a.attendance === 'absent').length, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                ].map(({ label, count, color, bg, border }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: 11.5, color, opacity: .8, marginTop: 4, fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>

              {attendance.map((a, i) => {
                const statusCfg = { full: { color: '#059669', label: 'Full Day' }, half: { color: '#D97706', label: 'Half Day' }, absent: { color: '#DC2626', label: 'Absent' }, pending: { color: '#94A3B8', label: 'Pending' } };
                const sc = statusCfg[a.attendance] ?? statusCfg.pending;
                return (
                  <div key={`${a.email}-${i}`} style={{ ...S.card, marginBottom: 6, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10 }}>
                    <Avatar name={a.name ?? a.email} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{a.name ?? a.email}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{a.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', fontSize: 11.5 }}>
                      <Clock size={11} /> {a.hoursWorked ? `${a.hoursWorked.toFixed(1)}h` : '—'}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                  </div>
                );
              })}
              {attendance.length === 0 && <div style={{ ...S.card, padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No records for today</div>}
            </motion.div>
          )}

          {/* ═══ AVAILABILITY ═══ */}
          {tab === 'availability' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Meeting Requests</div>
              <div style={S.sectionSub}>
                {meetingRequests.filter(r => r.status === 'pending').length} pending · {meetingRequests.length} total
              </div>
              {meetingRequests.length === 0 ? (
                <div style={{ ...S.card, padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  <Calendar size={32} style={{ margin: '0 auto 10px', opacity: .4 }} />
                  <div style={{ fontSize: 13 }}>No meeting requests yet.</div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>Users can request meetings from the dashboard availability panel.</div>
                </div>
              ) : (
                <>
                  {(['pending', 'confirmed', 'declined'] as const).map(status => {
                    const filtered = meetingRequests.filter(r => r.status === status);
                    if (!filtered.length) return null;
                    const cfg = {
                      pending: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Awaiting Approval' },
                      confirmed: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Confirmed' },
                      declined: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Declined' },
                    }[status];
                    return (
                      <div key={status} style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: cfg.color, marginBottom: 10 }}>
                          {cfg.label} ({filtered.length})
                        </div>
                        {filtered.map(r => (
                          <div key={r._id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.userName}</div>
                                <div style={{ fontSize: 11, color: '#64748B' }}>{r.userEmail}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                              <strong>{new Date(r.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                              {' · '}{r.timeEnd ? `${r.time} – ${r.timeEnd}` : r.time}
                            </div>
                            {r.purpose && <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>“{r.purpose}”</div>}
                            {status === 'pending' && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button onClick={() => handleMeetingRequest(r._id, 'confirmed')}
                                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #A7F3D0', background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                  <Check size={13} style={{ marginRight: 4, display: 'inline' }} /> Confirm
                                </button>
                                <button onClick={() => handleMeetingRequest(r._id, 'declined')}
                                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #FECACA', background: '#FEE2E2', color: '#991B1B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                  <X size={13} style={{ marginRight: 4, display: 'inline' }} /> Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}

          {/* ═══ LEAVES ═══ */}
          {tab === 'leaves' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Leave Approvals</div>
              <div style={S.sectionSub}>{pendingLeaves} requests awaiting action</div>

              {(['pending', 'approved', 'rejected'] as const).map(status => {
                const filtered = leaves.filter(l => l.status === status);
                if (!filtered.length) return null;
                const cfg = { pending: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Awaiting Approval' }, approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Approved' }, rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Declined' } }[status];
                return (
                  <div key={status} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: cfg.color, marginBottom: 10 }}>
                      {cfg.label} ({filtered.length})
                    </div>
                    {filtered.map(l => (
                      <div key={l.id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={l.name ?? l.email} size={28} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{l.name ?? l.email}</div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>{l.email}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 10.5, color: '#94A3B8' }}>{fmt(l.requestedAt)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                          <strong>{l.leaveCategory ?? l.type}</strong> · {l.startDate?.slice(0, 10)} → {l.endDate?.slice(0, 10)}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginBottom: status === 'pending' ? 10 : 0 }}>{l.reason}</div>
                        {status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleLeaveAction(l.id, 'approved')} style={{ ...S.btn, ...S.btnPrimary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                              <Check size={11} /> Approve
                            </button>
                            <button onClick={() => handleLeaveAction(l.id, 'rejected')} style={{ ...S.btn, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                              <X size={11} /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {leaves.length === 0 && <div style={{ ...S.card, padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No leave requests</div>}
            </motion.div>
          )}

          {/* ═══ LEAVE CALENDAR ═══ */}
          {tab === 'leave-calendar' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={S.sectionTitle}>Leave Calendar</div>
              <div style={S.sectionSub}>Visual overview of team leave schedule.</div>
              <div style={{ ...S.card, padding: 24 }}>
                {/* Simple month grid */}
                {(() => {
                  const now = new Date();
                  const y = now.getFullYear(), m = now.getMonth();
                  const daysInMonth = new Date(y, m + 1, 0).getDate();
                  const startDay = new Date(y, m, 1).getDay();
                  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                  const leaveDates = leaves.flatMap(l => {
                    if (!l.startDate) return [];
                    const start = new Date(l.startDate), end = l.endDate ? new Date(l.endDate) : start;
                    const ds = [];
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                      if (d.getFullYear() === y && d.getMonth() === m) ds.push(d.getDate());
                    }
                    return ds;
                  });
                  return (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16, textAlign: 'center' }}>
                        {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                          <div key={d} style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textAlign: 'center', paddingBottom: 4 }}>{d}</div>
                        ))}
                        {Array.from({ length: startDay }, (_, i) => <div key={`e${i}`} />)}
                        {days.map(d => {
                          const hasLeave = leaveDates.includes(d);
                          const isToday = d === now.getDate();
                          return (
                            <div key={d} style={{
                              height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 8, fontSize: 12, fontWeight: isToday ? 800 : 400,
                              background: isToday ? '#0D9488' : hasLeave ? '#FEF3C7' : 'transparent',
                              color: isToday ? '#fff' : hasLeave ? '#D97706' : '#0F172A',
                              border: hasLeave && !isToday ? '1px solid #FDE68A' : 'none',
                            }}>{d}</div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
                        {[{ color: '#0D9488', bg: '#0D9488', label: 'Today' }, { color: '#D97706', bg: '#FEF3C7', label: 'Leave' }].map(({ color, bg, label }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: bg }} />
                            <span style={{ fontSize: 11.5, color: '#64748B' }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* ═══ AUDIT LOG ═══ */}
          {tab === 'audit' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={S.sectionTitle}>Audit Log</div>
                  <div style={S.sectionSub}>All admin actions recorded chronologically.</div>
                </div>
                <button onClick={fetchAudit} style={{ ...S.btn, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
              <div style={S.card}>
                {auditLog.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No audit entries yet</div>
                ) : auditLog.map((entry, i) => (
                  <div key={entry.id ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 18px', borderBottom: '1px solid #F8FAFC' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0D9488', marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>
                        <strong style={{ color: '#0D9488' }}>{entry.by}</strong> {entry.action}
                        {entry.target && <> — <em style={{ color: '#64748B' }}>{entry.target}</em></>}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{fmt(entry.at)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* ═══ MANAGE USER MODAL ═══ */}
      <AnimatePresence>
        {manageUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setManageUser(null)}
          >
            <motion.div initial={{ scale: .95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, y: 8 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.18)', overflow: 'hidden' }}
            >
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Manage Member</span>
                <button onClick={() => setManageUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={16} /></button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: '#F8FAFC', borderRadius: 12 }}>
                  <Avatar name={manageUser.name} size={44} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{manageUser.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{manageUser.email}</div>
                    <div style={{ marginTop: 5 }}><RolePill role={manageUser.role} /></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {manageUser.role !== 'Admin' && (
                    <button onClick={() => { handleRoleChange(manageUser.id, 'Admin'); setManageUser(p => p ? { ...p, role: 'Admin' } : p); }}
                      style={{ ...S.btn, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: 7, width: '100%', justifyContent: 'flex-start' }}>
                      <Shield size={13} /> Make Admin
                    </button>
                  )}
                  {manageUser.role === 'Admin' && (
                    <button onClick={() => { handleRoleChange(manageUser.id, 'Member'); setManageUser(p => p ? { ...p, role: 'Member' } : p); }}
                      style={{ ...S.btn, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 7, width: '100%', justifyContent: 'flex-start' }}>
                      <UserCheck size={13} /> Demote to Member
                    </button>
                  )}
                  <button onClick={() => handleDeleteUser(manageUser.id, manageUser.name)}
                    style={{ ...S.btn, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 7, width: '100%', justifyContent: 'flex-start' }}>
                    <Trash2 size={13} /> Remove from workspace
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
