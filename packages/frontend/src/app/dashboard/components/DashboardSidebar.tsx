'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Hash,
  Plus,
  ChevronDown,
  ChevronRight,
  LogOut,
  Bell,
  ShieldCheck,
  CalendarDays,
  LogIn,
  Moon,
  Sun,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import AppLogo from '@/components/ui/AppLogo';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';
import MyActivityCalendar from './MyActivityCalendar';
import { getSocket } from '@/lib/socket';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

interface DashboardSidebarProps {
  onOpenNotifications?: () => void;
  notifCount?: number;
}

export default function DashboardSidebar({
  onOpenNotifications,
  notifCount = 0,
}: DashboardSidebarProps) {
  const {
    activeChannel,
    setActiveChannel,
    channels,
    addChannel,
    createWorkspaceChannel,
    members,
    addMember,
    removeMember,
    addMemberToChannel,
    removeMemberFromChannel,
  } = useDashboardStore();
  const { toggleTheme } = useTheme();
  const darkMode = useDashboardStore((s) => s.darkMode);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    name: 'Guest',
    role: 'Viewer',
    initials: 'G',
    email: '',
    projects: ['general'] as string[],
  });
  const [showActivityCalendar, setShowActivityCalendar] = useState(false);
  const [loggedInTodayEmails, setLoggedInTodayEmails] = useState<Set<string>>(new Set());

  // New Channel states
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // New Member states
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Developer');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['general']);

  // New state for editing member channel assignments
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editSelectedChannels, setEditSelectedChannels] = useState<string[]>(['general']);
  const myAvailability = currentUser?.email
    ? members.find((m) => m.email?.toLowerCase() === currentUser.email.toLowerCase())?.isAvailable
    : false;

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const cleanName = newChannelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');

    if (channels.some((c) => c.id === cleanName)) {
      toast.error('A channel with this name already exists!');
      return;
    }

    // Persist to the backend so the channel survives logout/login.
    const result = await createWorkspaceChannel(cleanName, newChannelDesc.trim());
    if (!result.ok) {
      toast.error(result.error || 'Failed to create channel.');
      return;
    }
    setActiveChannel(result.id ?? cleanName);
    toast.success(`#${result.id ?? cleanName} created! ✨`);

    setNewChannelName('');
    setNewChannelDesc('');
    setShowNewChannelModal(false);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    const emailClean = newMemberEmail.trim().toLowerCase();
    if (members.some((m) => m.email.toLowerCase() === emailClean)) {
      toast.error('A user with this email already exists!');
      return;
    }

    const cleanName = newMemberName.trim();
    const initials = cleanName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const colors = ['#3E4A89', '#7c3aed', '#0891b2', '#059669', '#dc2626', '#eab308'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const shortId =
      cleanName
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .slice(0, 4) + Math.floor(Math.random() * 100);
    const memberId = `member-${shortId}`;

    const newMemb = {
      id: memberId,
      initials,
      name: cleanName,
      email: emailClean,
      role: newMemberRole,
      status: 'online' as const,
      color: randomColor,
    };

    addMember(newMemb);

    // Assign channels to member
    selectedChannels.forEach((chanId) => {
      addMemberToChannel(chanId, memberId);
    });

    toast.success(`Welcome ${cleanName} to the team! 🎉`);

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Developer');
    setSelectedChannels(['general']);
    setShowNewMemberModal(false);
  };

  const storeMember = currentUser?.email
    ? members.find((m) => m.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
    : null;
  const currentMemberId = storeMember ? storeMember.id : 'currentUser';

  const accessibleChannels = channels.filter((ch) => {
    if (ch.id.startsWith('member-')) return false;
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') return true;
    if (!ch.memberIds) return true;
    return ch.memberIds.includes(currentMemberId);
  });

  useEffect(() => {
    const authData = localStorage.getItem('edutechex_token');
    if (authData) {
      try {
        const { user } = JSON.parse(authData);
        if (user) {
          const initials = user.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase();
          const projects = channels.filter((c) => !c.id.startsWith('member-')).map((c) => c.id);
          setCurrentUser({ ...user, initials, projects });
        }
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
    }
  }, [channels]);

  // Fetch real login status (green = logged in today, red = not logged in today)
  const fetchLoginStatus = useCallback(async () => {
    try {
      const authData = localStorage.getItem('edutechex_token');
      const token = authData ? JSON.parse(authData).token : null;
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/login-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.loggedInEmails)) {
        setLoggedInTodayEmails(new Set(data.loggedInEmails.map((e: string) => e.toLowerCase())));
      }
    } catch {
      /* backend unavailable */
    }
  }, []);

  useEffect(() => {
    fetchLoginStatus();
    // Refresh every 2 minutes
    const interval = setInterval(fetchLoginStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLoginStatus]);

  // Listen for real-time login status updates and member changes
  useEffect(() => {
    const socket = getSocket();
    const handleLoginUpdate = ({ email, loggedIn }: { email: string; loggedIn: boolean }) => {
      setLoggedInTodayEmails((prev) => {
        const next = new Set(prev);
        if (loggedIn) next.add(email.toLowerCase());
        else next.delete(email.toLowerCase());
        return next;
      });
    };
    const handleMemberUpdated = async ({
      email,
      role,
      channelIds,
    }: { email?: string; role?: string; channelIds?: string[] } = {}) => {
      const store = useDashboardStore.getState();
      // Load workspace channels first so new channels exist in the store,
      // then load members so memberIds are correctly rebuilt from DB channelIds.
      await store.loadWorkspaceChannels?.();
      await store.loadLocalMembers?.();

      if (email) {
        try {
          const raw = localStorage.getItem('edutechex_token');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.user && parsed.user.email?.toLowerCase() === email.toLowerCase()) {
              // Role change
              if (role) {
                parsed.user.role = role;
                localStorage.setItem('edutechex_token', JSON.stringify(parsed));
                setCurrentUser((prev) => ({ ...prev, role }));
                toast.success(`Your role has been updated to ${role} by an admin`, {
                  duration: 5000,
                });
              }
              // Channel access change (if backend includes channelIds in payload)
              if (channelIds !== undefined && !role) {
                toast.success('Your channel access has been updated by an admin', {
                  duration: 5000,
                });
              } else if (!role && channelIds === undefined) {
                // Generic update — admin changed something for this user
                toast.info('Your workspace access has been updated', { duration: 4000 });
              }
            }
          }
        } catch {
          /* ignore */
        }
      }
    };
    const handleMemberRemoved = ({ memberId }: { memberId: string }) => {
      if (memberId) useDashboardStore.getState().removeMemberLocally(memberId);
    };
    const handleStatusUpdate = ({ email, status, name }: { email: string; status: string; name?: string }) => {
      if (!email) return;
      const store = useDashboardStore.getState();
      const validStatus = ['online', 'away', 'in-meeting', 'offline'].includes(status)
        ? (status as import('@/store/dashboardStore').MemberStatus) : 'online';
      if (status) store.updateMemberStatus(email, validStatus);
      if (name) store.updateMemberName(email, name);
    };
    const handleAvailabilityUpdate = ({ email, isAvailable }: { email: string; isAvailable: boolean }) => {
      if (!email) return;
      useDashboardStore.getState().updateMemberAvailability(email, !!isAvailable);
    };
    socket.on('login_status_updated', handleLoginUpdate);
    socket.on('member_updated', handleMemberUpdated);
    socket.on('member_removed', handleMemberRemoved);
    socket.on('user_status_update', handleStatusUpdate);
    socket.on('user_availability', handleAvailabilityUpdate);
    return () => {
      socket.off('login_status_updated', handleLoginUpdate);
      socket.off('member_updated', handleMemberUpdated);
      socket.off('member_removed', handleMemberRemoved);
      socket.off('user_status_update', handleStatusUpdate);
      socket.off('user_availability', handleAvailabilityUpdate);
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      const activeChanObj = channels.find((c) => c.id === activeChannel);
      if (activeChanObj && !activeChanObj.id.startsWith('member-')) {
        const hasAccess =
          currentUser.role === 'Admin' ||
          currentUser.role === 'Manager' ||
          (activeChanObj.memberIds && activeChanObj.memberIds.includes(currentMemberId));
        if (!hasAccess) {
          setActiveChannel('general');
        }
      }
    }
  }, [activeChannel, channels, currentUser, currentMemberId, setActiveChannel]);

  return (
    <>
      <aside className="flex h-screen min-h-[100vh] w-56 shrink-0 flex-col glass-sidebar transition-all sm:w-60 z-10 justify-between">
        <div className="flex items-center gap-3 border-b border-[rgba(26,27,58,0.18)] px-3 py-3.5 sm:px-4 shrink-0">
          <AppLogo size={22} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black tracking-tight text-[#1E2636] uppercase">
              EduTechEx<span className="text-[#3E4A89]">OS</span>
            </p>
            <p className="truncate text-[11px] font-bold text-[#7C859E] uppercase tracking-widest">
              Workspace
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#7C859E] hover:bg-slate-200/50 hover:text-[#1E2636] transition-all"
            title="Notifications"
          >
            <Bell size={16} strokeWidth={2} />
            {notifCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#3E4A89] px-1 text-[9px] font-black text-white shadow-sm shadow-[rgba(26,27,58,0.18)] border border-white">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        </div>

        {/* SCROLLABLE AREA */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4 pb-0 min-h-0 scrollbar-thin h-full">
          <div>
            <button
              type="button"
              className="mb-1 flex w-full items-center justify-between px-3 text-left sm:px-4"
              onClick={() => setChannelsExpanded(!channelsExpanded)}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-black text-[#7C859E] uppercase tracking-widest">
                {channelsExpanded ? (
                  <ChevronDown size={12} strokeWidth={3} />
                ) : (
                  <ChevronRight size={12} strokeWidth={3} />
                )}
                Channels
              </span>
              <span className="text-[10px] tabular-nums font-bold text-[#7C859E]">
                {accessibleChannels.length}
              </span>
            </button>
            {channelsExpanded && (
              <nav className="mt-2 flex flex-col gap-1 px-2">
                {accessibleChannels.map((ch) => {
                  const isActive = activeChannel === ch.id;
                  const isMember = ch.memberIds?.includes(currentMemberId);
                  const canManage = currentUser.role === 'Admin' || currentUser.role === 'Manager';

                  return (
                    <div
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveChannel(ch.id);
                        }
                      }}
                      className={`group relative flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition-all cursor-pointer select-none outline-none ${
                        isActive
                          ? 'active-glow font-bold text-[#3E4A89]'
                          : 'text-[#7C859E] hover:bg-slate-200/40 hover:text-[#1E2636]'
                      }`}
                    >
                      <Hash
                        size={14}
                        className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-[#7C859E]'}`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span className="min-w-0 flex-1 truncate">{ch.name}</span>
                      {canManage && (
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isMember) removeMemberFromChannel(ch.id, currentMemberId);
                            }}
                            disabled={!isMember}
                            title="Remove from Channel"
                            className={`p-1 rounded ${isMember ? 'text-red-500 hover:bg-red-50' : 'text-red-300 cursor-not-allowed'}`}
                          >
                            <LogOut size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isMember) addMemberToChannel(ch.id, currentMemberId);
                            }}
                            disabled={isMember}
                            title="Add to Channel"
                            className={`p-1 rounded ${!isMember ? 'text-emerald-500 hover:bg-emerald-50' : 'text-emerald-300 cursor-not-allowed'}`}
                          >
                            <LogIn size={12} />
                          </button>
                        </div>
                      )}
                      {ch.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-[#3E4A89] px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm shadow-[rgba(26,27,58,0.18)]">
                          {ch.unread}
                        </span>
                      )}
                    </div>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="mx-3 border-t border-[rgba(26,27,58,0.18)] sm:mx-4" />

          <div>
            <div className="flex items-center justify-between px-3 sm:px-4 mb-1.5">
              <p className="text-[11px] font-black text-[#7C859E] uppercase tracking-widest">
                People
              </p>
              {currentUser.role === 'Admin' && (
                <button
                  type="button"
                  onClick={() => setShowNewMemberModal(true)}
                  className="text-[#7C859E] hover:text-[#3E4A89] p-0.5 hover:bg-slate-200/50 rounded transition-all cursor-pointer"
                  title="Add New Team Member"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <ul className="flex flex-col gap-0.5 px-2">
              {members.map((member) => {
                const isActive = activeChannel === member.id;
                return (
                  <li key={member.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setActiveChannel(member.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-all pr-8 ${
                        isActive
                          ? 'active-glow font-bold text-[#3E4A89]'
                          : 'text-[#4A5578] hover:bg-slate-200/40 hover:text-[#1E2636]'
                      }`}
                    >
                      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-[#4A5578]">
                        {member.initials}
                        {member.isAvailable && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 border-2 border-slate-50 shadow-sm">
                            <CheckCircle2 size={6} strokeWidth={3} className="text-white" />
                          </span>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-slate-50 ${
                            loggedInTodayEmails.has(member.email.toLowerCase())
                              ? 'bg-emerald-500'
                              : 'bg-red-400'
                          }`}
                          title={
                            loggedInTodayEmails.has(member.email.toLowerCase())
                              ? 'Logged in today'
                              : 'Not logged in today'
                          }
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{member.name}</span>
                      {member.onLeave ? (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 rounded-md px-1 py-0.5">
                          On Leave
                        </span>
                      ) : member.isAvailable ? (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 rounded-md px-1 py-0.5">
                          Available
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMemberId(member.id);
                        // Compute channels the member currently belongs to
                        const memberChannels = channels
                          .filter((ch) => !ch.id.startsWith('member-') && ch.memberIds?.includes(member.id))
                          .map((ch) => ch.id);
                        setEditSelectedChannels(memberChannels.length ? memberChannels : ['general']);
                        setShowEditMemberModal(true);
                      }}
                      className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all text-[#7C859E]"
                      title="Assign Channels"
                    >
                      ⚙️
                    </button>
                    {currentUser.role === 'Admin' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(`Are you sure you want to remove ${member.name} from the team?`)
                          ) {
                            removeMember(member.id);
                            toast.success(`${member.name} removed from the team.`);
                          }
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-600 rounded transition-all text-[#7C859E] font-extrabold text-[10px] cursor-pointer"
                        title="Remove Member"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {currentUser.role === 'Admin' && (
            <div className="px-3 sm:px-4">
              <Link
                href="/admin"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/10 bg-[rgba(62,74,137,0.08)]/50 hover:bg-indigo-100/60 px-3 py-2.5 text-[11px] font-black text-[#3E4A89] transition-all hover:scale-[1.02] shadow-sm tracking-widest uppercase"
              >
                <ShieldCheck size={13} className="text-[#3E4A89]" strokeWidth={2.5} />
                <span>Admin Dashboard</span>
              </Link>
            </div>
          )}

          <div className="px-3 sm:px-4">
            <button
              type="button"
              onClick={() => setShowNewChannelModal(true)}
              className="flex w-full items-center gap-2 rounded-md border border-dashed border-slate-300 py-2 pl-2 text-sm font-medium text-[#7C859E] hover:border-slate-400 hover:bg-[rgba(62,74,137,0.08)]/60 hover:text-[#4A5578] cursor-pointer"
            >
              <Plus size={14} strokeWidth={2} />
              New channel
            </button>
          </div>
        </div>

        {/* BOTTOM USER PANEL */}
        <div className="mt-auto flex w-full flex-col gap-2 border-t border-[rgba(62,74,137,0.08)] bg-transparent px-3 pt-3 pb-4 sm:px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-sm font-black text-white shadow-md shadow-indigo-500/20">
                {currentUser.initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-black text-[#1E2636] leading-none tracking-tight"
                title={currentUser.name}
              >
                {currentUser.name}
              </p>
              <span
                className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                  currentUser.role === 'Admin'
                    ? 'bg-[#3E4A89]/10 text-[#3E4A89]'
                    : 'bg-[#FAF8F5]/10 text-[#7C859E]'
                }`}
              >
                {currentUser.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const email = currentUser.email;
              if (!email) return;
              const newVal = !myAvailability;
              getSocket().emit('user_availability', { email, isAvailable: newVal });
              useDashboardStore.getState().updateMemberAvailability(email, newVal);
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-black uppercase tracking-widest transition-all ${
              myAvailability
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-600'
                : 'border border-dashed border-emerald-400/50 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400'
            }`}
            title={myAvailability ? 'Mark as unavailable' : 'Mark as available'}
          >
            {myAvailability ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <XCircle size={14} strokeWidth={2} />}
            <span>{myAvailability ? 'Available' : 'Mark Available'}</span>
          </button>

          <div className="flex items-center justify-between gap-1.5 bg-[rgba(62,74,137,0.08)]/40 rounded-xl p-1 border border-[rgba(26,27,58,0.18)]/40">
            <button
              type="button"
              onClick={() => setShowActivityCalendar(true)}
              className="flex-1 flex justify-center items-center py-1.5 rounded-lg text-[#7C859E] hover:bg-white hover:text-[#3E4A89] hover:shadow-sm transition-all"
              title="My Login Activity"
            >
              <CalendarDays size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 flex justify-center items-center py-1.5 rounded-lg text-[#7C859E] hover:bg-white hover:text-amber-500 hover:shadow-sm transition-all"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const raw = localStorage.getItem('edutechex_token');
                  const token = raw ? JSON.parse(raw).token : null;
                  if (token) {
                    await fetch(`${API_BASE}/api/auth/logout`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    }).catch(() => {});
                  }
                } catch { /* ignore */ }
                localStorage.removeItem('edutechex_token');
                localStorage.removeItem('edutechex_access_requests');
                await fetch('/api/auth/session', { method: 'DELETE' });
                window.location.href = '/sign-up-login-screen';
              }}
              className="flex-1 flex justify-center items-center py-1.5 rounded-lg text-[#7C859E] hover:bg-red-50 hover:text-red-600 hover:shadow-sm transition-all"
              title="Sign out"
            >
              <LogOut size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      <MyActivityCalendar
        open={showActivityCalendar}
        onClose={() => setShowActivityCalendar(false)}
      />

      {showNewChannelModal && (
        <div className="fixed inset-0 bg-[rgba(25,30,47,0.60)] backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[rgba(62,74,137,0.08)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white relative">
              <h3 className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                <span>✨</span> Create New Channel
              </h3>
              <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider mt-1">
                Add a collaborative space for the team
              </p>
              <button
                type="button"
                onClick={() => setShowNewChannelModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-[#7C859E] uppercase tracking-widest mb-1.5 flex justify-between items-center">
                  <span>Channel Name</span>
                  <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">
                    lowercase & hyphenated
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. research-and-dev"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-[rgba(26,27,58,0.18)] bg-[rgba(242,240,236,0.50)] text-sm font-bold text-[#1E2636] placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-[#7C859E] uppercase tracking-widest mb-1.5">
                  Channel Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coordination on research milestones"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-[rgba(26,27,58,0.18)] bg-[rgba(242,240,236,0.50)] text-sm font-bold text-[#1E2636] placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[rgba(62,74,137,0.08)]">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="h-9 px-4 rounded-xl text-sm font-black text-[#7C859E] hover:bg-[rgba(62,74,137,0.06)] transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-sm transition-all hover:scale-[1.02] shadow-md shadow-indigo-600/10 uppercase tracking-wider cursor-pointer"
                >
                  Create Channel ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditMemberModal && editingMemberId && (
        <div className="fixed inset-0 bg-[rgba(25,30,47,0.60)] backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[rgba(62,74,137,0.08)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white relative">
              <h3 className="text-base font-black uppercase tracking-widest flex items-center gap-2">⚙️ Assign Channels</h3>
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider mt-1">Select channels this member should have access to</p>
              <button type="button" onClick={() => setShowEditMemberModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white text-lg font-black">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                // Determine added and removed channels
                const member = members.find((m) => m.id === editingMemberId);
                if (!member) return;
                const current = new Set(member.channelIds || []);
                const selected = new Set(editSelectedChannels);
                const toAdd = [...selected].filter((c) => !current.has(c));
                const toRemove = [...current].filter((c) => !selected.has(c));
                // Apply updates via store actions
                toAdd.forEach((chanId) => addMemberToChannel(chanId, editingMemberId));
                toRemove.forEach((chanId) => removeMemberFromChannel(chanId, editingMemberId));
                toast.success(`Channel access updated for ${member.name}`);
                setShowEditMemberModal(false);
                setEditingMemberId(null);
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-2 max-h-36 overflow-y-auto border border-[rgba(26,27,58,0.18)] rounded-xl p-3 bg-[rgba(242,240,236,0.50)]">
                {channels
                  .filter((ch) => !ch.id.startsWith('member-'))
                  .map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2.5 text-sm font-bold text-[#4A5578] cursor-pointer hover:text-emerald-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={editSelectedChannels.includes(ch.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditSelectedChannels([...editSelectedChannels, ch.id]);
                          } else {
                            setEditSelectedChannels(editSelectedChannels.filter((id) => id !== ch.id));
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>#{ch.name}</span>
                    </label>
                  ))}
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[rgba(62,74,137,0.08)]">
                <button type="button" onClick={() => setShowEditMemberModal(false)} className="h-9 px-4 rounded-xl text-sm font-black text-[#7C859E] hover:bg-[rgba(62,74,137,0.06)] transition-colors uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm transition-all hover:scale-[1.02] shadow-md shadow-emerald-600/10 uppercase tracking-wider cursor-pointer">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
