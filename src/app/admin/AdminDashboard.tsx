'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bell,
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
  const [newExtraChannels, setNewExtraChannels] = useState<string[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [requestChannelsByReq, setRequestChannelsByReq] = useState<Record<string, string[]>>({});
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
    'people' | 'requests' | 'channels' | 'broadcast' | 'activity' | 'attendance' | 'desktop' | 'availability' | 'leaves'
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
      .then((r) => (r.ok ? r.json() : null)) // 404 before backend deploys → null
      .then((data: { success: boolean; stats?: ActivityStat[] } | null) => {
        if (data?.success && Array.isArray(data.stats)) setActivityStats(data.stats);
      })
      .catch(() => {
        /* non-critical — section shows empty state */
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

  function handleChannelToggle(memberId: string, channelId: string, checked: boolean) {
    const current = getExtraChannels(memberId).map((c) => c.id);
    if (checked && current.length >= 3) {
      toast.error('Max 3 channels per user. Remove one first.');
      return;
    }
    const next = checked
      ? [...new Set([...current, channelId])]
      : current.filter((id) => id !== channelId);
    const member = members.find((m) => m.id === memberId);
    const channel = extraChannels.find((c) => c.id === channelId);
    setMemberWorkspaceChannels(memberId, next, (msg) => toast.error(msg));
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
        toast.success(`${cleanName} added! Password: ${pwd} — sent to their email.`, { duration: 8000 });
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
      if (newRole !== 'Admin' && newExtraChannels.length > 0)
        setMemberWorkspaceChannels(tempId, newExtraChannels);
      toast.warning(`${cleanName} added locally — backend unreachable, won't persist.`);
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
      toast.success(`Leave ${status === 'approved' ? 'approved' : 'rejected'} — user has been notified.`);
    } catch { toast.error('Network error.'); }
    finally { setLeaveActionLoading(null); }
  }

  async function approveRequest(request: AccessRequest) {
    if (members.some((m) => m.email.toLowerCase() === request.email.toLowerCase())) {
      toast.error('This user already exists in the workspace.');
      return;
    }

    const selectedChannels = requestChannelsByReq[request.id] ?? [];

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
        body: JSON.stringify({ status: 'approved', channelIds: selectedChannels }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Failed to approve request on server.');
        return;
      }

      // Sync from backend — gets the newly approved member with correct channelIds
      loadLocalMembers?.();
    } catch {
      // Backend unreachable — still approve locally so the list updates
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

    // ── Update local UI state + localStorage fallback ───────────────────────
    const nextRequests = accessRequests.map((item) =>
      item.id === request.id ? { ...item, status: 'approved' as const } : item
    );
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success(`${request.name} approved. They can sign in now.`);
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
      // Backend unreachable — still update locally
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
    { id: 'channels' as const,   Icon: Hash,         label: 'Channels',   badge: 0,                      accent: '#0DAFCE', accentBg: 'rgba(13,175,206,0.10)',  accentBorder: 'rgba(13,175,206,0.22)',  animClass: 'click-bubble-pop' },
    { id: 'broadcast' as const,  Icon: Send,         label: 'Broadcast',  badge: 0,                      accent: '#C026D3', accentBg: 'rgba(192,38,211,0.10)',  accentBorder: 'rgba(192,38,211,0.22)',  animClass: 'click-send-whoosh' },
    { id: 'activity' as const,   Icon: Activity,     label: 'Activity',   badge: 0,                      accent: '#3B82F6', accentBg: 'rgba(59,130,246,0.10)',  accentBorder: 'rgba(59,130,246,0.22)',  animClass: 'click-bar-rise' },
    { id: 'attendance' as const, Icon: CalendarDays, label: 'Attendance', badge: 0,                      accent: '#F59E0B', accentBg: 'rgba(245,158,11,0.10)',  accentBorder: 'rgba(245,158,11,0.22)',  animClass: 'click-cell-bloom' },
    { id: 'desktop' as const,      Icon: Monitor,      label: 'Desktop',      badge: awRecords.length, accent: '#10B981', accentBg: 'rgba(16,185,129,0.10)',  accentBorder: 'rgba(16,185,129,0.22)',  animClass: 'click-bar-rise' },
    { id: 'availability' as const, Icon: CalendarDays, label: 'Availability', badge: 0,                accent: '#6366f1', accentBg: 'rgba(99,102,241,0.10)',  accentBorder: 'rgba(99,102,241,0.22)',  animClass: 'click-cell-bloom' },
    { id: 'leaves' as const,      Icon: CalendarX,    label: 'Leaves',      badge: leaves.filter(l => l.status === 'pending').length, accent: '#F59E0B', accentBg: 'rgba(245,158,11,0.10)', accentBorder: 'rgba(245,158,11,0.22)', animClass: 'click-cell-bloom' },
  ];

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  return (
    <AdminGuard>
      <div className="min-h-screen" style={{ background: '#ECEAF8', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

        {/* ── Spectrum bar ─────────────────────────────────────────────── */}
        <div className="spectrum-bar fixed top-0 left-0 right-0 z-50 pointer-events-none" />

        {/* ── Header ──────────────────────────────────────────────────────── */}
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
              <Link
                href="/dashboard"
                style={{ display: 'none' }}
                className="md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(91,79,219,0.25)'; (e.currentTarget as HTMLElement).style.color = '#5B4FDB'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,27,58,0.15)'; (e.currentTarget as HTMLElement).style.color = '#5A5F80'; }}
              >
                Workspace
              </Link>
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
                title="Admin alerts"
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
          {/* ── Page hero ───────────────────────────────────────────────── */}
          <section className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#EF476F', marginBottom: 8 }}>
                Admin-only dashboard
              </p>
              <h1 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#1A1B3A', marginBottom: 8 }}>
                Workspace Control Center
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(90,95,128,0.75)', lineHeight: 1.65, maxWidth: 560 }}>
                Manage people, channel access, broadcast emails, and monitor team activity — all in one place.
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

          {/* ── Tab navigation ──────────────────────────────────────────── */}
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

          {/* ════════════════════════════════════════════════════════════
              TAB: PEOPLE
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'people' && (
            <div className="overflow-hidden rounded-2xl" style={{ background: '#FFFFFF', border: '1.5px solid rgba(26,27,58,0.15)', boxShadow: '0 4px 16px rgba(91,79,219,0.06)', animation: 'slide-deck 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
              {/* People tab top accent */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #5B4FDB, #7B6FEB, #8B3FDB)', borderRadius: '8px 8px 0 0' }} />
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" style={{ borderBottom: '1px solid rgba(26,27,58,0.14)' }}>
                <div>
                  <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1B3A', letterSpacing: '-0.02em', marginBottom: 2 }}>
                    Users
                  </h2>
                  <p style={{ fontSize: 13, color: 'rgba(90,95,128,0.65)' }}>
                    Grant one controlled channel per person.
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

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(26,27,58,0.14)', background: 'rgba(91,79,219,0.02)' }}>
                      {['User', 'Role', 'Status', 'Current access', 'Channel access', ''].map(
                        (h) => (
                          <th
                            key={h}
                            style={{ padding: '12px 20px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.60)' }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const memberExtraChannels = getExtraChannels(member.id);
                      const isAdminMember = member.role === 'Admin';
                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid rgba(91,79,219,0.05)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91,79,219,0.03)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                                style={{
                                  background: `linear-gradient(135deg, ${member.color}, ${member.color}cc)`,
                                  boxShadow: `0 3px 10px ${member.color}30`,
                                }}
                              >
                                {member.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold" style={{ color: '#1A1B3A' }}>
                                  {member.name}
                                </p>
                                <p className="truncate text-xs text-ink-light">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {systemEmails.includes(member.email.toLowerCase()) ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: isAdminMember ? 'rgba(26,27,58,0.15)' : 'rgba(90,95,128,0.08)', color: isAdminMember ? '#5B4FDB' : '#5A5F80', border: `1px solid ${isAdminMember ? 'rgba(91,79,219,0.20)' : 'rgba(90,95,128,0.12)'}` }}>
                                {member.role}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.id, member.name, e.target.value)}
                                  style={{ height: 36, borderRadius: 10, border: '1.5px solid rgba(91,79,219,0.14)', background: '#ECEAF8', padding: '0 8px', fontSize: 12, fontWeight: 600, color: '#1A1B3A', outline: 'none' }}
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
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, background: 'rgba(26,27,58,0.14)', color: '#5B4FDB', fontSize: 10, fontWeight: 700, border: '1px solid rgba(26,27,58,0.22)', cursor: 'pointer', opacity: promoteLoadingId === member.id ? 0.5 : 1 }}
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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#5A5F80' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: member.status === 'online' ? '#10C98A' : member.status === 'away' ? '#F59E0B' : '#D4D0CC', boxShadow: member.status === 'online' ? '0 0 6px rgba(16,201,138,0.60)' : 'none' }} />
                              {member.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {isAdminMember ? (
                                <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', background: 'rgba(26,27,58,0.14)', color: '#5B4FDB', border: '1px solid rgba(26,27,58,0.22)' }}>All channels</span>
                              ) : (
                                <>
                                  <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: 'rgba(13,175,206,0.08)', color: '#0DAFCE', border: '1px solid rgba(13,175,206,0.18)' }}>#general</span>
                                  {memberExtraChannels.length > 0 ? (
                                    memberExtraChannels.map((ec) => (
                                      <span key={ec.id} style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: 'rgba(26,27,58,0.14)', color: '#5B4FDB', border: '1px solid rgba(26,27,58,0.22)' }}>#{ec.name}</span>
                                    ))
                                  ) : (
                                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.08)', color: '#D48C00', border: '1px solid rgba(245,158,11,0.18)' }}>Needs assignment</span>
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
                                <span style={{ fontSize: 10, fontWeight: 700, color: memberExtraChannels.length >= 3 ? '#EF476F' : 'rgba(90,95,128,0.55)', marginBottom: 2 }}>
                                  {memberExtraChannels.length}/3 channels
                                </span>
                                {extraChannels.map((c) => {
                                  const checked = memberExtraChannels.some((ec) => ec.id === c.id);
                                  const atCap = !checked && memberExtraChannels.length >= 3;
                                  return (
                                    <label
                                      key={c.id}
                                      className="flex items-center gap-2 select-none group"
                                      style={{ cursor: atCap ? 'not-allowed' : 'pointer', opacity: atCap ? 0.45 : 1 }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={atCap}
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
                                    // Both endpoints missing (very old deploy) — remove locally
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
                                      // DB record already gone — try system endpoint (covers
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

          {/* ════════════════════════════════════════════════════════════
              TAB: REQUESTS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Tab top accent */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #EF476F, #F57A98)', borderRadius: 3, marginBottom: 8 }} />
              {/* Pending requests grid */}
              {pendingRequests.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl p-5 transition-all duration-300"
                      style={{ background: '#FFFFFF', border: '1.5px solid rgba(239,71,111,0.14)', boxShadow: '0 2px 12px rgba(239,71,111,0.06)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(239,71,111,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,71,111,0.28)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(239,71,111,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,71,111,0.14)'; }}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,71,111,0.10)', border: '1.5px solid rgba(239,71,111,0.20)', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: '#EF476F' }}>
                              {request.name
                                .split(' ')
                                .map((p) => p[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {request.name}
                            </p>
                            <p style={{ fontSize: 11, color: 'rgba(90,95,128,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.email}</p>
                            <p style={{ marginTop: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#EF476F' }}>
                              {request.role} request
                            </p>
                          </div>
                        </div>
                        <span style={{ flexShrink: 0, borderRadius: 8, border: '1px solid rgba(239,71,111,0.20)', background: 'rgba(239,71,111,0.08)', padding: '3px 10px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#EF476F' }}>
                          Pending
                        </span>
                      </div>
                      {/* Multi-channel picker */}
                      {extraChannels.length > 0 && (
                        <div style={{ marginBottom: 12, borderRadius: 12, border: '1.5px solid rgba(91,79,219,0.14)', background: '#ECEAF8', padding: '10px 12px' }}>
                          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.60)', marginBottom: 8 }}>
                            Assign channels · #general is always included
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {extraChannels.map((c) => {
                              const picked = (requestChannelsByReq[request.id] ?? []).includes(c.id);
                              const pickedCount = (requestChannelsByReq[request.id] ?? []).length;
                              return (
                                <label key={`req-${request.id}-${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: (!picked && pickedCount >= 3) ? 'not-allowed' : 'pointer', opacity: (!picked && pickedCount >= 3) ? 0.45 : 1 }}>
                                  <input
                                    type="checkbox"
                                    checked={picked}
                                    disabled={!picked && pickedCount >= 3}
                                    onChange={(e) => {
                                      setRequestChannelsByReq((prev) => {
                                        const cur = prev[request.id] ?? [];
                                        const next = e.target.checked
                                          ? [...cur, c.id]
                                          : cur.filter((id) => id !== c.id);
                                        return { ...prev, [request.id]: next };
                                      });
                                    }}
                                    style={{ width: 14, height: 14, accentColor: '#5B4FDB', cursor: 'inherit' }}
                                  />
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: picked ? '#5B4FDB' : '#1A1B3A' }}>
                                    #{c.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <p style={{ marginTop: 8, fontSize: 9.5, color: 'rgba(90,95,128,0.50)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {(requestChannelsByReq[request.id] ?? []).length}/3 selected
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveRequest(request)}
                          style={{ display: 'flex', height: 36, flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, background: 'linear-gradient(135deg, #10C98A, #059669)', color: '#FFFFFF', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 3px 12px rgba(16,201,138,0.22)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(16,201,138,0.30)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(16,201,138,0.22)'; }}
                        >
                          <CheckCircle2 size={13} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectRequest(request.id)}
                          style={{ height: 36, borderRadius: 12, border: '1.5px solid rgba(239,71,111,0.18)', background: '#FFFFFF', padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#EF476F', cursor: 'pointer', transition: 'all .2s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,71,111,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,71,111,0.35)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,71,111,0.18)'; }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ borderRadius: 16, border: '1.5px dashed rgba(239,71,111,0.20)', background: '#FFF8F9', padding: '56px 32px', textAlign: 'center' }}>
                  <UserPlus size={28} style={{ margin: '0 auto 12px', color: 'rgba(239,71,111,0.40)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(90,95,128,0.70)' }}>No pending access requests</p>
                  <p style={{ marginTop: 4, fontSize: 11, color: 'rgba(90,95,128,0.45)' }}>
                    New sign-up requests will appear here for review.
                  </p>
                </div>
              )}

              {/* Approved users */}
              {approvedRequests.length > 0 && (
                <div style={{ borderRadius: 16, border: '1.5px solid rgba(16,201,138,0.16)', background: '#FFFFFF', padding: 20, boxShadow: '0 2px 12px rgba(16,201,138,0.06)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1B3A', marginBottom: 16 }}>
                    <CheckCircle2 size={16} style={{ color: '#10C98A' }} />
                    Approved users
                    <span style={{ marginLeft: 'auto', borderRadius: 20, background: 'rgba(16,201,138,0.10)', padding: '2px 10px', fontSize: 9.5, fontWeight: 700, color: '#10C98A' }}>
                      {approvedRequests.length}
                    </span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {approvedRequests.map((request) => (
                      <div
                        key={`approved-${request.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, border: '1.5px solid rgba(16,201,138,0.12)', background: '#F7FFFC', padding: 12 }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,201,138,0.10)', flexShrink: 0 }}>
                          <CheckCircle2 size={14} style={{ color: '#10C98A' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {request.name}
                          </p>
                          <p style={{ fontSize: 11, color: 'rgba(90,95,128,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.email}</p>
                        </div>
                        <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: '#10C98A', fontFamily: "'JetBrains Mono', monospace" }}>
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected users */}
              {rejectedRequests.length > 0 && (
                <div style={{ borderRadius: 16, border: '1.5px solid rgba(239,71,111,0.14)', background: '#FFFFFF', padding: 20, boxShadow: '0 2px 12px rgba(239,71,111,0.04)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1B3A', marginBottom: 16 }}>
                    <X size={16} style={{ color: '#EF476F' }} />
                    Rejected requests
                    <span style={{ marginLeft: 'auto', borderRadius: 20, background: 'rgba(239,71,111,0.08)', padding: '2px 10px', fontSize: 9.5, fontWeight: 700, color: '#EF476F' }}>
                      {rejectedRequests.length}
                    </span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rejectedRequests.map((request) => (
                      <div
                        key={`rejected-${request.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, border: '1.5px solid rgba(239,71,111,0.12)', background: '#FFF8F9', padding: 12 }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,71,111,0.08)', flexShrink: 0 }}>
                          <X size={14} style={{ color: '#EF476F' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {request.name}
                          </p>
                          <p style={{ fontSize: 11, color: 'rgba(90,95,128,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.email}</p>
                        </div>
                        <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: '#EF476F', fontFamily: "'JetBrains Mono', monospace" }}>
                          Rejected
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
                        Default channel — every user is automatically added.
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

          {/* ════════════════════════════════════════════════════════════
              TAB: BROADCAST
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'broadcast' && (
            <div className="mx-auto max-w-2xl">
              <div style={{ borderRadius: 20, border: '1.5px solid rgba(192,38,211,0.14)', background: '#FFFFFF', padding: 24, boxShadow: '0 4px 24px rgba(192,38,211,0.08)' }}>
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
                      placeholder="e.g. Team update — June 2026"
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
                      placeholder="Write your message here. Plain text — line breaks are preserved."
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
                      ✓ Last sent at {broadcastLastSent.at} · &ldquo;{broadcastLastSent.subject}
                      &rdquo; → {broadcastLastSent.count} members
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
                      see exactly what is tracked in Settings → Privacy.
                    </p>
                    <Link href="/admin/activity" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
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
                    <RefreshCw size={16} style={{ marginRight: 8 }} className="animate-spin" /> Loading activity data…
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

          {/* ════════════════════════════════════════════════════════════
              TAB: ATTENDANCE COMMAND CENTER
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'attendance' && (
            <div>
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

          {/* ════════════════════════════════════════════════════════════
              TAB: DESKTOP ACTIVITY (ActivityWatch)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'desktop' && (() => {
            const istOffset = 5.5 * 60 * 60 * 1000;
            const todayIST = new Date(Date.now() + istOffset).toISOString().slice(0, 10);
            const isToday = awDate === todayIST;

            // Summary stats
            const totalActive = awRecords.reduce((s, r) => s + (r.totalActiveMinutes ?? 0), 0);
            const totalAfk    = awRecords.reduce((s, r) => s + (r.totalAfkMinutes    ?? 0), 0);
            const mostActive  = awRecords.length ? awRecords.reduce((a, b) => (a.totalActiveMinutes ?? 0) > (b.totalActiveMinutes ?? 0) ? a : b) : null;
            const appTotals: Record<string, number> = {};
            awRecords.forEach(r => (r.appBreakdown ?? []).forEach(({ app, minutes }) => { appTotals[app] = (appTotals[app] ?? 0) + minutes; }));
            const topTeamApp = Object.entries(appTotals).sort((a, b) => b[1] - a[1])[0];

            // Members who haven't synced today (only relevant for today's view)
            const syncedEmails = new Set(awRecords.map(r => r.email.toLowerCase()));
            const missingMembers = isToday
              ? members.filter(m => !syncedEmails.has(m.email.toLowerCase()))
              : [];

            return (
            <div className="space-y-6">
              <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #0DAFCE)', borderRadius: 3 }} />

              {/* Header + date picker + refresh */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p style={{ marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#10B981' }}>
                    {isToday ? 'Live · Today' : awDate} · Via ActivityWatch
                  </p>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#1A1B3A' }}>
                    <Monitor size={20} style={{ color: '#10B981' }} /> Desktop Activity
                  </h2>
                  <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(90,95,128,0.70)', lineHeight: 1.6, maxWidth: 520 }}>
                    Real computer activity — which apps each team member is using. Requires <strong>ActivityWatch</strong> installed &amp; running on each member&apos;s machine. Syncing starts automatically when they log in to EduTechExOS.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={awDate}
                    max={todayIST}
                    onChange={e => {
                      const d = e.target.value;
                      setAwDate(d);
                      fetchAwData(d);
                    }}
                    style={{ borderRadius: 10, border: '1.5px solid rgba(16,185,129,0.22)', background: '#FFFFFF', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#1A1B3A', outline: 'none', cursor: 'pointer' }}
                  />
                  <button type="button" onClick={() => fetchAwData()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, border: '1.5px solid rgba(16,185,129,0.22)', background: '#FFFFFF', padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#10B981', cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; }}
                  >
                    <RefreshCw size={13} className={awLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
              </div>

              {/* Summary stats row */}
              {awRecords.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Team active', value: `${Math.floor(totalActive / 60)}h ${totalActive % 60}m`, color: '#10B981', bg: 'rgba(16,185,129,0.07)' },
                    { label: 'Team AFK', value: `${Math.floor(totalAfk / 60)}h ${totalAfk % 60}m`, color: '#D97706', bg: 'rgba(245,158,11,0.07)' },
                    { label: 'Most active', value: mostActive ? (mostActive.name || mostActive.email).split(' ')[0] : '—', color: '#6366F1', bg: 'rgba(99,102,241,0.07)' },
                    { label: 'Top app (team)', value: topTeamApp ? topTeamApp[0].replace(/^🌐 /, '') : '—', color: '#0DAFCE', bg: 'rgba(13,175,206,0.07)' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ borderRadius: 12, background: bg, padding: '12px 16px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.55)', marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Missing members alert (today only) */}
              {missingMembers.length > 0 && (
                <div style={{ borderRadius: 12, border: '1.5px solid rgba(245,158,11,0.22)', background: 'rgba(245,158,11,0.05)', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16, lineHeight: 1.4 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 4 }}>
                      {missingMembers.length} member{missingMembers.length > 1 ? 's' : ''} haven&apos;t synced today
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(90,95,128,0.70)' }}>
                      {missingMembers.map(m => m.name).join(', ')} — make sure they have ActivityWatch running and are logged in to EduTechExOS. The sidebar shows an <strong>AW Live</strong> indicator when connected.
                    </p>
                  </div>
                </div>
              )}

              {/* Setup instructions banner */}
              <details style={{ borderRadius: 14, border: '1.5px solid rgba(16,185,129,0.18)', background: 'rgba(16,185,129,0.04)' }}>
                <summary style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#059669', cursor: 'pointer', userSelect: 'none' }}>
                  Setup guide — how to connect a team member (one time)
                </summary>
                <ol style={{ margin: 0, padding: '0 18px 14px 36px', fontSize: 12, color: 'rgba(90,95,128,0.80)', lineHeight: 2.2 }}>
                  <li>Download &amp; install <strong>ActivityWatch</strong> from <code style={{ fontSize: 11, background: 'rgba(16,185,129,0.08)', padding: '1px 5px', borderRadius: 4 }}>activitywatch.net</code> — keep it running in the system tray</li>
                  <li>That&apos;s it — no script needed. When the member logs in to EduTechExOS, the dashboard automatically detects ActivityWatch and starts syncing every 5 minutes</li>
                  <li>The sidebar shows <strong style={{ color: '#10B981' }}>AW Live</strong> (green) when connected, or <strong style={{ color: '#94A3B8' }}>AW Off</strong> (grey) if ActivityWatch is not detected</li>
                </ol>
              </details>

              {/* Data table */}
              {awLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontSize: 13, color: 'rgba(90,95,128,0.65)' }}>
                  <RefreshCw size={16} style={{ marginRight: 8 }} className="animate-spin" /> Loading desktop activity…
                </div>
              ) : awRecords.length === 0 ? (
                <div style={{ borderRadius: 16, border: '1.5px dashed rgba(16,185,129,0.22)', background: 'rgba(16,185,129,0.03)', padding: '56px 32px', textAlign: 'center' }}>
                  <Monitor size={32} style={{ margin: '0 auto 12px', color: 'rgba(16,185,129,0.35)' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(90,95,128,0.70)', marginBottom: 4 }}>No desktop data yet today</p>
                  <p style={{ fontSize: 12, color: 'rgba(90,95,128,0.50)' }}>Data appears once a member logs in with ActivityWatch running. Their sidebar will show <strong>AW Live</strong> when connected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Live list */}
                  {awRecords
                    .sort((a, b) => (b.totalActiveMinutes ?? 0) - (a.totalActiveMinutes ?? 0))
                    .map((rec) => {
                      const member = members.find(m => m.email.toLowerCase() === rec.email.toLowerCase());
                      const initials = member?.initials ?? (rec.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '??');
                      const color = member?.color ?? '#64748b';
                      const activeH = Math.floor((rec.totalActiveMinutes ?? 0) / 60);
                      const activeM = (rec.totalActiveMinutes ?? 0) % 60;
                      const activeLabel = activeH > 0 ? `${activeH}h ${activeM}m` : `${activeM}m`;
                      const afkLabel   = `${rec.totalAfkMinutes ?? 0}m`;
                      const lastSyncAgo = rec.lastSync
                        ? (() => { const diff = Math.round((Date.now() - new Date(rec.lastSync).getTime()) / 60000); return diff < 2 ? 'just now' : `${diff}m ago`; })()
                        : '—';
                      const topApps = (rec.appBreakdown ?? []).slice(0, 5);
                      const totalMinForBar = topApps.reduce((s, a) => s + a.minutes, 0) || 1;
                      const isStale = rec.lastSync && (Date.now() - new Date(rec.lastSync).getTime()) > 10 * 60 * 1000;

                      return (
                        <div key={rec.email} style={{ borderRadius: 16, border: `1.5px solid ${rec.isAfk ? 'rgba(245,158,11,0.22)' : isStale ? 'rgba(26,27,58,0.12)' : 'rgba(16,185,129,0.18)'}`, background: '#FFFFFF', padding: '16px 20px', boxShadow: '0 2px 8px rgba(16,185,129,0.04)', transition: 'all .2s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(16,185,129,0.10)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(16,185,129,0.04)'; }}
                        >
                          {/* Top row */}
                          <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 12 }}>
                            {/* Avatar */}
                            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', backgroundColor: color, flexShrink: 0 }}>
                              {initials}
                            </div>
                            {/* Name + email */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1B3A' }}>{rec.name || rec.email}</p>
                              <p style={{ fontSize: 11, color: 'rgba(90,95,128,0.60)' }}>{rec.email}</p>
                            </div>
                            {/* Status badge */}
                            <span style={{ borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, background: rec.isAfk ? 'rgba(245,158,11,0.12)' : isStale ? 'rgba(90,95,128,0.10)' : 'rgba(16,185,129,0.12)', color: rec.isAfk ? '#D97706' : isStale ? '#64748B' : '#059669' }}>
                              {rec.isAfk ? '🟡 AFK' : isStale ? '⚫ Stale' : '🟢 Active'}
                            </span>
                            {/* Current app */}
                            {rec.currentApp && !rec.isAfk && (
                              <span style={{ borderRadius: 8, border: '1.5px solid rgba(16,185,129,0.18)', background: 'rgba(16,185,129,0.05)', padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#1A1B3A', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📍 {rec.currentApp}
                              </span>
                            )}
                            {/* Last sync */}
                            <span style={{ fontSize: 10, color: 'rgba(90,95,128,0.50)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>synced {lastSyncAgo}</span>
                          </div>

                          {/* Stats row */}
                          <div className="flex gap-4 flex-wrap" style={{ marginBottom: topApps.length > 0 ? 12 : 0 }}>
                            <div style={{ borderRadius: 8, background: 'rgba(16,185,129,0.06)', padding: '6px 12px', fontSize: 11 }}>
                              <span style={{ color: 'rgba(90,95,128,0.60)', marginRight: 4 }}>Active</span>
                              <strong style={{ color: '#059669' }}>{activeLabel}</strong>
                            </div>
                            <div style={{ borderRadius: 8, background: 'rgba(245,158,11,0.06)', padding: '6px 12px', fontSize: 11 }}>
                              <span style={{ color: 'rgba(90,95,128,0.60)', marginRight: 4 }}>AFK</span>
                              <strong style={{ color: '#D97706' }}>{afkLabel}</strong>
                            </div>
                            {rec.currentTitle && (
                              <div style={{ borderRadius: 8, background: 'rgba(26,27,58,0.04)', padding: '6px 12px', fontSize: 11, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: 'rgba(90,95,128,0.60)', marginRight: 4 }}>Window</span>
                                <span style={{ color: '#1A1B3A' }}>{rec.currentTitle}</span>
                              </div>
                            )}
                          </div>

                          {/* App breakdown bars */}
                          {topApps.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.50)', marginBottom: 2 }}>Top apps today</p>
                              {topApps.map(({ app, minutes }) => {
                                const pct = Math.round((minutes / totalMinForBar) * 100);
                                const isWork = !['YouTube', 'Netflix', 'Discord', 'Spotify', 'Instagram', 'Facebook', 'Twitter'].some(w => app.toLowerCase().includes(w.toLowerCase()));
                                return (
                                  <div key={app}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                      <span style={{ fontSize: 11, color: isWork ? '#1A1B3A' : '#EF476F', fontWeight: isWork ? 500 : 700 }}>
                                        {!isWork && '⚠️ '}{app}
                                      </span>
                                      <span style={{ fontSize: 10, color: 'rgba(90,95,128,0.60)' }}>{minutes >= 60 ? `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m` : `${Math.round(minutes)}m`} · {pct}%</span>
                                    </div>
                                    <div style={{ height: 4, width: '100%', borderRadius: 2, background: 'rgba(26,27,58,0.08)' }}>
                                      <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: isWork ? 'linear-gradient(90deg,#10B981,#0DAFCE)' : 'linear-gradient(90deg,#EF476F,#F59E0B)', transition: 'width .4s' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
          })()}

          {/* ════════════════════════════════════════════════════════════
              TAB: AVAILABILITY CALENDAR
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'availability' && (
            <div className="p-6">
              <div style={{ height: 3, background: 'linear-gradient(90deg, #6366f1, #8B5CF6)', borderRadius: 3, marginBottom: 24 }} />
              <AdminAvailabilityCalendar />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB: LEAVES
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'leaves' && (
            <div className="space-y-6 p-6">
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
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading leave requests…
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

                function LeaveStatusBadge({ status }: { status: string }) {
                  const cfg: Record<string, { color: string; bg: string; border: string }> = {
                    pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)' },
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
                                    {{ sick: '🤒', vacation: '🌴', personal: '👤', emergency: '⚡', other: '📋' }[leave.leaveCategory] ?? '📋'}
                                  </div>
                                  <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1B3A' }}>{leave.name}</p>
                                    <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(90,95,128,0.60)' }}>{leave.email}</p>
                                  </div>
                                </div>
                                <LeaveStatusBadge status={leave.status} />
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 12 }}>
                                <span style={{ fontSize: 12.5, color: '#4A5578' }}><strong>Type:</strong> {leave.type === 'instant' ? '⚡ Emergency' : '📅 Planned'}</span>
                                <span style={{ fontSize: 12.5, color: '#4A5578' }}><strong>Category:</strong> {catLabel[leave.leaveCategory] ?? leave.leaveCategory}</span>
                                <span style={{ fontSize: 12.5, color: '#4A5578' }}><strong>Date:</strong> {leave.type === 'instant' ? `${leave.startDate} · ${leave.duration === 'half' ? 'Half day' : 'Full day'}` : `${leave.startDate}${leave.endDate ? ` → ${leave.endDate}` : ''}`}</span>
                              </div>

                              <div style={{ background: 'rgba(26,27,58,0.03)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#4A5578', lineHeight: 1.5 }}>
                                {leave.reason}
                              </div>

                              {/* Admin note input */}
                              <input
                                type="text"
                                placeholder="Optional note to the member…"
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
                              <div style={{ fontSize: 20 }}>{{ sick: '🤒', vacation: '🌴', personal: '👤', emergency: '⚡', other: '📋' }[leave.leaveCategory] ?? '📋'}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1A1B3A' }}>{leave.name} <span style={{ fontWeight: 400, color: 'rgba(90,95,128,0.55)', fontSize: 11 }}>— {leave.type === 'instant' ? 'Emergency' : 'Planned'} · {catLabel[leave.leaveCategory]}</span></p>
                                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(90,95,128,0.55)' }}>{leave.startDate}{leave.endDate ? ` → ${leave.endDate}` : ''} · {leave.reason}</p>
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
        </main>

        {/* ── Add user modal ───────────────────────────────────────────── */}
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
                      #general only — no project channels created yet
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
