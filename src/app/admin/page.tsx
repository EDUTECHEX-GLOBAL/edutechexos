'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Hash,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '../components/AdminGuard';
import LoginTrackerCalendar from './components/LoginTrackerCalendar';
import { useDashboardStore } from '@/store/dashboardStore';
import { getSocket } from '@/lib/socket';

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
  password: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
};
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
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
  } = useDashboardStore();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Developer');
  const [newExtraChannel, setNewExtraChannel] = useState('');
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [requestChannelById, setRequestChannelById] = useState<Record<string, string>>({});
  const [promoteLoadingId, setPromoteLoadingId] = useState<string | null>(null);
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
    'people' | 'requests' | 'channels' | 'broadcast' | 'activity' | 'attendance'
  >('people');

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
          toast.error('Your account has been removed by the admin.');
          setTimeout(() => {
            window.location.replace('/sign-up-login-screen');
          }, 800);
        }
      } catch {
        /* ignore */
      }
    };
    socket.on('member_updated', onMemberUpdated);
    socket.on('member_removed', onMemberRemoved);
    socket.on('user_forcefully_removed', onForcefullyRemoved);
    return () => {
      socket.off('member_updated', onMemberUpdated);
      socket.off('member_removed', onMemberRemoved);
      socket.off('user_forcefully_removed', onForcefullyRemoved);
    };
  }, [loadLocalMembers]);

  // Helper — read the stored JWT token once
  function getAdminToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    // Primary: load members + access requests from backend
    loadLocalMembers?.();

    const token = getAdminToken();
    if (!token) return; // not logged in — nothing to load

    // Load access requests with a 20-second timeout so Render cold-starts don't block the UI
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    fetch(`${API_BASE}/api/access-requests`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` }, // ← was missing (caused 403)
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
              /* silent — already showing cached */
            });
        }, 15_000);
      });
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
      .then((r) => (r.ok ? r.json() : null)) // 404 before backend deploys → null
      .then((data: { success: boolean; stats?: ActivityStat[] } | null) => {
        if (data?.success && Array.isArray(data.stats)) setActivityStats(data.stats);
      })
      .catch(() => {
        /* non-critical — section shows empty state */
      })
      .finally(() => setActivityLoading(false));
  }, []);

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
        /* non-critical — local update already applied */
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

  async function handleChannelToggle(memberId: string, channelId: string, checked: boolean) {
    const current = getExtraChannels(memberId).map((c) => c.id);
    const next = checked
      ? [...new Set([...current, channelId])]
      : current.filter((id) => id !== channelId);
    // Optimistic local update
    setMemberWorkspaceChannels(memberId, next);

    // Persist to backend for DB members
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
          body: JSON.stringify({ channelIds: next }),
        });
      } catch {
        /* non-critical — local update already applied */
      }
    }

    const member = members.find((m) => m.id === memberId);
    const channel = extraChannels.find((c) => c.id === channelId);
    if (channel) {
      toast.success(
        checked
          ? `${member?.name ?? 'User'} added to #${channel.name}.`
          : `${member?.name ?? 'User'} removed from #${channel.name}.`
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

    // ── Persist to backend first so the member survives page refresh ──────────
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
          channelId: newExtraChannel || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.member) {
        // Use the real DB-backed ID returned by the server
        addMember({ ...data.member, initials, status: 'online', color });
        if (newRole !== 'Admin' && newExtraChannel)
          setMemberWorkspaceChannel(data.member.id, newExtraChannel);
        toast.success(`${cleanName} added. Default password: Welcome@2026`);
      } else {
        toast.error(data.error ?? 'Failed to add member on server.');
        return;
      }
    } catch {
      // Backend unreachable — add locally only (temporary, won't persist)
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
      if (newRole !== 'Admin' && newExtraChannel)
        setMemberWorkspaceChannel(tempId, newExtraChannel);
      toast.warning(`${cleanName} added locally — backend unreachable, won't persist.`);
    }

    setNewName('');
    setNewEmail('');
    setNewRole('Developer');
    setNewExtraChannel('');
    setShowAddModal(false);
  }

  function makeMemberId(name: string) {
    return `member-${name
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .slice(0, 5)}${Math.floor(Math.random() * 1000)}`;
  }

  async function approveRequest(request: AccessRequest) {
    if (members.some((m) => m.email.toLowerCase() === request.email.toLowerCase())) {
      toast.error('This user already exists in the workspace.');
      return;
    }

    const selectedChannel = requestChannelById[request.id] || null;

    // Build member object up-front — used in both online and offline paths
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

    // ── Persist approval to backend (cross-device) ──────────────────────────
    try {
      const authData = localStorage.getItem('edutechex_token');
      const token = authData ? JSON.parse(authData).token : null;

      const res = await fetch(`${API_BASE}/api/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'approved', channelId: selectedChannel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Failed to approve request on server.');
        return;
      }

      // ✅ Immediately add to local store so the people list updates right away
      addMember({
        id: memberId,
        initials,
        name: request.name,
        email: request.email,
        role: request.role,
        status: 'online',
        color,
      });
      if (selectedChannel) setMemberWorkspaceChannel(memberId, selectedChannel);

      // Sync from backend in background (don't await — keep UI snappy)
      loadLocalMembers?.();
    } catch {
      // Backend unreachable — still approve locally so the list updates
      addMember({
        id: makeMemberId(request.name),
        initials,
        name: request.name,
        email: request.email,
        role: request.role,
        status: 'online',
        color,
      });
      if (selectedChannel) setMemberWorkspaceChannel(makeMemberId(request.name), selectedChannel);
    }

    // ── Update local UI state + localStorage fallback ───────────────────────
    const nextRequests = accessRequests.map((item) =>
      item.id === request.id ? { ...item, status: 'approved' as const } : item
    );
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success(`${request.name} approved. They can sign in now.`);
  }

  async function rejectRequest(requestId: string) {
    // ── Delete from backend ─────────────────────────────────────────────────
    try {
      const token = getAdminToken();
      await fetch(`${API_BASE}/api/access-requests/${requestId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}, // ← was missing (caused 403)
      });
    } catch {
      // Backend unreachable — still remove locally
    }

    const nextRequests = accessRequests.filter((r) => r.id !== requestId);
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success('Access request removed.');
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
      color: 'from-primary to-green-light',
      bg: 'bg-primary/10',
    },
    {
      label: 'Online now',
      value: onlineMembers,
      icon: Activity,
      color: 'from-[#10b981] to-[#059669]',
      bg: 'bg-[#ecfdf5]',
    },
    {
      label: 'Access requests',
      value: pendingRequests.length,
      icon: Mail,
      color: 'from-[#f59e0b] to-[#d97706]',
      bg: 'bg-[#fffbeb]',
    },
    {
      label: 'Project channels',
      value: extraChannels.length,
      icon: Hash,
      color: 'from-ink to-ink-light',
      bg: 'bg-secondary',
    },
  ];

  const TABS = [
    { id: 'people' as const, Icon: Users, label: 'People', badge: 0 },
    { id: 'requests' as const, Icon: UserPlus, label: 'Requests', badge: pendingRequests.length },
    { id: 'channels' as const, Icon: Hash, label: 'Channels', badge: 0 },
    { id: 'broadcast' as const, Icon: Send, label: 'Broadcast', badge: 0 },
    { id: 'activity' as const, Icon: Activity, label: 'Activity', badge: 0 },
    { id: 'attendance' as const, Icon: CalendarDays, label: 'Attendance', badge: 0 },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 glass-nav">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5 no-underline">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-green-light flex items-center justify-center shadow-md shadow-primary/20">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-display font-bold text-base tracking-[-0.02em] text-foreground">
                  EduTechEx<span className="text-primary">OS</span>
                </span>
              </Link>
              <span className="hidden rounded-lg bg-primary/10 border border-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:inline-flex">
                Admin control
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-ink border border-border bg-surface hover:border-primary/20 hover:text-primary transition-all"
              >
                Workspace
              </Link>
              <button
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-light hover:bg-surface hover:text-foreground transition-all"
                title="Admin alerts"
              >
                <Bell size={17} />
                {pendingRequests.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#f59e0b] ring-2 ring-surface" />
                )}
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-green-light text-xs font-bold text-white shadow-md">
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
          {/* ── Page hero ───────────────────────────────────────────────── */}
          <section className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                Admin-only dashboard
              </p>
              <h1 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.03em] text-foreground">
                Workspace Control Center
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-ink-light leading-relaxed">
                Manage people, channel access, broadcast emails, and monitor team activity — all in
                one place.
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

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-premium p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}
                  >
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                    Live
                  </span>
                </div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-light">
                  {label}
                </p>
                <p className="mt-1 font-display font-bold text-3xl tracking-[-0.02em] text-foreground">
                  {value}
                </p>
              </div>
            ))}
          </section>

          {/* ── Tab navigation ──────────────────────────────────────────── */}
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-ink-light hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <tab.Icon size={15} />
                {tab.label}
                {tab.badge > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-primary text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════════════════════
              TAB: PEOPLE
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'people' && (
            <div className="card-premium overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg tracking-[-0.02em] text-foreground">
                    Users
                  </h2>
                  <p className="text-sm text-ink-light">
                    Grant one controlled channel per person.
                  </p>
                </div>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 md:w-80 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(62,74,137,0.12)] transition-all">
                  <Search size={15} className="text-ink-light" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-light"
                  />
                </label>
              </div>

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {['User', 'Role', 'Status', 'Current access', 'Channel access', ''].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-5 py-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.map((member) => {
                      const memberExtraChannels = getExtraChannels(member.id);
                      const isAdminMember = member.role === 'Admin';
                      return (
                        <tr key={member.id} className="transition hover:bg-surface-muted/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${member.color}, ${member.color}dd)`,
                                }}
                              >
                                {member.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {member.name}
                                </p>
                                <p className="truncate text-xs text-ink-light">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {systemEmails.includes(member.email.toLowerCase()) ? (
                              <span
                                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${isAdminMember ? 'bg-primary/10 text-primary' : 'bg-secondary text-ink'}`}
                              >
                                {member.role}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleRoleChange(member.id, member.name, e.target.value)
                                  }
                                  className="h-9 rounded-xl border border-border bg-surface px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
                                >
                                  <option value="Developer">Developer</option>
                                  <option value="Designer">Designer</option>
                                  <option value="Lead">Lead</option>
                                  <option value="Manager">Manager</option>
                                  <option value="Admin">Admin</option>
                                </select>
                                {!isAdminMember && canAddMoreAdmins && (
                                  <button
                                    type="button"
                                    onClick={() => promoteToAdmin(member)}
                                    disabled={promoteLoadingId === member.id}
                                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                                    title={`Make Admin (${adminCount}/${MAX_ADMINS} slots used)`}
                                  >
                                    <ShieldCheck size={10} />
                                    {promoteLoadingId === member.id ? 'Promoting...' : 'Make Admin'}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${member.status === 'online' ? 'bg-green-light' : member.status === 'away' ? 'bg-[#f59e0b]' : 'bg-[#d6d3d1]'}`}
                              />
                              {member.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {isAdminMember ? (
                                <span className="rounded-lg bg-primary/10 border border-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                                  All channels
                                </span>
                              ) : (
                                <>
                                  <span className="rounded-lg bg-surface border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                                    #general
                                  </span>
                                  {memberExtraChannels.length > 0 ? (
                                    memberExtraChannels.map((ec) => (
                                      <span
                                        key={ec.id}
                                        className="rounded-lg bg-primary/10 border border-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary"
                                      >
                                        #{ec.name}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="rounded-lg bg-[#fffbeb] border border-[#f59e0b]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#d97706]">
                                      Needs assignment
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {isAdminMember ? (
                              <span className="text-xs text-ink-light italic">Full access</span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {extraChannels.map((c) => {
                                  const checked = memberExtraChannels.some((ec) => ec.id === c.id);
                                  return (
                                    <label
                                      key={c.id}
                                      className="flex items-center gap-2 cursor-pointer select-none group"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) =>
                                          handleChannelToggle(member.id, c.id, e.target.checked)
                                        }
                                        className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                      />
                                      <span
                                        className={`text-xs font-semibold transition-colors ${checked ? 'text-primary' : 'text-ink-light group-hover:text-foreground'}`}
                                      >
                                        #{c.name}
                                      </span>
                                    </label>
                                  );
                                })}
                                {extraChannels.length === 0 && (
                                  <span className="text-xs text-ink-light italic">
                                    No extra channels
                                  </span>
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
                                const mongoId = member.id.startsWith('member-')
                                  ? member.id.slice(7)
                                  : null;
                                if (mongoId && mongoId.length === 24) {
                                  try {
                                    const authData = localStorage.getItem('edutechex_token');
                                    const token = authData ? JSON.parse(authData).token : null;
                                    const res = await fetch(
                                      `${API_BASE}/api/access-requests/${mongoId}`,
                                      {
                                        method: 'DELETE',
                                        headers: token
                                          ? { Authorization: `Bearer ${token}` }
                                          : {},
                                      }
                                    );
                                    const body = await res.json().catch(() => ({}));
                                    if (res.ok && body.success) {
                                      removeMember(member.id);
                                      toast.success(
                                        `${member.name} was removed from the workspace.`
                                      );
                                      loadLocalMembers?.();
                                    } else {
                                      toast.error(
                                        `Could not remove ${member.name}: ${body.error ?? res.status}`
                                      );
                                    }
                                  } catch {
                                    toast.error('Could not reach the server. Please try again.');
                                  }
                                } else {
                                  try {
                                    const authData = localStorage.getItem('edutechex_token');
                                    const token = authData ? JSON.parse(authData).token : null;
                                    const res = await fetch(`${API_BASE}/api/members/system`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                      },
                                      body: JSON.stringify({
                                        email: member.email,
                                        memberId: member.id,
                                      }),
                                    });
                                    const body = await res.json().catch(() => ({}));
                                    if (res.ok && body.success) {
                                      removeMember(member.id);
                                      toast.success(
                                        `${member.name} was removed from the workspace.`
                                      );
                                      loadLocalMembers?.();
                                    } else {
                                      toast.error(
                                        `Could not remove ${member.name}: ${body.error ?? res.status}`
                                      );
                                    }
                                  } catch {
                                    toast.error('Could not reach the server. Please try again.');
                                  }
                                }
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-light transition-all hover:bg-red-50 hover:text-[#f43f5e]"
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

          {/* ════════════════════════════════════════════════════════════
              TAB: REQUESTS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Pending requests grid */}
              {pendingRequests.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="card-premium rounded-2xl border border-[#f59e0b]/20 bg-[#fffbeb] p-5"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f59e0b]/20">
                            <span className="text-sm font-black text-[#d97706]">
                              {request.name
                                .split(' ')
                                .map((p) => p[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {request.name}
                            </p>
                            <p className="truncate text-xs text-ink-light">{request.email}</p>
                            <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d97706]">
                              {request.role} request
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg border border-[#f59e0b]/20 bg-surface px-2.5 py-1 text-[10px] font-bold uppercase text-[#d97706]">
                          Pending
                        </span>
                      </div>
                      <select
                        value={requestChannelById[request.id] ?? ''}
                        onChange={(e) =>
                          setRequestChannelById((v) => ({ ...v, [request.id]: e.target.value }))
                        }
                        className="mb-3 h-10 w-full rounded-xl border border-[#f59e0b]/20 bg-surface px-3 text-xs font-semibold text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(62,74,137,0.12)]"
                      >
                        <option value="">General only</option>
                        {extraChannels.map((c) => (
                          <option key={`req-${request.id}-${c.id}`} value={c.id}>
                            #{c.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveRequest(request)}
                          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold uppercase tracking-[0.06em] text-white hover:bg-primary-dark transition-all"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectRequest(request.id)}
                          className="h-9 rounded-xl border border-[#f59e0b]/20 bg-surface px-3 text-xs font-bold uppercase tracking-[0.06em] text-[#d97706] hover:bg-[#fff7ed] transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-14 text-center">
                  <UserPlus size={28} className="mx-auto mb-3 text-ink-light opacity-30" />
                  <p className="text-sm font-semibold text-ink-light">No pending access requests</p>
                  <p className="mt-1 text-xs text-ink-light opacity-60">
                    New sign-up requests will appear here for review.
                  </p>
                </div>
              )}

              {/* Approved users */}
              {approvedRequests.length > 0 && (
                <div className="card-premium p-5">
                  <h3 className="mb-4 flex items-center gap-2 font-display font-bold text-base tracking-[-0.02em] text-foreground">
                    <CheckCircle2 size={16} className="text-green-light" />
                    Approved users
                    <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                      {approvedRequests.length}
                    </span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {approvedRequests.map((request) => (
                      <div
                        key={`approved-${request.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-light/10">
                          <CheckCircle2 size={14} className="text-green-light" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {request.name}
                          </p>
                          <p className="truncate text-xs text-ink-light">{request.email}</p>
                        </div>
                        <span className="ml-auto shrink-0 text-[10px] font-bold text-green-light">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: CHANNELS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              {/* General channel */}
              <div className="card-premium p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                      <Hash size={16} className="text-ink-light" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">#general</p>
                      <p className="text-xs text-ink-light">
                        Default channel — every user is automatically added.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink-light">
                    {getChannelMembers('general').length} members
                  </span>
                </div>
              </div>

              {extraChannels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-14 text-center">
                  <Hash size={28} className="mx-auto mb-3 text-ink-light opacity-30" />
                  <p className="text-sm font-semibold text-ink-light">No project channels yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {extraChannels.map((channel) => {
                    const channelMembers = getChannelMembers(channel.id);
                    return (
                      <div key={channel.id} className="card-premium p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                              <Hash size={16} className="text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">
                                #{channel.name}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-light">
                                {channel.description}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                            {channelMembers.length} users
                          </span>
                        </div>

                        {/* Member chips */}
                        <div className="mb-3 flex min-h-[28px] flex-wrap gap-1.5">
                          {channelMembers.length ? (
                            channelMembers.map((member) => (
                              <button
                                key={`${channel.id}-${member.id}`}
                                type="button"
                                onClick={() => handleChannelToggle(member.id, channel.id, false)}
                                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-ink transition-all hover:border-red-200 hover:bg-red-50 hover:text-[#f43f5e]"
                                title={`Remove ${member.name} from #${channel.name}`}
                              >
                                <span
                                  className="flex h-4 w-4 items-center justify-center rounded-md text-[8px] font-black text-white"
                                  style={{ backgroundColor: member.color }}
                                >
                                  {member.initials?.[0]}
                                </span>
                                {member.name.split(' ')[0]}
                              </button>
                            ))
                          ) : (
                            <span className="text-xs font-medium text-[#d6d3d1]">
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
                          className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-xs font-semibold text-ink outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(62,74,137,0.12)]"
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

          {/* ════════════════════════════════════════════════════════════
              TAB: BROADCAST
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'broadcast' && (
            <div className="mx-auto max-w-2xl">
              <div className="card-premium p-6">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <Send size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl tracking-[-0.02em] text-foreground">
                      Broadcast Email
                    </h2>
                    <p className="mt-1 text-sm text-ink-light">
                      Send one message to all {members.length} workspace members at once.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      placeholder="e.g. Team update — June 2026"
                      maxLength={150}
                      className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm font-medium text-foreground placeholder-slate-300 outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(62,74,137,0.12)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                      Message
                    </label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Write your message here. Plain text — line breaks are preserved."
                      rows={7}
                      maxLength={2000}
                      className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-medium text-foreground placeholder-slate-300 outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(62,74,137,0.12)]"
                    />
                    <p className="mt-1 text-right text-[10px] text-ink-light">
                      {broadcastMessage.length}/2000
                    </p>
                  </div>

                  {/* Recipients preview */}
                  <div className="rounded-xl border border-border bg-surface-muted p-4">
                    <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                      Will be sent to {members.length} members
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {members.slice(0, 10).map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink"
                        >
                          <span
                            className="flex h-4 w-4 items-center justify-center rounded-md text-[8px] font-black text-white"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.initials?.[0]}
                          </span>
                          {m.name.split(' ')[0]}
                        </span>
                      ))}
                      {members.length > 10 && (
                        <span className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-light">
                          +{members.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>

                  {broadcastLastSent && (
                    <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs font-medium text-green-700">
                      ✓ Last sent at {broadcastLastSent.at} · &ldquo;{broadcastLastSent.subject}
                      &rdquo; → {broadcastLastSent.count} members
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBroadcast}
                    disabled={
                      broadcastSending || !broadcastSubject.trim() || !broadcastMessage.trim()
                    }
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {broadcastSending ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" /> Sending…
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

          {/* ════════════════════════════════════════════════════════════
              TAB: ACTIVITY
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'activity' && (
            <div className="space-y-8">
              {/* Activity monitoring */}
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                      Last 7 days · With user permission
                    </p>
                    <h2 className="flex items-center gap-2 font-display font-bold text-2xl tracking-[-0.02em] text-foreground">
                      <Eye size={20} className="text-primary" />
                      Activity Monitoring
                    </h2>
                    <p className="mt-1 text-sm text-ink-light">
                      In-app session time, messages sent, and engagement per team member. Users can
                      see exactly what is tracked in Settings → Privacy.
                    </p>
                    <Link
                      href="/admin/activity"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      View full activity report →
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
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-primary/20 hover:text-primary transition-all"
                  >
                    <RefreshCw size={13} className={activityLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {activityLoading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-ink-light">
                    <RefreshCw size={16} className="mr-2 animate-spin" /> Loading activity data…
                  </div>
                ) : activityStats.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-10 text-center text-sm text-ink-light">
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

                        return (
                          <div key={stat.email} className="card-premium flex flex-col gap-3 p-5">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                                style={{ backgroundColor: color }}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground">
                                  {stat.name || stat.email}
                                </p>
                                <p className="truncate text-[11px] text-ink-light">{stat.email}</p>
                              </div>
                              <span
                                className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  member?.status === 'online'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : member?.status === 'away'
                                      ? 'bg-amber-50 text-amber-600'
                                      : 'bg-secondary text-ink-light'
                                }`}
                              >
                                {member?.status ?? 'offline'}
                              </span>
                            </div>

                            <div>
                              <div className="mb-1 flex justify-between text-[10px] font-semibold text-ink-light">
                                <span>Engagement this week</span>
                                <span>{engagementPct}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-green-light transition-all"
                                  style={{ width: `${engagementPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex flex-col items-center rounded-xl bg-surface-muted px-1 py-2.5">
                                <Clock size={12} className="mb-1 text-primary" />
                                <span className="text-sm font-black text-foreground">
                                  {timeLabel}
                                </span>
                                <span className="text-[9px] uppercase tracking-wide text-ink-light">
                                  Session
                                </span>
                              </div>
                              <div className="flex flex-col items-center rounded-xl bg-surface-muted px-1 py-2.5">
                                <MessageSquare size={12} className="mb-1 text-primary" />
                                <span className="text-sm font-black text-foreground">
                                  {stat.messageCount ?? 0}
                                </span>
                                <span className="text-[9px] uppercase tracking-wide text-ink-light">
                                  Messages
                                </span>
                              </div>
                              <div className="flex flex-col items-center rounded-xl bg-surface-muted px-1 py-2.5">
                                <Activity size={12} className="mb-1 text-primary" />
                                <span className="text-sm font-black text-foreground">
                                  {stat.activeDays ?? 0}
                                </span>
                                <span className="text-[9px] uppercase tracking-wide text-ink-light">
                                  Days
                                </span>
                              </div>
                            </div>

                            <p className="border-t border-border pt-2 text-[11px] text-ink-light">
                              <span className="font-semibold text-foreground">Last active:</span>{' '}
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

          {/* ════════════════════════════════════════════════════════════
              TAB: ATTENDANCE COMMAND CENTER
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'attendance' && (
            <div>
              {/* Dark hero banner */}
              <div className="mb-6 overflow-hidden rounded-2xl bg-slate-950 px-7 py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-400">
                      Admin · Real-time tracking
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                      Attendance Command Center
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-400">
                      Review daily login patterns, manage check-ins, and track streaks per team
                      member.
                    </p>
                  </div>
                  {/* Today's quick presence dots */}
                  <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <p className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
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
                    <p className="mt-2.5 text-xs font-semibold text-slate-500">
                      <span className="text-emerald-400 font-bold">
                        {members.filter((m) => m.status === 'online').length}
                      </span>{' '}
                      / {members.length} online now
                    </p>
                  </div>
                </div>
              </div>

              {/* Calendar component */}
              <LoginTrackerCalendar />
            </div>
          )}
        </main>

        {/* ── Add user modal ───────────────────────────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm animate-fade-in">
            <form
              onSubmit={handleAddMember}
              className="w-full max-w-lg card-premium overflow-hidden animate-scale-in"
            >
              <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
                <div>
                  <h2 className="font-display font-bold text-lg tracking-[-0.02em] text-foreground">
                    Add application user
                  </h2>
                  <p className="mt-1 text-sm text-ink-light">
                    General is automatic. Pick one extra channel when needed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-ink-light hover:bg-secondary hover:text-foreground transition-all"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-light">
                    Full name
                  </span>
                  <input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Priya Nair"
                    className="mt-2 input-premium"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-light">
                    Work email
                  </span>
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="priya@edutechex.in"
                    className="mt-2 input-premium"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-light">
                    Role
                  </span>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="mt-2 input-premium"
                  >
                    <option value="Developer">Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-light">
                    Extra channel
                  </span>
                  <select
                    value={newRole === 'Admin' ? '__all' : newExtraChannel}
                    disabled={newRole === 'Admin'}
                    onChange={(e) => setNewExtraChannel(e.target.value)}
                    className="mt-2 input-premium disabled:cursor-not-allowed disabled:bg-secondary disabled:text-ink-light"
                  >
                    {newRole === 'Admin' ? (
                      <option value="__all">Full admin access</option>
                    ) : (
                      <>
                        <option value="">General only for now</option>
                        {extraChannels.map((c) => (
                          <option key={`new-${c.id}`} value={c.id}>
                            #{c.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-border bg-surface-muted p-5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary px-5 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
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
