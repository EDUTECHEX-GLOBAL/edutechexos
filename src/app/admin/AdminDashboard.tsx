'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Bell,
  KeyRound,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Clock,
  Eye,
  Hash,
  Mail,
  MessageSquare,
  Monitor,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ScrollText,
  Trash2,
  UserPlus,
  Users,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '../components/AdminGuard';
import LoginTrackerCalendar from './components/LoginTrackerCalendar';
import AdminAvailabilityCalendar from './components/AdminAvailabilityCalendar';
import AdminLeaveCalendar from './components/AdminLeaveCalendar';
import { useDashboardStore } from '@/store/dashboardStore';
import { getSocket } from '@/lib/socket';
import './admin.css';

type AdminUser = { name: string; email: string; role: string };
type ActivityStat = {
  email: string;
  name: string;
  totalMinutes: number;
  activeDays: number;
  lastSeen: string | null;
  messageCount: number;
  taskCount: number;
};
type AccessRequest = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'invited' | 'approved' | 'rejected';
  requestedAt: string;
};
type InviteLogEntry = {
  name: string;
  email: string;
  role: string;
  status: 'sent' | 'warn' | 'error';
  message: string;
  inviteUrl?: string;
  at: string;
};
type CsvRow = { name: string; email: string; role: string };
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

function LeaveStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; border: string }> = {
    pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)' },
    invited:  { color: '#818CF8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.30)' },
    approved: { color: '#10C98A', bg: 'rgba(16,201,138,0.10)',  border: 'rgba(16,201,138,0.25)' },
    rejected: { color: '#EF476F', bg: 'rgba(239,71,111,0.10)',  border: 'rgba(239,71,111,0.25)' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: c.bg, border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: '.08em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} />
      {status}
    </span>
  );
}
const MAX_ADMINS = 3;
const ACCESS_REQUESTS_KEY = 'edutechex_access_requests';
const systemEmails = [
  'admin@edutechex.in',
  'aditya@edutechex.in',
  'dev.rk@edutechex.in',
  'design.sa@edutechex.in',
  'tarun@edutechex.in',
  'mohan.kumar@edutechex.in',
  'mohan.reddy@edutechex.in',
  'mohan.sen@edutechex.in',
];

