'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDashboardStore, type MemberStatus } from '@/store/dashboardStore';
import { useTheme } from '@/components/ThemeProvider';
import DashboardLayout, { type LayoutTab } from './DashboardLayout';
import DashboardTopBar from './DashboardTopBar';
import InsightsPanel from './InsightsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, MessageSquare, Send, Smile, Paperclip, Pin,
  Bookmark, Trash2, Users, Loader2, Bot, X, ChevronLeft,
  Globe, Lock, AtSign, Sparkles, ExternalLink, CheckSquare, Menu, Clock, CalendarCheck,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

import KanbanBoard from './KanbanBoard';
import WikiPanel from './WikiPanel';
import CalendarPanel from './CalendarPanel';
import AIPanel from './AIPanel';
import NotificationPanel from './NotificationPanel';
import AdminControlPanel from './AdminControlPanel';
import ProfileModal from './ProfileModal';
import OfflineIndicator from './OfflineIndicator';
import DMPanel from './DMPanel';
import AnalyticsPanel from './AnalyticsPanel';
import BookmarksPanel from './BookmarksPanel';
import PeopleStatusPanel from './PeopleStatusPanel';
import LeavePanel from './LeavePanel';
import NotepadPanel from './NotepadPanel';
import SearchPanel from './SearchPanel';
import StandupPanel from './StandupPanel';
import SessionTimer from './SessionTimer';
import AdminAvailabilityView from './AdminAvailabilityView';
import MeetingStartedCard from './MeetingStartedCard';

