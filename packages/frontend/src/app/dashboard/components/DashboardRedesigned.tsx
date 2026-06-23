'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTheme } from '@/components/ThemeProvider';
import DashboardLayout, { type LayoutTab } from './DashboardLayout';
import DashboardTopBar from './DashboardTopBar';
import InsightsPanel from './InsightsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, MessageSquare, Send, Smile, Paperclip, Pin,
  Bookmark, Trash2, Users, Loader2, Bot, X, ChevronLeft,
  Globe, Lock, AtSign, Sparkles, ExternalLink, CheckSquare, Menu,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
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
import LeavePanel from './LeavePanel';
import NotepadPanel from './NotepadPanel';
import IntegrationsPanel from './IntegrationsPanel';
import SearchPanel from './SearchPanel';

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
    loadPinnedMessages, loadWorkspaceChannels,
    kanbanTasks, darkMode, toggleDarkMode,
    activeThreadId, setActiveThread,
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
    const handler = (data: { mentionedEmail: string; senderName: string; channelId: string; preview: string }) => {
      if (data.mentionedEmail?.toLowerCase() === currentUser.email?.toLowerCase()) {
        addNotification?.({
          type: 'mention',
          title: `${data.senderName} mentioned you`,
          body: data.preview,
        });
      }
    };
    socket.on('mention_notification', handler);
    return () => { socket.off('mention_notification', handler); };
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
    setComposerMessage('');
    if (composerRef.current) composerRef.current.focus();
  }, [composerMessage, channel, currentUser, addMessage]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06080F]">
        <div className="glass-dark rounded-2xl px-6 py-5 flex items-center gap-4 shadow-2xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(10,232,208,0.10)]">
            <Loader2 size={18} className="animate-spin text-[#0AE8D0]" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#EEF2F6]">Loading workspace</p>
            <p className="text-xs text-[#4B5678] mt-0.5">Preparing your dashboard...</p>
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
    : activeTab === 'integrations' ? 'Integrations'
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
        {activeTab === 'integrations' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark">
            <IntegrationsPanel onClose={() => setActiveTab('chats')} channels={channels} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {aiPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setAiPanelOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl border border-[rgba(148,163,184,0.10)]"
              style={{ height: '80vh', background: '#0D1025' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(148,163,184,0.06)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(124,92,252,0.15)]">
                    <Bot size={14} className="text-[#7C5CFC]" />
                  </span>
                  <span className="text-sm font-black text-[#EEF2F6]">AI Copilot</span>
                </div>
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.06)] transition-all"
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
            onProfileUpdated={(name, avatarUrl) => {
              setCurrentUser(prev => prev ? { ...prev, name, initials: name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) } : prev);
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile channel sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="absolute left-0 top-0 bottom-0 w-64 flex flex-col overflow-y-auto"
              style={{ background: '#0D1025', borderRight: '1px solid rgba(148,163,184,0.08)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-[rgba(148,163,184,0.06)]">
                <span className="text-sm font-black text-[#EEF2F6]">Channels</span>
                <button onClick={() => setMobileSidebarOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.07)] transition-all">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 px-2 py-2">
                {channels.filter((c: any) => c.type !== 'dm').map((ch: any) => (
                  <button key={ch.id}
                    onClick={() => { setActiveChannel(ch.id); setActiveTab('chats'); setMobileSidebarOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-all text-left mb-0.5 ${
                      channel?.id === ch.id ? 'bg-[rgba(10,232,208,0.10)] text-[#0AE8D0]' : 'text-[#4B5678] hover:bg-[rgba(148,163,184,0.06)] hover:text-[#EEF2F6]'
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
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-20 px-4"
            onClick={() => setGlobalSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl border border-[rgba(148,163,184,0.10)]"
              style={{ background: '#0D1025' }}
              onClick={(e) => e.stopPropagation()}
            >
              <SearchPanel onClose={() => setGlobalSearchOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <div className="flex items-center justify-between shrink-0 px-5 py-3 border-b border-[rgba(148,163,184,0.06)] bg-[rgba(13,16,37,0.30)]">
        <div className="flex items-center gap-3 min-w-0">
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0AE8D0] to-[#06B8A5] shadow-lg shadow-[#0AE8D0]/20"
          >
            <Hash size={15} className="text-[#06080F]" />
          </motion.span>
          <div className="min-w-0">
            <h2 className="text-base font-black text-[#EEF2F6] truncate flex items-center gap-2">
              {channel?.name ?? 'general'}
              {channel?.isPrivate && <Lock size={11} className="text-[#4B5678]" />}
              {!channel?.isPrivate && <Globe size={11} className="text-[#4B5678]" />}
            </h2>
            {channel?.description && (
              <p className="text-xs text-[#4B5678] truncate">{channel.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAiOpen}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#4B5678] hover:text-[#7C5CFC] hover:bg-[rgba(124,92,252,0.08)] transition-all"
            title="AI Copilot"
          >
            <Bot size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-[#4B5678] bg-[rgba(148,163,184,0.06)] hover:bg-[rgba(148,163,184,0.10)] hover:text-[#8896B0] transition-all"
          >
            <Users size={13} />
            {members.length}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-dark">
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(148,163,184,0.08)] to-transparent" />
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-bold text-[#4B5678] uppercase tracking-[0.2em]"
          >
            {firstMessageDate}
          </motion.span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(148,163,184,0.08)] to-transparent" />
        </div>

        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const isOwn = msg.sender === currentUser?.name;
          const isFirst = !prev || prev.sender !== msg.sender;
          const isPinned = pinIds.includes(msg.id);
          const isBookmarked = bookmarkedMessageIds.includes(msg.id);

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
                  <span className="mb-1 ml-1 text-xs font-bold text-[#8896B0]">
                    {msg.sender}
                  </span>
                )}

                <div
                  className={`relative rounded-2xl px-4 py-2.5 shadow-lg transition-all group-hover:shadow-xl
                    ${isOwn
                      ? 'bg-gradient-to-br from-[#0AE8D0] to-[#06B8A5] text-[#06080F] rounded-br-sm'
                      : 'bg-[rgba(22,27,61,0.80)] border border-[rgba(148,163,184,0.08)] text-[#EEF2F6] rounded-bl-sm'
                    }
                    ${isPinned ? 'ring-1 ring-[#F59E0B] ring-offset-1 ring-offset-[#06080F]' : ''}
                    ${isBookmarked ? 'shadow-[0_0_16px_rgba(245,158,11,0.08)]' : ''}
                  `}
                >
                  {isPinned && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <Pin size={10} className="text-[#F59E0B]" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#F59E0B]">Pinned</span>
                    </div>
                  )}
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
                              <pre className="my-1.5 overflow-x-auto rounded-xl bg-black/40 p-3 text-xs text-[#0AE8D0] border border-[rgba(10,232,208,0.10)]">
                                <code>{children}</code>
                              </pre>
                            );
                          }
                          return (
                            <code className={`rounded-lg px-1.5 py-0.5 font-mono text-xs ${
                              isOwn ? 'bg-black/15 text-[#06080F]' : 'bg-[rgba(10,232,208,0.08)] text-[#0AE8D0]'
                            }`}>
                              {children}
                            </code>
                          );
                        },
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noreferrer"
                            className={`underline decoration-1 underline-offset-2 ${
                              isOwn ? 'text-[#06080F]/80 hover:text-[#06080F]' : 'text-[#0AE8D0] hover:text-[#0AE8D0]/80'
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

                  {/* Link Preview */}
                  {msg.linkPreview && (
                    <a href={msg.linkPreview.url} target="_blank" rel="noreferrer"
                      className="mt-2 flex gap-2.5 rounded-xl border border-[rgba(148,163,184,0.10)] bg-black/20 p-2.5 hover:bg-black/30 transition-colors no-underline">
                      {msg.linkPreview.image && (
                        <img src={msg.linkPreview.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#EEF2F6] truncate">{msg.linkPreview.title}</div>
                        {msg.linkPreview.description && (
                          <div className="text-[10px] text-[#4B5678] line-clamp-2 mt-0.5">{msg.linkPreview.description}</div>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-[#0AE8D0]">
                          <ExternalLink size={9} />
                          <span className="text-[9px] truncate">{msg.linkPreview.siteName ?? msg.linkPreview.url}</span>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Task Card */}
                  {msg.taskCard && (
                    <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-[rgba(10,232,208,0.15)] bg-[rgba(10,232,208,0.05)] p-2.5">
                      <CheckSquare size={13} className="text-[#0AE8D0] mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#EEF2F6]">{msg.taskCard.taskText}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white shrink-0"
                            style={{ background: msg.taskCard.assigneeColor }}>
                            {msg.taskCard.assigneeInitials}
                          </div>
                          <span className="text-[10px] text-[#4B5678]">{msg.taskCard.assignee}</span>
                          <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            msg.taskCard.status === 'done' ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                            : msg.taskCard.status === 'inprogress' ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'
                            : 'bg-[rgba(148,163,184,0.10)] text-[#4B5678]'
                          }`}>
                            {msg.taskCard.status === 'inprogress' ? 'In Progress' : msg.taskCard.status === 'done' ? 'Done' : 'To Do'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isOwn ? 'text-[#06080F]/60' : 'text-[#4B5678]'}`}>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>

                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className={`absolute -bottom-4 ${isOwn ? 'left-0' : 'right-0'} hidden group-hover:flex`}
                    >
                      <div className="flex items-center gap-0.5 rounded-xl border border-[rgba(148,163,184,0.10)] bg-[#161B3D] p-1 shadow-xl shadow-black/30">
                        <button
                          onClick={() => toggleReaction(channelId, msg.id, '👍', currentUser?.email ?? '')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.08)] transition-all text-sm"
                          title="React"
                        >👍</button>
                        <button
                          onClick={() => toggleReaction(channelId, msg.id, '❤️', currentUser?.email ?? '')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.08)] transition-all text-sm"
                          title="Love"
                        >❤️</button>
                        <button
                          onClick={() => toggleReaction(channelId, msg.id, '🔥', currentUser?.email ?? '')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.08)] transition-all text-sm"
                          title="Fire"
                        >🔥</button>
                        <div className="h-5 w-px bg-[rgba(148,163,184,0.08)] mx-0.5" />
                        <button
                          onClick={() => toggleBookmark(msg.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                            isBookmarked
                              ? 'text-[#F59E0B] bg-[rgba(245,158,11,0.10)]'
                              : 'text-[#4B5678] hover:text-[#F59E0B] hover:bg-[rgba(245,158,11,0.08)]'
                          }`}
                          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                          <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => { if (isPinned) unpinMessage(channelId, msg.id); else pinMessage(channelId, msg.id); }}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                            isPinned
                              ? 'text-[#F59E0B] bg-[rgba(245,158,11,0.10)]'
                              : 'text-[#4B5678] hover:text-[#F59E0B] hover:bg-[rgba(245,158,11,0.08)]'
                          }`}
                          title={isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin size={13} />
                        </button>
                        {(msg.sender === currentUser?.name || false) && (
                          <button
                            onClick={() => deleteMessage(channelId, msg.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#FF6B7F] hover:bg-[rgba(255,107,127,0.08)] transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2 bg-gradient-to-t from-[#06080F] via-[#06080F] to-transparent">
        <div className="relative group">
          {/* @mention autocomplete */}
          <AnimatePresence>
            {mentionOpen && mentionFiltered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full left-4 mb-2 z-30 rounded-xl overflow-hidden shadow-xl border border-[rgba(148,163,184,0.12)]"
                style={{ background: '#0D1025', minWidth: 200 }}
              >
                {mentionFiltered.map(m => (
                  <button key={m.id} type="button" onMouseDown={() => insertMention(m.name)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-[rgba(10,232,208,0.08)] transition-colors">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-[#06080F] shrink-0"
                      style={{ background: m.color ?? '#0AE8D0' }}>{m.initials}</span>
                    <div>
                      <div className="text-xs font-bold text-[#EEF2F6]">{m.name}</div>
                      <div className="text-[10px] text-[#4B5678]">{m.role}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#0AE8D0] to-[#7C5CFC] opacity-0 group-focus-within:opacity-20 blur-sm transition-all duration-500" />
          <div className="relative rounded-2xl border border-[rgba(148,163,184,0.08)] bg-[rgba(22,27,61,0.60)] backdrop-blur-xl shadow-lg shadow-black/20 transition-all duration-300 group-focus-within:border-[rgba(10,232,208,0.25)]">
            <textarea
              ref={composerRef}
              value={composerMessage}
              onChange={handleComposerChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channel?.name ?? 'general'}... (type @ to mention)`}
              className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-[#EEF2F6] placeholder-[#4B5678] focus:outline-none"
              rows={1}
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#8896B0] hover:bg-[rgba(148,163,184,0.06)] transition-all"
                  title="Emoji"
                >
                  <Smile size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#8896B0] hover:bg-[rgba(148,163,184,0.06)] transition-all"
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
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0AE8D0] to-[#06B8A5] text-[#06080F] shadow-lg shadow-[#0AE8D0]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
