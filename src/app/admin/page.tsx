'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bell,
  CheckCircle2,
  Hash,
  Mail,
  Search,
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

type AdminUser = { name: string; email: string; role: string };
type AccessRequest = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
};
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
const ACCESS_REQUESTS_KEY = 'edutechex_access_requests';

export default function AdminPage() {
  const { members, addMember, removeMember, channels, setMemberWorkspaceChannel } =
    useDashboardStore();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Developer');
  const [newExtraChannel, setNewExtraChannel] = useState('');
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [requestChannelById, setRequestChannelById] = useState<Record<string, string>>({});

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

  useEffect(() => {
    // Primary: load from backend
    fetch(`${API_BASE}/api/access-requests`)
      .then((r) => r.json())
      .then((data: { success: boolean; requests?: AccessRequest[] }) => {
        if (data.success && Array.isArray(data.requests)) {
          setAccessRequests(data.requests);
          // Keep localStorage in sync as offline fallback
          localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(data.requests));
        }
      })
      .catch(() => {
        // Fallback: use localStorage if backend unreachable
        const cached = localStorage.getItem(ACCESS_REQUESTS_KEY);
        if (cached) {
          try { setAccessRequests(JSON.parse(cached)); } catch { /* ignore */ }
        }
      });
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
  const assignedExtraUsers = members.filter((m) => getExtraChannel(m.id)).length;
  const pendingRequests = accessRequests.filter((r) => r.status === 'pending');
  const approvedRequests = accessRequests.filter((r) => r.status === 'approved');

  function getExtraChannel(memberId: string) {
    return extraChannels.find((c) => c.memberIds?.includes(memberId));
  }
  function getChannelMembers(channelId: string) {
    const channel = channels.find((c) => c.id === channelId);
    return members.filter((m) => channel?.memberIds?.includes(m.id));
  }

  function handleChannelGrant(memberId: string, channelId: string) {
    setMemberWorkspaceChannel(memberId, channelId || null);
    const member = members.find((m) => m.id === memberId);
    const channel = extraChannels.find((c) => c.id === channelId);
    toast.success(
      channel
        ? `${member?.name ?? 'User'} now has access to #${channel.name}.`
        : `${member?.name ?? 'User'} now has general-only access.`
    );
  }

  function handleAddMember(e: React.FormEvent) {
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
    const colors = ['#2d6a4f', '#52b788', '#7c3aed', '#a78bfa', '#1b4332', '#c4b5fd'];
      const shortId =
      cleanName
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .slice(0, 4) + Math.floor(Math.random() * 1000);
    const memberId = `member-${shortId}`;

    addMember({
      id: memberId,
      initials,
      name: cleanName,
      email: emailClean,
      role: newRole,
      status: 'online',
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    if (newRole !== 'Admin' && newExtraChannel)
      setMemberWorkspaceChannel(memberId, newExtraChannel);

    toast.success(`${cleanName} was added with general access.`);
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

    // ── Persist approval to backend (cross-device) ──────────────────────────
    try {
      const res = await fetch(`${API_BASE}/api/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Failed to approve request on server.');
        return;
      }
    } catch {
      // Backend unreachable — still approve locally (offline fallback)
    }

    // ── Add to workspace member list ────────────────────────────────────────
    const colors = ['#2d6a4f', '#52b788', '#7c3aed', '#a78bfa', '#1b4332', '#c4b5fd'];
    const initials = request.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const memberId = makeMemberId(request.name);
    addMember({
      id: memberId,
      initials,
      name: request.name,
      email: request.email,
      role: request.role,
      status: 'online',
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    const selectedChannel = requestChannelById[request.id];
    if (selectedChannel) setMemberWorkspaceChannel(memberId, selectedChannel);

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
      await fetch(`${API_BASE}/api/access-requests/${requestId}`, { method: 'DELETE' });
    } catch {
      // Backend unreachable — still remove locally
    }

    const nextRequests = accessRequests.filter((r) => r.id !== requestId);
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success('Access request removed.');
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
      label: 'Project channels',
      value: extraChannels.length,
      icon: Hash,
      color: 'from-ink to-ink-light',
      bg: 'bg-secondary',
    },
    {
      label: 'Extra grants',
      value: `${assignedExtraUsers}/${members.length}`,
      icon: ShieldCheck,
      color: 'from-[#f59e0b] to-[#d97706]',
      bg: 'bg-[#fffbeb]',
    },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
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
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
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
          <section className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                Admin-only dashboard
              </p>
              <h1 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.03em] text-foreground">
                People and channel access
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-ink-light leading-relaxed">
                Admin has full application access. Every user gets #general automatically, and admin
                can grant exactly one extra project channel.
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

          <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
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

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="card-premium overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg tracking-[-0.02em] text-foreground">
                    Users
                  </h2>
                  <p className="text-sm text-ink-light">Grant one controlled channel per person.</p>
                </div>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 md:w-80 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(45,106,79,0.1)] transition-all">
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
                      {['User', 'Role', 'Status', 'Current access', 'Grant extra channel', ''].map(
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
                      const extraChannel = getExtraChannel(member.id);
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
                            <span
                              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${isAdminMember ? 'bg-primary/10 text-primary' : 'bg-secondary text-ink'}`}
                            >
                              {member.role}
                            </span>
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
                                  {extraChannel ? (
                                    <span className="rounded-lg bg-primary/10 border border-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                                      #{extraChannel.name}
                                    </span>
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
                            <select
                              value={isAdminMember ? '__all' : (extraChannel?.id ?? '')}
                              disabled={isAdminMember}
                              onChange={(e) => handleChannelGrant(member.id, e.target.value)}
                              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(45,106,79,0.1)] disabled:cursor-not-allowed disabled:bg-secondary disabled:text-ink-light"
                            >
                              {isAdminMember ? (
                                <option value="__all">Full admin access</option>
                              ) : (
                                <>
                                  <option value="">General only</option>
                                  {extraChannels.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      #{c.name}
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remove ${member.name} from the workspace?`)) {
                                  removeMember(member.id);
                                  toast.success(`${member.name} was removed.`);
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

            <aside className="space-y-6">
              <div className="card-premium p-5">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="font-display font-bold text-lg tracking-[-0.02em] text-foreground">
                      New account requests
                    </h2>
                    <p className="text-sm text-ink-light">
                      Approve users separately, then grant a channel.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail size={17} className="text-primary" />
                  </div>
                </div>
                <div className="space-y-3">
                  {pendingRequests.length ? (
                    pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-xl border border-[#f59e0b]/15 bg-[#fffbeb] p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {request.name}
                            </p>
                            <p className="truncate text-xs text-ink-light">{request.email}</p>
                            <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d97706]">
                              {request.role} request
                            </p>
                          </div>
                          <span className="rounded-lg bg-surface border border-[#f59e0b]/20 px-2.5 py-1 text-[10px] font-bold uppercase text-[#d97706]">
                            Pending
                          </span>
                        </div>
                        <select
                          value={requestChannelById[request.id] ?? ''}
                          onChange={(e) =>
                            setRequestChannelById((v) => ({ ...v, [request.id]: e.target.value }))
                          }
                          className="mb-3 h-10 w-full rounded-xl border border-[#f59e0b]/15 bg-surface px-3 text-xs font-semibold text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(45,106,79,0.1)]"
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
                            className="h-9 rounded-xl border border-[#f59e0b]/15 bg-surface px-3 text-xs font-bold uppercase tracking-[0.06em] text-[#d97706] hover:bg-[#fffbeb] transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-surface-muted p-6 text-center text-sm font-medium text-ink-light">
                      No new account requests.
                    </div>
                  )}
                  {approvedRequests.length > 0 && (
                    <div className="rounded-xl border border-border bg-surface-muted p-4">
                      <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                        Approved users
                      </p>
                      <div className="space-y-2">
                        {approvedRequests.slice(0, 4).map((request) => (
                          <div
                            key={`approved-${request.id}`}
                            className="flex items-center justify-between gap-3 text-xs font-medium text-ink"
                          >
                            <span className="truncate">{request.email}</span>
                            <span className="text-green-light">Ready to sign in</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-premium p-5">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="font-display font-bold text-lg tracking-[-0.02em] text-foreground">
                      Channel control
                    </h2>
                    <p className="text-sm text-ink-light">Move a user into a project channel.</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Settings size={17} className="text-ink-light" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-surface-muted p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">#general</p>
                        <p className="text-xs text-ink-light">Default channel for every user.</p>
                      </div>
                      <span className="text-xs font-semibold text-ink-light">
                        {getChannelMembers('general').length}
                      </span>
                    </div>
                  </div>
                  {extraChannels.map((channel) => {
                    const channelMembers = getChannelMembers(channel.id);
                    return (
                      <div
                        key={channel.id}
                        className="rounded-xl border border-border bg-surface p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              #{channel.name}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-light">
                              {channel.description}
                            </p>
                          </div>
                          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                            {channelMembers.length} users
                          </span>
                        </div>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {channelMembers.length ? (
                            channelMembers.map((member) => (
                              <button
                                key={`${channel.id}-${member.id}`}
                                type="button"
                                onClick={() => handleChannelGrant(member.id, '')}
                                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-ink hover:border-red-200 hover:bg-red-50 hover:text-[#f43f5e] transition-all"
                                title={`Remove ${member.name} from #${channel.name}`}
                              >
                                {member.initials}
                              </button>
                            ))
                          ) : (
                            <span className="text-xs font-medium text-[#d6d3d1]">
                              No users assigned yet
                            </span>
                          )}
                        </div>
                        <select
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            handleChannelGrant(e.target.value, channel.id);
                          }}
                          className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-xs font-semibold text-ink outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(45,106,79,0.1)]"
                        >
                          <option value="">Grant this channel to user</option>
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
              </div>
            </aside>
          </section>

          <section className="mt-10">
            <LoginTrackerCalendar />
          </section>
        </main>

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
