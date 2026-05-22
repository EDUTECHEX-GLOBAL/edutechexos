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
} from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '../components/AdminGuard';
import LoginTrackerCalendar from './components/LoginTrackerCalendar';
import { useDashboardStore } from '@/store/dashboardStore';

type AdminUser = {
  name: string;
  email: string;
  role: string;
};

type AccessRequest = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  status: 'pending' | 'approved';
  requestedAt: string;
};

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
    setAccessRequests(JSON.parse(localStorage.getItem(ACCESS_REQUESTS_KEY) || '[]'));
  }, []);

  const workspaceChannels = useMemo(
    () => channels.filter((channel) => !channel.id.startsWith('member-')),
    [channels]
  );

  const extraChannels = useMemo(
    () => workspaceChannels.filter((channel) => channel.id !== 'general'),
    [workspaceChannels]
  );

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      [member.name, member.email, member.role].join(' ').toLowerCase().includes(needle)
    );
  }, [members, search]);

  const onlineMembers = members.filter((member) => member.status === 'online').length;
  const assignedExtraUsers = members.filter((member) => getExtraChannel(member.id)).length;
  const pendingRequests = accessRequests.filter((request) => request.status === 'pending');
  const approvedRequests = accessRequests.filter((request) => request.status === 'approved');

  function getExtraChannel(memberId: string) {
    return extraChannels.find((channel) => channel.memberIds?.includes(memberId));
  }

  function getChannelMembers(channelId: string) {
    const channel = channels.find((item) => item.id === channelId);
    return members.filter((member) => channel?.memberIds?.includes(member.id));
  }

  function handleChannelGrant(memberId: string, channelId: string) {
    setMemberWorkspaceChannel(memberId, channelId || null);

    const member = members.find((item) => item.id === memberId);
    const channel = extraChannels.find((item) => item.id === channelId);
    toast.success(
      channel
        ? `${member?.name ?? 'User'} now has access to #${channel.name}.`
        : `${member?.name ?? 'User'} now has general-only access.`
    );
  }

  function handleAddMember(event: React.FormEvent) {
    event.preventDefault();

    if (!newName.trim() || !newEmail.trim()) return;

    const emailClean = newEmail.trim().toLowerCase();
    if (members.some((member) => member.email.toLowerCase() === emailClean)) {
      toast.error('A user with this email already exists.');
      return;
    }

    const cleanName = newName.trim();
    const initials = cleanName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const colors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#dc2626', '#eab308'];
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

    if (newRole !== 'Admin' && newExtraChannel) {
      setMemberWorkspaceChannel(memberId, newExtraChannel);
    }

    toast.success(`${cleanName} was added with general access.`);
    setNewName('');
    setNewEmail('');
    setNewRole('Developer');
    setNewExtraChannel('');
    setShowAddModal(false);
  }

  function makeMemberId(name: string) {
    const shortId =
      name
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .slice(0, 5) + Math.floor(Math.random() * 1000);
    return `member-${shortId}`;
  }

  function approveRequest(request: AccessRequest) {
    if (members.some((member) => member.email.toLowerCase() === request.email.toLowerCase())) {
      toast.error('This user already exists in the workspace.');
      return;
    }

    const colors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#dc2626', '#eab308'];
    const initials = request.name
      .split(' ')
      .map((part) => part[0])
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
    if (selectedChannel) {
      setMemberWorkspaceChannel(memberId, selectedChannel);
    }

    const nextRequests = accessRequests.map((item) =>
      item.id === request.id ? { ...item, status: 'approved' as const } : item
    );
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success(`${request.name} approved. They can sign in now.`);
  }

  function rejectRequest(requestId: string) {
    const nextRequests = accessRequests.filter((request) => request.id !== requestId);
    setAccessRequests(nextRequests);
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(nextRequests));
    toast.success('Access request removed.');
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 text-slate-950 font-dm-sans">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 lg:px-8">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-base font-black uppercase tracking-tight text-slate-950"
              >
                EduTechEx<span className="text-indigo-600">OS</span>
              </Link>
              <span className="hidden rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700 sm:inline-flex">
                Admin control
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 md:inline-flex"
              >
                Workspace
              </Link>
              <button
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Admin alerts"
              >
                <Bell size={18} strokeWidth={2.4} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                {(adminUser?.name ?? 'Admin')
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
          <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
                Admin-only dashboard
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                People and channel access
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Admin has full application access. Every user gets #general automatically, and admin
                can grant exactly one extra project channel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black uppercase tracking-[0.1em] text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
            >
              <UserPlus size={17} strokeWidth={2.5} />
              Add user
            </button>
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'People in app',
                value: members.length,
                icon: Users,
                tone: 'bg-indigo-600 text-white',
              },
              {
                label: 'Online now',
                value: onlineMembers,
                icon: Activity,
                tone: 'bg-emerald-600 text-white',
              },
              {
                label: 'Project channels',
                value: extraChannels.length,
                icon: Hash,
                tone: 'bg-slate-950 text-white',
              },
              {
                label: 'Extra grants',
                value: `${assignedExtraUsers}/${members.length}`,
                icon: ShieldCheck,
                tone: 'bg-amber-500 text-white',
              },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
                    <Icon size={19} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Live
                  </span>
                </div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-950">Users</h2>
                  <p className="text-sm font-semibold text-slate-500">
                    Grant one controlled channel per person.
                  </p>
                </div>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 md:w-80">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search people"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-5 py-4">User</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Current access</th>
                      <th className="px-5 py-4">Grant extra channel</th>
                      <th className="px-5 py-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((member) => {
                      const extraChannel = getExtraChannel(member.id);
                      const isAdminMember = member.role === 'Admin';

                      return (
                        <tr key={member.id} className="transition hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-black text-white"
                                style={{ backgroundColor: member.color }}
                              >
                                {member.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">
                                  {member.name}
                                </p>
                                <p className="truncate text-xs font-semibold text-slate-500">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                isAdminMember
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  member.status === 'online'
                                    ? 'bg-emerald-500'
                                    : member.status === 'away'
                                      ? 'bg-amber-400'
                                      : 'bg-slate-300'
                                }`}
                              />
                              {member.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {isAdminMember ? (
                                <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-indigo-700">
                                  All channels
                                </span>
                              ) : (
                                <>
                                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                    #general
                                  </span>
                                  {extraChannel ? (
                                    <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-indigo-700">
                                      #{extraChannel.name}
                                    </span>
                                  ) : (
                                    <span className="rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">
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
                              onChange={(event) =>
                                handleChannelGrant(member.id, event.target.value)
                              }
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              {isAdminMember ? (
                                <option value="__all">Full admin access</option>
                              ) : (
                                <>
                                  <option value="">General only</option>
                                  {extraChannels.map((channel) => (
                                    <option key={channel.id} value={channel.id}>
                                      #{channel.name}
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
                                  toast.success(`${member.name} was removed from the workspace.`);
                                }
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Remove user"
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
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
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950">
                      New account requests
                    </h2>
                    <p className="text-sm font-semibold text-slate-500">
                      Approve users separately, then grant a channel.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Mail size={18} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="space-y-3">
                  {pendingRequests.length ? (
                    pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-lg border border-amber-100 bg-amber-50/60 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">
                              {request.name}
                            </p>
                            <p className="truncate text-xs font-semibold text-slate-600">
                              {request.email}
                            </p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                              {request.role} request
                            </p>
                          </div>
                          <span className="rounded-md bg-white px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                            Pending
                          </span>
                        </div>
                        <select
                          value={requestChannelById[request.id] ?? ''}
                          onChange={(event) =>
                            setRequestChannelById((value) => ({
                              ...value,
                              [request.id]: event.target.value,
                            }))
                          }
                          className="mb-3 h-10 w-full rounded-lg border border-amber-100 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">General only</option>
                          {extraChannels.map((channel) => (
                            <option key={`request-${request.id}-${channel.id}`} value={channel.id}>
                              #{channel.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => approveRequest(request)}
                            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-xs font-black uppercase tracking-[0.08em] text-white hover:bg-indigo-700"
                          >
                            <CheckCircle2 size={15} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectRequest(request.id)}
                            className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-xs font-black uppercase tracking-[0.08em] text-amber-700 hover:bg-amber-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
                      No new account requests.
                    </div>
                  )}

                  {approvedRequests.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Approved users
                      </p>
                      <div className="space-y-2">
                        {approvedRequests.slice(0, 4).map((request) => (
                          <div
                            key={`approved-${request.id}`}
                            className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600"
                          >
                            <span className="truncate">{request.email}</span>
                            <span className="text-emerald-600">Ready to sign in</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950">
                      Channel control
                    </h2>
                    <p className="text-sm font-semibold text-slate-500">
                      Move a user into a project channel.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Settings size={18} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">#general</p>
                        <p className="text-xs font-semibold text-slate-500">
                          Default channel for every user.
                        </p>
                      </div>
                      <span className="text-xs font-black text-slate-500">
                        {getChannelMembers('general').length}
                      </span>
                    </div>
                  </div>

                  {extraChannels.map((channel) => {
                    const channelMembers = getChannelMembers(channel.id);
                    return (
                      <div
                        key={channel.id}
                        className="rounded-lg border border-slate-200 bg-white p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">
                              #{channel.name}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                              {channel.description}
                            </p>
                          </div>
                          <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase text-indigo-700">
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
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                title={`Remove ${member.name} from #${channel.name}`}
                              >
                                {member.initials}
                              </button>
                            ))
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              No users assigned yet
                            </span>
                          )}
                        </div>

                        <select
                          value=""
                          onChange={(event) => {
                            if (!event.target.value) return;
                            handleChannelGrant(event.target.value, channel.id);
                          }}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">Grant this channel to user</option>
                          {members
                            .filter((member) => member.role !== 'Admin')
                            .map((member) => (
                              <option key={`${channel.id}-grant-${member.id}`} value={member.id}>
                                {member.name}
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

          <section className="mt-8">
            <LoginTrackerCalendar />
          </section>
        </main>

        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <form
              onSubmit={handleAddMember}
              className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
            >
              <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight">Add application user</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-300">
                      General is automatic. Pick one extra channel when needed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg px-2 py-1 text-sm font-black text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Full name
                  </span>
                  <input
                    required
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Priya Nair"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Work email
                  </span>
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="priya@edutechex.in"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Role
                  </span>
                  <select
                    value={newRole}
                    onChange={(event) => setNewRole(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="Developer">Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Extra channel
                  </span>
                  <select
                    value={newRole === 'Admin' ? '__all' : newExtraChannel}
                    disabled={newRole === 'Admin'}
                    onChange={(event) => setNewExtraChannel(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {newRole === 'Admin' ? (
                      <option value="__all">Full admin access</option>
                    ) : (
                      <>
                        <option value="">General only for now</option>
                        {extraChannels.map((channel) => (
                          <option key={`new-${channel.id}`} value={channel.id}>
                            #{channel.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-indigo-700"
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
