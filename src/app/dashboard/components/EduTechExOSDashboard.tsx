'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../dashboard.css';
import AppLogo from '@/components/ui/AppLogo';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTheme } from '@/components/ThemeProvider';
import {
  sendMeetingEmailInvitation,
  sendMentionEmailNotification,
  uploadLocalFile,
  changePassword,
} from '@/app/actions/dbActions';
import NotificationPanel from './NotificationPanel';
import AIPanel from './AIPanel';
import { getSocket } from '@/lib/socket';

import MyActivityCalendar from './MyActivityCalendar';
import SearchPanel from './SearchPanel';
import FigmaPanel from './FigmaPanel';
import CalendarPanel from './CalendarPanel';
import IntegrationsPanel from './IntegrationsPanel';

import UserProfileModal from './UserProfileModal';
import WikiPanel from './WikiPanel';
import KanbanBoard from './KanbanBoard';
import AnalyticsPanel from './AnalyticsPanel';
import BookmarksPanel from './BookmarksPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/* Shared spring config used for every modal/panel */
const SPRING = { type: 'spring', damping: 26, stiffness: 360, mass: 0.8 } as const;
const BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: 0.18 },
} as const;
const CARD = {
  initial: { opacity: 0, y: 48, scale: 0.95 },
  animate: { opacity: 1, y: 0,  scale: 1    },
  exit:    { opacity: 0, y: 28, scale: 0.96 },
  transition: SPRING,
} as const;
import {
  BarChart2,
  Bell,
  Bookmark,
  BookOpen,
  CalendarPlus,
  Bot,
  CalendarDays,
  ChevronDown,
  Hash,
  CheckSquare,
  Loader2,
  Mail,
  Monitor,
  Palette,
  PhoneCall,
  LogOut,
  Mic,
  Moon,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Square,
  Sun,
  Trash2,
  Type,
  FileText,
  UserCheck,
  Users,
  Video,
  Volume2,
  X,
  Zap,
  Layout,
  Layers,
} from 'lucide-react';

type CurrentUser = {
  name: string;
  email: string;
  role: string;
  initials: string;
};

const DEFAULT_COMPANY_MEET_LINK = 'https://meet.google.com/uie-jxkt-vkx';
const THURSDAY_AFTERNOON_MEET_LINK = 'https://meet.google.com/dss-wmvy-cuq';
const FRIDAY_MEET_LINK = 'https://meet.google.com/eeq-maem-ztc';
const settingsKey = (email: string) => `edutechex_dashboard_settings_${email.toLowerCase()}`;
const EMOJI_OPTIONS = [
  '😀','😂','😍','🥰','😎','🤔','😭','😡','🤯','😴',
  '👍','👎','👏','🙏','✌️','🤝','👀','💪','🙌','🤞',
  '❤️','💛','💚','💙','💜','🔥','⭐','✨','🎉','🏆',
  '✅','❌','❓','❗','💯','🚀','💡','🎯','📌','🔔',
];

const AVATAR_OPTIONS = [
  '😊','😎','🤩','🥳','😍','🤖','👾','🧑‍💻',
  '🦊','🐱','🐯','🦁','🐼','🐨','🦄','🐸',
  '🚀','⚡','🌟','🔥','💎','🏆','🎯','🎭',
  '🧑‍🚀','🦸','🧩','🎨','🌈','👑',
];

type DashboardSettings = {
  // Profile
  displayName: string;
  avatarEmoji: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  // Meeting
  meetLink: string;
  // Notifications
  emailNotifications: boolean;
  desktopNotifications: boolean;
  soundNotifications: boolean;
  // Appearance
  compactChat: boolean;
  fontSize: 'normal' | 'large';
  // Behaviour
  enterToSend: boolean;
};

type MeetingButtonState = {
  label: string;
  link: string | null;
  message: string;
};

type RecordedPreview = {
  kind: 'audio' | 'video';
  blob: Blob;
  url: string;
  mimeType: string;
};

function getMeetingButtonState(now = new Date()): MeetingButtonState {
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 0 || day === 6) {
    return {
      label: 'No meeting',
      link: null,
      message: 'No meeting is scheduled on Saturday or Sunday.',
    };
  }

  if (day === 5) {
    return {
      label: 'Friday meet',
      link: FRIDAY_MEET_LINK,
      message: 'Friday meeting link is active.',
    };
  }

  if (day === 4 && hour >= 14) {
    return {
      label: 'Thursday PM meet',
      link: THURSDAY_AFTERNOON_MEET_LINK,
      message: 'Thursday afternoon meeting link is active.',
    };
  }

  return {
    label: 'Main meet',
    link: DEFAULT_COMPANY_MEET_LINK,
    message: 'Main meeting link is active.',
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(value))
    .replace(' ', '');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(value))
    .toUpperCase();
}

function renderWithMentions(text: string, isOwn: boolean, memberNames: string[] = []): React.ReactNode {
  if (!text) return text;

  // Build pattern from known member names (longest first to avoid partial matches)
  // Fall back to generic word+ pattern if no members
  const escaped = memberNames
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  const pattern = escaped.length > 0
    ? new RegExp(`(@(?:${escaped.join('|')}))`, 'gi')
    : /(@[A-Za-z][A-Za-z0-9 ._-]*[A-Za-z0-9]|@[A-Za-z])/g;

  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (/^@/i.test(part) && memberNames.some((n) => part.slice(1).toLowerCase() === n.toLowerCase())) {
      return (
        <strong key={i} className="font-black" style={{ color: isOwn ? '#EAE8F4' : '#C4CAE0' }}>
          {part}
        </strong>
      );
    }
    // fallback: any @word token when no members list
    if (memberNames.length === 0 && /^@[A-Za-z]/.test(part)) {
      return (
        <strong key={i} className="font-black" style={{ color: isOwn ? '#EAE8F4' : '#C4CAE0' }}>
          {part}
        </strong>
      );
    }
    return part;
  });
}

function parseScheduledMeet(text: string) {
  if (!text.startsWith('Meeting Scheduled:')) return null;

  const title = text.match(/Meeting Scheduled:\s*(.+)/)?.[1]?.trim() || 'Team meeting';
  const time = text.match(/Time:\s*(.+)/)?.[1]?.trim() || 'Time not set';
  const people = text.match(/Mentioned people:\s*(.+)/)?.[1]?.trim() || 'No mentions';
  const link =
    text.match(/Join Link:\s*(https?:\/\/\S+)/)?.[1]?.trim() || DEFAULT_COMPANY_MEET_LINK;

  return { title, time, people, link };
}