export default function DashboardRedesigned() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LayoutTab>('chats');

  const store = useDashboardStore();
  const {
    activeChannel, setActiveChannel,
    channels, messages, members,
    addMessage, addMessageFromSocket,
    deleteMessage, pinMessage, unpinMessage,
    toggleBookmark, toggleReaction, bookmarkedMessageIds,
    pinnedMessageIds, notifications, addNotification,
    loadLocalMessages, loadLocalWikiPages, loadLocalKanbanTasks,
    loadPinnedMessages, loadWorkspaceChannels, updateMemberStatus, updateMemberName, updateMemberAvailability,
    kanbanTasks, darkMode, toggleDarkMode,
    activeThreadId, setActiveThread,
    addKanbanTask,
  } = store;

  const [currentUser, setCurrentUser] = useState<{
    name: string; email: string; role: string; initials: string;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [composerMessage, setComposerMessage] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [standupOpen, setStandupOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [sendBounce, setSendBounce] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const currentUserEmail = currentUser?.email?.toLowerCase() ?? '';
  const isAdmin = currentUser?.role === 'Admin';
  const visibleNotifications = notifications.filter(
    (n) => !n.recipientEmails?.length
      || n.recipientEmails.map((e) => e.toLowerCase()).includes(currentUserEmail),
  );
  const unreadNotifications = visibleNotifications.filter((n) => !n.read).length;

  const channel = useMemo(() => {
    if (!activeChannel) return channels[0];
    return channels.find((c) => c.id === activeChannel) ?? channels[0];
  }, [activeChannel, channels]);

  const channelMessages = useMemo(() => {
    return messages[channel?.id ?? 'general'] ?? [];
  }, [messages, channel]);

  const visibleMessages = channelMessages.filter((m) => !m.parentId);

  useEffect(() => {
    loadLocalMessages?.();
    loadLocalWikiPages?.();
    loadLocalKanbanTasks?.();
    loadPinnedMessages?.();
    loadWorkspaceChannels?.();
    const interval = setInterval(() => {
      loadLocalMessages?.();
      loadLocalWikiPages?.();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const authData = localStorage.getItem('edutechex_token');
    if (!authData) {
      router.push('/sign-up-login-screen?mode=user&redirect=/dashboard');
      return;
    }
    try {
      const { user } = JSON.parse(authData);
      if (!user) {
        router.push('/sign-up-login-screen?mode=user&redirect=/dashboard');
        return;
      }
      const initials = user.name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      setCurrentUser({ ...user, initials });
      setAuthChecked(true);
    } catch {
      router.push('/sign-up-login-screen?mode=user&redirect=/dashboard');
    }
  }, [router]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages.length]);

  // Cmd/Ctrl+K → global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // @mention notification via socket
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    const mentionHandler = (data: { recipientEmail: string; senderName: string; channelId: string; messageId: string; preview: string }) => {
      if (data.recipientEmail?.toLowerCase() === currentUser.email?.toLowerCase()) {
        addNotification?.({
          type: 'mention',
          actor: data.senderName,
          actorInitials: data.senderName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          actorColor: '#5B4FDB',
          message: data.preview,
          channel: data.channelId,
        });
      }
    };
    socket.on('mention_notification', mentionHandler);

    // Live kanban updates from other users
    const kanbanHandler = () => { loadLocalKanbanTasks?.(); };
    socket.on('kanban_changed', kanbanHandler);

    // Live status/name updates from other users
    const statusHandler = ({ email, status, name }: { email: string; status: string; name?: string }) => {
      if (!email) return;
      const validStatus = ['online', 'away', 'in-meeting', 'offline'].includes(status)
        ? (status as MemberStatus) : 'online';
      if (status) updateMemberStatus(email, validStatus);
      if (name) updateMemberName(email, name);
    };
    socket.on('user_status_update', statusHandler);

    // Live availability updates from other users
    const availabilityHandler = ({ email, isAvailable }: { email: string; isAvailable: boolean }) => {
      if (!email) return;
      updateMemberAvailability(email, !!isAvailable);
    };
    socket.on('user_availability', availabilityHandler);

    // Meeting request notifications
    const meetingRequestCreatedHandler = (data: { userName: string; date: string; time: string }) => {
      if (currentUser?.role !== 'Admin') return;
      toast.success(`Meeting request from ${data.userName}`, { description: `${data.date} at ${data.time}` });
    };
    const meetingRequestReviewedHandler = (data: { status: string; date: string; time: string }) => {
      toast.info(`Meeting ${data.status === 'confirmed' ? 'confirmed' : 'declined'}`, { description: `${data.date} at ${data.time}` });
    };
    socket.on('meeting_request_created', meetingRequestCreatedHandler);
    socket.on('meeting_request_reviewed', meetingRequestReviewedHandler);

    return () => {
      socket.off('mention_notification', mentionHandler);
      socket.off('kanban_changed', kanbanHandler);
      socket.off('user_status_update', statusHandler);
      socket.off('user_availability', availabilityHandler);
      socket.off('meeting_request_created', meetingRequestCreatedHandler);
      socket.off('meeting_request_reviewed', meetingRequestReviewedHandler);
    };
  }, [currentUser]);

  const handleSend = useCallback(async () => {
    const text = composerMessage.trim();
    if (!text || !channel) return;
    setSendBounce(true);
    setTimeout(() => setSendBounce(false), 400);
    addMessage(channel.id, {
      id: `msg-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: '#FF6B7F',
      timestamp: new Date().toISOString(),
      text,
    });

    // @mention → Kanban task creation for each mentioned member
    const mentionRegex = /@([\w. ]+)/g;
    const mentionMatches = text.match(mentionRegex);
    if (mentionMatches && currentUser) {
      const mentionedInText = mentionMatches.map((m) => m.slice(1).toLowerCase().trim());
      const mentionedMembers = members.filter((member) =>
        mentionedInText.includes(member.name?.toLowerCase()) ||
        mentionedInText.includes(member.email?.toLowerCase())
      );
      mentionedMembers.forEach((member) => {
        addKanbanTask?.({
          text: text.slice(0, 200),
          assignee: member.name,
          assigneeInitials: (member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)) ?? '??',
          assigneeEmail: member.email,
          sourceChannel: `#${channel.name}`,
          status: 'todo',
        });
        addNotification?.({
          type: 'task',
          actor: currentUser.name,
          actorInitials: currentUser.initials,
          actorColor: '#FF6B7F',
          channel: channel.name,
          channelId: channel.id,
          message: `📋 Task assigned to you: "${text.slice(0, 120)}"`,
          recipientEmails: [member.email],
        });
      });
    }

    setComposerMessage('');
    if (composerRef.current) composerRef.current.focus();
  }, [composerMessage, channel, currentUser, addMessage, members, addKanbanTask, addNotification]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50">
        <div className="bg-white/70 backdrop-blur-md border border-indigo-100 rounded-2xl px-6 py-5 flex items-center gap-4 shadow-2xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Loader2 size={18} className="animate-spin text-indigo-600" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">Loading workspace</p>
            <p className="text-xs text-slate-500 mt-0.5">Preparing your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (adminPanelOpen && isAdmin) {
    return (
      <AdminControlPanel
        onDashboard={() => setAdminPanelOpen(false)}
        currentUser={currentUser}
      />
    );
  }

  const tabLabel = activeTab === 'chats' ? (channel?.name ?? 'general')
    : activeTab === 'dms' ? 'Direct Messages'
    : activeTab === 'tasks' ? 'Task Board'
    : activeTab === 'docs' ? 'Wiki'
    : activeTab === 'calendar' ? 'Calendar'
    : activeTab === 'leave' ? 'Leave'
    : activeTab === 'bookmarks' ? 'Saved Messages'
    : activeTab === 'notepad' ? 'Notes'
    : activeTab === 'reports' ? 'Reports'
    : 'Analytics';

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isAdmin={isAdmin}
      currentUser={currentUser}
      darkMode={darkMode}
      onToggleTheme={() => { toggleTheme(); toggleDarkMode(); }}
      onSettingsOpen={() => isAdmin ? setAdminPanelOpen(true) : setProfileOpen(true)}
      channels={channels.filter((c: any) => c.type !== 'dm')}
      activeChannel={channel?.id ?? ''}
      onChannelChange={(id: string) => { setActiveChannel(id); setActiveTab('chats'); }}
      topBar={
        <DashboardTopBar
          title={tabLabel}
          subtitle={activeTab === 'chats' ? channel?.description : undefined}
          unreadNotifications={unreadNotifications}
          onSearchOpen={() => setGlobalSearchOpen(true)}
          onNotificationsOpen={() => setNotificationsOpen(true)}
          onMobileMenuOpen={() => setMobileSidebarOpen(true)}
        />
      }
      rightPanel={
        <InsightsPanel
          activeChannel={channel?.id}
          members={members}
          kanbanTasks={kanbanTasks}
          messages={messages}
        />
      }
    >
      <div className="h-full flex flex-col">
        {activeTab === 'chats' && (
          <ChatView
            channel={channel}
            messages={visibleMessages}
            currentUser={currentUser}
            composerMessage={composerMessage}
            setComposerMessage={setComposerMessage}
            onSend={handleSend}
            sendBounce={sendBounce}
            composerRef={composerRef as React.RefObject<HTMLTextAreaElement>}
            chatBottomRef={chatBottomRef as React.RefObject<HTMLDivElement>}
            pinnedMessageIds={pinnedMessageIds}
            bookmarkedMessageIds={bookmarkedMessageIds}
            toggleBookmark={toggleBookmark}
            pinMessage={pinMessage}
            unpinMessage={unpinMessage}
            deleteMessage={deleteMessage}
            toggleReaction={toggleReaction}
            activeThreadId={activeThreadId}
            setActiveThread={setActiveThread}
            members={members}
            onAiOpen={() => setAiPanelOpen(true)}
          />
        )}
        {activeTab === 'dms' && (
          <div className="flex-1 overflow-hidden">
            <DMPanel currentUser={currentUser} members={members} />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
            <KanbanBoard onClose={() => {}} />
          </div>
        )}
        {activeTab === 'docs' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark">
            <WikiPanel onClose={() => {}} activeChannel={channel?.id ?? 'general'} />
          </div>
        )}
        {activeTab === 'calendar' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
            <CalendarPanel onClose={() => {}} />
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark">
            <AnalyticsPanel onClose={() => setActiveTab('chats')} />
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark">
            <AnalyticsPanel onClose={() => setActiveTab('chats')} />
          </div>
        )}
        {activeTab === 'leave' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
            <LeavePanel onClose={() => setActiveTab('chats')} />
          </div>
        )}
        {activeTab === 'people' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
            <PeopleStatusPanel onClose={() => setActiveTab('chats')} />
          </div>
        )}
        {activeTab === 'bookmarks' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark">
            <BookmarksPanel onClose={() => setActiveTab('chats')} />
          </div>
        )}
        {activeTab === 'notepad' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark">
            <NotepadPanel onClose={() => setActiveTab('chats')} activeChannel={channel?.id ?? ''} />
          </div>
        )}

      </div>

      <AnimatePresence>
        {aiPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
            onClick={() => setAiPanelOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl border border-indigo-100 bg-white/95 backdrop-blur-xl"
              style={{ height: '80vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-50">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(124,92,252,0.15)]">
                    <Bot size={14} className="text-[#7C5CFC]" />
                  </span>
                  <span className="text-sm font-black text-slate-800">AI Copilot</span>
                </div>
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
              <AIPanel activeChannel={channel?.id ?? 'general'} onClose={() => setAiPanelOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      <OfflineIndicator />

      <AnimatePresence>
        {profileOpen && (
          <ProfileModal
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            currentUser={currentUser}
            onProfileUpdated={(name) => {
              const newInitials = name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
              setCurrentUser(prev => prev ? { ...prev, name, initials: newInitials } : prev);
              if (currentUser) {
                updateMemberName(currentUser.email, name);
                getSocket().emit('user_status_update', { email: currentUser.email, status: 'online', name });
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile channel sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="absolute left-0 top-0 bottom-0 w-64 flex flex-col overflow-y-auto bg-white/95 backdrop-blur-xl border-r border-slate-200 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
                <span className="text-sm font-black text-slate-800">Channels</span>
                <button onClick={() => setMobileSidebarOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 px-2 py-2">
                {channels.filter((c: any) => c.type !== 'dm').map((ch: any) => (
                  <button key={ch.id}
                    onClick={() => { setActiveChannel(ch.id); setActiveTab('chats'); setMobileSidebarOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-all text-left mb-0.5 ${
                      channel?.id === ch.id ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}>
                    <Hash size={13} className="shrink-0" />
                    <span className="text-xs font-bold truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {globalSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/20 backdrop-blur-sm pt-20 px-4"
            onClick={() => setGlobalSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl border border-slate-200 bg-white/95 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SearchPanel onClose={() => setGlobalSearchOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Availability FAB */}
      <button
        onClick={() => setAvailabilityOpen(true)}
        className="fixed bottom-6 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        title="Admin Availability"
      >
        <CalendarCheck size={18} />
      </button>

      {/* Standup FAB */}
      <button
        onClick={() => setStandupOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        title="Daily Standup"
      >
        <Clock size={18} />
      </button>

      <AnimatePresence>
        {standupOpen && (
          <StandupPanel onClose={() => setStandupOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {availabilityOpen && (
          <AdminAvailabilityView key="availability" onClose={() => setAvailabilityOpen(false)} />
        )}
      </AnimatePresence>

      <SessionTimer />
    </DashboardLayout>
  );
}

function ChatView({
  channel,
  messages,
  currentUser,
  composerMessage,
  setComposerMessage,
  onSend,
  sendBounce,
  composerRef,
  chatBottomRef,
  pinnedMessageIds,
  bookmarkedMessageIds,
  toggleBookmark,
  pinMessage,
  unpinMessage,
  deleteMessage,
  toggleReaction,
  activeThreadId,
  setActiveThread,
  members,
  onAiOpen,
}: {
  channel: any;
  messages: any[];
  currentUser: any;
  composerMessage: string;
  setComposerMessage: (v: string) => void;
  onSend: () => void;
  sendBounce: boolean;
  composerRef: React.RefObject<HTMLTextAreaElement>;
  chatBottomRef: React.RefObject<HTMLDivElement>;
  pinnedMessageIds: Record<string, string[]>;
  bookmarkedMessageIds: string[];
  toggleBookmark: (id: string, meta?: any) => void;
  pinMessage: (ch: string, id: string) => void;
  unpinMessage: (ch: string, id: string) => void;
  deleteMessage: (ch: string, id: string) => void;
  toggleReaction: (ch: string, msgId: string, emoji: string, email: string) => void;
  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;
  members: any[];
  onAiOpen: () => void;
}) {
  const channelId = channel?.id ?? 'general';
  const pinIds = pinnedMessageIds[channelId] ?? [];
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const mentionFiltered = members.filter(m => m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 6);

  function handleComposerChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setComposerMessage(val);
    const match = val.match(/@([a-zA-Z][\w ]*)$/);
    if (match) { setMentionQuery(match[1]); setMentionOpen(true); }
    else { setMentionOpen(false); setMentionQuery(''); }
  }

  function insertMention(name: string) {
    const newVal = composerMessage.replace(/@([a-zA-Z][\w ]*)$/, `@${name} `);
    setComposerMessage(newVal);
    setMentionOpen(false);
    setMentionQuery('');
    composerRef.current?.focus();
  }

  const firstMessageDate = messages[0]?.timestamp
    ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })
      .format(new Date(messages[0].timestamp)).toUpperCase()
    : 'TODAY';

  function formatTime(ts: string) {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: true })
      .format(new Date(ts)).replace(' ', '');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between shrink-0 px-5 py-3 border-b border-slate-200/60 bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-md shadow-teal-500/10"
          >
            <Hash size={15} className="text-white" />
          </motion.span>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-800 truncate flex items-center gap-2">
              {channel?.name ?? 'general'}
              {channel?.isPrivate && <Lock size={11} className="text-slate-400" />}
              {!channel?.isPrivate && <Globe size={11} className="text-slate-400" />}
            </h2>
            {channel?.description && (
              <p className="text-xs text-slate-500 truncate">{channel.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAiOpen}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50/60 transition-all"
            title="AI Copilot"
          >
            <Bot size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-all"
          >
            <Users size={13} />
            {members.length}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-light">
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]"
          >
            {firstMessageDate}
          </motion.span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
        </div>

        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const isOwn = msg.sender === currentUser?.name;
          const isFirst = !prev || prev.sender !== msg.sender;
          const isPinned = pinIds.includes(msg.id);
          const isBookmarked = bookmarkedMessageIds.includes(msg.id);
          const isInstantMeet = msg.id?.startsWith('meeting-started-');
          const instantMeetLink = isInstantMeet ? msg.text?.match(/\[Click here to join the meeting\]\(([^)]+)\)/)?.[1] : undefined;

          return (
            <motion.div
              key={msg.id}
              id={`msg-${msg.id}`}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`group flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} ${isFirst ? 'mt-5' : 'mt-0.5'}`}
            >
              {!isOwn && (
                <div className="shrink-0 pt-1">
                  {isFirst ? (() => {
                    const senderMember = members.find(m => m.name === msg.sender);
                    const avatarUrl = senderMember?.avatarUrl;
                    return (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="h-8 w-8 rounded-full overflow-hidden shadow-lg shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={msg.sender} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white"
                            style={{ background: msg.color ?? 'linear-gradient(135deg, #FF6B7F, #FF4770)' }}>
                            {msg.initials}
                          </div>
                        )}
                      </motion.div>
                    );
                  })() : (
                    <div className="h-8 w-8" />
                  )}
                </div>
              )}

              <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {isFirst && !isOwn && (
                  <span className="mb-1 ml-1 text-xs font-bold text-slate-600">
                    {msg.sender}
                  </span>
                )}

                <div
                  className={`relative rounded-2xl transition-all group-hover:shadow-xl
                    ${isInstantMeet
                      ? 'p-0 bg-transparent border-0 overflow-hidden'
                      : `px-4 py-2.5 shadow-lg ${
                          isOwn
                            ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-sm'
                            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
                        }`
                    }
                    ${isPinned && !isInstantMeet ? 'ring-1 ring-amber-500 ring-offset-1 ring-offset-slate-100' : ''}
                    ${isBookmarked && !isInstantMeet ? 'shadow-[0_0_16px_rgba(245,158,11,0.08)]' : ''}
                  `}
                >
                  {isInstantMeet && instantMeetLink ? (
                    <div className="mb-1">
                      <MeetingStartedCard
                        title={`${msg.sender} started a meeting`}
                        subtitle="Join on Google Meet"
                        meetLink={instantMeetLink}
                      />
                    </div>
                  ) : null}
                  {isPinned && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <Pin size={10} className="text-[#F59E0B]" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#F59E0B]">Pinned</span>
                    </div>
                  )}
                  {!isInstantMeet && (
                  <div className={`text-sm leading-relaxed ${isOwn ? 'font-medium' : ''}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children, className }) => {
                          const isBlock = String(className ?? '').includes('language-');
                          if (isBlock) {
                            return (
                              <pre className={`my-1.5 overflow-x-auto rounded-xl p-3 text-xs border ${
                                isOwn ? 'bg-teal-950/40 text-teal-200 border-teal-400/20' : 'bg-slate-50 text-teal-700 border-slate-100'
                              }`}>
                                <code>{children}</code>
                              </pre>
                            );
                          }
                          return (
                            <code className={`rounded-lg px-1.5 py-0.5 font-mono text-xs ${
                              isOwn ? 'bg-black/15 text-white' : 'bg-teal-50 text-teal-700'
                            }`}>
                              {children}
                            </code>
                          );
                        },
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noreferrer"
                            className={`underline decoration-1 underline-offset-2 ${
                              isOwn ? 'text-white hover:text-teal-100' : 'text-teal-600 hover:text-teal-800'
                            }`}
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                  )}

                  {/* Link Preview */}
                  {!isInstantMeet && msg.linkPreview && (
                    <a href={msg.linkPreview.url} target="_blank" rel="noreferrer"
                      className={`mt-2 flex gap-2.5 rounded-xl p-2.5 transition-colors no-underline border ${
                        isOwn ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-slate-100 bg-slate-50 hover:bg-slate-100/80'
                      }`}>
                      {msg.linkPreview.image && (
                        <img src={msg.linkPreview.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isOwn ? 'text-white' : 'text-slate-800'}`}>{msg.linkPreview.title}</div>
                        {msg.linkPreview.description && (
                          <div className={`text-[10px] line-clamp-2 mt-0.5 ${isOwn ? 'text-white/80' : 'text-slate-500'}`}>{msg.linkPreview.description}</div>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'text-indigo-200' : 'text-indigo-600'}`}>
                          <ExternalLink size={9} />
                          <span className="text-[9px] truncate">{msg.linkPreview.siteName ?? msg.linkPreview.url}</span>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Task Card */}
                  {!isInstantMeet && msg.taskCard && (
                    <div className={`mt-2 flex items-start gap-2.5 rounded-xl border p-2.5 ${
                      isOwn ? 'border-white/20 bg-white/10' : 'border-teal-100 bg-teal-50/50'
                    }`}>
                      <CheckSquare size={13} className={`mt-0.5 shrink-0 ${isOwn ? 'text-white' : 'text-teal-600'}`} />
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold ${isOwn ? 'text-white' : 'text-slate-800'}`}>{msg.taskCard.taskText}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white shrink-0"
                            style={{ background: msg.taskCard.assigneeColor }}>
                            {msg.taskCard.assigneeInitials}
                          </div>
                          <span className={`text-[10px] ${isOwn ? 'text-white/80' : 'text-slate-500'}`}>{msg.taskCard.assignee}</span>
                          <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isOwn 
                              ? 'bg-white/20 text-white'
                              : msg.taskCard.status === 'done' 
                                ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                                : msg.taskCard.status === 'inprogress' 
                                  ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'
                                  : 'bg-slate-200/60 text-slate-600'
                          }`}>
                            {msg.taskCard.status === 'inprogress' ? 'In Progress' : msg.taskCard.status === 'done' ? 'Done' : 'To Do'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isOwn && !isInstantMeet ? 'text-white/70' : isInstantMeet ? 'text-slate-400' : 'text-slate-400'}`}>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>

                  {!isInstantMeet && (<AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className={`absolute -bottom-4 ${isOwn ? 'left-0' : 'right-0'} hidden group-hover:flex`}
                    >
                      <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/80 bg-white/95 p-1 shadow-xl shadow-slate-200/50 backdrop-blur-md">
                        <button
                          onClick={() => toggleReaction(channelId, msg.id, '👍', currentUser?.email ?? '')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm"
                          title="React"
                        >👍</button>
                        <button
                          onClick={() => toggleReaction(channelId, msg.id, '❤️', currentUser?.email ?? '')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm"
                          title="Love"
                        >❤️</button>
                        <button
                          onClick={() => toggleReaction(channelId, msg.id, '🔥', currentUser?.email ?? '')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm"
                          title="Fire"
                        >🔥</button>
                        <div className="h-5 w-px bg-slate-200/80 mx-0.5" />
                        <button
                          onClick={() => toggleBookmark(msg.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                            isBookmarked
                              ? 'text-amber-500 bg-amber-50'
                              : 'text-slate-500 hover:text-amber-500 hover:bg-amber-50/50'
                          }`}
                          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                          <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => { if (isPinned) unpinMessage(channelId, msg.id); else pinMessage(channelId, msg.id); }}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                            isPinned
                              ? 'text-amber-500 bg-amber-50'
                              : 'text-slate-500 hover:text-amber-500 hover:bg-amber-50/50'
                          }`}
                          title={isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin size={13} />
                        </button>
                        {(msg.sender === currentUser?.name || false) && (
                          <button
                            onClick={() => deleteMessage(channelId, msg.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>)}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2 bg-gradient-to-t from-slate-100/90 via-slate-50/30 to-transparent">
        <div className="relative group">
          {/* @mention autocomplete */}
          <AnimatePresence>
            {mentionOpen && mentionFiltered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full left-4 mb-2 z-30 rounded-xl overflow-hidden shadow-xl border border-slate-200 bg-white/95 backdrop-blur-xl"
                style={{ minWidth: 200 }}
              >
                {mentionFiltered.map(m => (
                  <button key={m.id} type="button" onMouseDown={() => insertMention(m.name)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-teal-50/60 transition-colors">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0"
                      style={{ background: m.color ?? '#6366f1' }}>{m.initials}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{m.name}</div>
                      <div className="text-[10px] text-slate-400">{m.role}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-teal-400 to-teal-500 opacity-0 group-focus-within:opacity-15 blur-sm transition-all duration-500" />
          <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 group-focus-within:border-teal-400/60 group-focus-within:shadow-teal-50">
            <textarea
              ref={composerRef}
              value={composerMessage}
              onChange={handleComposerChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channel?.name ?? 'general'}... (type @ to mention)`}
              className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              rows={1}
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                  title="Emoji"
                >
                  <Smile size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                  title="Attach"
                >
                  <Paperclip size={16} />
                </motion.button>
              </div>
              <motion.button
                whileHover={composerMessage.trim() ? { scale: 1.05 } : {}}
                whileTap={composerMessage.trim() ? { scale: 0.95 } : {}}
                animate={sendBounce ? { scale: [1, 1.2, 0.9, 1] } : {}}
                transition={sendBounce ? { duration: 0.4 } : {}}
                onClick={onSend}
                disabled={!composerMessage.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send size={14} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