export default function AdminPage() {
  const {
    members,
    addMember,
    removeMember,
    channels,
    setMemberWorkspaceChannel,
    setMemberWorkspaceChannels,
    setMemberRole,
    loadLocalMembers,
    loadWorkspaceChannels,
  } = useDashboardStore();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Developer');
  const [newExtraChannels, setNewExtraChannels] = useState<string[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [requestChannelsByReq, setRequestChannelsByReq] = useState<Record<string, string[]>>({});
  const [promoteLoadingId, setPromoteLoadingId] = useState<string | null>(null);
  const [channelPopoverId, setChannelPopoverId] = useState<string | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStat[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastLastSent, setBroadcastLastSent] = useState<{
    subject: string;
    count: number;
    at: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    'people' | 'requests' | 'invites' | 'channels' | 'broadcast' | 'activity' | 'attendance' | 'desktop' | 'availability' | 'leaves' | 'leave-calendar' | 'audit'
  >('people');
  type AWRecord = {
    email: string; name: string; currentApp: string; currentTitle: string;
    isAfk: boolean; totalActiveMinutes: number; totalAfkMinutes: number;
    appBreakdown: { app: string; minutes: number }[]; lastSync: string;
  };
  const [awRecords, setAwRecords] = useState<AWRecord[]>([]);
  const [awLoading, setAwLoading] = useState(false);
  const [awDate, setAwDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(Date.now() + istOffset).toISOString().slice(0, 10);
  });

  // Live in-app activity "” users active in last 3 minutes
  type LiveUser = {
    email: string; name: string;
    currentActivity: string; currentPanel: string;
    lastSeen: string; todayMinutes: number;
  };
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [expandedDesktopEmail, setExpandedDesktopEmail] = useState<string | null>(null);

  type HistoryUser = {
    email: string; name: string;
    totalMinutes: number; messageCount: number; taskCount: number;
    lastSeen: string | null; currentActivity: string; currentPanel: string;
  };
  const [historyUsers, setHistoryUsers] = useState<HistoryUser[]>([]);
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(Date.now() + istOffset).toISOString().slice(0, 10);
  });
  const [historyLoading, setHistoryLoading] = useState(false);

  type AuditEntry = {
    id: string; adminEmail: string; adminName: string;
    action: string; target: string; targetName: string;
    details: Record<string, unknown>; timestamp: string;
  };
  const [auditLogs, setAuditLogs]       = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [inviteName, setInviteName]     = useState('');
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState('Developer');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteLog, setInviteLog]       = useState<InviteLogEntry[]>([]);
  const [csvText, setCsvText]           = useState('');
  const [csvParsed, setCsvParsed]       = useState<CsvRow[]>([]);
  const [csvSending, setCsvSending]     = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [shownPasswords, setShownPasswords] = useState<Record<string, string>>({});
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'invited' | 'rejected'>('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [viewingRequest, setViewingRequest] = useState<AccessRequest | null>(null);

  const fetchAuditLog = useCallback(async () => {
    const raw = localStorage.getItem('edutechex_token');
    if (!raw) return;
    setAuditLoading(true);
    try {
      const { token } = JSON.parse(raw);
      const r = await fetch(`${API_BASE}/api/audit-log?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (data.success) setAuditLogs(data.logs);
    } catch { /* network error */ }
    finally { setAuditLoading(false); }
  }, []);

  type LeaveRecord = {
    id: string; email: string; name: string;
    type: 'instant' | 'planned'; leaveCategory: string;
    startDate: string; endDate?: string; duration?: string;
    reason: string; status: 'pending' | 'approved' | 'rejected';
    adminNote?: string; requestedAt: string;
  };
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveNotes, setLeaveNotes] = useState<Record<string, string>>({});
  const [leaveActionLoading, setLeaveActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const authData = localStorage.getItem('edutechex_token');
    if (!authData) return;
    try {
      const { user } = JSON.parse(authData);
      if (user) setAdminUser(user);
    } catch {
      setAdminUser(null);
    }
  }, []);

  // Re-load member list on real-time member_updated / member_removed events.
  // Also listen for user_forcefully_removed so an admin who somehow gets removed
  // while on this page is immediately logged out.
  useEffect(() => {
    const socket = getSocket();
    const onMemberUpdated = () => {
      loadLocalMembers?.();
    };
    const onMemberRemoved = ({ memberId }: { memberId: string }) => {
      useDashboardStore.getState().removeMemberLocally(memberId);
    };
    const onForcefullyRemoved = ({ email }: { email: string }) => {
      const stored = localStorage.getItem('edutechex_token');
      if (!stored) return;
      try {
        const me = JSON.parse(stored)?.user?.email?.toLowerCase();
        if (me && me === email.toLowerCase()) {
          localStorage.removeItem('edutechex_token');
          document.cookie = 'auth_session=; path=/; max-age=0';
          toast.error('Your account has been removed by the admin.');
          setTimeout(() => {
            window.location.replace('/sign-up-login-screen');
          }, 800);
        }
      } catch {
        /* ignore */
      }
    };
    const onLeaveRequested = () => { fetchLeaves(); };
    socket.on('member_updated', onMemberUpdated);
    socket.on('member_removed', onMemberRemoved);
    socket.on('user_forcefully_removed', onForcefullyRemoved);
    socket.on('leave_requested', onLeaveRequested);
    return () => {
      socket.off('member_updated', onMemberUpdated);
      socket.off('member_removed', onMemberRemoved);
      socket.off('user_forcefully_removed', onForcefullyRemoved);
      socket.off('leave_requested', onLeaveRequested);
    };
  }, [loadLocalMembers]);

  // Helper "” read the stored JWT token once
  function getAdminToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    // Primary: load members + channels fresh from backend
    loadLocalMembers?.();
    loadWorkspaceChannels?.();

    const token = getAdminToken();
    if (!token) return; // not logged in "” nothing to load

    // Load access requests with a 20-second timeout so Render cold-starts don't block the UI
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    fetch(`${API_BASE}/api/access-requests`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` }, // â† was missing (caused 403)
    })
      .then((r) => r.json())
      .then((data: { success: boolean; requests?: AccessRequest[] }) => {
        clearTimeout(timer);
        if (data.success && Array.isArray(data.requests)) {
          setAccessRequests(data.requests);
          // Keep localStorage in sync as offline fallback
          localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(data.requests));
        }
      })
      .catch(() => {
        clearTimeout(timer);
        // Fallback: use localStorage if backend unreachable / timed out
        const cached = localStorage.getItem(ACCESS_REQUESTS_KEY);
        if (cached) {
          try {
            setAccessRequests(JSON.parse(cached));
          } catch {
            /* ignore */
          }
        }
        // Retry once after 15 seconds (backend may still be waking up)
        setTimeout(() => {
          const t2 = getAdminToken();
          fetch(`${API_BASE}/api/access-requests`, {
            headers: t2 ? { Authorization: `Bearer ${t2}` } : {},
          })
            .then((r) => r.json())
            .then((data: { success: boolean; requests?: AccessRequest[] }) => {
              if (data.success && Array.isArray(data.requests)) {
                setAccessRequests(data.requests);
                localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(data.requests));
              }
            })
            .catch(() => {
              /* silent "” already showing cached */
            });
        }, 15_000);
      });

    fetchLeaves();
  }, []);

  // Load activity stats for the monitoring dashboard
  useEffect(() => {
    const authData = localStorage.getItem('edutechex_token');
    if (!authData) return;
    let token: string | null = null;
    try {
      token = JSON.parse(authData).token;
    } catch {
      return;
    }
    if (!token) return;

    setActivityLoading(true);
    fetch(`${API_BASE}/api/activity/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null)) // 404 before backend deploys â†’ null
      .then((data: { success: boolean; stats?: ActivityStat[] } | null) => {
        if (data?.success && Array.isArray(data.stats)) setActivityStats(data.stats);
      })
      .catch(() => {
        /* non-critical "” section shows empty state */
      })
      .finally(() => setActivityLoading(false));
  }, []);

  const fetchAwData = useCallback((date?: string) => {
    const token = getAdminToken();
    if (!token) return;
    setAwLoading(true);
    const d = date ?? awDate;
    fetch(`${API_BASE}/api/activity/aw?date=${d}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { success: boolean; records?: AWRecord[] } | null) => {
        if (data?.success && Array.isArray(data.records)) setAwRecords(data.records);
      })
      .catch(() => {})
      .finally(() => setAwLoading(false));
  }, [awDate]);

  useEffect(() => {
    if (activeTab === 'desktop') fetchAwData();
  }, [activeTab, fetchAwData]);

  // Real-time AW updates via socket
  useEffect(() => {
    const socket = getSocket();
    const handler = () => fetchAwData();
    socket.on('aw_sync', handler);
    return () => { socket.off('aw_sync', handler); };
  }, [fetchAwData]);

  // â”€â”€ Live in-app activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchLiveUsers = useCallback(() => {
    const token = getAdminToken();
    if (!token) return;
    setLiveLoading(true);
    fetch(`${API_BASE}/api/activity/live`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { success: boolean; live?: LiveUser[] } | null) => {
        if (data?.success && Array.isArray(data.live)) setLiveUsers(data.live);
      })
      .catch(() => {})
      .finally(() => setLiveLoading(false));
  }, []);

  // Fetch live users when desktop tab opens + every 30 s
  useEffect(() => {
    if (activeTab !== 'desktop') return;
    fetchLiveUsers();
    const id = setInterval(fetchLiveUsers, 30_000);
    return () => clearInterval(id);
  }, [activeTab, fetchLiveUsers]);

  // Real-time push: update live list when a heartbeat arrives
  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: LiveUser) => {
      setLiveUsers((prev) => {
        const next = prev.filter((u) => u.email !== payload.email);
        return [{ ...payload }, ...next];
      });
    };
    socket.on('user_activity_update', handler);
    return () => { socket.off('user_activity_update', handler); };
  }, []);

  // â”€â”€ In-app activity history (all sessions for a given date) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchHistory = useCallback((date?: string) => {
    const token = getAdminToken();
    if (!token) return;
    setHistoryLoading(true);
    const d = date ?? historyDate;
    fetch(`${API_BASE}/api/activity/history?date=${d}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { success: boolean; sessions?: HistoryUser[] } | null) => {
        if (data?.success && Array.isArray(data.sessions)) setHistoryUsers(data.sessions);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [historyDate]);

  useEffect(() => {
    if (activeTab === 'desktop') fetchHistory();
  }, [activeTab, fetchHistory]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLog();
  }, [activeTab, fetchAuditLog]);

  const workspaceChannels = useMemo(
    () => channels.filter((c) => !c.id.startsWith('member-')),
    [channels]
  );
  const extraChannels = useMemo(
    () => workspaceChannels.filter((c) => c.id !== 'general'),
    [workspaceChannels]
  );
  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((m) =>
      [m.name, m.email, m.role].join(' ').toLowerCase().includes(needle)
    );
  }, [members, search]);

  const onlineMembers = members.filter((m) => m.status === 'online').length;
  const assignedExtraUsers = members.filter((m) => getExtraChannels(m.id).length > 0).length;
  const pendingRequests = accessRequests.filter((r) => r.status === 'pending');
  const approvedRequests = accessRequests.filter((r) => r.status === 'approved');
  const rejectedRequests = accessRequests.filter((r) => r.status === 'rejected');

  // Count total admins (hardcoded + members with Admin role)
  const adminCount = members.filter((m) => m.role === 'Admin').length;
  const canAddMoreAdmins = adminCount < MAX_ADMINS;

  async function promoteToAdmin(member: { id: string; name: string; email: string }) {
    if (!canAddMoreAdmins) {
      toast.error(`Maximum ${MAX_ADMINS} admins allowed. Remove an existing admin first.`);
      return;
    }
    if (!confirm(`Make ${member.name} an Admin? (${adminCount}/${MAX_ADMINS} admin slots used)`))
      return;
    setPromoteLoadingId(member.id);
    try {
      const authData = localStorage.getItem('edutechex_token');
      const token = authData ? JSON.parse(authData).token : null;
      const dbId = member.id.replace('member-', '');
      const res = await fetch(`${API_BASE}/api/members/${dbId}/promote-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Failed to promote admin.');
        return;
      }
      setMemberRole(member.id, 'Admin');
      await loadLocalMembers?.();
      toast.success(data.message ?? `${member.name} is now an Admin.`);
    } catch {
      toast.error('Network error promoting admin.');
    } finally {
      setPromoteLoadingId(null);
    }
  }

  async function handleRoleChange(memberId: string, memberName: string, newRoleVal: string) {
    if (newRoleVal === 'Admin' && !canAddMoreAdmins) {
      toast.error(`Maximum ${MAX_ADMINS} admins allowed. Remove an existing admin first.`);
      return;
    }
    // Optimistic local update
    setMemberRole(memberId, newRoleVal);

    // Persist to backend for DB members (id looks like "member-<24-char-hex>")
    const rawId = memberId.replace('member-', '');
    if (rawId.length === 24) {
      try {
        const token = getAdminToken();
        await fetch(`${API_BASE}/api/access-requests/${rawId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ role: newRoleVal }),
        });
      } catch {
        /* non-critical "” local update already applied */
      }
    }
    toast.success(`Role updated to ${newRoleVal} for ${memberName}`);
  }

  function getExtraChannels(memberId: string) {
    return extraChannels.filter((c) => c.memberIds?.includes(memberId));
  }
  function getChannelMembers(channelId: string) {
    const channel = channels.find((c) => c.id === channelId);
    return members.filter((m) => channel?.memberIds?.includes(m.id));
  }

  function handleChannelToggle(memberId: string, channelId: string, checked: boolean) {
    const current = getExtraChannels(memberId).map((c) => c.id);
    const next = checked
      ? [...new Set([...current, channelId])]
      : current.filter((id) => id !== channelId);
    const member = members.find((m) => m.id === memberId);
    const channel = extraChannels.find((c) => c.id === channelId);
    setMemberWorkspaceChannels(memberId, next, (msg) => toast.error(msg));
    if (channel) {
      toast.success(
        checked
          ? `${member?.name ?? 'User'} added to #${channel.name}`
          : `${member?.name ?? 'User'} removed from #${channel.name}`
      );
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    const emailClean = newEmail.trim().toLowerCase();
    if (members.some((m) => m.email.toLowerCase() === emailClean)) {
      toast.error('A user with this email already exists.');
      return;
    }

    const cleanName = newName.trim();
    const initials = cleanName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const colors = ['#3E4A89', '#9BA6D3', '#7c3aed', '#a78bfa', '#2A3568', '#c4b5fd'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // â”€â”€ Persist to backend first so the member survives page refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_BASE}/api/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: cleanName,
          email: emailClean,
          role: newRole,
          channelIds: newRole !== 'Admin' ? newExtraChannels : [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.member) {
        // Use the real DB-backed ID returned by the server
        addMember({ ...data.member, initials, status: 'online', color });
        if (newRole !== 'Admin' && newExtraChannels.length > 0)
          setMemberWorkspaceChannels(data.member.id, newExtraChannels);
        const pwd = data.generatedPassword ?? '';
        toast.success(`${cleanName} added! Password: ${pwd} "” sent to their email.`, { duration: 8000 });
        // Send welcome email with credentials
        if (pwd) {
          fetch(`${API_BASE}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: [{ email: emailClean, name: cleanName }],
              subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME || 'SkillNaav'}!`,
              htmlContent: `<p>Hello ${cleanName},</p><p>Welcome to SkillNaav! Here are your login credentials:</p><p>Email: ${emailClean}<br/>Password: ${pwd}</p><p>You can log in at <a href="https://www.skillnaav.com/user/login">https://www.skillnaav.com/user/login</a>.</p><p>For more information, visit SkillNaav.</p><p>If you have any questions, contact skillnaav@gmail.com.</p>`
            })
          });
        }
      } else {
        toast.error(data.error ?? 'Failed to add member on server.');
        return;
      }
    } catch {
      // Backend unreachable "” add locally only (temporary, won't persist)
      const tempId = `member-${cleanName
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .slice(0, 4)}${Math.floor(Math.random() * 1000)}`;
      addMember({
        id: tempId,
        initials,
        name: cleanName,
        email: emailClean,
        role: newRole,
        status: 'online',
        color,
      });
      if (newRole !== 'Admin' && newExtraChannels.length > 0)
        setMemberWorkspaceChannels(tempId, newExtraChannels);
      toast.warning(`${cleanName} added locally "” backend unreachable, won't persist.`);
    }

    setNewName('');
    setNewEmail('');
    setNewRole('Developer');
    setNewExtraChannels([]);
    setShowAddModal(false);
  }

  function makeMemberId(name: string) {
    return `member-${name
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .slice(0, 5)}${Math.floor(Math.random() * 1000)}`;
  }

  async function fetchLeaves() {
    const token = getAdminToken();
    if (!token) return;
    setLeavesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/leaves`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setLeaves(data.leaves);
    } catch { /* offline */ }
    finally { setLeavesLoading(false); }
  }

  async function handleLeaveAction(leaveId: string, status: 'approved' | 'rejected') {
    const token = getAdminToken();
    setLeaveActionLoading(leaveId);
    try {
      const res = await fetch(`${API_BASE}/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status, adminNote: leaveNotes[leaveId] ?? '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.error ?? 'Failed to update leave.'); return; }
      setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status, adminNote: leaveNotes[leaveId] ?? '' } : l));
      toast.success(`Leave ${status === 'approved' ? 'approved' : 'rejected'} "” user has been notified.`);
    } catch { toast.error('Network error.'); }
    finally { setLeaveActionLoading(null); }
  }

  async function approveRequest(request: AccessRequest) {
    if (members.some((m) => m.email.toLowerCase() === request.email.toLowerCase())) {
      toast.error('This user already exists in the workspace.');
      return;
    }

    const selectedChannels = requestChannelsByReq[request.id] ?? [];

    // Build member object up-front "” used in both online and offline paths
    const MEMBER_COLORS = ['#3E4A89', '#9BA6D3', '#7c3aed', '#a78bfa', '#2A3568', '#c4b5fd'];
    const initials = request.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    // Use the DB id so the member-id matches what loadLocalMembers returns later
    const memberId = `member-${request.id}`;
    const color =
      MEMBER_COLORS[
        Math.abs(request.email.split('').reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0)) %
          MEMBER_COLORS.length
      ];

    // â”€â”€ Persist approval to backend (cross-device) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try {
      const authData = localStorage.getItem('edutechex_token');
      const token = authData ? JSON.parse(authData).token : null;

      const res = await fetch(`${API_BASE}/api/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'approved', channelIds: selectedChannels }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Failed to approve request on server.');
        return;
      }

      // Sync from backend "” gets the newly approved member with correct channelIds
      loadLocalMembers?.();
    } catch {
      // Backend unreachable "” still approve locally so the list updates
      const fallbackId = makeMemberId(request.name);
      addMember({
        id: fallbackId,
        initials,
        name: request.name,
        email: request.email,
        role: request.role,
        status: 'online',
        color,
      });
      if (selectedChannels.length > 0) setMemberWorkspaceChannels(fallbackId, selectedChannels);
    }

    // â”€â”€ Update local UI state + localStorage fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const nextRequests = accessRequests.map((item) =>
      item.id === request.id ? { ...item, status: 'approved' as const } : item
    );
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success(`${request.name} approved. They can sign in now.`);
  }

  async function sendInvite(request: AccessRequest) {
    const token = getAdminToken();
    try {
      const res = await fetch(`${API_BASE}/api/admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: request.email, name: request.name, role: request.role, requestId: request.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to send invite.'); return; }

      // Update local state to show 'invited' badge immediately
      const updated = accessRequests.map((r) => r.id === request.id ? { ...r, status: 'invited' as const } : r);
      setAccessRequests(updated);
      localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(updated));
      if (data.emailSent === false && data.inviteUrl) {
        toast.warning(`Email delivery failed. Copy the invite link and share it manually with ${request.email}.`);
        setInviteLog((prev) => [{ name: request.name, email: request.email, role: request.role, status: 'warn' as const, message: 'Email failed — share link manually', inviteUrl: data.inviteUrl, at: new Date().toISOString() }, ...prev]);
      } else {
        toast.success(`Invite sent to ${request.email} — link expires in 4.5 hours.`);
      }
    } catch {
      toast.error('Could not reach server. Try again.');
    }
  }

  async function generatePasswordForRequest(request: AccessRequest) {
    const token = getAdminToken();
    setGeneratingFor(request.id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/generate-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ requestId: request.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to generate password.'); return; }

      const updated = accessRequests.map((r) => r.id === request.id ? { ...r, status: 'approved' as const } : r);
      setAccessRequests(updated);
      localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(updated));

      if (data.generatedPassword) {
        setShownPasswords((prev) => ({ ...prev, [request.id]: data.generatedPassword }));
      }

      if (data.emailSent === false) {
        toast.warning(`Password generated — email failed. Copy it below and share with ${request.email}.`);
      } else {
        toast.success(`Password generated and emailed to ${request.email}. They can sign in now.`);
      }
    } catch {
      toast.error('Could not reach server. Try again.');
    } finally {
      setGeneratingFor(null);
    }
  }

  async function sendDirectInvite(e: React.FormEvent) {
    e.preventDefault();
    const token = getAdminToken();
    setInviteSubmitting(true);
    const entry: CsvRow = { name: inviteName.trim(), email: inviteEmail.trim().toLowerCase(), role: inviteRole };
    try {
      const res = await fetch(`${API_BASE}/api/admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(entry),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteLog((prev) => [{ ...entry, status: 'error' as const, message: data.error ?? 'Failed', at: new Date().toISOString() }, ...prev]);
        toast.error(data.error ?? 'Failed to send invite.');
      } else if (data.emailSent === false && data.inviteUrl) {
        setInviteLog((prev) => [{ ...entry, status: 'warn' as const, message: 'Email failed — share link manually', inviteUrl: data.inviteUrl, at: new Date().toISOString() }, ...prev]);
        toast.warning(`Email delivery failed. The invite link is shown below — copy and send it to ${entry.email}.`);
        setInviteName(''); setInviteEmail(''); setInviteRole('Developer');
      } else {
        setInviteLog((prev) => [{ ...entry, status: 'sent' as const, message: 'Invite sent (expires in 4.5h)', at: new Date().toISOString() }, ...prev]);
        toast.success(`Invite sent to ${entry.email}`);
        setInviteName(''); setInviteEmail(''); setInviteRole('Developer');
      }
    } catch {
      setInviteLog((prev) => [{ ...entry, status: 'error' as const, message: 'Network error', at: new Date().toISOString() }, ...prev]);
      toast.error('Could not reach server.');
    } finally {
      setInviteSubmitting(false);
    }
  }

  function parseCSV(raw: string) {
    const rows = raw.trim().split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((c) => c.trim());
        return { name: parts[0] ?? '', email: (parts[1] ?? '').toLowerCase(), role: parts[2] ?? 'Developer' } as CsvRow;
      })
      .filter((r) => r.name && r.email);
    setCsvParsed(rows);
  }

  async function sendBulkInvites() {
    if (csvParsed.length === 0) return;
    const token = getAdminToken();
    setCsvSending(true);
    const results: InviteLogEntry[] = await Promise.all(
      csvParsed.map(async (row) => {
        try {
          const res = await fetch(`${API_BASE}/api/admin/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(row),
          });
          const data = await res.json();
          if (!res.ok) return { ...row, status: 'error' as const, message: data.error ?? 'Failed', at: new Date().toISOString() };
          if (data.emailSent === false && data.inviteUrl) return { ...row, status: 'warn' as const, message: 'Email failed — share link manually', inviteUrl: data.inviteUrl, at: new Date().toISOString() };
          return { ...row, status: 'sent' as const, message: 'Invite sent (expires in 4.5h)', at: new Date().toISOString() };
        } catch {
          return { ...row, status: 'error' as const, message: 'Network error', at: new Date().toISOString() };
        }
      })
    );
    setInviteLog((prev) => [...results, ...prev]);
    setCsvParsed([]); setCsvText('');
    const sent = results.filter((r) => r.status === 'sent').length;
    toast.success(`${sent}/${results.length} invites sent successfully.`);
    setCsvSending(false);
  }

  async function rejectRequest(requestId: string) {
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_BASE}/api/access-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Failed to reject request.');
        return;
      }
    } catch {
      // Backend unreachable "” still update locally
    }

    const nextRequests = accessRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'rejected' as const } : r
    );
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success('Access request rejected.');
  }

  async function handleBroadcast() {
    if (!broadcastSubject.trim()) {
      toast.error('Please enter a subject.');
      return;
    }
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message.');
      return;
    }
    if (
      !confirm(
        `Send this email to all ${members.length} workspace members?\n\nSubject: ${broadcastSubject}`
      )
    )
      return;
    setBroadcastSending(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${API_BASE}/api/admin/broadcast-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: broadcastSubject.trim(),
          message: broadcastMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setBroadcastLastSent({
          subject: broadcastSubject.trim(),
          count: data.sentTo,
          at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });
        setBroadcastSubject('');
        setBroadcastMessage('');
        toast.success(`Email sent to ${data.sentTo} members.`);
      } else {
        toast.error(data.error ?? 'Failed to send email.');
      }
    } catch {
      toast.error('Could not reach the server. Please try again.');
    } finally {
      setBroadcastSending(false);
    }
  }

  const statCards = [
    {
      label: 'People in app',
      value: members.length,
      icon: Users,
      accent: '#5B4FDB',
      accentBg: 'rgba(26,27,58,0.15)',
      gradient: 'linear-gradient(135deg, #5B4FDB, #7B6FEB)',
    },
    {
      label: 'Online now',
      value: onlineMembers,
      icon: Activity,
      accent: '#10C98A',
      accentBg: 'rgba(16,201,138,0.10)',
      gradient: 'linear-gradient(135deg, #10C98A, #059669)',
    },
    {
      label: 'Access requests',
      value: pendingRequests.length,
      icon: Mail,
      accent: '#EF476F',
      accentBg: 'rgba(239,71,111,0.10)',
      gradient: 'linear-gradient(135deg, #EF476F, #F57A98)',
    },
    {
      label: 'Project channels',
      value: extraChannels.length,
      icon: Hash,
      accent: '#0DAFCE',
      accentBg: 'rgba(13,175,206,0.10)',
      gradient: 'linear-gradient(135deg, #0DAFCE, #3B82F6)',
    },
  ];

  const TABS = [
    { id: 'people' as const,     Icon: Users,        label: 'People',     badge: 0,                      accent: '#5B4FDB', accentBg: 'rgba(26,27,58,0.15)',   accentBorder: 'rgba(91,79,219,0.22)',   animClass: 'click-slide-deck' },
    { id: 'requests' as const,   Icon: UserPlus,     label: 'Requests',   badge: pendingRequests.length,  accent: '#EF476F', accentBg: 'rgba(239,71,111,0.10)',  accentBorder: 'rgba(239,71,111,0.22)',  animClass: 'click-bubble-pop' },
    { id: 'invites' as const,    Icon: Sparkles,     label: 'Invite',     badge: 0,                       accent: '#10C98A', accentBg: 'rgba(16,201,138,0.10)',  accentBorder: 'rgba(16,201,138,0.22)',  animClass: 'click-bubble-pop' },
    { id: 'channels' as const,   Icon: Hash,         label: 'Channels',   badge: 0,                      accent: '#0DAFCE', accentBg: 'rgba(13,175,206,0.10)',  accentBorder: 'rgba(13,175,206,0.22)',  animClass: 'click-bubble-pop' },
    { id: 'broadcast' as const,  Icon: Send,         label: 'Broadcast',  badge: 0,                      accent: '#C026D3', accentBg: 'rgba(192,38,211,0.10)',  accentBorder: 'rgba(192,38,211,0.22)',  animClass: 'click-send-whoosh' },
    { id: 'activity' as const,   Icon: Activity,     label: 'Activity',   badge: 0,                      accent: '#3B82F6', accentBg: 'rgba(59,130,246,0.10)',  accentBorder: 'rgba(59,130,246,0.22)',  animClass: 'click-bar-rise' },
    { id: 'attendance' as const, Icon: CalendarDays, label: 'Attendance', badge: 0,                      accent: '#F59E0B', accentBg: 'rgba(245,158,11,0.10)',  accentBorder: 'rgba(245,158,11,0.22)',  animClass: 'click-cell-bloom' },
    { id: 'desktop' as const,      Icon: Monitor,      label: 'Desktop',      badge: liveUsers.length, accent: '#10B981', accentBg: 'rgba(16,185,129,0.10)',  accentBorder: 'rgba(16,185,129,0.22)',  animClass: 'click-bar-rise' },
    { id: 'availability' as const, Icon: CalendarDays, label: 'Availability', badge: 0,                accent: '#6366f1', accentBg: 'rgba(99,102,241,0.10)',  accentBorder: 'rgba(99,102,241,0.22)',  animClass: 'click-cell-bloom' },
    { id: 'leaves' as const,         Icon: CalendarX,    label: 'Leaves',         badge: leaves.filter(l => l.status === 'pending').length, accent: '#F59E0B', accentBg: 'rgba(245,158,11,0.10)', accentBorder: 'rgba(245,158,11,0.22)', animClass: 'click-cell-bloom' },
    { id: 'leave-calendar' as const,  Icon: CalendarDays, label: 'Leave Calendar', badge: 0,                                                     accent: '#10C98A', accentBg: 'rgba(16,201,138,0.10)', accentBorder: 'rgba(16,201,138,0.22)', animClass: 'click-cell-bloom' },
    { id: 'audit' as const,           Icon: ScrollText,   label: 'Audit Log',      badge: 0,                                                     accent: '#6366F1', accentBg: 'rgba(99,102,241,0.10)',  accentBorder: 'rgba(99,102,241,0.22)',  animClass: 'click-bar-rise' },
  ];

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  return (
    <AdminGuard>
      <div className="admin-control-root min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

        {/* â”€â”€ Spectrum bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="spectrum-bar fixed top-0 left-0 right-0 z-50 pointer-events-none" />

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <header className="sticky top-[3px] z-40" style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(26,27,58,0.14)', boxShadow: '0 2px 16px rgba(91,79,219,0.06)' }}>
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5 no-underline">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #5B4FDB, #8B3FDB)', boxShadow: '0 4px 14px rgba(91,79,219,0.28)' }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#FFFFFF' }}>EX</span>
                </div>
                <span style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: '#1A1B3A', letterSpacing: '-0.025em' }}>
                  EduTechEx<span style={{ color: '#5B4FDB' }}>OS</span>
                </span>
              </Link>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 8, background: 'rgba(239,71,111,0.08)', border: '1px solid rgba(239,71,111,0.18)', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#EF476F', fontFamily: "'JetBrains Mono', monospace" }}>
                Admin control
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20, border: '1.5px solid rgba(26,27,58,0.18)', background: '#FFFFFF', fontSize: 12, fontWeight: 600, color: '#5A5F80', textDecoration: 'none', transition: 'all .2s' }}
                className="hidden md:inline-flex"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(91,79,219,0.28)'; (e.currentTarget as HTMLElement).style.color = '#5B4FDB'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,27,58,0.18)'; (e.currentTarget as HTMLElement).style.color = '#5A5F80'; }}
              >
                Workspace
              </Link>
              <button
                className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all"
                style={{ color: '#9296B0', background: 'transparent', border: '1.5px solid rgba(26,27,58,0.15)' }}
                title="Pending requests"
                onClick={() => setActiveTab('requests')}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,71,111,0.06)'; (e.currentTarget as HTMLElement).style.color = '#EF476F'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9296B0'; }}
              >
                <Bell size={17} />
                {pendingRequests.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: '#EF476F' }} />
                )}
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold" style={{ background: 'linear-gradient(135deg, #5B4FDB, #8B3FDB)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(91,79,219,0.25)' }}>
                {(adminUser?.name ?? 'Admin')
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-6 py-10 lg:px-8">
          {/* â”€â”€ Page hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>
                Admin control
              </p>
              <h1 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#1A1B3A', marginBottom: 8 }}>
                Workspace Control Center
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(90,95,128,0.75)', lineHeight: 1.65, maxWidth: 560 }}>
                Manage people, channel access, broadcast emails, and monitor team activity "” all in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-5 py-3 text-sm whitespace-nowrap"
            >
              <UserPlus size={16} />
              Add user
            </button>
          </section>

          {/* â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, icon: Icon, accent, accentBg, gradient }) => (
              <div
                key={label}
                className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300"
                style={{ background: '#FFFFFF', border: `1.5px solid ${accent}18`, boxShadow: `0 2px 8px ${accent}0A`, cursor: 'default' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = `0 12px 40px ${accent}16`; el.style.borderColor = `${accent}30`; el.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = `0 2px 8px ${accent}0A`; el.style.borderColor = `${accent}18`; el.style.transform = 'translateY(0)'; }}
              >
                {/* Left accent strip */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: gradient, borderRadius: '3px 0 0 3px' }} />
                <div className="mb-4 flex items-center justify-between">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${accent}28` }}>
                    <Icon size={19} style={{ color: '#FFFFFF' }} />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: accent, background: accentBg, padding: '3px 8px', borderRadius: 20 }}>
                    Live
                  </span>
                </div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.65)', marginBottom: 4 }}>
                  {label}
                </p>
                <p style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: '#1A1B3A', lineHeight: 1 }}>
                  {value}
                </p>
              </div>
            ))}
          </section>

          {/* â”€â”€ Tab navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl p-1.5" style={{ background: '#FFFFFF', border: '1.5px solid rgba(26,27,58,0.14)', boxShadow: '0 2px 8px rgba(91,79,219,0.04)' }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    const btn = document.querySelector(`[data-tab="${tab.id}"]`) as HTMLElement;
                    if (btn) {
                      btn.classList.remove(tab.animClass);
                      void btn.offsetWidth;
                      btn.classList.add(tab.animClass);
                      setTimeout(() => btn.classList.remove(tab.animClass), 600);
                    }
                  }}
                  data-tab={tab.id}
                  className="flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-250"
                  style={isActive ? {
                    background: tab.accentBg,
                    color: tab.accent,
                    border: `1.5px solid ${tab.accentBorder}`,
                    boxShadow: `0 2px 12px ${tab.accent}18`,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  } : {
                    color: 'rgba(90,95,128,0.70)',
                    border: '1.5px solid transparent',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(91,79,219,0.04)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <tab.Icon size={15} />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      height: 18, minWidth: 18, padding: '0 5px',
                      borderRadius: 9, fontSize: 9, fontWeight: 800,
                      background: isActive ? tab.accent : '#EF476F',
                      color: '#FFFFFF',
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: PEOPLE
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'people' && (
            <div className="card-premium overflow-hidden" style={{ animation: 'slide-deck 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
              {/* People tab top accent */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #5B4FDB, #7B6FEB, #8B3FDB)', borderRadius: '8px 8px 0 0' }} />
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" style={{ borderBottom: '1px solid rgba(26,27,58,0.14)' }}>
                <div>
                  <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1B3A', letterSpacing: '-0.02em', marginBottom: 2 }}>
                    Users
                  </h2>
                  <p style={{ fontSize: 13, color: 'rgba(90,95,128,0.65)' }}>
                    Manage team members, roles, and channel access.
                  </p>
                </div>
                <label className="flex h-10 items-center gap-2 rounded-xl px-3.5 md:w-80 transition-all" style={{ border: '1.5px solid rgba(91,79,219,0.14)', background: '#ECEAF8' }}>
                  <Search size={15} style={{ color: '#9296B0' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    style={{ color: '#1A1B3A' }}
                  />
                </label>
              </div>

              {/* Channel access modal */}
              {channelPopoverId && (() => {
                const modalMember = filteredMembers.find(m => m.id === channelPopoverId);
                if (!modalMember) return null;
                const modalExtraChannels = getExtraChannels(modalMember.id);
                return (
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,12,40,0.45)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setChannelPopoverId(null)}
                  >
                    <div
                      style={{ background: '#fff', borderRadius: 20, width: 380, maxWidth: '92vw', boxShadow: '0 24px 60px rgba(91,79,219,0.22), 0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div style={{ background: 'linear-gradient(135deg, #5B4FDB, #7B6FEB)', padding: '20px 24px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: modalMember.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.20)' }}>
                              {modalMember.initials}
                            </div>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{modalMember.name}</p>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>Channel Access</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setChannelPopoverId(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                      {/* Channel list */}
                      <div style={{ padding: '16px 24px 20px', maxHeight: 360, overflowY: 'auto' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.50)', marginBottom: 12 }}>
                          Select channels to grant access
                        </p>
                        {/* #general — always on */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(13,175,206,0.06)', border: '1px solid rgba(13,175,206,0.15)', marginBottom: 8, opacity: 0.7 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,175,206,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Hash size={14} style={{ color: '#0DAFCE' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0DAFCE', margin: 0 }}>general</p>
                            <p style={{ fontSize: 10, color: 'rgba(90,95,128,0.55)', margin: '1px 0 0' }}>Always granted to everyone</p>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#0DAFCE', background: 'rgba(13,175,206,0.12)', padding: '3px 8px', borderRadius: 6, letterSpacing: '.06em' }}>DEFAULT</span>
                        </div>
                        {extraChannels.length === 0 ? (
                          <p style={{ fontSize: 13, color: 'rgba(90,95,128,0.55)', textAlign: 'center', padding: '24px 0' }}>No additional channels in workspace.</p>
                        ) : extraChannels.map((c) => {
                          const checked = modalExtraChannels.some((ec) => ec.id === c.id);
                          return (
                            <label
                              key={c.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 6, background: checked ? 'rgba(91,79,219,0.06)' : 'rgba(90,95,128,0.03)', border: `1.5px solid ${checked ? 'rgba(91,79,219,0.22)' : 'rgba(90,95,128,0.10)'}`, transition: 'all .15s' }}
                            >
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: checked ? 'rgba(91,79,219,0.12)' : 'rgba(90,95,128,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Hash size={14} style={{ color: checked ? '#5B4FDB' : '#9BA6D3' }} />
                              </div>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: checked ? 700 : 500, color: checked ? '#1A1B3A' : '#5A5F80' }}>{c.name}</span>
                              {/* Toggle switch */}
                              <div style={{ position: 'relative', width: 40, height: 22, flexShrink: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => handleChannelToggle(modalMember.id, c.id, e.target.checked)}
                                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', margin: 0, cursor: 'pointer', zIndex: 1 }}
                                />
                                <div style={{ width: 40, height: 22, borderRadius: 11, background: checked ? '#5B4FDB' : 'rgba(90,95,128,0.20)', transition: 'background .2s', position: 'relative' }}>
                                  <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.20)', transition: 'left .2s' }} />
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {/* Footer */}
                      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(91,79,219,0.08)', display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => setChannelPopoverId(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(90,95,128,0.08)', color: '#5A5F80', fontSize: 13, fontWeight: 700, border: '1px solid rgba(90,95,128,0.14)', cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button type="button" onClick={() => setChannelPopoverId(null)} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg, #5B4FDB, #7B6FEB)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(91,79,219,0.30)' }}>
                          Save Access
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(26,27,58,0.10)', background: 'rgba(91,79,219,0.02)' }}>
                      {['Member', 'Role', 'Status', 'Channels', ''].map((h) => (
                        <th key={h} style={{ padding: '11px 20px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.55)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const memberExtraChannels = getExtraChannels(member.id);
                      const isPrivileged = member.role === 'Admin' || member.role === 'Manager';
                      const isAdminMember = member.role === 'Admin';
                      const roleColors: Record<string, { bg: string; color: string; border: string }> = {
                        Admin:     { bg: 'rgba(91,79,219,0.12)',  color: '#5B4FDB', border: 'rgba(91,79,219,0.25)' },
                        Manager:   { bg: 'rgba(16,201,138,0.10)', color: '#0BA868', border: 'rgba(16,201,138,0.25)' },
                        Lead:      { bg: 'rgba(245,158,11,0.10)', color: '#D48C00', border: 'rgba(245,158,11,0.25)' },
                        Developer: { bg: 'rgba(13,175,206,0.10)', color: '#0A90AA', border: 'rgba(13,175,206,0.22)' },
                        Designer:  { bg: 'rgba(239,71,111,0.10)', color: '#C73060', border: 'rgba(239,71,111,0.22)' },
                      };
                      const rc = roleColors[member.role] ?? roleColors.Developer;
                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid rgba(91,79,219,0.05)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91,79,219,0.025)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {/* Member */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${member.color}, ${member.color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: `0 2px 8px ${member.color}30` }}>
                                {member.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold" style={{ color: '#1A1B3A' }}>{member.name}</p>
                                <p className="truncate text-xs" style={{ color: 'rgba(90,95,128,0.60)' }}>{member.email}</p>
                              </div>
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-5 py-3.5">
                            {systemEmails.includes(member.email.toLowerCase()) ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>
                                {member.role}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.id, member.name, e.target.value)}
                                  style={{ height: 32, borderRadius: 8, border: `1.5px solid ${rc.border}`, background: rc.bg, padding: '0 8px', fontSize: 12, fontWeight: 600, color: rc.color, outline: 'none', cursor: 'pointer' }}
                                >
                                  <option value="Developer">Developer</option>
                                  <option value="Designer">Designer</option>
                                  <option value="Lead">Lead</option>
                                  <option value="Manager">Manager</option>
                                  <option value="Admin">Admin</option>
                                </select>
                                {!isAdminMember && canAddMoreAdmins && (
                                  <button type="button" onClick={() => promoteToAdmin(member)} disabled={promoteLoadingId === member.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'transparent', color: '#5B4FDB', fontSize: 10, fontWeight: 700, border: '1px solid rgba(91,79,219,0.22)', cursor: 'pointer', opacity: promoteLoadingId === member.id ? 0.5 : 1, width: 'fit-content' }}>
                                    <ShieldCheck size={10} />
                                    {promoteLoadingId === member.id ? 'Promoting…' : 'Make Admin'}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: member.status === 'online' ? '#0BA868' : '#5A5F80' }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: member.status === 'online' ? '#10C98A' : member.status === 'away' ? '#F59E0B' : '#D4D0CC', boxShadow: member.status === 'online' ? '0 0 6px rgba(16,201,138,0.60)' : 'none', flexShrink: 0 }} />
                              {member.status ?? 'offline'}
                            </span>
                          </td>
                          {/* Channels */}
                          <td className="px-5 py-3.5">
                            {isPrivileged ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'rgba(91,79,219,0.08)', color: '#5B4FDB', border: '1px solid rgba(91,79,219,0.18)' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                All channels
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(13,175,206,0.08)', color: '#0DAFCE', border: '1px solid rgba(13,175,206,0.18)' }}>
                                  <Hash size={8} />{`general`}
                                </span>
                                {memberExtraChannels.slice(0, 2).map((ec) => (
                                  <span key={ec.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(91,79,219,0.08)', color: '#5B4FDB', border: '1px solid rgba(91,79,219,0.18)' }}>
                                    <Hash size={8} />{ec.name}
                                  </span>
                                ))}
                                {memberExtraChannels.length > 2 && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#5A5F80' }}>+{memberExtraChannels.length - 2} more</span>
                                )}
                                {!systemEmails.includes(member.email.toLowerCase()) && (
                                  <button
                                    type="button"
                                    onClick={() => setChannelPopoverId(member.id)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(91,79,219,0.07)', color: '#5B4FDB', border: '1.5px dashed rgba(91,79,219,0.30)', cursor: 'pointer', transition: 'all .15s' }}
                                  >
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                                    Manage
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Remove ${member.name} from the workspace?\n\nThey will be logged out immediately if they are currently online.`
                                  )
                                )
                                  return;
                                const authData = localStorage.getItem('edutechex_token');
                                const token = authData ? JSON.parse(authData).token : null;
                                const mongoId = member.id.startsWith('member-')
                                  ? member.id.slice(7)
                                  : null;
                                const isDbMember = mongoId !== null && mongoId.length === 24;

                                const doSystemRemove = async () => {
                                  const payload = JSON.stringify({ email: member.email, memberId: member.id });
                                  const headers = {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  };
                                  // Try POST /api/members/remove first (works even when some
                                  // reverse-proxies 404 DELETE on this path), then fall back
                                  // to the original DELETE endpoint.
                                  let r = await fetch(`${API_BASE}/api/members/remove`, {
                                    method: 'POST', headers, body: payload,
                                  });
                                  if (r.status === 404) {
                                    r = await fetch(`${API_BASE}/api/members/system`, {
                                      method: 'DELETE', headers, body: payload,
                                    });
                                  }
                                  const b = await r.json().catch(() => ({}));
                                  if (r.ok && b.success) {
                                    removeMember(member.id);
                                    toast.success(`${member.name} was removed from the workspace.`);
                                    loadLocalMembers?.();
                                  } else if (r.status === 404) {
                                    // Both endpoints missing (very old deploy) "” remove locally
                                    removeMember(member.id);
                                    toast.success(`${member.name} was removed from the workspace.`);
                                    loadLocalMembers?.();
                                  } else {
                                    toast.error(`Could not remove ${member.name}: ${b.error ?? r.status}`);
                                  }
                                };

                                try {
                                  if (isDbMember) {
                                    const res = await fetch(`${API_BASE}/api/access-requests/${mongoId}`, {
                                      method: 'DELETE',
                                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                                    });
                                    const body = await res.json().catch(() => ({}));
                                    if (res.ok && body.success) {
                                      removeMember(member.id);
                                      toast.success(`${member.name} was removed from the workspace.`);
                                      loadLocalMembers?.();
                                    } else if (res.status === 404) {
                                      // DB record already gone "” try system endpoint (covers
                                      // hardcoded members that were also registered via sign-up)
                                      // or just remove from local state if truly gone.
                                      await doSystemRemove().catch(async () => {
                                        removeMember(member.id);
                                        toast.success(`${member.name} was removed from the workspace.`);
                                        loadLocalMembers?.();
                                      });
                                    } else {
                                      toast.error(`Could not remove ${member.name}: ${body.error ?? res.status}`);
                                    }
                                  } else {
                                    await doSystemRemove();
                                  }
                                } catch {
                                  toast.error('Could not reach the server. Please try again.');
                                }
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-light transition-all hover:bg-[rgba(244,63,94,0.10)] hover:text-[#f43f5e]"
                              title="Remove user"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: REQUESTS
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'requests' && (() => {
            const statusCfg: Record<string, { label: string; color: string; bg: string; border: string }> = {
              pending:  { label: 'Pending',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)' },
              invited:  { label: 'Invited',  color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)' },
              approved: { label: 'Approved', color: '#10C98A', bg: 'rgba(16,201,138,0.10)',  border: 'rgba(16,201,138,0.25)' },
              rejected: { label: 'Revoked',  color: '#EF476F', bg: 'rgba(239,71,111,0.10)',  border: 'rgba(239,71,111,0.20)' },
            };

            const filterCounts = {
              all:      accessRequests.length,
              pending:  accessRequests.filter(r => r.status === 'pending').length,
              invited:  accessRequests.filter(r => r.status === 'invited').length,
              approved: accessRequests.filter(r => r.status === 'approved').length,
              rejected: accessRequests.filter(r => r.status === 'rejected').length,
            };

            const filtered = accessRequests
              .filter(r => requestFilter === 'all' || r.status === requestFilter)
              .filter(r => {
                const q = requestSearch.toLowerCase();
                return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
              });

            const isInternal = (email: string) => email.toLowerCase().endsWith('@edutechex.in');

            return (
              <div className="card-premium p-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ height: 3, background: 'linear-gradient(90deg,#EF476F,#F57A98)', borderRadius: 3 }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: '#1A1B3A', margin: 0 }}>
                      User Requests
                    </h2>
                    <p style={{ fontSize: 12, color: 'rgba(90,95,128,0.55)', margin: '2px 0 0' }}>
                      {filterCounts.all} total &nbsp;&middot;&nbsp; {filterCounts.pending} pending &nbsp;&middot;&nbsp; {filterCounts.approved} approved
                    </p>
                  </div>
                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(90,95,128,0.40)' }} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={requestSearch}
                      onChange={e => setRequestSearch(e.target.value)}
                      style={{ paddingLeft: 30, paddingRight: 12, height: 34, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.10)', background: '#F7F8FC', fontSize: 12, color: '#1A1B3A', outline: 'none', width: 200 }}
                    />
                  </div>
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['all', 'pending', 'invited', 'approved', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRequestFilter(f)}
                      style={{ height: 28, padding: '0 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', transition: 'all .15s',
                        background: requestFilter === f ? '#1A1B3A' : 'rgba(26,27,58,0.05)',
                        color: requestFilter === f ? '#fff' : 'rgba(90,95,128,0.70)',
                        border: requestFilter === f ? 'none' : '1.5px solid rgba(26,27,58,0.08)',
                      }}
                    >
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      <span style={{ marginLeft: 5, fontSize: 9.5, opacity: 0.75 }}>
                        {filterCounts[f]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* View modal */}
                {viewingRequest && (
                  <div style={{ borderRadius: 14, border: '1.5px solid rgba(91,79,219,0.18)', background: 'rgba(91,79,219,0.04)', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>
                            {viewingRequest.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1B3A', margin: 0 }}>{viewingRequest.name}</p>
                          <p style={{ fontSize: 12, color: 'rgba(90,95,128,0.65)', margin: '2px 0 0', fontFamily: "'JetBrains Mono',monospace" }}>{viewingRequest.email}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setViewingRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(90,95,128,0.50)', padding: 4 }}>
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', marginBottom: 14 }}>
                      {[
                        { label: 'Role', value: viewingRequest.role },
                        { label: 'Type', value: isInternal(viewingRequest.email) ? 'Internal (@edutechex.in)' : 'External' },
                        { label: 'Status', value: statusCfg[viewingRequest.status]?.label ?? viewingRequest.status },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(90,95,128,0.45)', margin: '0 0 3px' }}>{label}</p>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1B3A', margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {shownPasswords[viewingRequest.id] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(16,201,138,0.06)', border: '1px solid rgba(16,201,138,0.22)', borderRadius: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#065F46', flexShrink: 0 }}>Generated password:</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#065F46', flex: 1 }}>{shownPasswords[viewingRequest.id]}</span>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(shownPasswords[viewingRequest.id]); toast.success('Copied!'); }} style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: '#10C98A', color: '#fff', border: 'none', cursor: 'pointer' }}>Copy</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Table */}
                {filtered.length === 0 ? (
                  <div style={{ borderRadius: 14, border: '1.5px dashed rgba(26,27,58,0.12)', background: '#F7F8FC', padding: '48px 24px', textAlign: 'center' }}>
                    <UserPlus size={26} style={{ margin: '0 auto 10px', color: 'rgba(90,95,128,0.30)' }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(90,95,128,0.55)' }}>No users match this filter</p>
                  </div>
                ) : (
                  <div style={{ borderRadius: 14, border: '1.5px solid rgba(26,27,58,0.08)', overflow: 'hidden' }}>
                    {/* Table head */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 90px 100px 180px', padding: '9px 16px', background: 'rgba(26,27,58,0.03)', borderBottom: '1px solid rgba(26,27,58,0.07)' }}>
                      {['User', 'Role', 'Type', 'Status', 'Actions'].map(h => (
                        <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(90,95,128,0.45)' }}>{h}</span>
                      ))}
                    </div>

                    {/* Rows */}
                    {filtered.map((request, i) => {
                      const cfg = statusCfg[request.status] ?? statusCfg.pending;
                      const internal = isInternal(request.email);
                      const canApprove = request.status === 'pending' || request.status === 'invited';
                      const isRevoked = request.status === 'rejected';

                      return (
                        <div
                          key={request.id}
                          style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 90px 100px 180px', padding: '11px 16px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(26,27,58,0.06)' : 'none', background: viewingRequest?.id === request.id ? 'rgba(99,102,241,0.04)' : i % 2 === 0 ? '#fff' : 'rgba(26,27,58,0.012)', alignItems: 'center', transition: 'background .15s' }}
                        >
                          {/* User */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: isRevoked ? 'rgba(239,71,111,0.10)' : request.status === 'approved' ? 'rgba(16,201,138,0.10)' : 'rgba(91,79,219,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: isRevoked ? '#EF476F' : request.status === 'approved' ? '#10C98A' : '#5B4FDB' }}>
                                {request.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1A1B3A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.name}</p>
                              <p style={{ fontSize: 10.5, color: 'rgba(90,95,128,0.60)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace" }}>{request.email}</p>
                            </div>
                          </div>

                          {/* Role */}
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#5B4FDB' }}>{request.role}</span>

                          {/* Type */}
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-block',
                            background: internal ? 'rgba(16,201,138,0.08)' : 'rgba(245,158,11,0.08)',
                            color: internal ? '#059669' : '#B45309',
                            border: internal ? '1px solid rgba(16,201,138,0.20)' : '1px solid rgba(245,158,11,0.20)',
                          }}>
                            {internal ? 'Internal' : 'External'}
                          </span>

                          {/* Status */}
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, display: 'inline-block', background: cfg.bg, color: cfg.color, border: '1px solid ' + cfg.border }}>
                            {cfg.label}
                          </span>

                          {/* Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* View */}
                            <button
                              type="button"
                              title="View details"
                              onClick={() => setViewingRequest(viewingRequest?.id === request.id ? null : request)}
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid rgba(26,27,58,0.10)', background: viewingRequest?.id === request.id ? 'rgba(99,102,241,0.10)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: viewingRequest?.id === request.id ? '#6366f1' : 'rgba(90,95,128,0.55)', transition: 'all .15s', flexShrink: 0 }}
                            >
                              <Eye size={13} />
                            </button>

                            {/* Approve */}
                            {internal ? (
                              <button
                                type="button"
                                title={request.status === 'approved' ? 'Already approved' : 'Generate password and email credentials'}
                                onClick={() => canApprove && generatePasswordForRequest(request)}
                                disabled={!canApprove || generatingFor === request.id}
                                style={{ height: 30, padding: '0 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, border: 'none', cursor: canApprove ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s', flexShrink: 0,
                                  background: request.status === 'approved' ? 'rgba(16,201,138,0.10)' : 'linear-gradient(135deg,#10C98A,#059669)',
                                  color: request.status === 'approved' ? '#059669' : '#fff',
                                  opacity: !canApprove && request.status !== 'approved' ? 0.45 : 1,
                                }}
                              >
                                {generatingFor === request.id ? <><RefreshCw size={11} className="animate-spin" /> Working</> : request.status === 'approved' ? <><CheckCircle2 size={11} /> Approved</> : <><KeyRound size={11} /> Gen. Password</>}
                              </button>
                            ) : (
                              <button
                                type="button"
                                title={request.status === 'invited' ? 'Invite already sent' : request.status === 'approved' ? 'Already approved' : 'Send invite link'}
                                onClick={() => canApprove && sendInvite(request)}
                                disabled={!canApprove}
                                style={{ height: 30, padding: '0 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, border: 'none', cursor: canApprove ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s', flexShrink: 0,
                                  background: request.status === 'approved' || request.status === 'invited' ? 'rgba(99,102,241,0.10)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                  color: request.status === 'approved' || request.status === 'invited' ? '#6366f1' : '#fff',
                                  opacity: !canApprove && request.status !== 'approved' && request.status !== 'invited' ? 0.45 : 1,
                                }}
                              >
                                {request.status === 'approved' ? <><CheckCircle2 size={11} /> Approved</> : request.status === 'invited' ? <><CheckCircle2 size={11} /> Invited</> : <><Mail size={11} /> Send Invite</>}
                              </button>
                            )}

                            {/* Revoke */}
                            <button
                              type="button"
                              title={isRevoked ? 'Already revoked' : 'Revoke access'}
                              onClick={() => !isRevoked && request.status !== 'pending' && rejectRequest(request.id)}
                              disabled={isRevoked || request.status === 'pending'}
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid rgba(239,71,111,0.18)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isRevoked || request.status === 'pending' ? 'default' : 'pointer', color: '#EF476F', transition: 'all .15s', flexShrink: 0, opacity: isRevoked || request.status === 'pending' ? 0.35 : 1 }}
                              onMouseEnter={e => { if (!isRevoked && request.status !== 'pending') { (e.currentTarget as HTMLElement).style.background = 'rgba(239,71,111,0.08)'; } }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: CHANNELS
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {/* TAB: INVITE GENERATOR */}
          {activeTab === 'invites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(16,201,138,0.06)', border: '1.5px solid rgba(16,201,138,0.20)' }}>
                <ShieldCheck size={16} style={{ color: '#10C98A', flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(26,27,58,0.70)', lineHeight: 1.6 }}>
                  Invites are the <strong>only</strong> way into the workspace. Each link expires in <strong>4.5 hours</strong> and is single-use. Users who sign up with non-company emails are blocked.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card-premium" style={{ padding: '24px 28px' }}>
                  <div style={{ height: 3, background: 'linear-gradient(90deg,#10C98A,#059669)', borderRadius: 3, marginBottom: 20 }} />
                  <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: '#1A1B3A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Send a single invite</h3>
                  <p style={{ margin: '0 0 20px', fontSize: 12, color: 'rgba(90,95,128,0.60)' }}>Fill in the details and we will email a secure activation link.</p>
                  <form onSubmit={sendDirectInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'Full name', value: inviteName, setter: setInviteName, placeholder: 'Riya Sharma', type: 'text' },
                      { label: 'Email', value: inviteEmail, setter: setInviteEmail, placeholder: 'riya@edutechex.in', type: 'email' },
                    ].map(({ label, value, setter, placeholder, type }) => (
                      <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(90,95,128,0.65)', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                        <input type={type} required value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} style={{ height: 40, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.14)', background: '#ECEAF8', padding: '0 12px', fontSize: 13, fontWeight: 500, color: '#1A1B3A', outline: 'none' }} />
                      </label>
                    ))}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(90,95,128,0.65)', fontFamily: "'JetBrains Mono', monospace" }}>Role</span>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.14)', background: '#ECEAF8', padding: '0 12px', fontSize: 13, fontWeight: 600, color: '#1A1B3A', outline: 'none' }}>
                        {['Developer', 'Designer', 'Lead', 'Manager', 'Admin'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </label>
                    <button type="submit" disabled={inviteSubmitting} style={{ height: 42, borderRadius: 12, background: inviteSubmitting ? 'rgba(16,201,138,0.35)' : 'linear-gradient(135deg,#10C98A,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: inviteSubmitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(16,201,138,0.28)', transition: 'all .2s', marginTop: 4 }}>
                      <Mail size={14} /> {inviteSubmitting ? 'Sending...' : 'Send Invite Link'}
                    </button>
                  </form>
                </div>

                <div className="card-premium" style={{ padding: '24px 28px' }}>
                  <div style={{ height: 3, background: 'linear-gradient(90deg,#6366f1,#8B3FDB)', borderRadius: 3, marginBottom: 20 }} />
                  <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: '#1A1B3A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Bulk invite via CSV</h3>
                  <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(90,95,128,0.60)' }}>
                    One row per person: <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: 'rgba(91,79,219,0.08)', padding: '1px 5px', borderRadius: 4 }}>Name, email@edutechex.in, Role</code>
                  </p>
                  <textarea value={csvText} onChange={(e) => { setCsvText(e.target.value); parseCSV(e.target.value); }} placeholder="Priya Nair, priya@edutechex.in, Designer" rows={6} style={{ width: '100%', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.14)', background: '#ECEAF8', padding: '10px 12px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#1A1B3A', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  {csvParsed.length > 0 && (
                    <div style={{ marginTop: 14, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.10)', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 90px', padding: '7px 12px', background: 'rgba(26,27,58,0.04)', borderBottom: '1px solid rgba(26,27,58,0.08)' }}>
                        {['Name', 'Email', 'Role'].map((h) => <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(90,95,128,0.50)' }}>{h}</span>)}
                      </div>
                      {csvParsed.map((row, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 90px', padding: '8px 12px', borderBottom: i < csvParsed.length - 1 ? '1px solid rgba(26,27,58,0.06)' : 'none', background: i % 2 === 0 ? '#fff' : 'rgba(26,27,58,0.015)' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1B3A' }}>{row.name}</span>
                          <span style={{ fontSize: 11, color: 'rgba(90,95,128,0.70)', fontFamily: "'JetBrains Mono', monospace" }}>{row.email}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#5B4FDB' }}>{row.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" disabled={csvParsed.length === 0 || csvSending} onClick={sendBulkInvites} style={{ marginTop: 14, width: '100%', height: 42, borderRadius: 12, background: (csvParsed.length === 0 || csvSending) ? 'rgba(99,102,241,0.25)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: (csvParsed.length === 0 || csvSending) ? 'rgba(255,255,255,0.60)' : '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: (csvParsed.length === 0 || csvSending) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' }}>
                    <Send size={14} /> {csvSending ? 'Sending...' : 'Send ' + String(csvParsed.length > 0 ? csvParsed.length + ' ' : '') + 'Invite' + String(csvParsed.length !== 1 ? 's' : '')}
                  </button>
                </div>
              </div>

              {inviteLog.length > 0 && (
                <div className="card-premium" style={{ padding: '24px 28px' }}>
                  <div style={{ height: 3, background: 'linear-gradient(90deg,#F59E0B,#D97706)', borderRadius: 3, marginBottom: 20 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: '#1A1B3A', margin: 0 }}>
                      Invite log <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(90,95,128,0.50)', marginLeft: 6 }}>this session</span>
                    </h3>
                    <button type="button" onClick={() => setInviteLog([])} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(90,95,128,0.55)', background: 'none', border: '1.5px solid rgba(26,27,58,0.12)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>Clear</button>
                  </div>
                  <div style={{ borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.08)', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 90px 1fr 120px', padding: '8px 16px', background: 'rgba(26,27,58,0.03)', borderBottom: '1px solid rgba(26,27,58,0.07)' }}>
                      {['Name', 'Email', 'Role', 'Status', 'Sent at'].map((h) => <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(90,95,128,0.45)' }}>{h}</span>)}
                    </div>
                    {inviteLog.map((entry, i) => (
                      <div key={i} style={{ borderBottom: i < inviteLog.length - 1 ? '1px solid rgba(26,27,58,0.06)' : 'none', background: i % 2 === 0 ? '#fff' : 'rgba(26,27,58,0.015)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 90px 1fr 120px', padding: '10px 16px', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1B3A' }}>{entry.name}</span>
                          <span style={{ fontSize: 11, color: 'rgba(90,95,128,0.70)', fontFamily: "'JetBrains Mono', monospace" }}>{entry.email}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#5B4FDB' }}>{entry.role}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: entry.status === 'sent' ? '#10C98A' : entry.status === 'warn' ? '#F59E0B' : '#EF476F' }}>
                            {entry.status === 'sent' ? <CheckCircle2 size={12} /> : entry.status === 'warn' ? <AlertTriangle size={12} /> : <X size={12} />}
                            {entry.status === 'sent' ? 'Email sent' : entry.status === 'warn' ? 'Email failed' : entry.message}
                          </span>
                          <span style={{ fontSize: 10.5, color: 'rgba(90,95,128,0.45)', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(entry.at).toLocaleTimeString()}</span>
                        </div>
                        {entry.status === 'warn' && entry.inviteUrl && (
                          <div style={{ margin: '0 16px 10px', padding: '8px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10.5, color: '#92400E', fontWeight: 600, flexShrink: 0 }}>Share this link:</span>
                            <span style={{ fontSize: 10, color: '#78350F', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all', flex: 1 }}>{entry.inviteUrl}</span>
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(entry.inviteUrl ?? ''); toast.success('Link copied!'); }}
                              style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: '#F59E0B', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >Copy</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="card-premium space-y-4 p-6">
              {/* Top accent */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #0DAFCE, #3B82F6)', borderRadius: 3 }} />
              {/* General channel */}
              <div style={{ borderRadius: 16, border: '1.5px solid rgba(13,175,206,0.16)', background: '#FFFFFF', padding: 20, boxShadow: '0 2px 12px rgba(13,175,206,0.06)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,175,206,0.10)', border: '1.5px solid rgba(13,175,206,0.20)' }}>
                      <Hash size={16} style={{ color: '#0DAFCE' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1B3A', fontFamily: "'JetBrains Mono', monospace" }}>#general</p>
                      <p style={{ fontSize: 11, color: 'rgba(90,95,128,0.65)', marginTop: 2 }}>
                        Default channel "” every user is automatically added.
                      </p>
                    </div>
                  </div>
                  <span style={{ borderRadius: 10, border: '1.5px solid rgba(13,175,206,0.18)', background: 'rgba(13,175,206,0.08)', padding: '4px 12px', fontSize: 10, fontWeight: 700, color: '#0DAFCE' }}>
                    {getChannelMembers('general').length} members
                  </span>
                </div>
              </div>

              {extraChannels.length === 0 ? (
                <div style={{ borderRadius: 16, border: '1.5px dashed rgba(13,175,206,0.20)', background: 'rgba(13,175,206,0.03)', padding: '56px 32px', textAlign: 'center' }}>
                  <Hash size={28} style={{ margin: '0 auto 12px', color: 'rgba(13,175,206,0.40)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(90,95,128,0.70)' }}>No project channels yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {extraChannels.map((channel) => {
                    const channelMembers = getChannelMembers(channel.id);
                    return (
                      <div key={channel.id} style={{ borderRadius: 16, border: '1.5px solid rgba(13,175,206,0.14)', background: '#FFFFFF', padding: 20, boxShadow: '0 2px 10px rgba(13,175,206,0.06)', transition: 'all .2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(13,175,206,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,175,206,0.28)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(13,175,206,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,175,206,0.14)'; }}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,175,206,0.10)', border: '1.5px solid rgba(13,175,206,0.20)', flexShrink: 0 }}>
                              <Hash size={16} style={{ color: '#0DAFCE' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                                #{channel.name}
                              </p>
                              <p style={{ marginTop: 2, fontSize: 11, color: 'rgba(90,95,128,0.65)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {channel.description}
                              </p>
                            </div>
                          </div>
                          <span style={{ flexShrink: 0, borderRadius: 8, background: 'rgba(13,175,206,0.08)', padding: '3px 10px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#0DAFCE' }}>
                            {channelMembers.length} users
                          </span>
                        </div>

                        {/* Member chips */}
                        <div style={{ marginBottom: 12, display: 'flex', minHeight: 28, flexWrap: 'wrap', gap: 6 }}>
                          {channelMembers.length ? (
                            channelMembers.map((member) => (
                              <button
                                key={`${channel.id}-${member.id}`}
                                type="button"
                                onClick={() => handleChannelToggle(member.id, channel.id, false)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1.5px solid rgba(26,27,58,0.18)', background: '#ECEAF8', padding: '3px 10px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#5A5F80', cursor: 'pointer', transition: 'all .15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,71,111,0.30)'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,71,111,0.06)'; (e.currentTarget as HTMLElement).style.color = '#EF476F'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,27,58,0.18)'; (e.currentTarget as HTMLElement).style.background = '#ECEAF8'; (e.currentTarget as HTMLElement).style.color = '#5A5F80'; }}
                                title={`Remove ${member.name} from #${channel.name}`}
                              >
                                <span
                                  style={{ width: 16, height: 16, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#FFFFFF', backgroundColor: member.color }}
                                >
                                  {member.initials?.[0]}
                                </span>
                                {member.name.split(' ')[0]}
                              </button>
                            ))
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(90,95,128,0.50)' }}>
                              No users assigned yet
                            </span>
                          )}
                        </div>

                        {/* Grant access */}
                        <select
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            handleChannelToggle(e.target.value, channel.id, true);
                          }}
                          style={{ height: 40, width: '100%', borderRadius: 12, border: '1.5px solid rgba(13,175,206,0.18)', background: 'rgba(13,175,206,0.04)', padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#1A1B3A', outline: 'none' }}
                        >
                          <option value="">+ Grant access to a user</option>
                          {members
                            .filter((m) => m.role !== 'Admin')
                            .map((m) => (
                              <option key={`${channel.id}-grant-${m.id}`} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: BROADCAST
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'broadcast' && (
            <div className="mx-auto max-w-2xl">
              <div className="card-premium" style={{ padding: 24 }}>
                {/* Top accent */}
                <div style={{ height: 3, background: 'linear-gradient(90deg, #C026D3, #8B3FDB)', borderRadius: '8px 8px 0 0', marginBottom: 24, marginLeft: -24, marginRight: -24, marginTop: -24 }} />
                <div className="mb-6 flex items-start gap-4">
                  <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(192,38,211,0.10)', border: '1.5px solid rgba(192,38,211,0.20)', flexShrink: 0 }}>
                    <Send size={20} style={{ color: '#C026D3' }} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#1A1B3A' }}>
                      Broadcast Email
                    </h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(90,95,128,0.70)' }}>
                      Send one message to all {members.length} workspace members at once.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.65)' }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      placeholder="e.g. Team update "” June 2026"
                      maxLength={150}
                      style={{ height: 44, width: '100%', borderRadius: 12, border: '1.5px solid rgba(192,38,211,0.18)', background: '#ECEAF8', padding: '0 14px', fontSize: 13, fontWeight: 500, color: '#1A1B3A', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(192,38,211,0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(192,38,211,0.10)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(192,38,211,0.18)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.65)' }}>
                      Message
                    </label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Write your message here. Plain text "” line breaks are preserved."
                      rows={7}
                      maxLength={2000}
                      style={{ width: '100%', resize: 'none', borderRadius: 12, border: '1.5px solid rgba(192,38,211,0.18)', background: '#ECEAF8', padding: '12px 14px', fontSize: 13, fontWeight: 500, color: '#1A1B3A', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color .2s, box-shadow .2s' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(192,38,211,0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(192,38,211,0.10)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(192,38,211,0.18)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p style={{ marginTop: 4, textAlign: 'right', fontSize: 9.5, color: 'rgba(90,95,128,0.50)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {broadcastMessage.length}/2000
                    </p>
                  </div>

                  {/* Recipients preview */}
                  <div style={{ borderRadius: 12, border: '1.5px solid rgba(192,38,211,0.12)', background: 'rgba(192,38,211,0.03)', padding: 16 }}>
                    <p style={{ marginBottom: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.60)' }}>
                      Will be sent to {members.length} members
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {members.slice(0, 10).map((m) => (
                        <span
                          key={m.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1.5px solid rgba(26,27,58,0.15)', background: '#FFFFFF', padding: '4px 10px', fontSize: 11, fontWeight: 500, color: '#5A5F80' }}
                        >
                          <span style={{ width: 16, height: 16, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#FFFFFF', backgroundColor: m.color }}>
                            {m.initials?.[0]}
                          </span>
                          {m.name.split(' ')[0]}
                        </span>
                      ))}
                      {members.length > 10 && (
                        <span style={{ borderRadius: 8, border: '1.5px solid rgba(26,27,58,0.15)', background: '#FFFFFF', padding: '4px 10px', fontSize: 11, fontWeight: 500, color: 'rgba(90,95,128,0.60)' }}>
                          +{members.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>

                  {broadcastLastSent && (
                    <div style={{ borderRadius: 12, border: '1.5px solid rgba(16,201,138,0.20)', background: 'rgba(16,201,138,0.06)', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: '#059669' }}>
                      âœ“ Last sent at {broadcastLastSent.at} · &ldquo;{broadcastLastSent.subject}
                      &rdquo; â†’ {broadcastLastSent.count} members
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBroadcast}
                    disabled={broadcastSending || !broadcastSubject.trim() || !broadcastMessage.trim()}
                    style={{ display: 'flex', height: 44, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, background: 'linear-gradient(135deg, #C026D3, #8B3FDB)', color: '#FFFFFF', fontSize: 13, fontWeight: 700, border: 'none', cursor: broadcastSending ? 'not-allowed' : 'pointer', opacity: broadcastSending || !broadcastSubject.trim() || !broadcastMessage.trim() ? 0.5 : 1, transition: 'all .2s', boxShadow: '0 4px 16px rgba(192,38,211,0.25)' }}
                    onMouseEnter={e => { if (!broadcastSending) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(192,38,211,0.32)'; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(192,38,211,0.25)'; }}
                  >
                    {broadcastSending ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Send to All {members.length} Members
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: ACTIVITY
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'activity' && (
            <div className="card-premium space-y-8 p-6">
              {/* Top accent */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #3B82F6, #0DAFCE)', borderRadius: 3 }} />
              {/* Activity monitoring */}
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p style={{ marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#3B82F6' }}>
                      Last 7 days · With user permission
                    </p>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#1A1B3A' }}>
                      <Eye size={20} style={{ color: '#3B82F6' }} />
                      Activity Monitoring
                    </h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(90,95,128,0.70)', lineHeight: 1.6 }}>
                      In-app session time, messages sent, and engagement per team member. Users can
                      see exactly what is tracked in Settings â†’ Privacy.
                    </p>
                    <Link href="/admin/activity" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
                    >
                      View full activity report â†’
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const authData = localStorage.getItem('edutechex_token');
                      if (!authData) return;
                      let token: string | null = null;
                      try {
                        token = JSON.parse(authData).token;
                      } catch {
                        return;
                      }
                      if (!token) return;
                      setActivityLoading(true);
                      fetch(`${API_BASE}/api/activity/stats`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((r) => (r.ok ? r.json() : null))
                        .then((data: { success: boolean; stats?: ActivityStat[] } | null) => {
                          if (data?.success && Array.isArray(data.stats))
                            setActivityStats(data.stats);
                        })
                        .catch(() => {})
                        .finally(() => setActivityLoading(false));
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 12, border: '1.5px solid rgba(59,130,246,0.18)', background: '#FFFFFF', padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.35)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.18)'; }}
                  >
                    <RefreshCw size={13} className={activityLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {activityLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontSize: 13, color: 'rgba(90,95,128,0.65)' }}>
                    <RefreshCw size={16} style={{ marginRight: 8 }} className="animate-spin" /> Loading activity data...
                  </div>
                ) : activityStats.length === 0 ? (
                  <div style={{ borderRadius: 16, border: '1.5px dashed rgba(59,130,246,0.20)', background: 'rgba(59,130,246,0.03)', padding: '40px 32px', textAlign: 'center', fontSize: 13, color: 'rgba(90,95,128,0.65)' }}>
                    No activity data yet. Data appears once users open the dashboard.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {activityStats
                      .sort((a, b) => (b.totalMinutes ?? 0) - (a.totalMinutes ?? 0))
                      .map((stat) => {
                        const hrs = Math.floor((stat.totalMinutes ?? 0) / 60);
                        const mins = (stat.totalMinutes ?? 0) % 60;
                        const timeLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                        const lastSeenLabel = stat.lastSeen
                          ? new Date(stat.lastSeen).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Never';
                        const member = members.find(
                          (m) => m.email.toLowerCase() === stat.email.toLowerCase()
                        );
                        const initials =
                          member?.initials ??
                          (stat.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2) ||
                            '??');
                        const color = member?.color ?? '#64748b';
                        const engagementPct = Math.min(
                          100,
                          Math.round(((stat.totalMinutes ?? 0) / (7 * 8 * 60)) * 100)
                        );
                        const statusColor = member?.status === 'online' ? '#10C98A' : member?.status === 'away' ? '#F59E0B' : 'rgba(90,95,128,0.50)';
                        const statusBg = member?.status === 'online' ? 'rgba(16,201,138,0.10)' : member?.status === 'away' ? 'rgba(245,158,11,0.10)' : 'rgba(90,95,128,0.08)';

                        return (
                          <div key={stat.email} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 16, border: '1.5px solid rgba(59,130,246,0.12)', background: '#FFFFFF', padding: 20, boxShadow: '0 2px 12px rgba(59,130,246,0.06)', transition: 'all .2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(59,130,246,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.25)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(59,130,246,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.12)'; }}
                          >
                            <div className="flex items-center gap-3">
                              <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#FFFFFF', backgroundColor: color, flexShrink: 0 }}>
                                {initials}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {stat.name || stat.email}
                                </p>
                                <p style={{ fontSize: 11, color: 'rgba(90,95,128,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.email}</p>
                              </div>
                              <span style={{ marginLeft: 'auto', flexShrink: 0, borderRadius: 20, padding: '2px 8px', fontSize: 9.5, fontWeight: 700, color: statusColor, background: statusBg }}>
                                {member?.status ?? 'offline'}
                              </span>
                            </div>

                            <div>
                              <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 600, color: 'rgba(90,95,128,0.60)' }}>
                                <span>Engagement this week</span>
                                <span>{engagementPct}%</span>
                              </div>
                              <div style={{ height: 6, width: '100%', overflow: 'hidden', borderRadius: 3, background: 'rgba(26,27,58,0.14)' }}>
                                <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #3B82F6, #0DAFCE)', transition: 'width .5s', width: `${engagementPct}%` }} />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                              {[
                                { Icon: Clock,        value: timeLabel,              label: 'Session',  color: '#3B82F6' },
                                { Icon: MessageSquare, value: stat.messageCount ?? 0, label: 'Messages', color: '#0DAFCE' },
                                { Icon: Activity,      value: stat.activeDays ?? 0,   label: 'Days',     color: '#10C98A' },
                              ].map(({ Icon: Ic, value, label, color: c }) => (
                                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 12, background: 'rgba(91,79,219,0.04)', padding: '10px 4px' }}>
                                  <Ic size={12} style={{ marginBottom: 4, color: c }} />
                                  <span style={{ fontSize: 13, fontWeight: 900, color: '#1A1B3A' }}>{value}</span>
                                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(90,95,128,0.55)', marginTop: 1 }}>{label}</span>
                                </div>
                              ))}
                            </div>

                            <p style={{ borderTop: '1px solid rgba(26,27,58,0.14)', paddingTop: 8, fontSize: 11, color: 'rgba(90,95,128,0.65)' }}>
                              <span style={{ fontWeight: 600, color: '#1A1B3A' }}>Last active:</span>{' '}
                              {lastSeenLabel}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: ATTENDANCE COMMAND CENTER
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'attendance' && (
            <div className="card-premium p-6">
              {/* Attendance hero banner */}
              <div className="mb-6 overflow-hidden rounded-2xl px-7 py-6" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,71,111,0.06))', border: '1.5px solid rgba(245,158,11,0.18)', boxShadow: '0 4px 24px rgba(245,158,11,0.08)' }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#D48C00', marginBottom: 6 }}>
                      Admin · Real-time tracking
                    </p>
                    <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#1A1B3A', marginBottom: 4 }}>
                      Attendance Command Center
                    </h2>
                    <p style={{ fontSize: 13, color: 'rgba(90,95,128,0.75)', lineHeight: 1.6 }}>
                      Review daily login patterns, manage check-ins, and track streaks per team
                      member.
                    </p>
                  </div>
                  {/* Today's quick presence dots */}
                  <div className="shrink-0 rounded-2xl px-5 py-4" style={{ border: '1.5px solid rgba(245,158,11,0.18)', background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(12px)' }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.60)', marginBottom: 10 }}>
                      Present today
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {members.slice(0, 12).map((m) => (
                        <div
                          key={m.id}
                          title={m.name}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white transition-transform hover:scale-110"
                          style={{
                            backgroundColor:
                              m.status === 'online' ? m.color : `${m.color}55`,
                            outline:
                              m.status === 'online'
                                ? `2px solid ${m.color}`
                                : '2px solid transparent',
                            outlineOffset: '2px',
                          }}
                        >
                          {m.initials}
                        </div>
                      ))}
                    </div>
                    <p style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: 'rgba(90,95,128,0.70)' }}>
                      <span style={{ color: '#10C98A', fontWeight: 800 }}>
                        {members.filter((m) => m.status === 'online').length}
                      </span>
                      {' '}/ {members.length} online now
                    </p>
                  </div>
                </div>
              </div>

              {/* Calendar component */}
              <LoginTrackerCalendar />
            </div>
          )}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: DESKTOP ACTIVITY
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'desktop' && (() => {
            const istOffset = 5.5 * 60 * 60 * 1000;
            const todayIST  = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
            const viewDate  = awDate; // single date for all data

            const panelIcon: Record<string, string> = {
              messages: 'ðŸ’¬', wiki: 'ðŸ“–', kanban: 'âœ…', calendar: 'ðŸ“…',
              leave: 'ðŸŒ´', dashboard: 'ðŸ ', ai: 'âœ¨',
            };

            const fmt = (m: number) => m <= 0 ? '0m' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
            const ago = (iso: string | null | undefined) => {
              if (!iso) return 'never';
              const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
              if (s < 60) return `${s}s ago`;
              if (s < 3600) return `${Math.round(s / 60)}m ago`;
              return `${Math.round(s / 3600)}h ago`;
            };

            const DISTRACTIONS = ['youtube','netflix','discord','spotify','instagram','facebook','twitter','reddit','tiktok','whatsapp'];
            const isDistraction = (app: string) => DISTRACTIONS.some(d => app.toLowerCase().includes(d));

            // Merge all data sources into one object per member
            type MergedMember = {
              email: string; name: string; initials: string; color: string; role: string;
              status: 'live' | 'away' | 'offline';
              currentActivity: string; currentPanel: string;
              lastSeen: string | null;
              todayMinutes: number; messageCount: number; taskCount: number;
              appBreakdown: { app: string; minutes: number }[];
              totalActiveMinutes: number; isAfk: boolean; agentConnected: boolean;
            };

            const merged: MergedMember[] = members.map((m) => {
              const live    = liveUsers.find(u => u.email.toLowerCase()    === m.email.toLowerCase());
              const history = historyUsers.find(u => u.email.toLowerCase() === m.email.toLowerCase());
              const aw      = awRecords.find(r => r.email.toLowerCase()    === m.email.toLowerCase());
              const status: 'live' | 'away' | 'offline' = live ? 'live' : (history?.totalMinutes ?? 0) > 0 ? 'away' : 'offline';
              return {
                email:              m.email,
                name:               m.name,
                initials:           m.initials || m.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || '?',
                color:              m.color ?? '#6366f1',
                role:               m.role ?? '',
                status,
                currentActivity:    live?.currentActivity || (history?.currentActivity ?? ''),
                currentPanel:       live?.currentPanel    || (history?.currentPanel    ?? ''),
                lastSeen:           live?.lastSeen        || (history?.lastSeen        ?? null),
                todayMinutes:       history?.totalMinutes ?? (live?.todayMinutes ?? 0),
                messageCount:       history?.messageCount ?? 0,
                taskCount:          history?.taskCount    ?? 0,
                appBreakdown:       aw?.appBreakdown      ?? [],
                totalActiveMinutes: aw?.totalActiveMinutes ?? 0,
                isAfk:              aw?.isAfk ?? false,
                agentConnected:     !!aw,
              };
            }).sort((a, b) => {
              const order: Record<string, number> = { live: 0, away: 1, offline: 2 };
              return order[a.status] - order[b.status] || b.todayMinutes - a.todayMinutes;
            });

            const liveCount    = merged.filter(m => m.status === 'live').length;
            const teamMinutes  = merged.reduce((s, m) => s + m.todayMinutes, 0);
            const agentCount   = merged.filter(m => m.agentConnected).length;

            const refreshAll = () => { fetchLiveUsers(); fetchHistory(viewDate); fetchAwData(viewDate); };

            const toggleExpand = (email: string) =>
              setExpandedDesktopEmail(prev => prev === email ? null : email);

            return (
            <div className="card-premium" style={{ padding: '24px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <style>{`
                @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.5)}}
                .pdot{animation:pdot 1.8s ease-in-out infinite;}
                .drow{transition:background .15s;}
                .drow:hover{background:rgba(99,102,241,0.04)!important;}
              `}</style>

              {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#10B981', marginBottom: 6, fontFamily: 'monospace' }}>
                    {viewDate === todayIST ? 'Live · Today' : viewDate} · Team Overview
                  </p>
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1A1B3A', margin: '0 0 14px', letterSpacing: '-0.025em' }}>
                    Team Activity
                  </h2>
                  {/* Quick-stat chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.10)', borderRadius: 20, padding: '5px 12px' }}>
                      <span className="live-dot" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#065F46' }}>{liveCount} online now</span>
                    </div>
                    <div style={{ background: 'rgba(99,102,241,0.09)', borderRadius: 20, padding: '5px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4338CA' }}>{fmt(teamMinutes)} team total</span>
                    </div>
                    <div style={{ background: 'rgba(13,175,206,0.09)', borderRadius: 20, padding: '5px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0E7490' }}>{agentCount}/{members.length} agents connected</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="date" value={viewDate} max={todayIST}
                    onChange={e => { const d = e.target.value; setAwDate(d); setHistoryDate(d); fetchHistory(d); fetchAwData(d); }}
                    style={{ borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', background: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#1A1B3A', outline: 'none' }}
                  />
                  <button type="button" onClick={refreshAll}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', background: '#fff', padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#1A1B3A', cursor: 'pointer' }}>
                    <RefreshCw size={13} className={(awLoading || historyLoading || liveLoading) ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* ── Member list (accordion) ──────────────────────────────────── */}
              <div style={{ borderRadius: 18, border: '1.5px solid rgba(26,27,58,0.09)', background: '#fff', overflow: 'hidden', boxShadow: '0 2px 12px rgba(26,27,58,0.04)' }}>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 60px 60px 28px', gap: 0, padding: '9px 20px', background: 'rgba(26,27,58,0.03)', borderBottom: '1px solid rgba(26,27,58,0.07)' }}>
                  {['Member', 'Status', 'Time', 'Msgs', 'Tasks', ''].map((h) => (
                    <span key={h} style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(90,95,128,0.45)' }}>{h}</span>
                  ))}
                </div>

                {merged.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'rgba(90,95,128,0.45)', fontSize: 13 }}>No team members yet.</div>
                ) : merged.map((person, idx) => {
                  const isLive     = person.status === 'live';
                  const isAway     = person.status === 'away';
                  const isExpanded = expandedDesktopEmail === person.email;
                  const topApps    = person.appBreakdown.slice(0, 8);
                  const maxMins    = topApps[0]?.minutes || 1;
                  const inAppPct   = Math.min(100, Math.round((person.todayMinutes / 480) * 100));
                  const icon       = panelIcon[person.currentPanel] || '🖥️';
                  const dotColor   = isLive ? '#10B981' : isAway ? '#F59E0B' : '#CBD5E1';
                  const statusText = isLive ? 'Online' : isAway ? ago(person.lastSeen) : 'Offline';
                  const statusFg   = isLive ? '#059669' : isAway ? '#B45309' : '#94A3B8';

                  return (
                    <div key={person.email}>
                      {/* ── Collapsed row ── */}
                      <div
                        className="drow"
                        onClick={() => toggleExpand(person.email)}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 120px 60px 60px 60px 28px',
                          alignItems: 'center', padding: '13px 20px', cursor: 'pointer',
                          borderBottom: isExpanded ? 'none' : idx < merged.length - 1 ? '1px solid rgba(26,27,58,0.06)' : 'none',
                          background: isExpanded ? 'rgba(99,102,241,0.03)' : '#fff',
                        }}
                      >
                        {/* Name + avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: person.color }}>
                              {person.initials}
                            </div>
                            <div className={isLive ? 'pdot' : ''} style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: dotColor, border: '2px solid #fff' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1B3A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</p>
                            <p style={{ fontSize: 10.5, color: 'rgba(90,95,128,0.50)', margin: 0 }}>{person.role}</p>
                          </div>
                        </div>

                        {/* Status */}
                        <span style={{ fontSize: 11, fontWeight: 700, color: statusFg }}>{statusText}</span>

                        {/* Time */}
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>{fmt(person.todayMinutes)}</span>

                        {/* Msgs */}
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366F1' }}>{person.messageCount}</span>

                        {/* Tasks */}
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>{person.taskCount}</span>

                        {/* Chevron */}
                        <span style={{ fontSize: 14, color: 'rgba(90,95,128,0.35)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▾</span>
                      </div>

                      {/* ── Expanded detail panel ── */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid rgba(99,102,241,0.10)', borderBottom: idx < merged.length - 1 ? '1px solid rgba(26,27,58,0.06)' : 'none', background: 'rgba(99,102,241,0.02)', padding: '20px 22px 22px' }}>

                          {/* Current activity */}
                          {person.currentActivity && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                              <span style={{ fontSize: 18 }}>{icon}</span>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(90,95,128,0.50)', textTransform: 'uppercase', letterSpacing: '.10em', margin: 0 }}>Right now</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1B3A', margin: 0 }}>{person.currentActivity}</p>
                              </div>
                            </div>
                          )}

                          {/* Quick stats */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                            {[
                              { label: 'In-app time', value: fmt(person.todayMinutes), color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                              { label: 'Messages sent', value: String(person.messageCount), color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
                              { label: 'Tasks updated', value: String(person.taskCount), color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
                            ].map(({ label, value, color, bg }) => (
                              <div key={label} style={{ borderRadius: 12, background: bg, padding: '12px 14px' }}>
                                <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'rgba(90,95,128,0.50)', margin: '0 0 4px' }}>{label}</p>
                                <p style={{ fontSize: 20, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{value}</p>
                              </div>
                            ))}
                          </div>

                          {/* In-app time bar */}
                          {person.todayMinutes > 0 && (
                            <div style={{ marginBottom: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'rgba(90,95,128,0.45)' }}>In-app (EduTechExOS)</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981' }}>{inAppPct}% of workday</span>
                              </div>
                              <div style={{ height: 8, borderRadius: 4, background: 'rgba(16,185,129,0.12)' }}>
                                <div style={{ height: '100%', borderRadius: 4, width: `${inAppPct}%`, background: 'linear-gradient(90deg,#10B981,#0DAFCE)', transition: 'width .5s' }} />
                              </div>
                            </div>
                          )}

                          {/* Desktop app breakdown */}
                          {topApps.length > 0 ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'rgba(90,95,128,0.45)' }}>Desktop Apps</span>
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6366F1' }}>
                                  {fmt(person.totalActiveMinutes)} tracked
                                  {person.isAfk && <span style={{ marginLeft: 8, color: '#D97706' }}> · AFK now</span>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {topApps.map(({ app, minutes }) => {
                                  const pct    = Math.max(4, Math.round((minutes / maxMins) * 100));
                                  const isDist = isDistraction(app);
                                  return (
                                    <div key={app} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <span style={{ width: 140, fontSize: 12, fontWeight: isDist ? 700 : 500, color: isDist ? '#EF476F' : '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {isDist ? '⚠ ' : ''}{app}
                                      </span>
                                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: isDist ? 'rgba(239,71,111,0.10)' : 'rgba(99,102,241,0.10)' }}>
                                        <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: isDist ? 'linear-gradient(90deg,#EF476F,#F59E0B)' : 'linear-gradient(90deg,#6366F1,#818CF8)', transition: 'width .5s' }} />
                                      </div>
                                      <span style={{ width: 48, fontSize: 12, fontWeight: 700, color: isDist ? '#EF476F' : '#6366F1', textAlign: 'right', flexShrink: 0 }}>{fmt(minutes)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div style={{ borderRadius: 10, border: '1.5px dashed rgba(99,102,241,0.20)', padding: '14px 16px', background: 'rgba(99,102,241,0.03)' }}>
                              <p style={{ fontSize: 12, color: 'rgba(90,95,128,0.55)', margin: 0 }}>
                                💻 Desktop app tracking not set up — ask this member to follow the setup banner in their sidebar.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
          })()}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: AVAILABILITY CALENDAR
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'availability' && (
            <div className="card-premium p-6">
              <div style={{ height: 3, background: 'linear-gradient(90deg, #6366f1, #8B5CF6)', borderRadius: 3, marginBottom: 24 }} />
              <AdminAvailabilityCalendar />
            </div>
          )}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: LEAVES
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'leaves' && (
            <div className="card-premium space-y-6 p-6">
              <div style={{ height: 3, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', borderRadius: 3, marginBottom: 8 }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 800, color: '#1A1B3A', margin: 0, letterSpacing: '-0.02em' }}>Leave Requests</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'rgba(90,95,128,0.60)' }}>Review and action leave applications from team members.</p>
                </div>
                <button onClick={fetchLeaves} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', background: '#FFFFFF', fontSize: 12, fontWeight: 600, color: 'rgba(90,95,128,0.70)', cursor: 'pointer' }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {leavesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10, color: 'rgba(90,95,128,0.55)', fontSize: 13 }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading leave requests...
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : leaves.length === 0 ? (
                <div style={{ borderRadius: 16, border: '1.5px dashed rgba(245,158,11,0.25)', background: '#FFFBF0', padding: '56px 32px', textAlign: 'center' }}>
                  <CalendarX size={28} style={{ margin: '0 auto 12px', color: 'rgba(245,158,11,0.40)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(90,95,128,0.70)', margin: 0 }}>No leave requests</p>
                  <p style={{ marginTop: 4, fontSize: 11, color: 'rgba(90,95,128,0.45)' }}>Leave requests from team members will appear here.</p>
                </div>
              ) : (() => {
                const pendingLeaves  = leaves.filter(l => l.status === 'pending');
                const resolvedLeaves = leaves.filter(l => l.status !== 'pending');
                const catColor: Record<string, string> = { sick: '#EF476F', vacation: '#10C98A', personal: '#5B4FDB', emergency: '#F59E0B', other: '#9BA6D3' };
                const catLabel: Record<string, string> = { sick: 'Sick', vacation: 'Vacation', personal: 'Personal', emergency: 'Emergency', other: 'Other' };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Pending */}
                    {pendingLeaves.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(90,95,128,0.45)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 12 }}>
                          Awaiting action · {pendingLeaves.length}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {pendingLeaves.map(leave => (
                            <div key={leave.id} style={{ borderRadius: 16, border: '1.5px solid rgba(245,158,11,0.20)', background: '#FFFDF5', padding: 20, boxShadow: '0 2px 12px rgba(245,158,11,0.06)' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${catColor[leave.leaveCategory] ?? '#9BA6D3'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                                    {{ sick: 'ðŸ¤’', vacation: 'ðŸŒ´', personal: 'ðŸ‘¤', emergency: 'âš¡', other: 'ðŸ“‹' }[leave.leaveCategory] ?? 'ðŸ“‹'}
                                  </div>
                                  <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1B3A' }}>{leave.name}</p>
                                    <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(90,95,128,0.60)' }}>{leave.email}</p>
                                  </div>
                                </div>
                                <LeaveStatusBadge status={leave.status} />
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 12 }}>
                                <span style={{ fontSize: 12.5, color: '#4A5578' }}><strong>Type:</strong> {leave.type === 'instant' ? 'âš¡ Emergency' : 'ðŸ“… Planned'}</span>
                                <span style={{ fontSize: 12.5, color: '#4A5578' }}><strong>Category:</strong> {catLabel[leave.leaveCategory] ?? leave.leaveCategory}</span>
                                <span style={{ fontSize: 12.5, color: '#4A5578' }}><strong>Date:</strong> {leave.type === 'instant' ? `${leave.startDate} · ${leave.duration === 'half' ? 'Half day' : 'Full day'}` : `${leave.startDate}${leave.endDate ? ` â†’ ${leave.endDate}` : ''}`}</span>
                              </div>

                              <div style={{ background: 'rgba(26,27,58,0.03)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#4A5578', lineHeight: 1.5 }}>
                                {leave.reason}
                              </div>

                              {/* Admin note input */}
                              <input
                                type="text"
                                placeholder="Optional note to the member..."
                                value={leaveNotes[leave.id] ?? ''}
                                onChange={e => setLeaveNotes(prev => ({ ...prev, [leave.id]: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(26,27,58,0.12)', fontSize: 12.5, color: '#1A1B3A', background: '#fff', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
                              />

                              <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                  type="button"
                                  onClick={() => handleLeaveAction(leave.id, 'approved')}
                                  disabled={leaveActionLoading === leave.id}
                                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#10C98A,#059669)', color: '#fff', fontSize: 11.5, fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: '.04em', opacity: leaveActionLoading === leave.id ? 0.6 : 1 }}
                                >
                                  <CheckCircle2 size={14} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLeaveAction(leave.id, 'rejected')}
                                  disabled={leaveActionLoading === leave.id}
                                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10, background: '#fff', color: '#EF476F', fontSize: 11.5, fontWeight: 700, border: '1.5px solid rgba(239,71,111,0.25)', cursor: 'pointer', letterSpacing: '.04em', opacity: leaveActionLoading === leave.id ? 0.6 : 1 }}
                                >
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolved */}
                    {resolvedLeaves.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(90,95,128,0.45)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 12 }}>
                          Resolved · {resolvedLeaves.length}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {resolvedLeaves.map(leave => (
                            <div key={leave.id} style={{ borderRadius: 14, border: '1.5px solid rgba(26,27,58,0.08)', background: '#FAFAFA', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 20 }}>{{ sick: 'ðŸ¤’', vacation: 'ðŸŒ´', personal: 'ðŸ‘¤', emergency: 'âš¡', other: 'ðŸ“‹' }[leave.leaveCategory] ?? 'ðŸ“‹'}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1A1B3A' }}>{leave.name} <span style={{ fontWeight: 400, color: 'rgba(90,95,128,0.55)', fontSize: 11 }}>"” {leave.type === 'instant' ? 'Emergency' : 'Planned'} · {catLabel[leave.leaveCategory]}</span></p>
                                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(90,95,128,0.55)' }}>{leave.startDate}{leave.endDate ? ` â†’ ${leave.endDate}` : ''} · {leave.reason}</p>
                                {leave.adminNote && <p style={{ margin: '3px 0 0', fontSize: 11, color: leave.status === 'approved' ? '#10C98A' : '#EF476F', fontStyle: 'italic' }}>Note: {leave.adminNote}</p>}
                              </div>
                              <LeaveStatusBadge status={leave.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
              TAB: LEAVE CALENDAR
          ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */}
          {activeTab === 'leave-calendar' && (
            <div className="card-premium p-6">
              <div style={{ height: 3, background: 'linear-gradient(90deg, #10C98A, #059669)', borderRadius: 3, marginBottom: 24 }} />
              <AdminLeaveCalendar />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: AUDIT LOG
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'audit' && (
            <div className="card-premium" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg,#6366F1,#818CF8)', borderRadius: 3 }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#1A1B3A', margin: 0, letterSpacing: '-0.02em' }}>
                    Audit Log
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'rgba(90,95,128,0.60)' }}>
                    Every admin action is permanently recorded here. Immutable and time-stamped.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLog}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', background: '#fff', fontSize: 12, fontWeight: 600, color: 'rgba(90,95,128,0.70)', cursor: 'pointer' }}
                >
                  <RefreshCw size={13} style={auditLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                  Refresh
                </button>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { prefix: 'member',  label: 'Member', color: '#6366F1' },
                  { prefix: 'leave',   label: 'Leave',  color: '#F59E0B' },
                  { prefix: 'channel', label: 'Channel',color: '#0DAFCE' },
                ].map(({ prefix, label, color }) => (
                  <span key={prefix} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}33` }}>
                    {label}
                  </span>
                ))}
              </div>

              {/* Log entries */}
              {auditLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(90,95,128,0.55)', fontSize: 13, padding: '48px 0', justifyContent: 'center' }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading audit log…
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ borderRadius: 16, border: '1.5px dashed rgba(99,102,241,0.20)', background: 'rgba(99,102,241,0.02)', padding: '52px 32px', textAlign: 'center' }}>
                  <ScrollText size={28} style={{ margin: '0 auto 12px', color: 'rgba(99,102,241,0.30)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(90,95,128,0.60)', margin: 0 }}>No admin actions recorded yet</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'rgba(90,95,128,0.40)' }}>Actions will appear here as soon as any admin takes one.</p>
                </div>
              ) : (
                <div style={{ borderRadius: 16, border: '1.5px solid rgba(26,27,58,0.08)', background: '#fff', overflow: 'hidden', boxShadow: '0 2px 12px rgba(26,27,58,0.04)' }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px 200px', padding: '9px 20px', background: 'rgba(26,27,58,0.03)', borderBottom: '1px solid rgba(26,27,58,0.07)' }}>
                    {['When', 'Action', 'Admin', 'Affected'].map(h => (
                      <span key={h} style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(90,95,128,0.45)' }}>{h}</span>
                    ))}
                  </div>

                  {auditLogs.map((log, idx) => {
                    const [category] = log.action.split('.');
                    const colorMap: Record<string, string> = { member: '#6366F1', leave: '#F59E0B', channel: '#0DAFCE' };
                    const accent = colorMap[category] || '#94A3B8';
                    const actionLabel = log.action
                      .replace('member.approved',    'Member approved')
                      .replace('member.rejected',    'Member rejected')
                      .replace('member.removed',     'Member removed')
                      .replace('member.role_changed','Role changed')
                      .replace('leave.approved',     'Leave approved')
                      .replace('leave.rejected',     'Leave rejected')
                      .replace('channel.created',    'Channel created')
                      .replace('channel.deleted',    'Channel deleted')
                      .replace(/\./g, ' ');
                    const when = new Date(log.timestamp);
                    const dateStr = when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    const timeStr = when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={log.id}
                        style={{
                          display: 'grid', gridTemplateColumns: '160px 1fr 180px 200px',
                          alignItems: 'center', padding: '12px 20px',
                          borderBottom: idx < auditLogs.length - 1 ? '1px solid rgba(26,27,58,0.05)' : 'none',
                        }}
                      >
                        {/* When */}
                        <div>
                          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#1A1B3A' }}>{timeStr}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(90,95,128,0.50)' }}>{dateStr}</p>
                        </div>

                        {/* Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: accent }}>{actionLabel}</span>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <span style={{ fontSize: 10.5, color: 'rgba(90,95,128,0.45)', marginLeft: 4 }}>
                              {Object.entries(log.details).filter(([k]) => !['leaveId'].includes(k)).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </span>
                          )}
                        </div>

                        {/* Admin */}
                        <div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1A1B3A' }}>{log.adminName || log.adminEmail}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(90,95,128,0.45)' }}>{log.adminEmail}</p>
                        </div>

                        {/* Affected */}
                        <div>
                          {log.target ? (
                            <>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1A1B3A' }}>{log.targetName || log.target}</p>
                              <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(90,95,128,0.45)' }}>{log.target}</p>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: 'rgba(90,95,128,0.30)' }}>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* â”€â”€ Add user modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ background: 'rgba(26,27,58,0.28)' }}>
            <form
              onSubmit={handleAddMember}
              className="w-full max-w-lg overflow-hidden"
              style={{ borderRadius: 20, background: '#FFFFFF', border: '1.5px solid rgba(26,27,58,0.22)', boxShadow: '0 24px 64px rgba(26,27,58,0.24)' }}
            >
              {/* Modal top accent */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #5B4FDB, #8B3FDB, #C026D3)', borderRadius: '8px 8px 0 0' }} />
              <div className="flex items-start justify-between gap-4 p-6" style={{ borderBottom: '1px solid rgba(26,27,58,0.14)' }}>
                <div>
                  <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#1A1B3A' }}>
                    Add application user
                  </h2>
                  <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(90,95,128,0.70)' }}>
                    General is automatic. Pick one extra channel when needed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(90,95,128,0.60)', border: '1.5px solid rgba(26,27,58,0.15)', background: 'transparent', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,71,111,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF476F'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(90,95,128,0.60)'; }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <label className="block">
                  <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'rgba(90,95,128,0.65)', fontFamily: "'JetBrains Mono', monospace" }}>
                    Full name
                  </span>
                  <input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Priya Nair"
                    style={{ display: 'block', marginTop: 6, height: 44, width: '100%', borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.24)', background: '#ECEAF8', padding: '0 14px', fontSize: 13, fontWeight: 500, color: '#1A1B3A', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(91,79,219,0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(26,27,58,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(26,27,58,0.24)'; e.target.style.boxShadow = 'none'; }}
                  />
                </label>
                <label className="block">
                  <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'rgba(90,95,128,0.65)', fontFamily: "'JetBrains Mono', monospace" }}>
                    Work email
                  </span>
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="priya@edutechex.in"
                    style={{ display: 'block', marginTop: 6, height: 44, width: '100%', borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.24)', background: '#ECEAF8', padding: '0 14px', fontSize: 13, fontWeight: 500, color: '#1A1B3A', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(91,79,219,0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(26,27,58,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(26,27,58,0.24)'; e.target.style.boxShadow = 'none'; }}
                  />
                </label>
                <label className="block">
                  <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'rgba(90,95,128,0.65)', fontFamily: "'JetBrains Mono', monospace" }}>
                    Role
                  </span>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ display: 'block', marginTop: 6, height: 44, width: '100%', borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.24)', background: '#ECEAF8', padding: '0 14px', fontSize: 13, fontWeight: 500, color: '#1A1B3A', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="Developer">Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>
                <div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'rgba(90,95,128,0.65)', fontFamily: "'JetBrains Mono', monospace" }}>
                    Channel access
                  </span>
                  {newRole === 'Admin' ? (
                    <div style={{ marginTop: 6, borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.18)', background: '#DDD8F6', padding: '12px 14px', fontSize: 12, fontWeight: 600, color: 'rgba(90,95,128,0.55)' }}>
                      Full access to all channels (Admin)
                    </div>
                  ) : extraChannels.length === 0 ? (
                    <div style={{ marginTop: 6, borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.18)', background: '#ECEAF8', padding: '12px 14px', fontSize: 12, color: 'rgba(90,95,128,0.55)' }}>
                      #general only "” no project channels created yet
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.24)', background: '#ECEAF8', padding: '12px 14px' }}>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.55)', marginBottom: 10 }}>
                        #general is always included · pick up to 3 more
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {extraChannels.map((c) => {
                          const checked = newExtraChannels.includes(c.id);
                          const atLimit = newExtraChannels.length >= 3;
                          return (
                            <label key={`new-${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: (!checked && atLimit) ? 'not-allowed' : 'pointer', opacity: (!checked && atLimit) ? 0.45 : 1 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!checked && atLimit}
                                onChange={(e) => {
                                  if (e.target.checked) setNewExtraChannels((p) => [...p, c.id]);
                                  else setNewExtraChannels((p) => p.filter((id) => id !== c.id));
                                }}
                                style={{ width: 15, height: 15, accentColor: '#5B4FDB', cursor: 'inherit', flexShrink: 0 }}
                              />
                              <div>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: checked ? '#5B4FDB' : '#1A1B3A' }}>
                                  #{c.name}
                                </span>
                                {c.description && (
                                  <span style={{ fontSize: 10, color: 'rgba(90,95,128,0.55)', marginLeft: 6 }}>{c.description}</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", color: newExtraChannels.length >= 3 ? '#EF476F' : 'rgba(90,95,128,0.50)' }}>
                          {newExtraChannels.length}/3 selected
                        </span>
                        {newExtraChannels.length > 0 && (
                          <button type="button" onClick={() => setNewExtraChannels([])} style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(90,95,128,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                            clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5" style={{ borderTop: '1px solid rgba(26,27,58,0.14)', background: 'rgba(91,79,219,0.02)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid rgba(26,27,58,0.22)', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#5A5F80', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,71,111,0.30)'; (e.currentTarget as HTMLElement).style.color = '#EF476F'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,27,58,0.22)'; (e.currentTarget as HTMLElement).style.color = '#5A5F80'; }}
                >
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #5B4FDB, #8B3FDB)', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s', boxShadow: '0 4px 14px rgba(91,79,219,0.28)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(91,79,219,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(91,79,219,0.28)'; }}
                >
                  Create access
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