export default function EduTechExOSDashboard() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const {
    activeChannel,
    setActiveChannel,
    channels,
    messages,
    members,
    addChannel,
    addMessage,
    addMessageFromSocket,
    updateMessageFromSocket,
    deleteMessageFromSocket,
    addNotification,
    loadLocalMessages,
    loadLocalWikiPages,
    loadLocalKanbanTasks,
    loadLocalBookmarkedIds,
    loadLocalNotifications,
    loadPinnedMessages,
    loadWorkspaceChannels,
    notifications,
    typingUsers,
    pinnedMessageIds,
    bookmarkedMessageIds,
    toggleBookmark,
    deleteMessage,
    pinMessage,
    unpinMessage,
    toggleReaction,
    toggleDarkMode: storeDarkModeToggle,
    darkMode,
    kanbanTasks,
    addKanbanTask,
    updateKanbanTaskStatus,
  } = useDashboardStore();
  const [rightPanel, setRightPanel] = useState<'ai' | 'closed'>('closed');
  const [rightSidePanel, setRightSidePanel] = useState<'pinned' | 'bookmarked' | null>(null);
  const [composerMessage, setComposerMessage] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityCalendarOpen, setActivityCalendarOpen] = useState(false);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [meetMenuOpen, setMeetMenuOpen] = useState(false);
  const [meetInputMenuOpen, setMeetInputMenuOpen] = useState(false);
  const meetInputMenuRef = useRef<HTMLDivElement>(null);
  const [scheduleMeetOpen, setScheduleMeetOpen] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetInviteeIds, setMeetInviteeIds] = useState<string[]>([]);
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'notifications' | 'meeting' | 'security'>('profile');
  const [pwCurrent, setPwCurrent]   = useState('');
  const [pwNew, setPwNew]           = useState('');
  const [pwConfirm, setPwConfirm]   = useState('');
  const [pwLoading, setPwLoading]   = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>({
    displayName: '',
    avatarEmoji: '',
    status: 'online',
    meetLink: DEFAULT_COMPANY_MEET_LINK,
    emailNotifications: true,
    desktopNotifications: false,
    soundNotifications: true,
    compactChat: false,
    fontSize: 'normal',
    enterToSend: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── Settings: load from MongoDB on mount, auto-save on change ───────────────
  const settingsLoadedFromDB = useRef(false);
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load saved settings from MongoDB on first mount
    const raw = typeof window !== 'undefined' ? localStorage.getItem('edutechex_token') : null;
    if (!raw) return;
    try {
      const { token } = JSON.parse(raw);
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com'}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.settings) {
            const s = data.settings;
            setSettings((prev) => ({
              ...prev,
              ...(s.displayName          !== undefined && { displayName: s.displayName }),
              ...(s.avatarEmoji          !== undefined && { avatarEmoji: s.avatarEmoji }),
              ...(s.status               !== undefined && { status: s.status }),
              ...(s.meetLink             !== undefined && { meetLink: s.meetLink }),
              ...(s.emailNotifications   !== undefined && { emailNotifications: s.emailNotifications }),
              ...(s.desktopNotifications !== undefined && { desktopNotifications: s.desktopNotifications }),
              ...(s.soundNotifications   !== undefined && { soundNotifications: s.soundNotifications }),
              ...(s.compactChat          !== undefined && { compactChat: s.compactChat }),
              ...(s.fontSize             !== undefined && { fontSize: s.fontSize }),
              ...(s.enterToSend          !== undefined && { enterToSend: s.enterToSend }),
            }));
          }
        })
        .catch(() => {})
        .finally(() => { settingsLoadedFromDB.current = true; });
    } catch { settingsLoadedFromDB.current = true; }
  }, []); // run once on mount

  useEffect(() => {
    // Don't save before we've loaded (prevents overwriting DB with defaults)
    if (!settingsLoadedFromDB.current) return;
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    settingsSaveTimer.current = setTimeout(() => {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('edutechex_token') : null;
      if (!raw) return;
      try {
        const { token } = JSON.parse(raw);
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com'}/api/settings`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        }).catch(() => {});
      } catch { /* ignore */ }
    }, 1500); // debounce 1.5s
    return () => { if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current); };
  }, [settings]);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  const [hoverEmojiMsgId, setHoverEmojiMsgId] = useState<string | null>(null);
  const [pinScrollIdx, setPinScrollIdx] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const discardRecordingRef = useRef(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedPreview, setRecordedPreview] = useState<RecordedPreview | null>(null);
  const [recordingSending, setRecordingSending] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ─── New panel states ────────────────────────────────────────────────────────
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const [wikiOpen, setWikiOpen] = useState(false);
  const [kanbanOpen, setKanbanOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const [figmaOpen, setFigmaOpen]       = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<(typeof members)[0] | null>(null);
  const currentMember = currentUser?.email
    ? members.find((member) => member.email.toLowerCase() === currentUser.email.toLowerCase())
    : null;
  const currentMemberId = currentMember?.id ?? '';
  const isAdmin = currentUser?.role === 'Admin';
  const currentUserColor = currentMember?.color ?? (isAdmin ? '#3E4A89' : '#64748b');
  const workspaceChannels = useMemo(
    () =>
      channels.filter((item) => {
        if (item.id.startsWith('member-')) return false;
        if (isAdmin) return true;
        if (item.id === 'general') return true;
        return Boolean(currentMemberId && item.memberIds?.includes(currentMemberId));
      }),
    [channels, currentMemberId, isAdmin]
  );
  const activeChannelRecord = channels.find((item) => item.id === activeChannel);
  const activeChannelAllowed = Boolean(
    activeChannelRecord &&
    (activeChannelRecord.id.startsWith('member-') ||
      isAdmin ||
      activeChannelRecord.id === 'general' ||
      (currentMemberId && activeChannelRecord.memberIds?.includes(currentMemberId)))
  );
  const channel = activeChannelAllowed
    ? activeChannelRecord
    : (workspaceChannels[0] ?? channels[0]);

  const activeChannelId = useMemo(() => {
    if (!channel) return 'general';
    if (channel.id.startsWith('member-') && currentMemberId) {
      const sorted = [channel.id, currentMemberId].sort();
      return `dm-${sorted[0]}-${sorted[1]}`;
    }
    return channel.id;
  }, [channel, currentMemberId]);

  const channelMessages = useMemo(() => {
    const list = messages[activeChannelId];
    if (list) return list;

    if (channel?.id.startsWith('member-') && currentMemberId) {
      const targetId = channel.id;
      const localMock = messages[targetId] ?? [];
      const userMock = messages[currentMemberId] ?? [];
      const combined = [...localMock, ...userMock].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return combined;
    }
    return [];
  }, [messages, activeChannelId, channel, currentMemberId]);
  // All users can see the full team list so they can start personal DMs
  const people = members;
  const activeChannelMembers = useMemo(() => {
    if (!channel) return [];
    if (channel.id.startsWith('member-')) {
      return members.filter((member) => member.id === channel.id || member.id === currentMemberId);
    }
    return members.filter((member) => channel.memberIds?.includes(member.id));
  }, [channel, currentMemberId, members]);
  const currentUserEmail = currentUser?.email?.toLowerCase() ?? '';
  const visibleNotifications = notifications.filter(
    (item) =>
      !item.recipientEmails?.length ||
      item.recipientEmails.map((email) => email.toLowerCase()).includes(currentUserEmail)
  );
  const unreadNotifications = visibleNotifications.filter((item) => !item.read).length;
  const meetingButtonState = getMeetingButtonState();
  const companyMeetLink = settings.meetLink.trim() || DEFAULT_COMPANY_MEET_LINK;
  const mentionQuery = useMemo(() => {
    const match = composerMessage
      .slice(0, composerRef.current?.selectionStart ?? composerMessage.length)
      .match(/@([\w\s.-]*)$/);
    return match?.[1]?.trim().toLowerCase() ?? '';
  }, [composerMessage]);
  const mentionSuggestions = activeChannelMembers
    .filter((member) => member.email.toLowerCase() !== currentUserEmail)
    .filter((member) => !mentionQuery || member.name.toLowerCase().includes(mentionQuery))
    .slice(0, 6);

  const firstMessageDate = useMemo(() => {
    const first = channelMessages[0]?.timestamp;
    return first ? formatDate(first) : 'TODAY';
  }, [channelMessages]);

  useEffect(() => {
    loadLocalMessages?.();
    loadLocalWikiPages?.();
    loadLocalKanbanTasks?.();
    loadLocalBookmarkedIds?.();
    loadPinnedMessages?.();
    loadWorkspaceChannels?.();
    useDashboardStore.getState().loadLocalMembers?.();
    const interval = setInterval(() => {
      loadLocalMessages?.();
      loadLocalWikiPages?.();
    }, 3000);
    // Refresh members every 30 s so newly approved users appear without a hard reload
    const membersInterval = setInterval(() => {
      useDashboardStore.getState().loadLocalMembers?.();
    }, 30_000);
    return () => { clearInterval(interval); clearInterval(membersInterval); };
  }, []); // Zustand actions are stable refs � empty deps is safe

  // ── Socket.IO real-time message delivery ──────────────────────────────────
  // Join the active channel room so we receive live `new_message` events.
  // Uses activeChannelId (not activeChannel) so DM rooms (dm-X-Y) work correctly.
  // Re-joins on every 'connect' event so Render cold-start wakeups don't silently
  // break real-time delivery for User 2.
  useEffect(() => {
    const socket = getSocket();

    // Join correct room (DMs use 'dm-X-Y', workspace channels use their id)
    socket.emit('join_channel', activeChannelId);

    // Rejoin whenever socket reconnects (Render wakes from sleep, network blip, etc.)
    const handleReconnect = () => {
      socket.emit('join_channel', activeChannelId);
    };

    const handleNewMessage = ({ channelId, message }: { channelId: string; message: import('@/store/dashboardStore').Message }) => {
      addMessageFromSocket(channelId, message);
      // Only notify for messages sent by someone else
      if (message.sender !== currentUserRef.current?.name) {
        if (settingsRef.current.soundNotifications) playNotificationSound();
        if (settingsRef.current.desktopNotifications) {
          showDesktopNotification(
            `${message.sender} · #${channelId}`,
            message.text
          );
        }
      }
    };

    const handleUpdatedMessage = ({ channelId, message }: { channelId: string; message: import('@/store/dashboardStore').Message }) => {
      updateMessageFromSocket(channelId, message);
    };

    const handleDeletedMessage = ({ channelId, messageId }: { channelId: string; messageId: string }) => {
      deleteMessageFromSocket(channelId, messageId);
    };

    // When admin changes a member's role/channel, reload the member list
    // and if it's the current user, refresh their role in state + localStorage
    const handleMemberUpdated = ({ email, role }: { email?: string; role?: string } = {}) => {
      useDashboardStore.getState().loadLocalMembers?.();
      if (email && role && currentUserRef.current?.email?.toLowerCase() === email.toLowerCase()) {
        try {
          const raw = localStorage.getItem('edutechex_token');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.user) {
              parsed.user.role = role;
              localStorage.setItem('edutechex_token', JSON.stringify(parsed));
              setCurrentUser((prev) => prev ? { ...prev, role } : prev);
            }
          }
        } catch { /* ignore */ }
      }
    };

    socket.on('connect', handleReconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleUpdatedMessage);
    socket.on('message_deleted', handleDeletedMessage);
    socket.on('member_updated', handleMemberUpdated);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleUpdatedMessage);
      socket.off('message_deleted', handleDeletedMessage);
      socket.off('member_updated', handleMemberUpdated);
      socket.emit('leave_channel', activeChannelId);
    };
  }, [activeChannelId, addMessageFromSocket, updateMessageFromSocket, deleteMessageFromSocket]);

  // Poll backend notifications for the signed-in user every 5 seconds
  useEffect(() => {
    if (!currentUserEmail) return;
    loadLocalNotifications?.(currentUserEmail);
    const interval = setInterval(() => loadLocalNotifications?.(currentUserEmail), 5000);
    return () => clearInterval(interval);
  }, [currentUserEmail, loadLocalNotifications]);

  // Sync dark mode from store on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);


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

      // Load settings scoped to this user so display names don't bleed across accounts
      const savedSettings = localStorage.getItem(settingsKey(user.email));
      if (savedSettings) {
        try {
          setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
        } catch { /* corrupt settings — ignore */ }
      }

      const initials = user.name
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      // Use saved displayName only if it was saved for THIS user (already applied above via setSettings)
      const savedDisplayName = (() => {
        try { return JSON.parse(savedSettings ?? '{}')?.displayName ?? ''; } catch { return ''; }
      })();
      setCurrentUser({ ...user, name: savedDisplayName || user.name, initials });
      setAuthChecked(true);
    } catch {
      router.push('/sign-up-login-screen?mode=user&redirect=/dashboard');
    }
  }, [router]);

  useEffect(() => {
    // Delay so React finishes rendering the new channel's messages before scrolling
    const t = setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'auto' }), 80);
    return () => clearTimeout(t);
  }, [activeChannel, activeChannelId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length]);

  useEffect(() => {
    if (!authChecked) return;

    const active = channels.find((item) => item.id === activeChannel);
    if (!active || active.id.startsWith('member-') || isAdmin || active.id === 'general') return;

    if (!currentMemberId || !active.memberIds?.includes(currentMemberId)) {
      setActiveChannel('general');
    }
  }, [activeChannel, authChecked, channels, currentMemberId, isAdmin, setActiveChannel]);

  // ── Notification helpers ────────────────────────────────────────────────────
  function playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } catch { /* browser may block AudioContext without a user gesture */ }
  }

  function showDesktopNotification(title: string, body: string) {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body: body.slice(0, 120), icon: '/favicon.ico' });
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 120);
  };

  function sendMessage() {
    const text = composerMessage.trim();
    if (!text || !channel) return;

    const mentionedMembers = activeChannelMembers.filter(
      (member) =>
        member.email.toLowerCase() !== currentUserEmail &&
        text.toLowerCase().includes(`@${member.name}`.toLowerCase())
    );

    addMessage(activeChannelId, {
      id: `msg-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUserColor,
      timestamp: new Date().toISOString(),
      text,
    });

    if (mentionedMembers.length > 0) {
      addNotification({
        type: 'mention',
        actor: currentUser?.name ?? 'EduTechExOS',
        actorInitials: currentUser?.initials ?? 'OS',
        actorColor: currentUserColor,
        channel: channel.name,
        message: text,
        recipientEmails: mentionedMembers.map((member) => member.email),
      });

      if (settings.emailNotifications) {
        mentionedMembers.forEach((member) => {
          sendMentionEmailNotification(
            currentUser?.name ?? 'EduTechExOS',
            member.name,
            member.email,
            channel.name,
            text
          );
        });
      }

      // Auto-create a Kanban task when the message contains an @mention + an action keyword
      const ACTION_KEYWORDS =
        /\b(todo|task|please|add|create|fix|update|review|prepare|finish|complete|implement|deploy|build|test|set\s*up|check|write|design|handle|send|assign|make|ensure|submit|upload|schedule|do)\b/i;
      if (ACTION_KEYWORDS.test(text)) {
        const firstMentioned = mentionedMembers[0];
        addKanbanTask({
          text: text.slice(0, 200),
          assignee: firstMentioned.name,
          assigneeInitials: firstMentioned.initials,
          assigneeEmail: firstMentioned.email,
          sourceChannel: `#${channel.name}`,
          status: 'todo',
        });
        toast.success(`📋 Task added to Kanban board for @${firstMentioned.name}`);
      }
    }

    setComposerMessage('');
    setMentionMenuOpen(false);
  }

  const visibleMessages = channelMessages;

  function insertComposerText(prefix: string, suffix = '') {
    const input = composerRef.current;
    if (!input) {
      setComposerMessage((value) => `${value}${prefix}${suffix}`);
      return;
    }

    const start = input.selectionStart ?? composerMessage.length;
    const end = input.selectionEnd ?? composerMessage.length;
    const selected = composerMessage.slice(start, end);
    const next = `${composerMessage.slice(0, start)}${prefix}${selected}${suffix}${composerMessage.slice(end)}`;
    setComposerMessage(next);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + prefix.length + selected.length;
      input.setSelectionRange(cursor, cursor);
    });
  }

  function insertMention(memberName: string) {
    const input = composerRef.current;
    const cursor = input?.selectionStart ?? composerMessage.length;
    const before = composerMessage.slice(0, cursor);
    const after = composerMessage.slice(cursor);
    const nextBefore = before.replace(/@([\w\s.-]*)$/, `@${memberName} `);
    const next = `${nextBefore}${after}`;
    setComposerMessage(next);
    setMentionMenuOpen(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextBefore.length, nextBefore.length);
    });
  }

  function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    localStorage.setItem(settingsKey(currentUser?.email ?? 'default'), JSON.stringify(settings));
    // Update display name live
    setCurrentUser((user) =>
      user ? { ...user, name: settings.displayName.trim() || user.name } : user
    );
    // Request desktop notification permission when first enabling
    if (settings.desktopNotifications && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setSettingsOpen(false);
    toast.success('Settings saved');
  }

  async function handleChangePassword() {
    if (!currentUser?.email) return;
    if (pwNew.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (pwNew !== pwConfirm) { toast.error('New passwords do not match.'); return; }
    setPwLoading(true);
    try {
      const result = await changePassword(currentUser.email, pwCurrent, pwNew);
      if (result.success) {
        toast.success('Password changed successfully!');
        setPwCurrent(''); setPwNew(''); setPwConfirm('');
      } else {
        toast.error(result.error ?? 'Could not change password.');
      }
    } finally {
      setPwLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !channel) return;

    try {
      let fileUrl: string | null = null;
      let fileName = file.name;
      let fileType = file.type;

      // Try server upload first; fall back to data URL (Vercel ephemeral FS-safe)
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await uploadLocalFile(formData);
        if (result.success && result.url) {
          fileUrl = result.url;
          fileName = result.name || file.name;
          fileType = result.type || file.type;
        }
      } catch { /* server upload failed — fall through to data URL */ }

      if (!fileUrl) {
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      addMessage(activeChannelId, {
        id: `msg-file-${Date.now()}`,
        sender: currentUser?.name ?? 'You',
        initials: currentUser?.initials ?? 'Y',
        color: currentUserColor,
        timestamp: new Date().toISOString(),
        text: composerMessage.trim(),
        files: [{ name: fileName, url: fileUrl, type: fileType }],
      });
      setComposerMessage('');
      toast.success('File shared to channel');
    } finally {
      event.target.value = '';
    }
  }

  function createChannel(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin) {
      toast.error('Only an admin can create channels.');
      return;
    }

    const cleanName = newChannelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
    if (!cleanName) return;
    if (channels.some((item) => item.id === cleanName)) {
      toast.error('A channel with this name already exists.');
      return;
    }
    addChannel({
      id: cleanName,
      name: cleanName,
      description: newChannelDescription.trim() || 'Custom workspace channel',
      memberCount: 0,
      unread: 0,
      memberIds: [],
    });
    setActiveChannel(cleanName);
    setNewChannelName('');
    setNewChannelDescription('');
    setNewChannelOpen(false);
    toast.success(`#${cleanName} created`);
  }

  useEffect(() => {
    if (videoPreviewRef.current && mediaStreamRef.current) {
      videoPreviewRef.current.srcObject = mediaStreamRef.current;
    }
  }, [recordingType]);

  useEffect(() => {
    return () => {
      if (recordedPreview) URL.revokeObjectURL(recordedPreview.url);
    };
  }, [recordedPreview]);

  // Close emoji panel when clicking outside
  useEffect(() => {
    if (!emojiMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(e.target as Node) &&
        emojiBtnRef.current &&
        !emojiBtnRef.current.contains(e.target as Node)
      ) {
        setEmojiMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emojiMenuOpen]);

  useEffect(() => {
    if (!meetInputMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (!meetInputMenuRef.current?.contains(e.target as Node)) setMeetInputMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [meetInputMenuOpen]);

  // Recording timer
  useEffect(() => {
    if (recordingType) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [recordingType]);

  async function startRecording(kind: 'audio' | 'video') {
    if (!channel) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Recording is not supported in this browser.');
      return;
    }

    try {
      setRecordingBusy(true);
      discardRecordingRef.current = false;
      const stream =
        kind === 'video'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType =
        kind === 'video'
          ? MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm'
          : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const stoppedStream = mediaStreamRef.current;
        stoppedStream?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecordingType(null);
        setRecordingBusy(false);

        if (discardRecordingRef.current || chunks.length === 0) return;

        const blob = new Blob(chunks, { type: mimeType });
        setRecordedPreview((existing) => {
          if (existing) URL.revokeObjectURL(existing.url);
          return {
            kind,
            blob,
            mimeType,
            url: URL.createObjectURL(blob),
          };
        });
        toast.success(`${kind === 'video' ? 'Screen recording' : 'Voice note'} ready to preview`);
      };

      mediaRecorderRef.current = recorder;
      setRecordingType(kind);
      recorder.start();
      toast.success(`${kind === 'video' ? 'Screen' : 'Voice'} recording started`);
    } catch {
      setRecordingBusy(false);
      setRecordingType(null);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      toast.error(`Could not start ${kind} recording. Check browser permissions.`);
    }
  }

  function stopRecording(save: boolean) {
    if (!mediaRecorderRef.current) return;
    discardRecordingRef.current = !save;
    mediaRecorderRef.current.stop();
  }

  function discardRecordedPreview() {
    setRecordedPreview((preview) => {
      if (preview) URL.revokeObjectURL(preview.url);
      return null;
    });
  }

  async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function sendRecordedPreview() {
    if (!recordedPreview || !channel) return;

    setRecordingSending(true);
    try {
      const file = new File(
        [recordedPreview.blob],
        `${recordedPreview.kind}-note-${Date.now()}.webm`,
        { type: recordedPreview.mimeType }
      );
      const formData = new FormData();
      formData.append('file', file);

      let mediaUrl: string | null = null;
      try {
        const result = await uploadLocalFile(formData);
        if (result.success && result.url) mediaUrl = result.url;
      } catch { /* server upload failed, will use data URL */ }

      // Always fall back to data URL if server upload failed (works everywhere including Vercel)
      if (!mediaUrl) {
        mediaUrl = await blobToDataUrl(recordedPreview.blob);
      }

      addMessage(activeChannelId, {
        id: `msg-${recordedPreview.kind}-${Date.now()}`,
        sender: currentUser?.name ?? 'You',
        initials: currentUser?.initials ?? 'Y',
        color: currentUserColor,
        timestamp: new Date().toISOString(),
        text:
          composerMessage.trim() ||
          `${recordedPreview.kind === 'video' ? '�¹ Screen recording' : '🎙�¸ Voice note'}`,
        ...(recordedPreview.kind === 'video' ? { videoUrl: mediaUrl } : { audioUrl: mediaUrl }),
      });
      setComposerMessage('');
      URL.revokeObjectURL(recordedPreview.url);
      setRecordedPreview(null);
      toast.success(`${recordedPreview.kind === 'video' ? 'Camera recording' : 'Voice note'} sent`);
    } catch {
      toast.error(`Could not save the ${recordedPreview.kind} recording.`);
    } finally {
      setRecordingSending(false);
    }
  }

  const availableInvitees = activeChannelMembers.filter(
    (member) => member.email.toLowerCase() !== currentUserEmail
  );
  const selectedInvitees = members.filter((member) => meetInviteeIds.includes(member.id));
  function toggleInvitee(memberId: string) {
    setMeetInviteeIds((selected) =>
      selected.includes(memberId)
        ? selected.filter((id) => id !== memberId)
        : [...selected, memberId]
    );
  }

  function openScheduleMeet() {
    const rounded = new Date();
    rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);
    const defaultDate = rounded.toISOString().split('T')[0];
    const defaultTime = `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
    setMeetTitle(`${channel?.name ?? 'Team'} sync`);
    setMeetDate(defaultDate);
    setMeetTime(defaultTime);

    // Pre-select @mentioned people; fall back to all channel members when no @mentions typed
    const mentionedWords = (composerMessage.match(/@(\w+)/g) ?? []).map((m) => m.slice(1).toLowerCase());
    const preMentionedIds = mentionedWords.length > 0
      ? availableInvitees
          .filter((m) => mentionedWords.some((w) => m.name.toLowerCase().includes(w)))
          .map((m) => m.id)
      : availableInvitees.map((m) => m.id); // select all by default so form can always submit

    setMeetInviteeIds(preMentionedIds);
    setSendEmailInvite(settings.emailNotifications);
    setMeetMenuOpen(false);
    setMeetInputMenuOpen(false);
    setScheduleMeetOpen(true);
  }

  async function scheduleMeet(event: React.FormEvent) {
    event.preventDefault();
    if (!channel) return;

    const title = meetTitle.trim();
    if (!title || !meetDate || !meetTime || selectedInvitees.length === 0) {
      toast.error('Add a title, time, and at least one mentioned person.');
      return;
    }

    const meetLink = companyMeetLink;
    const inviteeEmails = selectedInvitees.map((member) => member.email);
    const inviteeNames = selectedInvitees.map((member) => `@${member.name}`).join(', ');
    const timeLabel = `${meetDate} at ${meetTime}`;
    const text = [
      `Meeting Scheduled: ${title}`,
      `Time: ${timeLabel}`,
      `Mentioned people: ${inviteeNames}`,
      `Join Link: ${meetLink}`,
    ].join('\n');

    addMessage(activeChannelId, {
      id: `meeting-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUserColor,
      timestamp: new Date().toISOString(),
      text,
    });

    addNotification({
      type: 'mention',
      actor: currentUser?.name ?? 'EduTechExOS',
      actorInitials: currentUser?.initials ?? 'OS',
      actorColor: currentUserColor,
      channel: channel.name,
      message: `scheduled "${title}" for ${timeLabel}. Join: ${meetLink}`,
      recipientEmails: inviteeEmails,
    });

    // Always close the modal and return to chat first, then send email in background
    setScheduleMeetOpen(false);
    setMeetTitle('');
    setMeetDate('');
    setMeetTime('');
    setMeetInviteeIds([]);
    setComposerMessage('');

    // Scroll chat to the new meeting message and refocus input
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      composerRef.current?.focus();
    }, 200);

    // Send email invite in the background � doesn't block returning to chat
    if (sendEmailInvite) {
      try {
        const emailResult = await sendMeetingEmailInvitation(title, timeLabel, inviteeEmails, meetLink);
        if (emailResult.success) {
          toast.success(
            `Meeting scheduled. Email invite sent to ${inviteeEmails.length} recipient${inviteeEmails.length === 1 ? '' : 's'}.`
          );
        } else {
          toast.warning('Meeting scheduled, but email delivery failed.');
        }
      } catch {
        toast.warning('Meeting scheduled, but email could not be sent.');
      }
    } else {
      toast.success('Meeting scheduled successfully.');
    }
  }

  function startNewMeeting() {
    if (!channel) return;
    // Open a brand-new Google Meet room instantly; post the link to chat
    const meetLink = 'https://meet.google.com/new';

    addMessage(activeChannelId, {
      id: `meeting-started-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUserColor,
      timestamp: new Date().toISOString(),
      text: `�¢ **Meeting Started**\n\nJoin on Google Meet:\n${meetLink}`,
    });

    const notifyMembers = activeChannelMembers.filter(
      (member) => member.email.toLowerCase() !== currentUserEmail
    );
    if (notifyMembers.length > 0) {
      addNotification({
        type: 'mention',
        actor: currentUser?.name ?? 'EduTechExOS',
        actorInitials: currentUser?.initials ?? 'OS',
        actorColor: currentUserColor,
        channel: channel.name,
        message: `started a Google Meet. Join: ${meetLink}`,
        recipientEmails: notifyMembers.map((member) => member.email),
      });
    }

    window.open(meetLink, '_blank');
    toast.success('Google Meet started! Link posted to chat.');
  }


  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-[#4A5578] dark:bg-[#191E2F] dark:text-[#7C859E]">
        <div className="flex items-center gap-3 rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] px-5 py-4 text-sm font-black shadow-sm  dark:bg-[#191E2F] dark:text-[#9BA6D3]">
          <Loader2 size={18} className="animate-spin text-green-700" />
          Checking workspace access
        </div>
      </div>
    );
  }


    return (
    <div className="dashboard-root dashboard-workspace-no-panel text-[#1E2636]">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• LEFT ICON RAIL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <nav className="workspace-rail">
        <div className="rail-top">
          <motion.div
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
            className="rail-logo-wrap"
            style={{ background: 'linear-gradient(135deg,#3E4A89 0%,#4f52a0 100%)', boxShadow: '0 2px 8px rgba(98,100,167,0.40)' }}
          >
            <AppLogo size={18} />
          </motion.div>

          <div className="rail-divider" />

          <motion.button whileTap={{ scale: 0.90 }} className="rail-btn active">
            <Hash size={19} strokeWidth={2.2} />
            <span className="rail-label">Chat</span>
          </motion.button>

          {[
            { icon: CheckSquare,  label: 'Tasks',        action: () => setKanbanOpen(true) },
            { icon: BookOpen,     label: 'Wiki',         action: () => setWikiOpen(true) },
            { icon: CalendarDays, label: 'Calendar',     action: () => setCalendarOpen(true) },
            { icon: Layers,       label: 'Figma',        action: () => setFigmaOpen(true) },
            { icon: Zap,          label: 'Integrations', action: () => setIntegrationsOpen(true) },
            ...(isAdmin ? [{ icon: BarChart2, label: 'Analytics', action: () => setAnalyticsOpen(true) }] : []),
          ].map(({ icon: Icon, label, action }) => (
            <motion.button key={label} whileTap={{ scale: 0.90 }} onClick={action} className="rail-btn">
              <Icon size={19} strokeWidth={1.8} />
              <span className="rail-label">{label}</span>
            </motion.button>
          ))}
        </div>

        <div className="rail-bottom">
          <div className="rail-divider" />
          <motion.button whileTap={{ scale: 0.90 }} onClick={() => { toggleTheme(); storeDarkModeToggle(); }} className="rail-btn">
            {darkMode ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            <span className="rail-label">{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.90 }} onClick={() => { setSettings(v => ({ ...v, displayName: v.displayName || currentUser?.name || '' })); setSettingsOpen(true); }} className="rail-btn">
            <Settings size={18} strokeWidth={1.8} />
            <span className="rail-label">Settings</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setSettings(v => ({ ...v, displayName: v.displayName || currentUser?.name || '' })); setSettingsOpen(true); }}
            className="rail-avatar"
            style={settings.avatarEmoji ? { background: 'transparent', fontSize: '1.35rem', lineHeight: 1 } : { background: currentUserColor }}
          >
            {settings.avatarEmoji || (currentUser?.initials ?? 'G')}
          </motion.button>

          {/* Notifications circle button */}
          <div style={{ marginTop: '8px' }}>
            <motion.button
              whileHover={{ scale: 1.10 }}
              whileTap={{ scale: 0.90 }}
              onClick={() => setNotificationsOpen(true)}
              className="relative flex items-center justify-center"
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: unreadNotifications > 0
                  ? 'linear-gradient(135deg,#ef4444,#f97316)'
                  : 'linear-gradient(135deg,#64748b,#94a3b8)',
                boxShadow: unreadNotifications > 0
                  ? '0 0 0 3px rgba(239,68,68,0.30), 0 6px 20px rgba(239,68,68,0.45)'
                  : '0 4px 14px rgba(0,0,0,0.30)',
                color: '#fff',
                border: 'none', cursor: 'pointer',
              }}
            >
              <Bell size={17} strokeWidth={2} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-black text-white" style={{ background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444' }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SIDEBAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <aside className="workspace-sidebar">

        {/* ── Workspace header + search ─────────────────── */}
        <div className="sidebar-search-bar">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[13px] font-semibold text-white truncate">EduTechExOS</span>
            {unreadNotifications > 0 && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setNotificationsOpen(true)}
                className="relative flex h-6 w-6 items-center justify-center rounded"
                style={{ color: 'rgba(255,255,255,0.55)' }}
                title="Notifications"
              >
                <Bell size={14} />
                <span className="badge-pulse absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-black text-white" style={{ background: '#ef4444' }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              </motion.button>
            )}
          </div>
          <button
            onClick={() => setGlobalSearchOpen(true)}
            className="sidebar-search-input w-full"
          >
            <Search size={13} />
            <span className="text-[12.5px]">Search</span>
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────── */}
        <div className="sidebar-scroll">
          {/* Channels */}
          <section className="mb-5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setChannelsExpanded(v => !v)}
              className="flex w-full items-center justify-between px-1 py-1.5 text-left"
            >
              <span className="sidebar-section-label flex items-center gap-1">
                <motion.span
                  animate={{ rotate: channelsExpanded ? 0 : -90 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="flex"
                >
                  <ChevronDown size={12} />
                </motion.span>
                Channels
              </span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                {workspaceChannels.length}
              </span>
            </motion.button>

            <AnimatePresence initial={false}>
              {channelsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.85 }}
                  style={{ overflow: 'hidden' }}
                  className="mt-1.5 space-y-0.5"
                >
                  {workspaceChannels.map((item, i) => {
                    const isActive = activeChannel === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ x: -18, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30, delay: i * 0.04 }}
                        whileHover={{ x: isActive ? 0 : 5 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveChannel(item.id)}
                        className={`sidebar-channel-btn${isActive ? ' active' : ''}`}
                      >
                        {/* Animated active-channel left bar — moves smoothly between channels */}
                        {isActive && (
                          <motion.span
                            layoutId="active-channel-bar"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                            style={{ background: '#3E4A89' }}
                            transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                          />
                        )}
                        <Hash size={13} style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }} />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        {item.unread > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                            style={{ background: '#3E4A89', color: '#ffffff' }}
                          >
                            {item.unread}
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* People */}
          <section>
            <p className="sidebar-section-label mt-3">
              People
            </p>
            <div className="space-y-0.5">
              {people.map((member, i) => {
                const avatarColors = ['#191E2F','#3E4A89','#0d7490','#3E4A89','#b45309','#2A3568','#1d4ed8'];
                const avatarBg = avatarColors[i % avatarColors.length];
                return (
                  <motion.div
                    key={member.id}
                    initial={{ x: -18, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30, delay: i * 0.045 + 0.12 }}
                    whileHover={{ x: 4 }}
                    className="group flex h-9 items-center gap-2 rounded px-1.5 transition-colors duration-100 hover:bg-white/[0.06] cursor-pointer"
                  >
                    <motion.button
                      onClick={() => setActiveChannel(member.id)}
                      whileTap={{ scale: 0.95 }}
                      title={`Chat with ${member.name}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <div
                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                        style={{ background: avatarBg }}
                      >
                        {member.initials}
                        {(() => {
                          const s = member.id === currentMemberId ? settings.status : member.status;
                          return (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${
                                s === 'online' ? 'bg-emerald-400' :
                                s === 'away'   ? 'bg-amber-400'  :
                                s === 'busy'   ? 'bg-red-400'    : 'bg-[#7C859E]'
                              }`}
                              style={{ boxShadow: '0 0 0 2px #292827' }}
                            />
                          );
                        })()}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                        {member.name}
                      </span>
                    </motion.button>

                    <motion.button
                      onClick={() => setProfileMember(member)}
                      whileTap={{ scale: 0.88 }}
                      title={`View ${member.name}'s profile`}
                      className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md group-hover:flex"
                      style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)' }}
                    >
                      <UserCheck size={12} />
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Admin controls */}
          {isAdmin && (
            <div className="mt-6 space-y-2">
              <Link
                href="/admin"
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-[0.10em] transition-all duration-200 hover:brightness-110"
                style={{ background: 'rgba(98,100,167,0.14)', color: '#a5a6f6', border: '1px solid rgba(98,100,167,0.22)' }}
              >
                <ShieldCheck size={14} strokeWidth={2.5} />
                Admin dashboard
              </Link>
              <motion.button
                whileHover={{ borderColor: 'rgba(62,74,137,0.30)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setNewChannelOpen(true)}
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-4 text-sm font-semibold transition-all duration-200"
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.38)', border: '1px dashed rgba(255,255,255,0.15)' }}
              >
                <Plus size={14} />
                New channel
              </motion.button>
            </div>
          )}
        </div>

        {/* ── Footer / User panel ─────────────────────────── */}
        <div className="sidebar-footer">
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: currentUserColor }}>
                {currentUser?.initials ?? 'G'}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${settings.status === 'online' ? 'bg-emerald-400' : settings.status === 'away' ? 'bg-amber-400' : settings.status === 'busy' ? 'bg-red-400' : 'bg-[#7C859E]'}`} style={{ borderColor: '#292827' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight text-white">{currentUser?.name ?? 'Guest'}</p>
              <p className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.42)' }}>{currentUser?.role ?? 'Viewer'}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <motion.button whileTap={{ scale: 0.88 }} title="Activity" onClick={() => setActivityCalendarOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded" style={{ color: 'rgba(255,255,255,0.42)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              ><CalendarDays size={14} /></motion.button>
              <motion.button whileTap={{ scale: 0.88 }} title="Sign out"
                onClick={() => { localStorage.removeItem('edutechex_token'); toast.success('Signed out'); router.push('/sign-up-login-screen'); }}
                className="flex h-7 w-7 items-center justify-center rounded" style={{ color: 'rgba(255,255,255,0.42)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.color = '#f87171'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
              ><LogOut size={14} /></motion.button>
            </div>
          </div>
        </div>
      </aside>

      <main className={`workspace-chat${(pinnedMessageIds[activeChannelId]?.length ?? 0) > 0 ? ' workspace-chat-has-pin' : ''}`}>
        <header className="chat-header">
          {/* Channel name box */}
          <div className="min-w-0 relative">
            <div className="inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 relative overflow-hidden"
              style={{
                background: 'rgba(25,30,47,0.92)',
                border: '1px solid rgba(155,166,211,0.35)',
                boxShadow: '0 0 20px rgba(62,74,137,0.14), 0 2px 12px rgba(0,0,0,0.50)',
              }}
            >
              {/* Gold top shimmer */}
              <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #3E4A89, #9BA6D3, #3E4A89, transparent)' }} />

              {/* Gold hash badge */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-[13px] font-black"
                style={{ background: 'linear-gradient(135deg, #3E4A89, #2A3568)', boxShadow: '0 0 10px rgba(62,74,137,0.45)' }}>
                #
              </span>

              {/* Gold gradient channel name */}
              <span className="truncate text-[22px] font-black leading-tight max-w-[260px]" style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2F8 55%, #C4CAE0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {channel?.id.startsWith('member-') ? channel.name : channel?.name}
              </span>

              {/* Gold bottom shimmer */}
              <span className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(155,166,211,0.35), transparent)' }} />
            </div>

            {channel?.description && (
              <p className="mt-1 truncate text-[13px] font-medium pl-1" style={{ color: '#7C859E' }}>
                {channel.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              title="View channel members"
              onClick={() => setMembersOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold md:flex transition-all hover:scale-105"
              style={{ background: 'rgba(62,74,137,0.10)', color: '#7C859E', border: '1px solid rgba(62,74,137,0.20)' }}
            >
              <Users size={16} />
              {channel?.id.startsWith('member-') ? 2 : activeChannelMembers.length}
            </button>
            <button
              title="Search messages"
              onClick={() => setGlobalSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-105"
              style={{ color: '#7C859E', background: 'rgba(62,74,137,0.08)' }}
            >
              <Search size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMeetMenuOpen((value) => !value)}
                className={`flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-black uppercase text-white shadow-sm transition-all hover:scale-105 ${
                  meetingButtonState.link ? '' : 'bg-[#7C859E] cursor-default'
                }`}
                style={meetingButtonState.link ? {
                  background: 'linear-gradient(135deg, #3E4A89, #2A3568)',
                  boxShadow: '0 0 14px rgba(62,74,137,0.35)',
                } : undefined}
              >
                <Video size={16} />
                {meetingButtonState.label}
                <ChevronDown size={14} />
              </button>
              {meetMenuOpen && (
                <div className="absolute right-0 top-11 z-[300] w-56 rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-2 shadow-xl">
                  <p className="px-3 py-2 text-xs font-bold text-[#7C859E]">
                    {meetingButtonState.message}
                  </p>
                  <button
                    onClick={() => {
                      setMeetMenuOpen(false);
                      if (meetingButtonState.link) {
                        window.open(meetingButtonState.link, '_blank');
                      } else {
                        toast.info(meetingButtonState.message);
                      }
                    }}
                    disabled={!meetingButtonState.link}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Video size={16} className="text-[#C4CAE0]" />
                    Join meet
                  </button>
                </div>
              )}
            </div>


            <div className="relative">
              <button
                title="More channel actions"
                onClick={() => setMoreOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)]"
              >
                <MoreHorizontal size={20} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-11 z-[300] w-56 rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-2 shadow-xl">
                  <button
                    onClick={() => { setMoreOpen(false); setMembersOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Users size={15} /> View members
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setGlobalSearchOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Search size={15} /> Search messages
                  </button>

                  <button
                    onClick={() => { setMoreOpen(false); setWikiOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <BookOpen size={15} /> Knowledge base
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setKanbanOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Layout size={15} /> Task board
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setBookmarksPanelOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Bookmark size={15} /> Saved messages
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setMoreOpen(false); setAnalyticsOpen(true); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                    >
                      <BarChart2 size={15} /> Analytics
                    </button>
                  )}
                  <button
                    onClick={() => { setMoreOpen(false); setFigmaOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Layers size={15} /> Figma viewer
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setCalendarOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <CalendarDays size={15} /> Team calendar
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setIntegrationsOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Zap size={15} /> Integrations
                  </button>

                </div>
              )}
            </div>
          </div>
        </header>
        {/* Pinned messages strip — click to jump to pinned message */}
        {channel && (pinnedMessageIds[activeChannelId]?.length ?? 0) > 0 && (() => {
          const pinIds = pinnedMessageIds[activeChannelId] ?? [];
          const idx = pinScrollIdx % pinIds.length;
          const targetId = pinIds[pinIds.length - 1 - idx];
          const targetMsg = channelMessages.find(m => m.id === targetId);
          return (
            <button
              type="button"
              onClick={() => {
                document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setPinScrollIdx(s => s + 1);
              }}
              className="flex w-full items-center gap-3 border-y border-amber-200 bg-amber-50/80 px-5 py-3 text-left shadow-sm transition-colors hover:bg-amber-100/80"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-white shadow-sm">
                <Pin size={13} strokeWidth={2.5} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  {pinIds.length > 1 ? `Pinned  ${idx + 1} of ${pinIds.length}` : 'Pinned message'}
                </span>
                {targetMsg && (
                  <span className="min-w-0 truncate text-xs font-semibold text-amber-900/75">
                    <span className="text-amber-700 font-black">{targetMsg.sender}:&nbsp;</span>
                    {targetMsg.text.replace(/\n/g, ' ').slice(0, 80)}
                  </span>
                )}
              </span>
              <ChevronDown size={14} className="shrink-0 text-amber-500 -rotate-90" />
            </button>
          );
        })()}

        <section className="chat-scroll">
          <div className="mt-auto w-full">
          <div className="date-divider my-4 px-3">
            <span />
            <strong>{firstMessageDate}</strong>
            <span />
          </div>

          <div className="pb-6 px-3">
            {visibleMessages.map((message, index) => {
              const prev = visibleMessages[index - 1];
              const next = visibleMessages[index + 1];
              const isOwn = message.sender === currentUser?.name;
              const gap5m = (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime() > 5 * 60 * 1000;
              const isFirst = !prev || prev.sender !== message.sender || gap5m(prev.timestamp, message.timestamp);
              const isLast = !next || next.sender !== message.sender || gap5m(message.timestamp, next.timestamp);
              const scheduledMeet = parseScheduledMeet(message.text);
              const isPinned = (pinnedMessageIds[activeChannelId] ?? []).includes(message.id);
              const isBookmarked = bookmarkedMessageIds.includes(message.id);

              return (
                <div key={message.id} id={`msg-${message.id}`} className={`flex items-end gap-2 ${isFirst ? (settings.compactChat ? 'mt-2' : 'mt-4') : 'mt-0.5'} ${isOwn ? 'flex-row-reverse' : ''}`}>

                  {/* Avatar — receiver only, first in group */}
                  {!isOwn && (
                    <div className="shrink-0">
                      {isFirst ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm" style={{ backgroundColor: message.color }}>
                          {message.initials}
                        </div>
                      ) : <div className="h-8 w-8" />}
                    </div>
                  )}

                  {/* Bubble column */}
                  <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>

                    {/* Sender name — receiver, first in group only */}
                    {isFirst && !isOwn && (
                      <span className="mb-0.5 ml-1 text-xs font-bold" style={{ color: message.color }}>
                        {message.sender}
                      </span>
                    )}

                    {/* Main bubble */}
                    {!message.poll && (
                      <div className={`relative group/bubble rounded-2xl px-3.5 py-2.5 shadow-sm
                        ${isOwn
                          ? `bg-[#1E2538] text-white border border-[rgba(62,74,137,0.15)] ${isLast ? 'bubble-own rounded-br-sm' : ''}`
                          : `bg-white border border-[rgba(62,74,137,0.08)] text-[#1E2636] ${isLast ? 'bubble-other rounded-bl-sm' : ''}`
                        }
                        ${isPinned ? 'ring-2 ring-amber-400' : ''}
                      `}>

                        {/* Content */}
                        {scheduledMeet ? (
                          /* ── Meeting Scheduled Card ─────────────────── */
                          <div
                            className="w-[288px] overflow-hidden rounded-2xl"
                            style={{
                              boxShadow: '0 8px 32px rgba(25,30,47,0.18), 0 2px 8px rgba(25,30,47,0.10)',
                              border: '1px solid rgba(155,166,211,0.22)',
                            }}
                          >
                            {/* ── Top accent line ── */}
                            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #3E4A89, #9BA6D3, #3E4A89, transparent)' }} />

                            {/* ── Dark header ── */}
                            <div
                              className="relative px-4 pt-4 pb-4 overflow-hidden"
                              style={{ background: 'linear-gradient(135deg, #191E2F 0%, #1E2538 60%, #252D4A 100%)' }}
                            >
                              {/* bg glow */}
                              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 80% at 85% 30%, rgba(62,74,137,0.28), transparent 70%)' }} />

                              <div className="relative flex items-start gap-3">
                                {/* Icon */}
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 mt-0.5"
                                  style={{ background: 'linear-gradient(135deg, #3E4A89, #2A3568)', boxShadow: '0 4px 14px rgba(62,74,137,0.50)' }}
                                >
                                  <Video size={17} className="text-white" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  {/* Status pill */}
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span
                                      className="inline-block w-1.5 h-1.5 rounded-full"
                                      style={{ background: '#34D399', boxShadow: '0 0 6px rgba(52,211,153,0.70)', animation: 'badge-pulse 2.5s ease-in-out infinite' }}
                                    />
                                    <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: 'rgba(155,166,211,0.80)' }}>
                                      Meeting Scheduled
                                    </span>
                                  </div>
                                  {/* Title */}
                                  <h3 className="text-[15px] font-black text-white leading-snug truncate">
                                    {scheduledMeet.title}
                                  </h3>
                                </div>
                              </div>
                            </div>

                            {/* ── Light body ── */}
                            <div className="px-4 pt-3 pb-2" style={{ background: '#FAF8F5' }}>
                              <div className="space-y-2">
                                {scheduledMeet.time && (
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                                      style={{ background: 'rgba(62,74,137,0.08)', border: '1px solid rgba(62,74,137,0.14)' }}
                                    >
                                      <CalendarDays size={13} style={{ color: '#3E4A89' }} />
                                    </div>
                                    <span className="text-[13px] font-bold" style={{ color: '#1E2636' }}>
                                      {scheduledMeet.time}
                                    </span>
                                  </div>
                                )}
                                {scheduledMeet.people && scheduledMeet.people !== 'No mentions' && (
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                                      style={{ background: 'rgba(62,74,137,0.08)', border: '1px solid rgba(62,74,137,0.14)' }}
                                    >
                                      <Users size={13} style={{ color: '#3E4A89' }} />
                                    </div>
                                    <span className="text-[13px] font-medium truncate" style={{ color: '#4A5578' }}>
                                      {scheduledMeet.people}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── Divider ── */}
                            <div style={{ height: '1px', margin: '0 16px', background: 'linear-gradient(90deg, transparent, rgba(62,74,137,0.18), transparent)' }} />

                            {/* ── Join button ── */}
                            <div className="px-4 pt-3 pb-4" style={{ background: '#FAF8F5' }}>
                              <a
                                href={scheduledMeet.link}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-black text-white transition-all duration-200 hover:scale-[1.02] active:scale-95"
                                style={{
                                  background: 'linear-gradient(135deg, #3E4A89 0%, #2A3568 100%)',
                                  boxShadow: '0 4px 14px rgba(62,74,137,0.38), inset 0 1px 0 rgba(255,255,255,0.12)',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(62,74,137,0.55), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 14px rgba(62,74,137,0.38), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                              >
                                <Video size={14} />
                                Join Meeting
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className={`leading-relaxed ${settings.fontSize === 'large' ? 'text-xl' : 'text-[16px]'} ${isOwn ? 'text-white' : 'text-[#1E2636]'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-1 last:mb-0">
                                    {React.Children.map(children, (child) =>
                                      typeof child === 'string' ? renderWithMentions(child, isOwn, members.map((m) => m.name)) : child
                                    )}
                                  </p>
                                ),
                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children, className }) => {
                                  const isBlock = String(className ?? '').includes('language-');
                                  return isBlock
                                    ? <pre className="my-1 overflow-x-auto rounded-lg bg-black/20 p-2 text-xs text-green-300"><code>{children}</code></pre>
                                    : <code className={`rounded px-1 py-0.5 font-mono text-xs ${isOwn ? 'bg-white/20 text-white' : 'bg-[rgba(62,74,137,0.08)] text-[#3E4A89]'}`}>{children}</code>;
                                },
                                blockquote: ({ children }) => <blockquote className={`border-l-4 pl-3 italic text-xs ${isOwn ? 'border-white/40 text-white/80' : 'border-[rgba(62,74,137,0.25)] text-[#7C859E]'}`}>{children}</blockquote>,
                                a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className={`underline ${isOwn ? 'text-white/90' : 'text-green-700'}`}>{children}</a>,
                              }}>
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Audio */}
                        {message.audioUrl && (
                          <div className={`mt-2 rounded-xl p-2 ${isOwn ? 'bg-white/10' : 'bg-[#FAF8F5]'}`}>
                            <audio className="w-48 h-8" controls src={message.audioUrl}><track kind="captions" /></audio>
                            <p className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}>Voice note</p>
                          </div>
                        )}

                        {/* Video */}
                        {message.videoUrl && (
                          <div className="mt-2 w-56">
                            <video className="w-full rounded-xl bg-black" controls src={message.videoUrl}><track kind="captions" /></video>
                            <p className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}>Screen recording</p>
                          </div>
                        )}

                        {/* Files */}
                        {message.files && message.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {message.files.map((file, fi) => (
                              <a key={fi} href={file.url} target="_blank" rel="noreferrer"
                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold transition-colors
                                  ${isOwn ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-[rgba(62,74,137,0.12)] bg-white text-[#4A5578] hover:border-[rgba(62,74,137,0.15)]'}`}>
                                📎 {file.name}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Timestamp + double-tick */}
                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}>
                          <span>{formatTime(message.timestamp)}</span>
                          {isOwn && (
                            <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" className="opacity-80">
                              <path d="M11.071.653a.75.75 0 0 1 .001 1.06l-5.78 5.79a.75.75 0 0 1-1.063 0L1.928 5.2a.75.75 0 1 1 1.062-1.059l1.769 1.77L10.01.653a.75.75 0 0 1 1.061 0z"/>
                              <path d="M15.071.653a.75.75 0 0 1 .001 1.06l-5.78 5.79a.75.75 0 0 1-.532.22.75.75 0 0 1-.532-1.28L13.01.653a.75.75 0 0 1 1.061 0z" opacity="0.6"/>
                            </svg>
                          )}
                        </div>

                        {/* Hover action bar — floats beside the bubble */}
                        <div className={`absolute ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} top-0 hidden group-hover/bubble:flex items-center`}>
                          <div className="flex items-center gap-0.5 rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-1 shadow-lg">
                            <div className="relative">
                              <button
                                onClick={() => setHoverEmojiMsgId(hoverEmojiMsgId === message.id ? null : message.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm hover:bg-[rgba(62,74,137,0.08)]"
                                title="React">😊</button>
                              {hoverEmojiMsgId === message.id && (
                                <div className={`absolute top-full mt-1 z-30 flex gap-1 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white p-1.5 shadow-xl ${isOwn ? 'right-0' : 'left-0'}`}>
                                  {['👍','❤️','😂','🔥','👀','✅','🎉','💯'].map((em) => (
                                    <button key={em}
                                      onClick={() => { toggleReaction(activeChannelId, message.id, em, currentUser?.email ?? ''); setHoverEmojiMsgId(null); }}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-lg hover:scale-110 hover:bg-[rgba(62,74,137,0.08)] transition-all">
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => toggleBookmark(message.id, { channelId: activeChannelId, text: message.text, sender: message.sender, timestamp: message.timestamp })}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(62,74,137,0.08)] ${isBookmarked ? 'text-amber-500' : 'text-[#7C859E] hover:text-amber-500'}`}
                              title={isBookmarked ? 'Remove bookmark' : 'Save'}>
                              <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => { isPinned ? unpinMessage(activeChannelId, message.id) : pinMessage(activeChannelId, message.id); }}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(62,74,137,0.08)] ${isPinned ? 'text-amber-500' : 'text-[#7C859E] hover:text-amber-500'}`}
                              title={isPinned ? 'Unpin' : 'Pin'}>
                              <Pin size={13} />
                            </button>
                            {(isOwn || isAdmin) && (
                              <button
                                onClick={() => deleteMessage(activeChannelId, message.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-red-50 hover:text-red-600"
                                title="Delete">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Poll */}
                    {message.poll && (
                      <div className="mt-1 w-64 rounded-2xl border border-[rgba(62,74,137,0.10)] bg-white p-4 shadow-sm">
                        <p className="mb-3 text-sm font-bold text-[#1E2636]">📊 {message.poll.question}</p>
                        <div className="space-y-2">
                          {message.poll.options.map((opt, i) => {
                            const total = message.poll!.options.reduce((s, o) => s + o.votes.length, 0);
                            const pct = total ? Math.round((opt.votes.length / total) * 100) : 0;
                            return (
                              <div key={i} className="relative overflow-hidden rounded-xl border border-[rgba(62,74,137,0.15)] bg-white">
                                <div className="absolute inset-y-0 left-0 rounded-l-xl bg-indigo-100" style={{ width: `${pct}%` }} />
                                <div className="relative flex items-center justify-between px-3 py-2">
                                  <span className="text-sm font-semibold text-[#4A5578]">{opt.text}</span>
                                  <span className="text-xs font-bold text-green-700">{pct}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-[#7C859E]">{message.poll.options.reduce((s, o) => s + o.votes.length, 0)} votes</p>
                      </div>
                    )}

                    {/* Reactions */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(message.reactions).map(([emoji, users]: [string, any]) =>
                          users.length > 0 ? (
                            <button key={emoji}
                              onClick={() => toggleReaction(activeChannelId, message.id, emoji, currentUser?.email ?? '')}
                              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all
                                ${users.includes(currentUser?.email ?? '')
                                  ? 'border-[rgba(62,74,137,0.15)] bg-indigo-100 font-bold text-[#3E4A89]'
                                  : 'border-[rgba(62,74,137,0.12)] bg-white text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]'}`}>
                              <span>{emoji}</span><span>{users.length}</span>
                            </button>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} className="h-2" />
          </div>
          </div>
        </section>

        {/* Typing indicators */}
        {channel && (() => {
          const typers = (typingUsers[activeChannelId] ?? []).filter(
            name => name !== currentUser?.name
          );
          if (!typers.length) return null;
          const label = typers.length === 1
            ? `${typers[0]} is typing�¦`
            : typers.length === 2
            ? `${typers[0]} and ${typers[1]} are typing�¦`
            : 'Several people are typing�¦';
          return (
            <div className="flex items-center gap-2 px-5 py-1.5 text-[13px] text-[#616161]">
              <span className="flex gap-[3px] items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
              {label}
            </div>
          );
        })()}

        <footer className="shrink-0 border-t border-[rgba(62,74,137,0.08)] bg-[#FAF8F5]/95 backdrop-blur-md px-4 py-3">
          {/* Mention dropdown */}
          {mentionMenuOpen && mentionSuggestions.length > 0 && (
            <div className="mb-2 overflow-hidden rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-xl">
              {mentionSuggestions.map((member) => (
                <button key={member.id} onClick={() => insertMention(member.name)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[rgba(62,74,137,0.08)] transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: member.color }}>{member.initials}</div>
                  <div><p className="text-sm font-bold text-[#1E2636]">{member.name}</p><p className="text-xs text-[#7C859E]">{member.role}</p></div>
                </button>
              ))}
            </div>
          )}

          {/* Emoji picker */}
          {emojiMenuOpen && (
            <div ref={emojiPanelRef} className="mb-2 rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-3 shadow-xl">
              <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji, idx) => (
                  <button key={idx} type="button"
                    onClick={() => { insertComposerText(emoji); setEmojiMenuOpen(false); }}
                    className="flex h-8 items-center justify-center rounded-lg text-lg hover:scale-110 hover:bg-[rgba(62,74,137,0.08)] transition-all">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input ref={fileInputRef} onChange={handleFileUpload} type="file" className="hidden" />

          <div className="flex items-end gap-2">
            {/* Toolbar icons */}
            <div className="flex items-center gap-0.5 shrink-0 mb-0.5">
              <button ref={emojiBtnRef} onClick={() => { setEmojiMenuOpen((v) => !v); setMentionMenuOpen(false); }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${emojiMenuOpen ? 'bg-[rgba(62,74,137,0.08)] text-green-700' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]'}`} title="Emoji">
                <Smile size={18} />
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] transition-colors" title="Attach file">
                <Paperclip size={18} />
              </button>
              <button onClick={() => startRecording('audio')} disabled={recordingBusy || !!recordingType}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${recordingType === 'audio' ? 'animate-pulse bg-red-100 text-red-600' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]'}`} title="Voice note">
                <Mic size={18} />
              </button>
              <button onClick={() => startRecording('video')} disabled={recordingBusy || !!recordingType}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${recordingType === 'video' ? 'animate-pulse bg-red-100 text-red-600' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]'}`} title="Screen record">
                <Video size={18} />
              </button>
              {/* Meet dropdown */}
              <div className="relative" ref={meetInputMenuRef}>
                <button
                  onClick={() => setMeetInputMenuOpen((v) => !v)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${meetInputMenuOpen ? 'bg-[rgba(62,74,137,0.08)] text-green-700' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-green-700'}`}
                  title="Meet options"
                >
                  <PhoneCall size={17} />
                </button>
                {meetInputMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 w-52 overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl">
                    <div className="px-3 py-2 bg-[#FAF8F5] border-b border-[rgba(62,74,137,0.08)]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7C859E]">Meeting</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => { setMeetInputMenuOpen(false); startNewMeeting(); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[rgba(62,74,137,0.08)] transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-green-700 group-hover:bg-[rgba(62,74,137,0.12)] transition-colors">
                          <Video size={15} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#1E2636]">Start Meet</p>
                          <p className="text-[11px] text-[#7C859E]">Instant Jitsi room</p>
                        </div>
                      </button>
                      <button
                        onClick={() => { setMeetInputMenuOpen(false); openScheduleMeet(); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                          <CalendarPlus size={15} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#1E2636]">Schedule Meet</p>
                          <p className="text-[11px] text-[#7C859E]">
                            {composerMessage.includes('@') ? 'Uses your @mentions' : 'Pick who to invite'}
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recording badge */}
            {recordingType && (
              <div className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 mb-0.5"
                style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)' }}>
                {recordingType === 'audio' ? (
                  /* Voice → animated waveform */
                  <div className="flex items-center gap-[2.5px]" style={{ height: 28 }}>
                    {[0.4,0.7,1,0.6,0.9,0.5,1,0.75,0.55,0.85,0.45,0.95,0.65,0.8,0.5,0.7,0.4,0.9,0.6,1,0.5,0.75,0.85,0.45,0.65].map((h, i) => (
                      <span key={i} style={{
                        display: 'inline-block', width: 3, borderRadius: 9999,
                        background: 'linear-gradient(to top, #7C859E, #C4CAE0)',
                        animationName: 'waveBar',
                        animationDuration: `${0.6 + (i % 5) * 0.12}s`,
                        animationDelay: `${(i * 0.04) % 0.5}s`,
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        animationDirection: 'alternate',
                        minHeight: 4, maxHeight: 24,
                        height: `${h * 24}px`,
                      }} />
                    ))}
                  </div>
                ) : (
                  /* Screen → pulsing REC dot + monitor icon + label */
                  <div className="flex items-center gap-2" style={{ height: 28 }}>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: '#ef4444' }} />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} />
                    </span>
                    <Monitor size={17} style={{ color: '#C4CAE0' }} strokeWidth={2.2} />
                    <span className="text-xs font-bold" style={{ color: '#C4CAE0' }}>Recording screen</span>
                  </div>
                )}
                {/* Timer */}
                <span className="text-xs font-bold tabular-nums mx-1" style={{ color: '#C4CAE0' }}>
                  {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
                </span>
                {/* Divider */}
                <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(139,92,246,0.25)' }} />
                {/* Stop button */}
                <button
                  onClick={() => stopRecording(false)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all hover:scale-105"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }}
                  title="Stop recording"
                >
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#ef4444' }} />
                  Stop
                </button>
                {/* Preview button */}
                <button
                  onClick={() => stopRecording(true)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all hover:scale-105"
                  style={{ background: 'rgba(139,92,246,0.14)', color: '#C4CAE0', border: '1px solid rgba(139,92,246,0.25)' }}
                  title="Stop and preview"
                >
                  Preview
                </button>
                {/* Send button */}
                <button
                  onClick={async () => {
                    discardRecordingRef.current = false;
                    stopRecording(true);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', border: 'none' }}
                  title="Stop and send"
                >
                  Send
                </button>
              </div>
            )}

            {/* Pill textarea */}
            <textarea
              ref={composerRef}
              value={composerMessage}
              onChange={(event) => {
                const next = event.target.value;
                setComposerMessage(next);
                setMentionMenuOpen(/@[\w\s.-]*$/.test(next));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
                if (event.key === 'Escape') { setEmojiMenuOpen(false); setMentionMenuOpen(false); }
              }}
              placeholder={`Message #${channel?.name ?? ''}�¦ (Enter to send · Shift+Enter for new line)`}
              className="flex-1 resize-none border-0 bg-transparent px-3 py-2 text-[13.5px] text-[#1E2636] placeholder-[#8a8886] focus:outline-none"
              rows={1}
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />

            {/* Round indigo send button */}
            <button
              onClick={sendMessage}
              disabled={!composerMessage.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition-all" style={{ background: 'linear-gradient(135deg, #C4CAE0, #7C859E)', color: '#191E2F' }}
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </main>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• RIGHT ICON RAIL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <nav className="workspace-right-rail">
        {/* Top: Pinned + Bookmarked */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setRightSidePanel(rightSidePanel === 'pinned' ? null : 'pinned')}
          className={`rail-btn${rightSidePanel === 'pinned' ? ' active' : ''}`}
          style={rightSidePanel === 'pinned' ? { background: 'rgba(245,158,11,0.15)', color: '#b45309' } : {}}
        >
          <Pin size={18} strokeWidth={2} />
          <span className="rail-label">Pinned</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setRightSidePanel(rightSidePanel === 'bookmarked' ? null : 'bookmarked')}
          className={`rail-btn${rightSidePanel === 'bookmarked' ? ' active' : ''}`}
          style={rightSidePanel === 'bookmarked' ? { background: 'rgba(245,158,11,0.15)', color: '#b45309' } : {}}
        >
          <Bookmark size={18} strokeWidth={2} />
          <span className="rail-label">Saved</span>
        </motion.button>

        {/* Bottom: Copilot circle button */}
        <div style={{ marginTop: 'auto', paddingBottom: '10px' }}>
          <motion.button
            whileHover={{ scale: 1.10 }}
            whileTap={{ scale: 0.90 }}
            onClick={() => setRightPanel(rightPanel === 'ai' ? 'closed' : 'ai')}
            className="relative flex items-center justify-center"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: rightPanel === 'ai'
                ? 'linear-gradient(135deg,#3E4A89,#7c3aed)'
                : 'linear-gradient(135deg,#3E4A89,#9BA6D3)',
              boxShadow: rightPanel === 'ai'
                ? '0 0 0 3px rgba(62,74,137,0.35), 0 6px 20px rgba(62,74,137,0.5)'
                : '0 4px 14px rgba(62,74,137,0.40)',
              color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Bot size={18} strokeWidth={2} />
          </motion.button>
        </div>
      </nav>

      {/* ── AI Copilot popup (anchored to right rail) ─────────────── */}
      <AnimatePresence>
        {rightPanel === 'ai' && (
          <motion.div
            key="ai-popup"
            initial={{ opacity: 0, x: 16, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360, mass: 0.8 }}
            className="fixed bottom-4 right-16 z-[199] w-[360px] overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl"
            style={{ maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.20), 0 4px 16px rgba(62,74,137,0.14)' }}
          >
            <AIPanel
              activeChannel={activeChannelId}
              onClose={() => setRightPanel('closed')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pinned messages slide-in panel ────────────────────────── */}
      <AnimatePresence>
        {rightSidePanel === 'pinned' && (() => {
          const pinIds = pinnedMessageIds[activeChannelId] ?? [];
          const pinnedMsgs = pinIds.map(id => channelMessages.find(m => m.id === id)).filter(Boolean);
          return (
            <motion.div
              key="pinned-panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="fixed top-0 right-14 z-[150] h-full w-72 border-l border-[rgba(62,74,137,0.08)] bg-[#FAF8F5]/95 backdrop-blur-md shadow-2xl flex flex-col"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.12)] px-4">
                <div className="flex items-center gap-2">
                  <Pin size={15} className="text-amber-500" />
                  <span className="text-sm font-bold text-[#1E2636]">Pinned Messages</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-600">{pinIds.length}</span>
                </div>
                <button onClick={() => setRightSidePanel(null)} className="rounded-lg p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {pinnedMsgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Pin size={32} className="mb-3 text-slate-200" />
                    <p className="text-sm font-semibold text-[#7C859E]">No pinned messages</p>
                    <p className="text-xs text-[#9BA6D3] mt-1">Pin a message to see it here</p>
                  </div>
                ) : pinnedMsgs.map((msg) => msg && (
                  <div key={msg.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: msg.color }}>{msg.initials}</div>
                      <span className="text-xs font-bold text-[#4A5578]">{msg.sender}</span>
                      <span className="text-[10px] text-[#7C859E] ml-auto">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-xs text-[#4A5578] leading-relaxed line-clamp-3">{msg.text}</p>
                    <button
                      onClick={() => { unpinMessage(activeChannelId, msg.id); document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                      className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-700"
                    >Unpin · Jump to message</button>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Bookmarked messages slide-in panel ────────────────────── */}
      <AnimatePresence>
        {rightSidePanel === 'bookmarked' && (
          <motion.div
            key="bookmarked-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="fixed top-0 right-14 z-[150] h-full w-72 border-l border-[rgba(62,74,137,0.08)] bg-[#FAF8F5]/95 backdrop-blur-md shadow-2xl flex flex-col"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.12)] px-4">
              <div className="flex items-center gap-2">
                <Bookmark size={15} className="text-amber-500" />
                <span className="text-sm font-bold text-[#1E2636]">Saved Messages</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-600">{bookmarkedMessageIds.length}</span>
              </div>
              <button onClick={() => setRightSidePanel(null)} className="rounded-lg p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {bookmarkedMessageIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Bookmark size={32} className="mb-3 text-slate-200" />
                  <p className="text-sm font-semibold text-[#7C859E]">No saved messages</p>
                  <p className="text-xs text-[#9BA6D3] mt-1">Bookmark a message to see it here</p>
                </div>
              ) : (() => {
                const saved = bookmarkedMessageIds.map(id => {
                  const found = Object.values(messages).flatMap(arr => arr).find(m => m.id === id);
                  return found;
                }).filter(Boolean);
                return saved.map((msg) => msg && (
                  <div key={msg.id} className="rounded-xl border border-[rgba(62,74,137,0.08)] bg-[#FAF8F5] p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: msg.color }}>{msg.initials}</div>
                      <span className="text-xs font-bold text-[#4A5578]">{msg.sender}</span>
                      <span className="text-[10px] text-[#7C859E] ml-auto">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-xs text-[#4A5578] leading-relaxed line-clamp-3">{msg.text}</p>
                    <button
                      onClick={() => toggleBookmark(msg.id)}
                      className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-700"
                    >Remove bookmark</button>
                  </div>
                ));
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <MyActivityCalendar
        open={activityCalendarOpen}
        onClose={() => setActivityCalendarOpen(false)}
      />

      {/* ── Feature panels (AnimatePresence enables exit animations) ── */}
      <AnimatePresence>
        {figmaOpen    && <FigmaPanel    key="figma"    onClose={() => setFigmaOpen(false)} />}
        {integrationsOpen && (
          <IntegrationsPanel
            key="integrations"
            onClose={() => setIntegrationsOpen(false)}
            channels={channels}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {calendarOpen && <CalendarPanel key="calendar" onClose={() => setCalendarOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
      {settingsOpen && (
        <motion.div
          key="settings"
          {...BACKDROP}
          className="fixed inset-0 z-[115] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm dark:bg-black/70"
          onClick={() => setSettingsOpen(false)}
        >
          <motion.div
            {...CARD}
            className="flex w-full max-w-2xl overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl  dark:bg-[#191E2F]"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Left nav ──────────────────────────────────────── */}
            <div className="flex w-44 shrink-0 flex-col border-r border-[rgba(62,74,137,0.12)] bg-[#FAF8F5]  dark:bg-slate-800/60">
              <div className="flex h-14 items-center gap-2.5 border-b border-[rgba(62,74,137,0.12)] px-4 ">
                <Settings size={16} className="shrink-0 text-green-700" />
                <span className="text-sm font-black text-[#1E2636]">Settings</span>
              </div>
              <nav className="flex-1 space-y-0.5 p-2">
                {([
                  { id: 'profile',       icon: UserCheck,  label: 'Profile'       },
                  { id: 'appearance',    icon: Palette,    label: 'Appearance'    },
                  { id: 'notifications', icon: Bell,       label: 'Notifications' },
                  { id: 'meeting',       icon: Video,      label: 'Meeting'       },
                  { id: 'security',      icon: ShieldCheck, label: 'Security'     },
                ] as const).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSettingsTab(id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all ${
                      settingsTab === id
                        ? 'bg-[#1E2538] text-white border border-[rgba(62,74,137,0.15)] shadow-sm'
                        : 'text-[#4A5578] hover:bg-[rgba(62,74,137,0.08)] dark:text-[#9BA6D3]/60'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </nav>
              {/* Sign out shortcut */}
              <div className="border-t border-[rgba(62,74,137,0.12)] p-2 ">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('edutechex_token');
                    toast.success('Signed out');
                    router.push('/sign-up-login-screen');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>

            {/* ── Right content ──────────────────────────────────── */}
            <form onSubmit={saveSettings} className="flex min-h-0 flex-1 flex-col">
              {/* Tab header */}
              <div className="flex h-14 items-center justify-between border-b border-[rgba(62,74,137,0.12)] px-5 ">
                <h2 className="text-base font-black text-[#1E2636]">
                  {settingsTab === 'profile'       && 'Profile'}
                  {settingsTab === 'appearance'    && 'Appearance'}
                  {settingsTab === 'notifications' && 'Notifications'}
                  {settingsTab === 'meeting'       && 'Meeting'}
                  {settingsTab === 'security'      && 'Security'}
                </h2>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800"
                  title="Close settings"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5">

                {/* ── PROFILE ─────────────────────────────────────── */}
                {settingsTab === 'profile' && (
                  <>
                    {/* Avatar card */}
                    <div className="flex items-center gap-4 rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-indigo-200 text-3xl"
                        style={settings.avatarEmoji ? { background: 'rgba(62,74,137,0.06)', border: '2px solid rgba(62,74,137,0.15)' } : { background: '#3E4A89' }}
                      >
                        {settings.avatarEmoji
                          ? settings.avatarEmoji
                          : <span className="text-lg font-black text-white">{currentUser?.initials ?? 'G'}</span>
                        }
                      </div>
                      <div>
                        <p className="font-black text-[#1E2636]">{settings.displayName || currentUser?.name}</p>
                        <p className="text-sm text-[#7C859E] dark:text-[#7C859E]">{currentUser?.email}</p>
                        <span className="mt-1 inline-flex rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#3E4A89] dark:bg-indigo-900/40 dark:text-indigo-300">
                          {currentUser?.role}
                        </span>
                      </div>
                    </div>

                    {/* Avatar picker */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-[#7C859E]">
                        Choose avatar
                      </label>
                      <p className="mt-0.5 text-[11px] text-[#7C859E]">Pick a character � shows in your profile and sidebar.</p>
                      <div className="mt-2 grid grid-cols-6 gap-2">
                        {/* "None" option � reverts to initials */}
                        <button
                          type="button"
                          onClick={() => setSettings((v) => ({ ...v, avatarEmoji: '' }))}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-[10px] font-black transition-all ${
                            !settings.avatarEmoji
                              ? 'border-[#3E4A89] bg-[#3E4A89] text-white shadow-md'
                              : 'border-[rgba(62,74,137,0.15)] bg-white text-[#4A5578] hover:border-[rgba(62,74,137,0.35)]'
                          }`}
                          title="Use initials"
                        >
                          {currentUser?.initials ?? 'G'}
                        </button>
                        {AVATAR_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setSettings((v) => ({ ...v, avatarEmoji: emoji }))}
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-xl transition-all hover:scale-110 ${
                              settings.avatarEmoji === emoji
                                ? 'border-[#3E4A89] bg-indigo-50 shadow-md shadow-indigo-100 scale-110'
                                : 'border-[rgba(62,74,137,0.12)] bg-white hover:border-[rgba(62,74,137,0.30)]'
                            }`}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Display name */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-[#7C859E] dark:text-[#7C859E]">
                        Display name
                      </label>
                      <input
                        value={settings.displayName}
                        onChange={(e) => setSettings((v) => ({ ...v, displayName: e.target.value }))}
                        placeholder={currentUser?.name ?? 'Your name'}
                        className="mt-2 h-11 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-bold outline-none focus:border-[#3E4A89] focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:placeholder-slate-500"
                      />
                      <p className="mt-1.5 text-xs text-[#7C859E]">This name appears in chat messages and the team list.</p>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-[#7C859E] dark:text-[#7C859E]">
                        Status
                      </label>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {([
                          { id: 'online',  label: 'Online',  dot: 'bg-emerald-500' },
                          { id: 'away',    label: 'Away',    dot: 'bg-amber-400'  },
                          { id: 'busy',    label: 'Busy',    dot: 'bg-red-500'    },
                          { id: 'offline', label: 'Offline', dot: 'bg-slate-300'  },
                        ] as const).map(({ id, label, dot }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSettings((v) => ({ ...v, status: id }))}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-bold transition-all ${
                              settings.status === id
                                ? 'border-[rgba(62,74,137,0.25)] bg-[rgba(62,74,137,0.08)] text-[#3E4A89] shadow-sm dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'border-[rgba(62,74,137,0.12)] bg-white text-[#7C859E] hover:border-slate-300 hover:bg-[rgba(62,74,137,0.06)]  dark:bg-slate-800 dark:text-[#7C859E]'
                            }`}
                          >
                            <span className={`h-3 w-3 rounded-full ${dot}`} />
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-[#7C859E]">Your status dot is visible to everyone in the People list.</p>
                    </div>
                  </>
                )}

                {/* ── APPEARANCE ──────────────────────────────────── */}
                {settingsTab === 'appearance' && (
                  <>
                    {/* Dark mode */}
                    <div className="flex items-center justify-between rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-[#4A5578] dark:bg-slate-700 dark:text-[#9BA6D3]">
                          {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1E2636]">Dark mode</p>
                          <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">Currently {darkMode ? 'on' : 'off'} — affects the whole app</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { toggleTheme(); storeDarkModeToggle(); }}
                        className={`relative h-6 w-11 rounded-full transition-colors ${darkMode ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Compact chat */}
                    <div className="flex items-center justify-between rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-[#4A5578] dark:bg-slate-700 dark:text-[#9BA6D3]">
                          <Layout size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1E2636]">Compact chat</p>
                          <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">Reduce spacing between messages</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings((v) => ({ ...v, compactChat: !v.compactChat }))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${settings.compactChat ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.compactChat ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Font size */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-[#4A5578] dark:bg-slate-700 dark:text-[#9BA6D3]">
                          <Type size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1E2636]">Message font size</p>
                          <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">Controls the size of text in chat bubbles</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pl-12">
                        {([
                          { id: 'normal', label: 'Normal (14px)' },
                          { id: 'large',  label: 'Large (16px)'  },
                        ] as const).map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSettings((v) => ({ ...v, fontSize: id }))}
                            className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                              settings.fontSize === id
                                ? 'border-[rgba(62,74,137,0.25)] bg-[rgba(62,74,137,0.08)] text-[#3E4A89] dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'border-[rgba(62,74,137,0.12)] bg-white text-[#7C859E] hover:bg-[rgba(62,74,137,0.06)]  dark:bg-slate-800 dark:text-[#7C859E]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Enter to send */}
                    <div className="flex items-center justify-between rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-[#4A5578] dark:bg-slate-700 dark:text-[#9BA6D3]">
                          <Send size={15} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1E2636]">Enter to send</p>
                          <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">
                            {settings.enterToSend
                              ? 'Enter sends · Shift+Enter for new line'
                              : 'Click the send button to post'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings((v) => ({ ...v, enterToSend: !v.enterToSend }))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${settings.enterToSend ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.enterToSend ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </>
                )}

                {/* ── NOTIFICATIONS ───────────────────────────────── */}
                {settingsTab === 'notifications' && (
                  <>
                    {/* Email */}
                    <div className="flex items-center justify-between rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-green-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                          <Mail size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1E2636]">Email on @mention</p>
                          <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">Send an email when someone @mentions you</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings((v) => ({ ...v, emailNotifications: !v.emailNotifications }))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${settings.emailNotifications ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Desktop notifications */}
                    <div className="rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                            <Monitor size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#1E2636]">Desktop notifications</p>
                            <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">Browser pop-up for incoming messages</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !settings.desktopNotifications;
                            setSettings((v) => ({ ...v, desktopNotifications: next }));
                            if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                              Notification.requestPermission();
                            }
                          }}
                          className={`relative h-6 w-11 rounded-full transition-colors ${settings.desktopNotifications ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.desktopNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {settings.desktopNotifications && typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          �  Notifications are blocked in your browser. Go to browser Site Settings to allow them.
                        </p>
                      )}
                    </div>

                    {/* Sound */}
                    <div className="flex items-center justify-between rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                          <Volume2 size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1E2636]">Sound alerts</p>
                          <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">Play a soft chime when new messages arrive</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={playNotificationSound}
                          className="rounded-lg border border-[rgba(62,74,137,0.12)] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#7C859E] hover:bg-[rgba(62,74,137,0.06)] dark:border-slate-600 dark:bg-slate-800"
                          title="Preview sound"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings((v) => ({ ...v, soundNotifications: !v.soundNotifications }))}
                          className={`relative h-6 w-11 rounded-full transition-colors ${settings.soundNotifications ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.soundNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── MEETING ─────────────────────────────────────── */}
                {settingsTab === 'meeting' && (
                  <>
                    {/* Current schedule */}
                    <div className="rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#7C859E] dark:text-[#7C859E]">
                        Scheduled meeting links
                      </p>
                      <div className="space-y-2.5">
                        {[
                          { days: 'Mon – Thu (before 2 PM)', label: 'Main meet',      link: DEFAULT_COMPANY_MEET_LINK,     dot: 'bg-[rgba(62,74,137,0.08)]0' },
                          { days: 'Thursday from 2 PM',      label: 'Thursday PM',    link: THURSDAY_AFTERNOON_MEET_LINK,  dot: 'bg-amber-500'  },
                          { days: 'Friday (all day)',         label: 'Friday meet',    link: FRIDAY_MEET_LINK,              dot: 'bg-emerald-500'},
                          { days: 'Saturday & Sunday',        label: 'No meeting',     link: null,                          dot: 'bg-slate-300'  },
                        ].map(({ days, label, link, dot }) => (
                          <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-4 py-2.5 ">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#4A5578]">{label}</p>
                                <p className="text-[11px] text-[#7C859E]">{days}</p>
                              </div>
                            </div>
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 rounded-lg bg-[rgba(62,74,137,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                              >
                                Open ↗
                              </a>
                            ) : (
                              <span className="shrink-0 rounded-lg bg-[rgba(62,74,137,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#7C859E] dark:bg-slate-700 dark:text-[#7C859E]">
                                Off
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Override main link */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-[#7C859E] dark:text-[#7C859E]">
                        Override main meet link
                      </label>
                      <input
                        value={settings.meetLink}
                        onChange={(e) => setSettings((v) => ({ ...v, meetLink: e.target.value }))}
                        placeholder={DEFAULT_COMPANY_MEET_LINK}
                        className="mt-2 h-11 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-bold outline-none focus:border-[#3E4A89] focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:placeholder-slate-500"
                      />
                      <p className="mt-1.5 text-xs text-[#7C859E]">Replaces the Mon–Thu default link. Leave blank to use the built-in link.</p>
                    </div>
                  </>
                )}
                {/* ── SECURITY ────────────────────────────────────── */}
                {settingsTab === 'security' && (
                  <>
                    {/* Info banner */}
                    <div className="flex items-start gap-3 rounded-2xl border border-[rgba(62,74,137,0.15)] bg-[rgba(62,74,137,0.08)] p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
                      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-green-700 dark:text-indigo-400" />
                      <div>
                        <p className="text-sm font-black text-indigo-800 dark:text-indigo-300">Change your password</p>
                        <p className="mt-0.5 text-xs text-green-700 dark:text-indigo-400">
                          You must enter your current password to set a new one. Minimum 8 characters.
                          System accounts (admin, core team) must contact admin to change passwords.
                        </p>
                      </div>
                    </div>

                    {/* Change password — uses a div + button, NOT a nested form (HTML forbids form-in-form) */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.12em] text-[#7C859E] dark:text-[#7C859E]">
                          Current password
                        </label>
                        <input
                          type="password"
                          value={pwCurrent}
                          onChange={(e) => setPwCurrent(e.target.value)}
                          placeholder="Enter your current password"
                          autoComplete="current-password"
                          required
                          className="mt-2 h-11 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-bold outline-none focus:border-[#3E4A89] focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.12em] text-[#7C859E] dark:text-[#7C859E]">
                          New password
                        </label>
                        <input
                          type="password"
                          value={pwNew}
                          onChange={(e) => setPwNew(e.target.value)}
                          placeholder="Min 8 characters"
                          autoComplete="new-password"
                          required
                          className="mt-2 h-11 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-bold outline-none focus:border-[#3E4A89] focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:placeholder-slate-500"
                        />
                        {/* Strength bar */}
                        {pwNew.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-1">
                              {[8, 10, 12].map((threshold, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    pwNew.length >= threshold
                                      ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-emerald-500'
                                      : 'bg-slate-200 dark:bg-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] text-[#7C859E]">
                              {pwNew.length < 8  ? 'Too short' :
                               pwNew.length < 10 ? 'Weak — try adding numbers or symbols' :
                               pwNew.length < 12 ? 'Moderate' : 'Strong ✓'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.12em] text-[#7C859E] dark:text-[#7C859E]">
                          Confirm new password
                        </label>
                        <input
                          type="password"
                          value={pwConfirm}
                          onChange={(e) => setPwConfirm(e.target.value)}
                          placeholder="Repeat new password"
                          autoComplete="new-password"
                          required
                          className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 dark:bg-slate-800 dark:placeholder-slate-500 ${
                            pwConfirm && pwNew !== pwConfirm
                              ? 'border-red-400 focus:border-red-400'
                              : 'border-[rgba(62,74,137,0.12)] focus:border-[#3E4A89] dark:border-slate-600'
                          }`}
                        />
                        {pwConfirm && pwNew !== pwConfirm && (
                          <p className="mt-1.5 text-xs font-semibold text-red-500">Passwords do not match.</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={pwLoading || !pwCurrent || !pwNew || pwNew !== pwConfirm}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E4A89] py-3 text-sm font-black text-white hover:bg-[#2A3568] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[rgba(62,74,137,0.08)]0 dark:hover:bg-[#3E4A89]"
                      >
                        {pwLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {pwLoading ? 'Changing password�¦' : 'Change password'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-[rgba(62,74,137,0.12)] bg-[#FAF8F5]/80 px-5 py-4 ">
                <p className="text-xs font-semibold text-[#7C859E]">
                  {settingsTab === 'security' ? 'Password is saved separately — use the button above.' : 'Changes apply immediately after saving.'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="h-9 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-[#4A5578] hover:bg-[rgba(62,74,137,0.08)] dark:border-slate-600 dark:bg-slate-800 dark:text-[#9BA6D3]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 rounded-xl bg-[#3E4A89] px-5 text-xs font-black uppercase tracking-[0.1em] text-white hover:bg-[#2A3568] dark:bg-[rgba(62,74,137,0.08)]0 dark:hover:bg-[#3E4A89]"
                  >
                    Save settings
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {scheduleMeetOpen && (
        <motion.div
          key="schedule-meet"
          {...BACKDROP}
          className="fixed inset-0 z-[115] flex items-center justify-center bg-[rgba(15,18,32,0.60)] p-4 backdrop-blur-md"
          onClick={() => setScheduleMeetOpen(false)}
        >
          <motion.form
            {...CARD}
            onSubmit={scheduleMeet}
            className="w-full max-w-2xl flex flex-col overflow-hidden rounded-3xl shadow-[0_32px_80px_rgba(25,30,47,0.45)]"
            style={{ maxHeight: '92vh', border: '1px solid rgba(155,166,211,0.18)' }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div
              className="relative flex items-center justify-between gap-4 px-6 py-5 overflow-hidden flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #191E2F 0%, #1E2538 60%, #252D4A 100%)' }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 80% at 10% 50%, rgba(62,74,137,0.22) 0%, transparent 70%)',
              }} />
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                background: 'linear-gradient(90deg, transparent, #3E4A89, #9BA6D3, #3E4A89, transparent)',
              }} />

              <div className="flex items-center gap-4 relative z-10">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3E4A89, #2A3568)', boxShadow: '0 4px 16px rgba(62,74,137,0.40)' }}
                >
                  <Video size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[18px] font-black tracking-tight text-white leading-tight">Schedule Meeting</h2>
                  <p className="text-[13px] font-medium mt-0.5" style={{ color: 'rgba(155,166,211,0.75)' }}>
                    #{channel?.name} &middot; Invitees get email + in-app alerts
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScheduleMeetOpen(false)}
                className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(196,202,224,0.80)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(196,202,224,0.80)'; }}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* ── Body (two-column) ───────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row overflow-hidden flex-1 min-h-0" style={{ background: '#FAF8F5' }}>

              {/* Left � Details */}
              <div className="flex flex-col gap-5 p-6 sm:w-[52%] sm:border-r overflow-y-auto" style={{ borderColor: 'rgba(62,74,137,0.10)' }}>

                {/* Title */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#7C859E' }}>Meeting Title</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <FileText size={15} style={{ color: '#9BA6D3' }} />
                    </span>
                    <input
                      value={meetTitle}
                      onChange={(e) => setMeetTitle(e.target.value)}
                      className="w-full h-11 rounded-xl pl-9 pr-3 text-sm font-bold outline-none transition-all"
                      style={{ background: '#FFFFFF', border: '1.5px solid rgba(62,74,137,0.14)', color: '#1E2636' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#3E4A89'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62,74,137,0.10)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(62,74,137,0.14)'; e.currentTarget.style.boxShadow = 'none'; }}
                      placeholder="e.g. Product Review Sync"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#7C859E' }}>Date</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <CalendarDays size={14} style={{ color: '#9BA6D3' }} />
                      </span>
                      <input
                        type="date"
                        value={meetDate}
                        onChange={(e) => setMeetDate(e.target.value)}
                        className="w-full h-11 rounded-xl pl-9 pr-3 text-sm font-bold outline-none transition-all"
                        style={{ background: '#FFFFFF', border: '1.5px solid rgba(62,74,137,0.14)', color: '#1E2636' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#3E4A89'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62,74,137,0.10)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(62,74,137,0.14)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#7C859E' }}>Time</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9BA6D3' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </span>
                      <input
                        type="time"
                        value={meetTime}
                        onChange={(e) => setMeetTime(e.target.value)}
                        className="w-full h-11 rounded-xl pl-9 pr-3 text-sm font-bold outline-none transition-all"
                        style={{ background: '#FFFFFF', border: '1.5px solid rgba(62,74,137,0.14)', color: '#1E2636' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#3E4A89'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62,74,137,0.10)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(62,74,137,0.14)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live date preview */}
                {meetDate && (
                  <div className="rounded-2xl p-4 flex items-center gap-4"
                    style={{ background: 'linear-gradient(135deg, rgba(62,74,137,0.07), rgba(62,74,137,0.03))', border: '1px solid rgba(62,74,137,0.12)' }}>
                    <div
                      className="flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #3E4A89, #2A3568)', boxShadow: '0 4px 12px rgba(62,74,137,0.30)' }}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none" style={{ color: '#9BA6D3' }}>
                        {new Date(meetDate).toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="text-[22px] font-black text-white leading-none mt-0.5">
                        {new Date(meetDate).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-black" style={{ color: '#1E2636' }}>
                        {new Date(meetDate).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      {meetTime && (
                        <p className="text-[13px] font-semibold mt-0.5" style={{ color: '#4A5578' }}>
                          {meetTime} &middot; {meetTitle || 'Untitled meeting'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Email toggle */}
                <div
                  className="flex items-start gap-3 rounded-2xl p-4 cursor-pointer select-none transition-all"
                  style={{
                    background: sendEmailInvite ? 'rgba(62,74,137,0.08)' : '#FFFFFF',
                    border: sendEmailInvite ? '1.5px solid rgba(62,74,137,0.22)' : '1.5px solid rgba(62,74,137,0.10)',
                  }}
                  onClick={() => setSendEmailInvite(!sendEmailInvite)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-9 h-5 rounded-full flex items-center px-0.5 transition-all duration-200"
                      style={{ background: sendEmailInvite ? '#3E4A89' : 'rgba(62,74,137,0.15)' }}>
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
                        style={{ transform: sendEmailInvite ? 'translateX(16px)' : 'translateX(0)' }} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail size={13} style={{ color: sendEmailInvite ? '#3E4A89' : '#9BA6D3' }} />
                      <span className="text-sm font-black" style={{ color: sendEmailInvite ? '#3E4A89' : '#7C859E' }}>
                        Send email invites
                      </span>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: '#7C859E' }}>
                      {sendEmailInvite && selectedInvitees.length > 0
                        ? `Will email ${selectedInvitees.length} person${selectedInvitees.length > 1 ? 's' : ''}`
                        : sendEmailInvite ? 'Select people on the right to invite'
                        : 'In-app notification only'}
                    </p>
                    {sendEmailInvite && selectedInvitees.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedInvitees.map((inv) => (
                          <span key={inv.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: 'rgba(62,74,137,0.12)', color: '#3E4A89' }}>
                            <Mail size={9} />{inv.email}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right � People selector */}
              <div className="flex flex-col sm:w-[48%] overflow-hidden" style={{ background: '#F2F0EC' }}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#7C859E' }}>
                    Invite People &middot; {meetInviteeIds.length} selected
                  </span>
                  {availableInvitees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMeetInviteeIds(
                        meetInviteeIds.length === availableInvitees.length
                          ? [] : availableInvitees.map((m) => m.id)
                      )}
                      className="text-[10px] font-black uppercase tracking-[0.10em] transition-colors hover:underline"
                      style={{ color: '#3E4A89' }}
                    >
                      {meetInviteeIds.length === availableInvitees.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(62,74,137,0.18) transparent' }}>
                  {availableInvitees.length ? (
                    availableInvitees.map((member) => {
                      const checked = meetInviteeIds.includes(member.id);
                      return (
                        <button
                          key={`invite-${member.id}`}
                          type="button"
                          onClick={() => toggleInvitee(member.id)}
                          className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-150"
                          style={{
                            background: checked ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                            border: checked ? '1.5px solid rgba(62,74,137,0.20)' : '1.5px solid transparent',
                            boxShadow: checked ? '0 2px 12px rgba(62,74,137,0.10)' : 'none',
                          }}
                          onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)'; }}
                          onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.55)'; }}
                        >
                          {/* Avatar with checkmark badge */}
                          <div className="relative flex-shrink-0">
                            <span
                              className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black text-white shadow-sm"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.initials}
                            </span>
                            {checked && (
                              <span
                                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full"
                                style={{ background: '#3E4A89', border: '2px solid #F2F0EC' }}
                              >
                                <svg width="9" height="7" viewBox="0 0 12 10" fill="none">
                                  <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                            )}
                          </div>

                          {/* Name + email */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-black leading-tight" style={{ color: checked ? '#1E2636' : '#4A5578' }}>
                              {member.name}
                            </p>
                            <p className="truncate text-[12px] mt-0.5" style={{ color: '#7C859E' }}>
                              {member.role}
                            </p>
                          </div>

                          {/* Checkbox */}
                          <div
                            className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-md transition-all"
                            style={{
                              background: checked ? '#3E4A89' : 'transparent',
                              border: checked ? '1.5px solid #3E4A89' : '1.5px solid rgba(62,74,137,0.20)',
                            }}
                          >
                            {checked && (
                              <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                                <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                        style={{ background: 'rgba(62,74,137,0.08)', border: '1px dashed rgba(62,74,137,0.20)' }}
                      >
                        <Users size={22} style={{ color: '#9BA6D3' }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: '#4A5578' }}>No teammates yet</p>
                      <p className="text-xs mt-1" style={{ color: '#7C859E' }}>Add members to this channel first.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <div
              className="flex items-center justify-between gap-4 px-6 py-4 flex-shrink-0"
              style={{ background: '#FAF8F5', borderTop: '1px solid rgba(62,74,137,0.10)' }}
            >
              {/* Invited avatars */}
              <div className="flex items-center gap-2.5">
                {meetInviteeIds.length > 0 && (
                  <div className="flex -space-x-2">
                    {availableInvitees.filter((m) => meetInviteeIds.includes(m.id)).slice(0, 4).map((m) => (
                      <span
                        key={m.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black text-white"
                        style={{ backgroundColor: m.color, border: '2px solid #FAF8F5' }}
                      >
                        {m.initials}
                      </span>
                    ))}
                    {meetInviteeIds.length > 4 && (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black"
                        style={{ background: 'rgba(62,74,137,0.15)', color: '#3E4A89', border: '2px solid #FAF8F5' }}
                      >
                        +{meetInviteeIds.length - 4}
                      </span>
                    )}
                  </div>
                )}
                <span className="text-[13px] font-semibold" style={{ color: '#7C859E' }}>
                  {meetInviteeIds.length > 0
                    ? `${meetInviteeIds.length} person${meetInviteeIds.length > 1 ? 's' : ''} invited`
                    : 'No invitees selected'}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleMeetOpen(false)}
                  className="h-10 rounded-xl px-5 text-xs font-black uppercase tracking-[0.10em] transition-all hover:scale-[1.02]"
                  style={{ border: '1.5px solid rgba(62,74,137,0.15)', background: 'transparent', color: '#4A5578' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(62,74,137,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl px-6 text-xs font-black uppercase tracking-[0.10em] text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #3E4A89, #2A3568)', boxShadow: '0 4px 16px rgba(62,74,137,0.35)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(62,74,137,0.50)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(62,74,137,0.35)'; }}
                >
                  ✦ Schedule Meet
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}      </AnimatePresence>

      {/* Recording overlay removed — controls are inline in the composer waveform bar */}

      <AnimatePresence>
      {recordedPreview && (
        <motion.div key="preview" {...BACKDROP} className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(25,30,47,0.45)] p-4 backdrop-blur-sm dark:bg-black/70">
          <motion.div {...CARD} className="w-full max-w-lg rounded-3xl border border-[rgba(62,74,137,0.12)] bg-white p-5 shadow-2xl  dark:bg-[#191E2F]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#1E2636]">
                  Preview {recordedPreview.kind === 'video' ? 'screen recording' : 'voice note'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#7C859E] dark:text-[#7C859E]">
                  Review it before sending to #{channel?.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={discardRecordedPreview}
                className="rounded-lg p-2 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="Discard recording"
              >
                <X size={18} />
              </button>
            </div>

            {recordedPreview.kind === 'video' ? (
              <video
                src={recordedPreview.url}
                className="mt-5 aspect-video w-full rounded-2xl bg-black object-contain"
                controls
              />
            ) : (
              <div className="mt-5 rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-4 ">
                <audio src={recordedPreview.url} className="w-full" controls />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={discardRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white text-sm font-black text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-[#9BA6D3]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={sendRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl bg-[#3E4A89] text-sm font-black text-white hover:bg-[#2A3568] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[rgba(62,74,137,0.08)]0 dark:hover:bg-[#3E4A89]"
              >
                {recordingSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {membersOpen && (
        <motion.div
          key="members"
          {...BACKDROP}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(25,30,47,0.35)] p-4 backdrop-blur-sm"
          onClick={() => setMembersOpen(false)}
        >
          <motion.div
            {...CARD}
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgba(62,74,137,0.12)] px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-[#1E2636]">Channel members</h2>
                <p className="text-sm font-semibold text-[#7C859E]">#{channel?.name}</p>
              </div>
              <button
                title="Close members"
                onClick={() => setMembersOpen(false)}
                className="rounded-lg p-2 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {activeChannelMembers.length ? (
                activeChannelMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setActiveChannel(member.id);
                      setMembersOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[#1E2636]">
                        {member.name}
                      </span>
                      <span className="block truncate text-xs font-semibold text-[#7C859E]">
                        {member.email}
                      </span>
                    </span>
                    <span className="rounded-full bg-[rgba(62,74,137,0.08)] px-2 py-1 text-[10px] font-black uppercase text-[#7C859E]">
                      {member.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[rgba(62,74,137,0.12)] p-6 text-center text-sm font-semibold text-[#7C859E]">
                  No users have been granted this channel yet.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ─── New Feature Panels ─────────────────────────────────────────────── */}

      {/* Global Search Panel */}
      <AnimatePresence>
      {globalSearchOpen && (
        <motion.div key="search" {...BACKDROP} className="fixed inset-0 z-[200] flex items-start justify-center bg-[rgba(25,30,47,0.50)] pt-20 backdrop-blur-sm" onClick={() => setGlobalSearchOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={SPRING}
            onClick={e => e.stopPropagation()} className="w-full max-w-2xl">
            <SearchPanel onClose={() => setGlobalSearchOpen(false)} />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <UserProfileModal
        member={profileMember}
        onClose={() => setProfileMember(null)}
      />

      {/* Wiki / Knowledge Base Panel */}
      <AnimatePresence>
      {wikiOpen && (
        <motion.div key="wiki" {...BACKDROP} className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm" onClick={() => setWikiOpen(false)}>
          <motion.div {...CARD} className="h-full w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <WikiPanel
              onClose={() => { setWikiOpen(false); scrollToBottom(); }}
              activeChannel={`personal-${currentUser?.email ?? 'guest'}`}
            />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Kanban Task Board */}
      <AnimatePresence>
      {kanbanOpen && (
        <motion.div key="kanban" {...BACKDROP} className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm" onClick={() => setKanbanOpen(false)}>
          <motion.div {...CARD} className="h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <KanbanBoard onClose={() => { setKanbanOpen(false); scrollToBottom(); }} />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Analytics Panel (Admin only) */}
      <AnimatePresence>
      {analyticsOpen && isAdmin && (
        <motion.div key="analytics" {...BACKDROP} className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm" onClick={() => setAnalyticsOpen(false)}>
          <motion.div {...CARD} className="w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <AnalyticsPanel onClose={() => { setAnalyticsOpen(false); scrollToBottom(); }} />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Bookmarks Panel */}
      <AnimatePresence>
      {bookmarksPanelOpen && (
        <motion.div key="bookmarks" {...BACKDROP} className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm" onClick={() => setBookmarksPanelOpen(false)}>
          <motion.div {...CARD} className="w-full max-w-xl max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <BookmarksPanel onClose={() => { setBookmarksPanelOpen(false); scrollToBottom(); }} />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {newChannelOpen && isAdmin && (
        <motion.div
          key="new-channel"
          {...BACKDROP}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(25,30,47,0.35)] p-4 backdrop-blur-sm"
          onClick={() => setNewChannelOpen(false)}
        >
          <motion.form
            {...CARD}
            onSubmit={createChannel}
            className="w-full max-w-md rounded-2xl border border-[rgba(62,74,137,0.12)] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1E2636]">New channel</h2>
                <p className="text-sm font-semibold text-[#7C859E]">
                  Create a workspace discussion lane.
                </p>
              </div>
              <button
                title="Close new channel"
                type="button"
                onClick={() => setNewChannelOpen(false)}
                className="rounded-lg p-2 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-xs font-black uppercase tracking-[0.12em] text-[#7C859E]">
              Name
            </label>
            <input
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-bold outline-none focus:border-[#3E4A89] focus:ring-4 focus:ring-indigo-100"
              placeholder="for example, school-pilots"
              autoFocus
            />
            <label className="mt-4 block text-xs font-black uppercase tracking-[0.12em] text-[#7C859E]">
              Description
            </label>
            <input
              value={newChannelDescription}
              onChange={(event) => setNewChannelDescription(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-bold outline-none focus:border-[#3E4A89] focus:ring-4 focus:ring-indigo-100"
              placeholder="What this channel is for"
            />
            <button
              type="submit"
              className="mt-5 h-11 w-full rounded-xl bg-[#3E4A89] text-sm font-black text-white hover:bg-[#2A3568]"
            >
              Create channel
            </button>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}




