'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import '../dashboard.css';
import AppLogo from '@/components/ui/AppLogo';
import { useDashboardStore } from '@/store/dashboardStore';
import type { MemberStatus } from '@/store/dashboardStore';
import { useTheme } from '@/components/ThemeProvider';
import { sendMentionEmailNotification, changePassword } from '@/app/actions/dbActions';
import { smartUpload } from '@/lib/uploadToFirebase';
import NotificationPanel from './NotificationPanel';
import AIPanel from './AIPanel';
import { ToastContainer, type ToastData } from './ToastNotification';
import { getSocket } from '@/lib/socket';
import {
  getOrCreateKeyPair,
  publishPublicKey,
  fetchPartnerPublicKey,
  encryptDMMessage,
  decryptDMMessage,
  dmCacheKey,
  isEncrypted,
} from '@/lib/dmCrypto';

import MyActivityCalendar from './MyActivityCalendar';
import CalendarPanel from './CalendarPanel';
import AdminAvailabilityView from './AdminAvailabilityView';
import PeopleStatusPanel from './PeopleStatusPanel';
import LeavePanel from './LeavePanel';
import MeetingStartedCard from './MeetingStartedCard';
import SearchPanel from './SearchPanel';
import { useActivityWatchSync } from '@/lib/useActivityWatchSync';

import UserProfileModal from './UserProfileModal';
import WikiPanel from './WikiPanel';
import KanbanBoard from './KanbanBoard';
import AnalyticsPanel from './AnalyticsPanel';
import BookmarksPanel from './BookmarksPanel';
import NotepadPanel from './NotepadPanel';
import StandupPanel from './StandupPanel';
import UserAttendanceCalendar from './UserAttendanceCalendar';
import SessionTimer from './SessionTimer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { trackEvent } from '@/app/PostHogProvider';
import { motion, AnimatePresence } from 'framer-motion';

/* Shared spring config used for every modal/panel */
const SPRING = { type: 'spring', damping: 26, stiffness: 360, mass: 0.8 } as const;
const BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18 },
} as const;
const CARD = {
  initial: { opacity: 0, y: 48, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 28, scale: 0.96 },
  transition: SPRING,
} as const;
import {
  BarChart2,
  Bell,
  Bookmark,
  BookOpen,
  CalendarPlus,
  CalendarCheck,
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
  Share2,
  MessageSquare,
  ExternalLink,
  Eye,
  Clock,
  Menu,
  ChevronLeft,
  CalendarX,
  Activity,
  Lock,
  StickyNote,
} from 'lucide-react';

type CurrentUser = {
  name: string;
  email: string;
  role: string;
  initials: string;
  status?: string;
  color?: string;
};

const DEFAULT_COMPANY_MEET_LINK = 'https://meet.google.com/uie-jxkt-vkx';
const THURSDAY_AFTERNOON_MEET_LINK = 'https://meet.google.com/dss-wmvy-cuq';
const FRIDAY_MEET_LINK = 'https://meet.google.com/eeq-maem-ztc';
function getGoogleMeetLinks(settings?: DashboardSettings) {
  return [
    { label: 'Main meet (Mon–Thu AM)', link: settings?.meetLink?.trim() || DEFAULT_COMPANY_MEET_LINK, days: 'Mon–Thu morning' },
    { label: 'Thursday PM meet', link: settings?.meetLinkThuPM?.trim() || THURSDAY_AFTERNOON_MEET_LINK, days: 'Thursday afternoon' },
    { label: 'Friday meet', link: settings?.meetLinkFriday?.trim() || FRIDAY_MEET_LINK, days: 'Friday' },
  ];
}
const settingsKey = (email: string) => `edutechex_dashboard_settings_${email.toLowerCase()}`;
function userIdFromDmChannel(channelId: string, myId: string): string {
  const after = channelId.replace('dm-', '');
  const sep = after.indexOf(myId);
  if (sep === -1) return after;
  return after.slice(0, sep) + after.slice(sep + myId.length);
}
const EMOJI_OPTIONS = [
  '😀',
  '😂',
  '😍',
  '🥰',
  '😎',
  '🤔',
  '😭',
  '😡',
  '🤯',
  '😴',
  '👍',
  '👎',
  '👏',
  '🙏',
  '✌️',
  '🤝',
  '👀',
  '💪',
  '🙌',
  '🤞',
  '❤️',
  '💛',
  '💚',
  '💙',
  '💜',
  '🔥',
  '⭐',
  '✨',
  '🎉',
  '🏆',
  '✅',
  '❌',
  '❓',
  '❗',
  '💯',
  '🚀',
  '💡',
  '🎯',
  '📌',
  '🔔',
];

const AVATAR_OPTIONS = [
  '😊',
  '😎',
  '🤩',
  '🥳',
  '😍',
  '🤖',
  '👾',
  '🧑‍💻',
  '🦊',
  '🐱',
  '🐯',
  '🦁',
  '🐼',
  '🐨',
  '🦄',
  '🐸',
  '🚀',
  '⚡',
  '🌟',
  '🔥',
  '💎',
  '🏆',
  '🎯',
  '🎭',
  '🧑‍🚀',
  '🦸',
  '🧩',
  '🎨',
  '🌈',
  '👑',
];

type DashboardSettings = {
  // Profile
  displayName: string;
  avatarEmoji: string;
  status: 'online' | 'away' | 'in-meeting' | 'offline';
  // Meeting
  meetLink: string;
  meetLinkThuPM: string;
  meetLinkFriday: string;
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

function getMeetingButtonState(
  now = new Date(),
  linkOverrides?: { main: string; thuPM: string; fri: string }
): MeetingButtonState {
  const day = now.getDay();
  const hour = now.getHours();

  const mainLink = linkOverrides?.main || DEFAULT_COMPANY_MEET_LINK;
  const thuPMLink = linkOverrides?.thuPM || THURSDAY_AFTERNOON_MEET_LINK;
  const friLink = linkOverrides?.fri || FRIDAY_MEET_LINK;

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
      link: friLink,
      message: 'Friday meeting link is active.',
    };
  }

  if (day === 4 && hour >= 14) {
    return {
      label: 'Thursday PM meet',
      link: thuPMLink,
      message: 'Thursday afternoon meeting link is active.',
    };
  }

  return {
    label: 'Main meet',
    link: mainLink,
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

function renderWithMentions(
  text: string,
  isOwn: boolean,
  memberNames: string[] = []
): React.ReactNode {
  if (!text) return text;

  // Build pattern from known member names (longest first to avoid partial matches)
  // Fall back to generic word+ pattern if no members
  const escaped = memberNames
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  const pattern =
    escaped.length > 0
      ? new RegExp(`(@(?:${escaped.join('|')}))`, 'gi')
      : /(@[A-Za-z][A-Za-z0-9 ._-]*[A-Za-z0-9]|@[A-Za-z])/g;

  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (
      /^@/i.test(part) &&
      memberNames.some((n) => part.slice(1).toLowerCase() === n.toLowerCase())
    ) {
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
    createWorkspaceChannel,
    addMessage,
    addMessageFromSocket,
    updateMessageFromSocket,
    deleteMessageFromSocket,
    patchLocalMessage,
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
    activeThreadId,
    setActiveThread,
    incrementUnread,
    clearUnread,
    updateMemberStatus,
    updateMemberName,
    updateMemberLeaveStatus,
    resetUserState,
  } = useDashboardStore();
  // Separate selector so badge counts always trigger a re-render
  const unreadCounts = useDashboardStore((s) => s.unreadCounts);
  const [dmToasts, setDmToasts] = useState<ToastData[]>([]);
  const [rightPanel, setRightPanel] = useState<'ai' | 'closed'>('closed');
  const [rightSidePanel, setRightSidePanel] = useState<'pinned' | 'bookmarked' | null>(null);
  const [meetJoinState, setMeetJoinState] = useState<Record<string, 'checking' | 'denied'>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'tasks' | 'ai'>('chat');
  const [composerMessage, setComposerMessage] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityCalendarOpen, setActivityCalendarOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [peopleStatusOpen, setPeopleStatusOpen] = useState(false);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [forwardingMsg, setForwardingMsg] = useState<{
    id: string;
    text: string;
    sender: string;
  } | null>(null);
  const [forwardQuery, setForwardQuery] = useState('');
  const [threadReplyText, setThreadReplyText] = useState('');
  const [linkPreviewCache, setLinkPreviewCache] = useState<
    Record<string, { title: string; description: string; image: string; siteName: string } | null>
  >({});
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [awBannerDismissed, setAwBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('aw_banner_dismissed') === '1';
  });
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  // ── Screen-time timer ────────────────────────────────────────────────────────
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const screenTimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Meeting quick-join dropdown ──────────────────────────────────────────────
  const [quickJoinOpen, setQuickJoinOpen] = useState(false);
  const quickJoinRef = useRef<HTMLDivElement>(null);
  const [meetMenuOpen, setMeetMenuOpen] = useState(false);
  const [meetInputMenuOpen, setMeetInputMenuOpen] = useState(false);
  const [shareMeetLinkOpen, setShareMeetLinkOpen] = useState(false);
  const [shareMeetLinkValue, setShareMeetLinkValue] = useState('');
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
  const [settingsTab, setSettingsTab] = useState<
    'profile' | 'appearance' | 'notifications' | 'meeting' | 'security' | 'privacy'
  >('profile');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>({
    displayName: '',
    avatarEmoji: '',
    status: 'online',
    meetLink: DEFAULT_COMPANY_MEET_LINK,
    meetLinkThuPM: THURSDAY_AFTERNOON_MEET_LINK,
    meetLinkFriday: FRIDAY_MEET_LINK,
    emailNotifications: true,
    desktopNotifications: false,
    soundNotifications: true,
    compactChat: false,
    fontSize: 'normal',
    enterToSend: true,
  });
  // Presence map: email (lowercase) → ISO timestamp of last heartbeat
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});

  // Derive online/offline status from presenceMap — a user is "online" if
  // they sent a heartbeat within the last 3 minutes (heartbeat fires every 30 s).
  const getPresenceStatus = (email: string): 'online' | 'offline' =>
    presenceMap[email.toLowerCase()]
      ? (Date.now() - new Date(presenceMap[email.toLowerCase()]).getTime()) < 3 * 60 * 1000
        ? 'online'
        : 'offline'
      : 'offline';

  const getLastSeenLabel = (email: string): string | null => {
    const iso = presenceMap[email.toLowerCase()];
    if (!iso) return null;
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'Active now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // ── Settings: load from MongoDB on mount, auto-save on change ───────────────
  const settingsLoadedFromDB = useRef(false);
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load saved settings from MongoDB on first mount
    const raw = typeof window !== 'undefined' ? localStorage.getItem('edutechex_token') : null;
    if (!raw) return;
    try {
      const { token } = JSON.parse(raw);
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com'}/api/settings`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.settings) {
            const s = data.settings;
            setSettings((prev) => ({
              ...prev,
              ...(s.displayName !== undefined && { displayName: s.displayName }),
              ...(s.avatarEmoji !== undefined && { avatarEmoji: s.avatarEmoji }),
              ...(s.status !== undefined && { status: s.status }),
              ...(s.meetLink !== undefined && { meetLink: s.meetLink }),
              ...(s.meetLinkThuPM !== undefined && { meetLinkThuPM: s.meetLinkThuPM }),
              ...(s.meetLinkFriday !== undefined && { meetLinkFriday: s.meetLinkFriday }),
              ...(s.emailNotifications !== undefined && {
                emailNotifications: s.emailNotifications,
              }),
              ...(s.desktopNotifications !== undefined && {
                desktopNotifications: s.desktopNotifications,
              }),
              ...(s.soundNotifications !== undefined && {
                soundNotifications: s.soundNotifications,
              }),
              ...(s.compactChat !== undefined && { compactChat: s.compactChat }),
              ...(s.fontSize !== undefined && { fontSize: s.fontSize }),
              ...(s.enterToSend !== undefined && { enterToSend: s.enterToSend }),
            }));
          }
        })
        .catch(() => {})
        .finally(() => {
          settingsLoadedFromDB.current = true;
        });
    } catch {
      settingsLoadedFromDB.current = true;
    }
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
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com'}/api/settings`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
          }
        ).catch(() => {});
      } catch {
        /* ignore */
      }
    }, 1500); // debounce 1.5s
    return () => {
      if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    };
  }, [settings]);
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
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
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [standupOpen, setStandupOpen] = useState(false);
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

  // ActivityWatch auto-sync — starts on login, stops on logout/unmount
  const awStatus = useActivityWatchSync(!!currentUserEmail);

  const visibleNotifications = notifications.filter(
    (item) =>
      !item.recipientEmails?.length ||
      item.recipientEmails.map((email) => email.toLowerCase()).includes(currentUserEmail)
  );
  const unreadNotifications = visibleNotifications.filter((item) => !item.read).length;
  const meetingButtonState = getMeetingButtonState(new Date(), {
    main: settings.meetLink.trim() || DEFAULT_COMPANY_MEET_LINK,
    thuPM: settings.meetLinkThuPM.trim() || THURSDAY_AFTERNOON_MEET_LINK,
    fri: settings.meetLinkFriday.trim() || FRIDAY_MEET_LINK,
  });
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

  const BROADCAST_MENTIONS = [
    { id: '@here', label: '@here', desc: 'Notify all active channel members' },
    { id: '@channel', label: '@channel', desc: 'Notify everyone in this channel' },
  ];
  const broadcastSuggestions = BROADCAST_MENTIONS.filter(
    (b) => !mentionQuery || b.id.slice(1).startsWith(mentionQuery.toLowerCase())
  );

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
    return () => {
      clearInterval(interval);
      clearInterval(membersInterval);
    };
  }, []); // Zustand actions are stable refs � empty deps is safe

  // ── Decrypt DM messages loaded from the server ────────────────────────────
  // Runs whenever the messages snapshot changes. Scans all DM channels for any
  // message whose text starts with ENC: and replaces it with the plaintext.
  // Uses a ref-set to skip already-decrypted IDs so it's effectively idempotent.
  const decryptedIdsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!currentUserEmail) return;
    const authData = localStorage.getItem('edutechex_token');
    const token = authData ? (() => { try { return JSON.parse(authData).token; } catch { return null; } })() : null;
    if (!token) return;

    const dmChannelIds = Object.keys(messages).filter((id) => id.startsWith('member-'));
    if (dmChannelIds.length === 0) return;

    (async () => {
      const kp = await getOrCreateKeyPair().catch(() => null);
      if (!kp) return;
      const { privateKeyJwk } = kp;

      for (const channelId of dmChannelIds) {
        const partner = members.find((m) => m.id === channelId);
        if (!partner?.email) continue;
        const partnerPub = await fetchPartnerPublicKey(partner.email, token).catch(() => null);
        if (!partnerPub) continue;
        const cKey = dmCacheKey(currentUserEmail, partner.email);

        for (const msg of messages[channelId] ?? []) {
          if (!isEncrypted(msg.text)) continue;
          if (decryptedIdsRef.current.has(msg.id)) continue;
          decryptedIdsRef.current.add(msg.id);
          try {
            const plain = await decryptDMMessage(msg.text, privateKeyJwk, partnerPub, cKey);
            patchLocalMessage(channelId, msg.id, { text: plain });
          } catch { /* keep encrypted fallback */ }
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUserEmail]);

  // ── Socket.IO real-time message delivery ──────────────────────────────────
  // Join the active channel room so we receive live `new_message` events.
  // Also join all other accessible channel rooms so DMs and background channels
  // deliver in real-time even when the user is viewing a different channel.
  // Re-joins on every 'connect' event so Render cold-start wakeups don't silently
  // break real-time delivery for User 2.
  useEffect(() => {
    const socket = getSocket();

    // Join the active channel, then all others so background DMs arrive in real-time
    const joinAllChannels = () => {
      socket.emit('join_channel', activeChannelId);
      useDashboardStore.getState().channels.forEach((ch) => {
        if (ch.id !== activeChannelId) socket.emit('join_channel', ch.id);
      });
    };
    joinAllChannels();

    // Rejoin all rooms and reload messages whenever socket reconnects (Render cold start, network blip)
    const handleReconnect = () => {
      joinAllChannels();
      useDashboardStore.getState().loadLocalMessages?.();
      // Re-broadcast current status after a socket reconnect so peers see us again
      const email = currentUserRef.current?.email;
      if (email) {
        const st = (useDashboardStore.getState().members.find(
          (m) => m.email.toLowerCase() === email.toLowerCase()
        )?.status) ?? 'online';
        getSocket().emit('user_status_update', { email, status: st });
      }
    };

    const handleNewMessage = async ({
      channelId,
      message,
    }: {
      channelId: string;
      message: import('@/store/dashboardStore').Message & { senderEmail?: string };
    }) => {
      let displayMessage = message;

      if ((channelId.startsWith('member-') || channelId.startsWith('dm-')) && isEncrypted(message.text)) {
        try {
          const authData = localStorage.getItem('edutechex_token');
          const token = authData ? (() => { try { return JSON.parse(authData).token; } catch { return null; } })() : null;
          if (token) {
            const { privateKeyJwk } = await getOrCreateKeyPair();
            const partnerEmail = message.senderEmail ?? '';
            if (partnerEmail) {
              const partnerPub = await fetchPartnerPublicKey(partnerEmail, token);
              if (partnerPub) {
                const cKey = dmCacheKey(currentUserRef.current?.email ?? '', partnerEmail);
                const plain = await decryptDMMessage(message.text, privateKeyJwk, partnerPub, cKey);
                displayMessage = { ...message, text: plain };
              }
            }
          }
        } catch { /* show encrypted text as fallback */ }
      }

      addMessageFromSocket(channelId, displayMessage);
      // Increment unread count for non-active channels
      if (channelId !== useDashboardStore.getState().activeChannel && message.sender !== currentUserRef.current?.name) {
        useDashboardStore.getState().incrementUnread(channelId);
      }
      // Only notify for messages sent by someone else
      if (message.sender !== currentUserRef.current?.name) {
        if (settingsRef.current.soundNotifications) playNotificationSound();
        const isDMChannel = channelId.startsWith('member-');
        if (settingsRef.current.desktopNotifications) {
          const notifTitle = isDMChannel
            ? `DM from ${message.sender}`
            : `${message.sender} · #${channelId}`;
          showDesktopNotification(notifTitle, displayMessage.text);
        }
        // Show in-app popup toast for DMs
        if (isDMChannel) {
          const toastId = `dm-${Date.now()}-${Math.random()}`;
          const initials = message.sender
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          setDmToasts((prev) => [
            ...prev,
            {
              id: toastId,
              type: 'dm',
              actor: message.sender,
              actorInitials: initials,
              actorColor: message.color ?? '#6366f1',
              message: displayMessage.text,
              channel: 'dm',
              onClickAction: () => setActiveChannel(channelId),
            },
          ]);
        }
      }
    };

    const handleUpdatedMessage = ({
      channelId,
      message,
    }: {
      channelId: string;
      message: import('@/store/dashboardStore').Message;
    }) => {
      updateMessageFromSocket(channelId, message);
    };

    const handleDeletedMessage = ({
      channelId,
      messageId,
    }: {
      channelId: string;
      messageId: string;
    }) => {
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
              setCurrentUser((prev) => (prev ? { ...prev, role } : prev));
            }
          }
        } catch {
          /* ignore */
        }
      }
    };

    // ── Force-logout: fires when an admin removes this user ──────────────────
    const handleForcefullyRemoved = ({ email }: { email: string }) => {
      const me = currentUserRef.current?.email?.toLowerCase();
      if (!me || me !== email.toLowerCase()) return; // not this user, ignore
      // Wipe session and redirect immediately
      getSocket().emit('user_status_update', { email: me, status: 'offline' });
      resetUserState();
      localStorage.removeItem('edutechex_token');
      localStorage.removeItem('edutechex_session_start');
      // Show a brief toast then hard-redirect (toast lib may not render after push, so use replace)
      try {
        toast.error('Your account has been removed by the admin.', { duration: 3000 });
      } catch {
        /* */
      }
      setTimeout(() => {
        window.location.replace('/sign-up-login-screen');
      }, 800);
    };

    // Reload channel list when admin creates or deletes a channel.
    // Also reload members so per-member channel access (memberIds) is recomputed
    // for the new channel — otherwise it loads with empty memberIds and stays
    // hidden in the sidebar until the next member refresh.
    const handleChannelCreated = async () => {
      await useDashboardStore.getState().loadWorkspaceChannels?.();
      await useDashboardStore.getState().loadLocalMembers?.();
    };
    const handleChannelDeleted = () => {
      useDashboardStore.getState().loadWorkspaceChannels?.();
    };

    // ── Access approved / rejected in real time ──────────────────────────────
    const handleAccessApproved = ({ email }: { email: string }) => {
      const me = currentUserRef.current?.email?.toLowerCase();
      if (!me || me !== email.toLowerCase()) return;
      // Update stored token
      try {
        const raw = localStorage.getItem('edutechex_token');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.user = { ...parsed.user, status: 'approved' };
          localStorage.setItem('edutechex_token', JSON.stringify(parsed));
        }
      } catch { /* */ }
      setCurrentUser((prev) => prev ? { ...prev, status: 'approved' } : prev);
      toast.success('Your account has been approved! Welcome to EduTechExOS.', { duration: 5000 });
    };
    const handleAccessRejected = ({ email }: { email: string }) => {
      const me = currentUserRef.current?.email?.toLowerCase();
      if (!me || me !== email.toLowerCase()) return;
      try {
        const raw = localStorage.getItem('edutechex_token');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.user = { ...parsed.user, status: 'rejected' };
          localStorage.setItem('edutechex_token', JSON.stringify(parsed));
        }
      } catch { /* */ }
      setCurrentUser((prev) => prev ? { ...prev, status: 'rejected' } : prev);
      toast.error('Your access request has been declined by the admin.', { duration: 6000 });
    };

    // Live-refresh Kanban and Wiki when anyone changes them (these reload the
    // viewer's own filtered list, so per-user/privacy rules are preserved).
    const handleKanbanChanged = () => useDashboardStore.getState().loadLocalKanbanTasks?.();
    const handleWikiChanged = () => useDashboardStore.getState().loadLocalWikiPages?.();

    // In-app @mention notification — fires when someone @mentions the current user
    const handleMentionNotification = (data: {
      recipientEmail: string; senderName: string; channelId: string; messageId: string; preview: string;
    }) => {
      if (!currentUserEmail) return;
      if (data.recipientEmail?.toLowerCase() !== currentUserEmail.toLowerCase()) return;
      addNotification({
        type: 'mention',
        actor: data.senderName,
        actorInitials: data.senderName?.slice(0, 2).toUpperCase() ?? '??',
        actorColor: '#6366F1',
        channel: data.channelId,
        message: data.preview,
        recipientEmails: [data.recipientEmail],
      });
    };

    const handleMeetingStarted = ({
      link, channelName, starter, starterInitials, starterColor,
    }: { link: string; channelName: string; starter: string; starterInitials: string; starterColor: string }) => {
      // Don't show toast to the person who started the meeting
      if (starter === currentUserRef.current?.name) return;
      import('sonner').then(({ toast: t }) => {
        t(`📹 ${starter} started a meeting in #${channelName}`, {
          duration: 30000,
          action: { label: 'Join', onClick: () => window.open(link, '_blank') },
        });
      }).catch(() => {});
    };

    socket.on('connect', handleReconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleUpdatedMessage);
    socket.on('message_deleted', handleDeletedMessage);
    socket.on('member_updated', handleMemberUpdated);
    socket.on('user_forcefully_removed', handleForcefullyRemoved);
    socket.on('channel_created', handleChannelCreated);
    socket.on('channel_deleted', handleChannelDeleted);
    socket.on('access_approved', handleAccessApproved);
    socket.on('access_rejected', handleAccessRejected);
    socket.on('kanban_changed', handleKanbanChanged);
    socket.on('wiki_changed', handleWikiChanged);
    socket.on('mention_notification', handleMentionNotification);
    const handlePresenceUpdate = ({ email, lastSeen }: { email: string; lastSeen: string }) => {
      if (!email) return;
      setPresenceMap((prev) => ({ ...prev, [email.toLowerCase()]: lastSeen }));
    };

    socket.on('meeting_started', handleMeetingStarted);
    socket.on('user_activity_update', handlePresenceUpdate);

    // Real-time status & name updates from other users
    const handleUserStatusUpdate = ({
      email, status, name,
    }: { email: string; status: string; name?: string }) => {
      if (!email) return;
      const validStatus = ['online', 'away', 'in-meeting', 'offline'].includes(status)
        ? (status as MemberStatus)
        : 'online';
      useDashboardStore.getState().updateMemberStatus(email, validStatus);
      if (name) useDashboardStore.getState().updateMemberName(email, name);
    };
    socket.on('user_status_update', handleUserStatusUpdate);

    // Increment unread count when a message arrives in a non-active channel
    const handleUnreadIncrement = ({ channelId }: { channelId: string }) => {
      if (channelId && channelId !== useDashboardStore.getState().activeChannel) {
        useDashboardStore.getState().incrementUnread(channelId);
      }
    };
    socket.on('unread_increment', handleUnreadIncrement);

    // Real-time leave status from other users (when admin approves/rejects a leave)
    const handleLeaveStatusUpdate = ({ email, onLeave }: { email: string; onLeave: boolean }) => {
      if (!email) return;
      useDashboardStore.getState().updateMemberLeaveStatus(email, onLeave);
    };
    socket.on('leave_status_update', handleLeaveStatusUpdate);

    // Real-time availability toggle from other users
    const handleAvailabilityUpdate = ({ email, isAvailable }: { email: string; isAvailable: boolean }) => {
      if (!email) return;
      useDashboardStore.getState().updateMemberAvailability(email, !!isAvailable);
    };
    socket.on('user_availability', handleAvailabilityUpdate);

    // Real-time meeting request notifications
    const handleMeetingRequestCreated = (data: { requestId: string; userName: string; userEmail: string; date: string; time: string; purpose?: string }) => {
      if (currentUserRef.current?.role !== 'Admin') return;
      toast.success(`Meeting request from ${data.userName}`, { description: `${data.date} at ${data.time}` });
      loadLocalNotifications?.(currentUserEmail ?? '');
    };
    const handleMeetingRequestReviewed = (data: { requestId: string; status: string; date: string; time: string }) => {
      toast.info(`Meeting ${data.status === 'confirmed' ? 'confirmed' : 'declined'}`, { description: `${data.date} at ${data.time}` });
      loadLocalNotifications?.(currentUserEmail ?? '');
    };
    socket.on('meeting_request_created', handleMeetingRequestCreated);
    socket.on('meeting_request_reviewed', handleMeetingRequestReviewed);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleUpdatedMessage);
      socket.off('message_deleted', handleDeletedMessage);
      socket.off('member_updated', handleMemberUpdated);
      socket.off('user_forcefully_removed', handleForcefullyRemoved);
      socket.off('channel_created', handleChannelCreated);
      socket.off('channel_deleted', handleChannelDeleted);
      socket.off('access_approved', handleAccessApproved);
      socket.off('access_rejected', handleAccessRejected);
      socket.off('kanban_changed', handleKanbanChanged);
      socket.off('wiki_changed', handleWikiChanged);
      socket.off('mention_notification', handleMentionNotification);
      socket.off('meeting_started', handleMeetingStarted);
      socket.off('user_activity_update', handlePresenceUpdate);
      socket.off('user_status_update', handleUserStatusUpdate);
      socket.off('unread_increment', handleUnreadIncrement);
      socket.off('leave_status_update', handleLeaveStatusUpdate);
      socket.off('user_availability', handleAvailabilityUpdate);
      socket.off('meeting_request_created', handleMeetingRequestCreated);
      socket.off('meeting_request_reviewed', handleMeetingRequestReviewed);
      socket.emit('leave_channel', activeChannelId);
    };
  }, [activeChannelId, addMessageFromSocket, updateMessageFromSocket, deleteMessageFromSocket, currentUserEmail, addNotification]);

  // Poll backend notifications for the signed-in user every 5 seconds
  useEffect(() => {
    if (!currentUserEmail) return;
    loadLocalNotifications?.(currentUserEmail);
    const interval = setInterval(() => loadLocalNotifications?.(currentUserEmail), 5000);
    return () => clearInterval(interval);
  }, [currentUserEmail, loadLocalNotifications]);

  // ── Screen-time timer — pauses during lunch 12:45–13:15 IST ─────────────────
  useEffect(() => {
    if (!authChecked || !currentUserEmail) return;
    const LUNCH_START_H = 12, LUNCH_START_M = 45;
    const LUNCH_END_H   = 13, LUNCH_END_M   = 15;
    const isLunch = () => {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      const inMins = h * 60 + m;
      return inMins >= LUNCH_START_H * 60 + LUNCH_START_M &&
             inMins <  LUNCH_END_H   * 60 + LUNCH_END_M;
    };
    screenTimeRef.current = setInterval(() => {
      if (!isLunch()) setSessionSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (screenTimeRef.current) clearInterval(screenTimeRef.current);
    };
  }, [authChecked, currentUserEmail]);

  // Load approved leaves so members on leave show indicator
  useEffect(() => {
    if (!authChecked || !currentUserEmail) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';
    const authRaw = localStorage.getItem('edutechex_token');
    const authToken = authRaw ? (() => { try { return JSON.parse(authRaw).token; } catch { return null; } })() : null;
    // Team-wide on-leave-today endpoint (returns { onLeave: [...] } and works
    // for non-admins, unlike /api/leaves which is scoped to the requester).
    fetch(`${API_BASE}/api/leaves/on-leave-today`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; onLeave?: Array<{ email?: string }> }) => {
        const list = Array.isArray(data?.onLeave) ? data.onLeave : [];
        const onLeaveEmails = new Set(
          list.map((l) => (l.email ?? '').toLowerCase()).filter(Boolean)
        );
        useDashboardStore.getState().members.forEach((m) => {
          updateMemberLeaveStatus(m.email, onLeaveEmails.has(m.email.toLowerCase()));
        });
      })
      .catch(() => {/* silently ignore */});
  }, [authChecked, currentUserEmail, updateMemberLeaveStatus]);

  // ── Presence: broadcast status via socket + update store ───────────────────
  const inMeetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const broadcastStatus = useCallback((status: 'online' | 'away' | 'in-meeting' | 'offline') => {
    const email = currentUserRef.current?.email;
    if (!email) return;
    getSocket().emit('user_status_update', { email, status });
    // Update store only — never call setSettings here to avoid setState-during-render
    updateMemberStatus(email, status as MemberStatus);
  }, [updateMemberStatus]);

  // Broadcast 'online' as soon as the current user is resolved
  useEffect(() => {
    if (!currentUser?.email) return;
    broadcastStatus('online');
  }, [currentUser?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // When page regains visibility and status is 'in-meeting', revert to 'online'
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const email = currentUserRef.current?.email;
        if (!email) return;
        const memberStatus = useDashboardStore.getState().members.find(
          (m) => m.email.toLowerCase() === email.toLowerCase()
        )?.status;
        if (memberStatus === 'in-meeting') {
          getSocket().emit('user_status_update', { email, status: 'online' });
          updateMemberStatus(email, 'online');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [updateMemberStatus]);

  // Activity heartbeat — ping backend every 60 s with current activity so admin sees live status.
  useEffect(() => {
    if (!currentUserEmail) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';
    let endpointAvailable = true;

    const getCurrentActivity = (): { currentActivity: string; currentPanel: string } => {
      if (wikiOpen)     return { currentActivity: 'Writing in Wiki',      currentPanel: 'wiki'      };
      if (kanbanOpen)   return { currentActivity: 'Managing Tasks',        currentPanel: 'kanban'    };
      if (calendarOpen) return { currentActivity: 'Viewing Calendar',      currentPanel: 'calendar'  };
      if (leaveOpen)    return { currentActivity: 'Viewing Leave',         currentPanel: 'leave'     };
      const chName = channels.find((c) => c.id === activeChannel)?.name;
      const label  = chName ? `#${chName}` : 'workspace';
      return { currentActivity: `Viewing ${label}`, currentPanel: 'messages' };
    };

    const ping = async () => {
      if (!endpointAvailable) return;
      const authData = localStorage.getItem('edutechex_token');
      const token = authData ? (() => { try { return JSON.parse(authData).token; } catch { return null; } })() : null;
      if (!token) return;
      try {
        const { currentActivity, currentPanel } = getCurrentActivity();
        const res = await fetch(`${API_BASE}/api/activity/heartbeat`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ currentActivity, currentPanel }),
        });
        if (res.status === 404) { endpointAvailable = false; clearInterval(intervalId); }
      } catch { /* network error — will retry */ }
    };

    ping();
    const intervalId = setInterval(ping, 60_000);
    return () => clearInterval(intervalId);
  }, [currentUserEmail, wikiOpen, kanbanOpen, calendarOpen, leaveOpen, activeChannel, channels]);

  // Tick every 60 s so "Xm ago" presence labels re-render automatically
  const [, setPresenceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPresenceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── E2E DM encryption — register public key with server once per login ────────
  useEffect(() => {
    if (!currentUserEmail) return;
    const authData = localStorage.getItem('edutechex_token');
    const token = authData ? (() => { try { return JSON.parse(authData).token; } catch { return null; } })() : null;
    if (!token) return;
    getOrCreateKeyPair().then(({ publicKeyJwk }) => publishPublicKey(publicKeyJwk, token)).catch(() => {});
  }, [currentUserEmail]);

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
        } catch {
          /* corrupt settings — ignore */
        }
      }

      const initials = user.name
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      // Use saved displayName only if it was saved for THIS user (already applied above via setSettings)
      const savedDisplayName = (() => {
        try {
          return JSON.parse(savedSettings ?? '{}')?.displayName ?? '';
        } catch {
          return '';
        }
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
    } catch {
      /* browser may block AudioContext without a user gesture */
    }
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

  async function sendMessage() {
    const text = composerMessage.trim();
    if (!text || !channel) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';
    const authData = localStorage.getItem('edutechex_token');
    const token = authData ? (() => { try { return JSON.parse(authData).token; } catch { return null; } })() : null;

    // Increment today's message count in the activity tracker (fire-and-forget)
    if (token) {
      fetch(`${API_BASE}/api/activity/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
    trackEvent('message_sent', { channel: channel?.name, channelId: activeChannelId });

    const mentionedMembers = activeChannelMembers.filter((member) => {
      if (member.email.toLowerCase() === currentUserEmail) return false;
      const lowerText = text.toLowerCase();
      const lowerName = member.name.toLowerCase();
      // Match @fullname, @firstname, or @lastname (word-level)
      if (lowerText.includes(`@${lowerName}`)) return true;
      const [firstName, ...rest] = lowerName.split(' ');
      const lastName = rest.join(' ');
      if (firstName && lowerText.includes(`@${firstName}`)) return true;
      if (lastName && lowerText.includes(`@${lastName}`)) return true;
      return false;
    });

    const localMsg = {
      id: `msg-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUserColor,
      timestamp: new Date().toISOString(),
      text,
    };

    if ((activeChannelId.startsWith('member-') || activeChannelId.startsWith('dm-')) && token) {
      // ── DM: encrypt before sending to server, keep plaintext locally ─────────
      const partnerEmail = activeChannelId.startsWith('member-')
        ? members.find((m) => m.id === activeChannelId)?.email
        : (() => {
            const myId = members.find((m) => m.email === currentUserEmail)?.id;
            const otherId = userIdFromDmChannel(activeChannelId, myId ?? '');
            return members.find((m) => m.id === otherId)?.email;
          })();
      let textToSend = text;
      if (partnerEmail) {
        try {
          const { privateKeyJwk } = await getOrCreateKeyPair();
          const partnerPub = await fetchPartnerPublicKey(partnerEmail, token);
          if (partnerPub) {
            const cKey = dmCacheKey(currentUserEmail, partnerEmail);
            textToSend = await encryptDMMessage(text, privateKeyJwk, partnerPub, cKey);
          }
        } catch { /* fallback: send plaintext */ }
      }
      // Optimistic local add with plaintext — socket echo is deduplicated and dropped
      addMessageFromSocket(activeChannelId, localMsg);
      // POST encrypted text to server
      fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...localMsg, channelId: activeChannelId, text: textToSend }),
      }).catch(() => {});
    } else {
      addMessage(activeChannelId, localMsg);
    }

    // @here / @channel — notify all channel members at once
    const isBroadcast = /@(here|channel)\b/i.test(text);
    if (isBroadcast) {
      const broadcastTargets = activeChannelMembers.filter(
        (m) => m.email.toLowerCase() !== currentUserEmail
      );
      if (broadcastTargets.length > 0) {
        addNotification({
          type: 'mention',
          actor: currentUser?.name ?? 'EduTechExOS',
          actorInitials: currentUser?.initials ?? 'OS',
          actorColor: currentUserColor,
          channel: channel.name,
          channelId: activeChannelId,
          message: text,
          recipientEmails: broadcastTargets.map((m) => m.email),
        });
        if (settings.soundNotifications) playNotificationSound();
        if (settings.desktopNotifications) {
          showDesktopNotification(
            `@${/@channel/i.test(text) ? 'channel' : 'here'} in #${channel.name}`,
            text
          );
        }
      }
    }

    if (mentionedMembers.length > 0) {
      addNotification({
        type: 'mention',
        actor: currentUser?.name ?? 'EduTechExOS',
        actorInitials: currentUser?.initials ?? 'OS',
        actorColor: currentUserColor,
        channel: channel.name,
        channelId: activeChannelId,
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

      // Auto-create a Kanban task for each @mentioned member
      mentionedMembers.forEach((member) => {
        addKanbanTask({
          text: text.slice(0, 200),
          assignee: member.name,
          assigneeInitials: member.initials,
          assigneeEmail: member.email,
          sourceChannel: `#${channel.name}`,
          status: 'todo',
        });
        addNotification({
          type: 'task',
          actor: currentUser?.name ?? 'EduTechExOS',
          actorInitials: currentUser?.initials ?? 'OS',
          actorColor: currentUserColor,
          channel: channel.name,
          channelId: activeChannelId,
          message: `📋 Task assigned to you: "${text.slice(0, 120)}"`,
          recipientEmails: [member.email],
        });
        trackEvent('task_created', {
          source: 'mention',
          channel: channel?.name,
          assignee: member.name,
        });
      });
    }

    setComposerMessage('');
    setMentionMenuOpen(false);
  }

  // Only top-level messages in main feed; replies live in the thread panel
  const visibleMessages = channelMessages.filter((m) => !m.parentId);
  const replyCount = (msgId: string) => channelMessages.filter((m) => m.parentId === msgId).length;

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

  function performSignOut() {
    // Broadcast offline immediately so other users see the dot go grey right away
    if (currentUser?.email) {
      getSocket().emit('user_status_update', { email: currentUser.email, status: 'offline' });
    }
    resetUserState();
    localStorage.removeItem('edutechex_token');
    localStorage.removeItem('edutechex_session_start');
    fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
    router.push('/sign-up-login-screen');
  }

  function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    localStorage.setItem(settingsKey(currentUser?.email ?? 'default'), JSON.stringify(settings));
    // Update display name live
    const newName = settings.displayName.trim() || (currentUser?.name ?? '');
    setCurrentUser((user) =>
      user ? { ...user, name: newName } : user
    );
    // Request desktop notification permission when first enabling
    if (
      settings.desktopNotifications &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }
    // Broadcast status & name to all connected users via socket
    if (currentUser?.email) {
      const socket = getSocket();
      socket.emit('user_status_update', {
        email: currentUser.email,
        status: settings.status,
        name: newName,
      });
      // Update own member entry in the store so the People list reflects immediately
      updateMemberStatus(currentUser.email, settings.status as MemberStatus);
      updateMemberName(currentUser.email, newName);
    }
    setSettingsOpen(false);
    toast.success('Settings saved');
  }

  async function handleChangePassword() {
    if (!currentUser?.email) return;
    if (pwNew.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (pwNew !== pwConfirm) {
      toast.error('New passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      const rawToken = localStorage.getItem('edutechex_token');
      const jwtToken = rawToken ? JSON.parse(rawToken).token : undefined;
      const result = await changePassword(currentUser.email, pwCurrent, pwNew, jwtToken);
      if (result.success) {
        toast.success('Password changed successfully!');
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
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

    const isRaw = !file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/');
    const maxBytes = isRaw ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`${file.name} is too large (max ${isRaw ? '5' : '10'} MB).`);
      event.target.value = '';
      return;
    }

    try {
      const folder = file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('video/')
          ? 'video'
          : 'files';
      const fileUrl = await smartUpload(file, { folder });

      addMessage(activeChannelId, {
        id: `msg-file-${Date.now()}`,
        sender: currentUser?.name ?? 'You',
        initials: currentUser?.initials ?? 'Y',
        color: currentUserColor,
        timestamp: new Date().toISOString(),
        text: composerMessage.trim(),
        files: [{ name: file.name, url: fileUrl, type: file.type }],
      });
      setComposerMessage('');
      toast.success('File shared to channel');
    } finally {
      event.target.value = '';
    }
  }

  async function createChannel(event: React.FormEvent) {
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
    // Persist to the backend so the channel survives logout/login.
    const result = await createWorkspaceChannel(cleanName, newChannelDescription.trim());
    if (!result.ok) {
      toast.error(result.error || 'Failed to create channel.');
      return;
    }
    setActiveChannel(result.id ?? cleanName);
    setNewChannelName('');
    setNewChannelDescription('');
    setNewChannelOpen(false);
    toast.success(`#${result.id ?? cleanName} created`);
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
      toast.error('Recording is not supported in this browser. Use Chrome or Firefox.');
      return;
    }

    // Pre-flight microphone permission check for audio recordings
    if (kind === 'audio' && navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (perm.state === 'denied') {
          toast.error(
            'Microphone is blocked. Open site settings (lock icon in address bar) → Microphone → Allow, then refresh.',
            { duration: 8000 }
          );
          return;
        }
      } catch {
        // permissions API not supported — proceed and let getUserMedia prompt
      }
    }

    try {
      setRecordingBusy(true);
      discardRecordingRef.current = false;
      const stream =
        kind === 'video'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      const mimeType =
        kind === 'video'
          ? MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : MediaRecorder.isTypeSupported('video/webm')
              ? 'video/webm'
              : ''
          : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
              ? 'audio/webm'
              : MediaRecorder.isTypeSupported('audio/mp4')
                ? 'audio/mp4'
                : '';
      // Cap the bitrate so recordings stay small enough to upload to the
      // backend (GridFS) and be viewable by everyone. Without a cap a screen
      // recording can exceed the upload limit and silently fall back to an
      // inline base64 blob that's too big to reach other users.
      const recorderOptions: MediaRecorderOptions = kind === 'video'
        ? { videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 128_000 }
        : { audioBitsPerSecond: 64_000 };
      if (mimeType) recorderOptions.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, recorderOptions);
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
    } catch (err: unknown) {
      setRecordingBusy(false);
      setRecordingType(null);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      if (isDenied) {
        toast.error(
          kind === 'audio'
            ? 'Microphone blocked. Click the lock icon in the browser address bar → Microphone → Allow, then try again.'
            : 'Screen share was cancelled or blocked. Click "Share" in the browser dialog to proceed.',
          { duration: 8000 }
        );
      } else {
        toast.error(`Could not start ${kind} recording. Try refreshing the page.`);
      }
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
      const folder = recordedPreview.kind === 'video' ? 'video' : 'audio';

      // Upload to backend GridFS; base64 data-URL fallback if the backend is
      // unreachable (e.g. cold start).
      const mediaUrl = await smartUpload(file, { folder });

      // If the upload fell back to an inline base64 blob that's too large, the
      // message would fail to persist/broadcast and only the sender would see
      // it. Reject it with a clear message instead of sending a broken one.
      if (mediaUrl.startsWith('data:') && mediaUrl.length > 18_000_000) {
        toast.error('Recording is too large to share. Please record a shorter clip and try again.');
        setRecordingSending(false);
        return;
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
    const mentionedWords = (composerMessage.match(/@(\w+)/g) ?? []).map((m) =>
      m.slice(1).toLowerCase()
    );
    const preMentionedIds =
      mentionedWords.length > 0
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

  async function handleJoinMeeting(_messageId: string, link: string) {
    // Scheduled meetings are open to the whole workspace — everyone joins the
    // same link, no invite-only gate. (Invitees still get the targeted email /
    // notification, but anyone in the team can join.)
    window.open(link, '_blank', 'noreferrer');
    broadcastStatus('in-meeting');
  }

  async function scheduleMeet(event: React.FormEvent) {
    event.preventDefault();
    if (!channel) return;

    const title = meetTitle.trim();
    if (!title || !meetDate || !meetTime) {
      toast.error('Please add a title and set a date & time for the meeting.');
      return;
    }

    // Generate a unique meeting code so each meeting has its own shareable link
    const meetingCode = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const googleMeetLink = companyMeetLink;
    const meetLink = `${window.location.origin}/meeting/${meetingCode}`;
    const inviteeNames = selectedInvitees.map((member) => `@${member.name}`).join(', ');
    // Only invited members get the email and notification
    const inviteeEmails = selectedInvitees
      .map((m) => m.email)
      .filter((e) => e && e.toLowerCase() !== currentUserEmail);
    const timeLabel = `${meetDate} at ${meetTime}`;
    const textLines = [
      `Meeting Scheduled: ${title}`,
      `Time: ${timeLabel}`,
      ...(inviteeNames ? [`Mentioned: ${inviteeNames}`] : []),
      `Join Link: ${meetLink}`,
    ];
    const text = textLines.join('\n');

    const msgId = `meeting-${Date.now()}`;
    addMessage(activeChannelId, {
      id: msgId,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUserColor,
      timestamp: new Date().toISOString(),
      text,
    });

    addNotification({
      type: 'task',
      actor: currentUser?.name ?? 'EduTechExOS',
      actorInitials: currentUser?.initials ?? 'OS',
      actorColor: currentUserColor,
      channel: channel.name,
      channelId: activeChannelId,
      message: `📅 Meeting scheduled: "${title}" on ${timeLabel}`,
      joinLink: meetLink,
      recipientEmails: inviteeEmails,
    });

    // Close the modal immediately — background work continues after
    setScheduleMeetOpen(false);
    setMeetTitle('');
    setMeetDate('');
    setMeetTime('');
    setMeetInviteeIds([]);
    setComposerMessage('');

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      composerRef.current?.focus();
    }, 200);

    // Run email + access-record creation concurrently in the background
    const authData = localStorage.getItem('edutechex_token');
    const token = authData ? JSON.parse(authData).token : null;
    const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';
    const authHeaders = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    // Compute the absolute start time so the backend can auto-start the meeting.
    const startAtIso = (() => {
      const d = new Date(`${meetDate}T${meetTime}`);
      return isNaN(d.getTime()) ? null : d.toISOString();
    })();

    // 1. Always create meeting access record (stores meetLink, code, and the
    //    scheduled start time so the join page works and the meeting auto-starts)
    fetch(`${BACKEND}/api/meeting-access`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messageId: msgId,
        channelId: activeChannelId,
        allowedEmails: inviteeEmails,
        meetingCode,
        meetLink: googleMeetLink,
        startAt: startAtIso,
        title,
        channelName: channel?.name ?? activeChannelId,
      }),
    }).catch((err) => console.error('[meeting-access] record creation failed:', err));

    // 2. Always send email to every mentioned person (not gated by settings toggle)
    if (inviteeEmails.length > 0) {
      try {
        const emailRes = await fetch(`${BACKEND}/api/meetings/invite`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ title, time: timeLabel, joinLink: meetLink, channelId: activeChannelId, inviteeEmails }),
        });
        const emailResult = await emailRes.json().catch(() => ({}));
        if (emailResult.success) {
          toast.success(`Meeting scheduled. Invite emailed to ${emailResult.sent} member${emailResult.sent === 1 ? '' : 's'}.`);
          trackEvent('meeting_scheduled', { emailInviteSent: true, inviteeCount: emailResult.sent });
        } else {
          toast.warning(`Meeting scheduled — email delivery failed. Share the link manually.`);
        }
      } catch {
        toast.warning('Meeting scheduled — could not send email invites. Share the link manually.');
      }
    } else {
      toast.success('Meeting scheduled successfully.');
      trackEvent('meeting_scheduled', { emailInviteSent: false });
    }
  }

  function startNewMeeting() {
    if (!channel) return;
    window.open('https://meet.google.com/new', '_blank');
    setShareMeetLinkValue('');
    setShareMeetLinkOpen(true);
    broadcastStatus('in-meeting');
  }

  function shareInstantMeetLink() {
    if (!channel || !shareMeetLinkValue.trim()) return;
    const meetLink = shareMeetLinkValue.trim();

    addMessage(activeChannelId, {
      id: `meeting-started-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUserColor,
      timestamp: new Date().toISOString(),
      text: `📹 **Instant Meet Started**\n\n[Click here to join the meeting](${meetLink})\n\nEveryone who clicks this link will enter the same room.`,
    });

    // Notify ALL workspace members via notifications + real-time socket
    const allOtherMembers = members.filter(
      (member) => member.email.toLowerCase() !== currentUserEmail
    );
    if (allOtherMembers.length > 0) {
      addNotification({
        type: 'mention',
        actor: currentUser?.name ?? 'EduTechExOS',
        actorInitials: currentUser?.initials ?? 'OS',
        actorColor: currentUserColor,
        channel: channel.name,
        message: `started a meeting in #${channel.name}. Join: ${meetLink}`,
        joinLink: meetLink,
        recipientEmails: allOtherMembers.map((member) => member.email),
      } as Parameters<typeof addNotification>[0]);
    }

    // Real-time popup toast for all currently online users
    getSocket().emit('meeting_started', {
      link: meetLink,
      channelName: channel.name,
      starter: currentUser?.name ?? 'Someone',
      starterInitials: currentUser?.initials ?? 'OS',
      starterColor: currentUserColor,
    });

    toast.success('Meeting link shared! All workspace members can join.');
    setShareMeetLinkOpen(false);
    setShareMeetLinkValue('');
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

  // ── Pending-approval gate ────────────────────────────────────────────────────
  if (currentUser?.status === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F7F6FF 0%, #ECEAF8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#FFFFFF', borderRadius: 20, border: '1.5px solid rgba(91,79,219,0.15)', boxShadow: '0 24px 72px rgba(91,79,219,0.12)', padding: 40, textAlign: 'center' }}>
          {/* Animated icon */}
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(91,79,219,0.12), rgba(139,63,219,0.12))', border: '2px solid rgba(91,79,219,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5B4FDB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(91,79,219,0.12)', animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
          </div>
          <style>{`@keyframes ping { 75%,100% { transform: scale(1.4); opacity: 0; } }`}</style>

          <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, color: '#1A1B3A', letterSpacing: '-0.03em', margin: '0 0 10px' }}>
            Awaiting Approval
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(90,95,128,0.70)', lineHeight: 1.7, margin: '0 0 24px' }}>
            Hi <strong>{currentUser.name.split(' ')[0]}</strong>! Your account is pending admin review. You will receive an email and this page will automatically update once approved.
          </p>

          {/* Status badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,122,152,0.08)', border: '1.5px solid rgba(245,122,152,0.22)', borderRadius: 20, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF476F', display: 'inline-block', animation: 'ping 1.5s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#EF476F', letterSpacing: '.12em', textTransform: 'uppercase' }}>Pending Admin Approval</span>
          </div>

          <div style={{ background: 'rgba(91,79,219,0.04)', borderRadius: 12, border: '1px solid rgba(91,79,219,0.10)', padding: '14px 18px', marginBottom: 28, textAlign: 'left' }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(90,95,128,0.50)', letterSpacing: '.18em', textTransform: 'uppercase' }}>Your account</p>
            <p style={{ margin: '4px 0', fontSize: 13, color: '#1A1B3A' }}><strong>Email:</strong> {currentUser.email}</p>
            <p style={{ margin: '4px 0', fontSize: 13, color: '#1A1B3A' }}><strong>Role:</strong> {currentUser.role}</p>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('edutechex_token');
              localStorage.removeItem('edutechex_session_start');
              window.location.replace('/sign-up-login-screen');
            }}
            style={{ width: '100%', padding: '13px', background: 'transparent', border: '1.5px solid rgba(26,27,58,0.12)', borderRadius: 10, fontSize: 12, fontWeight: 700, color: 'rgba(90,95,128,0.65)', cursor: 'pointer', letterSpacing: '.08em', transition: 'all .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(91,79,219,0.30)'; (e.currentTarget as HTMLButtonElement).style.color = '#5B4FDB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(26,27,58,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(90,95,128,0.65)'; }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Rejected gate ────────────────────────────────────────────────────────────
  if (currentUser?.status === 'rejected') {
    return (
      <div style={{ minHeight: '100vh', background: '#FFF8F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 440, background: '#FFFFFF', borderRadius: 20, border: '1.5px solid rgba(239,71,111,0.18)', boxShadow: '0 24px 72px rgba(239,71,111,0.10)', padding: 40, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,71,111,0.10)', border: '2px solid rgba(239,71,111,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF476F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: '#1A1B3A', margin: '0 0 10px' }}>Access Declined</h2>
          <p style={{ fontSize: 13.5, color: 'rgba(90,95,128,0.70)', lineHeight: 1.7, margin: '0 0 24px' }}>
            Your access request was not approved. Please contact the workspace admin for further information.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('edutechex_token');
              localStorage.removeItem('edutechex_session_start');
              window.location.replace('/sign-up-login-screen');
            }}
            style={{ width: '100%', padding: '13px', background: '#EF476F', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', letterSpacing: '.08em' }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root dashboard-workspace-no-panel text-[#1E2636]">
      {/* ------------------------------------------------------ LEFT ICON RAIL ------------------------------------------------------ */}

      {/* ══ MOBILE HEADER ══ */}
      <div className="mobile-header">
        <button
          className="mobile-header-btn"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open channels"
        >
          <Menu size={20} strokeWidth={2.5} />
        </button>
        <div className="mobile-header-channel">
          <span className="mobile-header-hash">#</span>
          <span className="mobile-header-name">{channel?.name ?? 'general'}</span>
        </div>
        <button
          className="mobile-header-btn"
          onClick={() => setGlobalSearchOpen(true)}
          aria-label="Search"
        >
          <Search size={18} strokeWidth={2.5} />
        </button>
        <button
          className="mobile-header-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <Settings size={18} strokeWidth={2.5} />
        </button>
        <div
          className="mobile-header-avatar"
          style={{ background: currentUserColor }}
          onClick={() => setSettingsOpen(true)}
          role="button"
          tabIndex={0}
        >
          {currentUser?.name
            ?.split(' ')
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) ?? '?'}
        </div>
      </div>

      {/* ══ MOBILE DRAWER BACKDROP ══ */}
      {mobileSidebarOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ══ MOBILE CHANNEL DRAWER ══ */}
      <div className={`mobile-drawer${mobileSidebarOpen ? ' open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#3E4A89,#4f52a0)' }}
            >
              <AppLogo size={14} />
            </div>
            <span className="text-[14px] font-black text-white">EduTechExOS</span>
          </div>
          <button className="mobile-drawer-close" onClick={() => setMobileSidebarOpen(false)}>
            <X size={15} />
          </button>
        </div>

        <div className="px-3 py-2.5 border-b border-[rgba(62,74,137,0.10)]">
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              setGlobalSearchOpen(true);
            }}
            className="sidebar-search-input w-full"
          >
            <Search size={13} />
            <span className="text-[12.5px]">Search workspace…</span>
          </button>
        </div>

        <div className="sidebar-scroll flex-1">
          <section className="mb-4">
            <p className="sidebar-section-label mt-2">Channels</p>
            {channels
              .filter((c: { id: string }) => !c.id.startsWith('member-'))
              .map((ch: { id: string; name: string }) => {
                const isActive = ch.id === activeChannelId;
                const unread = unreadCounts[ch.id] ?? 0;
                return (
                  <button
                    key={ch.id}
                    className={`sidebar-channel-btn${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setActiveChannel(ch.id);
                      clearUnread(ch.id);
                      setMobileSidebarOpen(false);
                      setMobileTab('chat');
                    }}
                  >
                    <Hash size={13} style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }} />
                    <span className="min-w-0 flex-1 truncate">{ch.name}</span>
                    {unread > 0 && !isActive && (
                      <span className="ml-auto shrink-0 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#EF476F] px-1 text-[9px] font-black text-white" style={{ height: 18 }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
          </section>
          <section>
            <p className="sidebar-section-label">Direct Messages</p>
            {channels
              .filter((c: { id: string }) => c.id.startsWith('member-'))
              .map((ch: { id: string; name: string }) => {
                const isActive = ch.id === activeChannelId;
                const member = members.find(
                  (m: { email: string; onLeave?: boolean }) => `member-${m.email}` === ch.id
                );
                const initials = ch.name
                  .split(' ')
                  .map((p: string) => p[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const statusColor = (member as { status?: string } | undefined)?.status === 'online'
                  ? 'bg-emerald-400'
                  : (member as { status?: string } | undefined)?.status === 'away'
                  ? 'bg-amber-400'
                  : (member as { status?: string } | undefined)?.status === 'in-meeting'
                  ? 'bg-red-400'
                  : 'bg-[#7C859E]';
                const dmUnread = unreadCounts[ch.id] ?? 0;
                return (
                  <button
                    key={ch.id}
                    className={`sidebar-channel-btn${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setActiveChannel(ch.id);
                      clearUnread(ch.id);
                      setMobileSidebarOpen(false);
                      setMobileTab('chat');
                    }}
                  >
                    <span
                      className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#3E4A89,#2A3568)' }}
                    >
                      {initials}
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#191E2F] ${statusColor}`} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{ch.name}</span>
                    {(member as { onLeave?: boolean } | undefined)?.onLeave && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700">Leave</span>
                    )}
                    {dmUnread > 0 && !isActive && (
                      <span className="ml-1 shrink-0 flex min-w-[18px] items-center justify-center rounded-full bg-[#EF476F] px-1 text-[9px] font-black text-white" style={{ height: 18 }}>
                        {dmUnread > 99 ? '99+' : dmUnread}
                      </span>
                    )}
                  </button>
                );
              })}
          </section>
        </div>

        <div className="sidebar-footer">
          <UserAttendanceCalendar />
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: currentUserColor }}
              >
                {currentUser?.name
                  ?.split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) ?? '?'}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${settings.status === 'online' ? 'bg-emerald-400' : settings.status === 'away' ? 'bg-amber-400' : settings.status === 'in-meeting' ? 'bg-red-400' : 'bg-[#7C859E]'}`}
                style={{ borderColor: '#0E1120' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold" style={{ color: '#000000' }}>{currentUser?.name}</p>
              <p className="truncate text-[10px]" style={{ color: '#333333' }}>
                {currentUser?.role}
              </p>
            </div>
            <button
              onClick={() => { toast.success('Signed out'); performSignOut(); }}
              className="flex h-7 w-7 items-center justify-center rounded"
              style={{ color: '#000000' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ══ MOBILE TASKS PANEL (full-screen) ══ */}
      {mobileTab === 'tasks' && (
        <div className="mobile-panel-overlay">
          <div className="mobile-panel-header">
            <button className="mobile-header-btn" onClick={() => setMobileTab('chat')}>
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <span className="mobile-panel-title">Tasks</span>
          </div>
          <div className="mobile-panel-body">
            <KanbanBoard onClose={() => setMobileTab('chat')} />
          </div>
        </div>
      )}

      {/* ══ MOBILE AI PANEL (full-screen) ══ */}
      {mobileTab === 'ai' && (
        <div className="mobile-panel-overlay" style={{ background: '#FAFAF8' }}>
          <AIPanel activeChannel={activeChannelId} onClose={() => setMobileTab('chat')} />
        </div>
      )}

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="mobile-nav">
        <button className="mobile-nav-btn" onClick={() => setMobileSidebarOpen(true)}>
          {unreadNotifications > 0 && (
            <span className="mobile-nav-badge">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
          <Hash size={20} strokeWidth={2} />
          Channels
        </button>
        <button
          className={`mobile-nav-btn${mobileTab === 'chat' ? ' active' : ''}`}
          onClick={() => setMobileTab('chat')}
        >
          <MessageSquare size={20} strokeWidth={2} />
          Chat
        </button>
        <button
          className={`mobile-nav-btn${mobileTab === 'tasks' ? ' active' : ''}`}
          onClick={() => setMobileTab('tasks')}
        >
          <Layout size={20} strokeWidth={2} />
          Tasks
        </button>
        <button
          className={`mobile-nav-btn${mobileTab === 'ai' ? ' active' : ''}`}
          onClick={() => {
            if (mobileTab !== 'ai') trackEvent('ai_copilot_opened', { channel: channel?.name });
            setMobileTab('ai');
          }}
        >
          <Bot size={20} strokeWidth={2} />
          Copilot
        </button>
        <button className="mobile-nav-btn" onClick={() => setSettingsOpen(true)}>
          <Settings size={20} strokeWidth={2} />
          More
        </button>
      </nav>

      <nav className="workspace-rail">
        <div className="rail-top">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="rail-logo-wrap"
            style={{
              background: 'linear-gradient(135deg,#5B6CF8 0%,#7B52E8 100%)',
              boxShadow: '0 4px 16px rgba(91,108,248,0.50)',
            }}
          >
            <AppLogo size={18} />
          </motion.div>

          <div className="rail-divider" />

          <motion.button whileTap={{ scale: 0.9 }} className="rail-btn active">
            <Hash size={19} strokeWidth={2.2} />
            <span className="rail-label">Chat</span>
          </motion.button>

          {[
            { icon: CheckSquare, label: 'Tasks',    action: () => setKanbanOpen(true)   },
            { icon: BookOpen,    label: 'Wiki',     action: () => setWikiOpen(true)     },
            { icon: StickyNote,  label: 'Notes',    action: () => setNotepadOpen(true)  },
            { icon: CalendarDays,label: 'Calendar', action: () => setCalendarOpen(true) },
          ].map(({ icon: Icon, label, action }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.9 }}
              onClick={action}
              className="rail-btn"
            >
              <Icon size={19} strokeWidth={1.8} />
              <span className="rail-label">{label}</span>
            </motion.button>
          ))}
        </div>

        <div className="rail-bottom">
          <div className="rail-divider" />

          {/* ActivityWatch status indicator */}
          <div
            title={
              awStatus === 'connected' ? 'ActivityWatch connected — syncing desktop activity'
              : awStatus === 'offline'  ? 'ActivityWatch not detected — install & open ActivityWatch on this machine'
              : 'Checking for ActivityWatch…'
            }
            className="rail-btn cursor-default select-none"
          >
            <div className="relative flex items-center justify-center">
              <Activity
                size={19}
                strokeWidth={1.8}
                className={
                  awStatus === 'connected' ? 'text-emerald-500'
                  : awStatus === 'offline' ? 'text-[#C5CAE0]'
                  : 'text-[#9BA6D3]'
                }
              />
              {awStatus === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              )}
            </div>
            <span
              className={`rail-label ${
                awStatus === 'connected' ? 'text-emerald-600'
                : awStatus === 'offline' ? 'text-[#C5CAE0]'
                : 'text-[#9BA6D3]'
              }`}
            >
              {awStatus === 'connected' ? 'AW Live' : awStatus === 'offline' ? 'AW Off' : 'AW…'}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              toggleTheme();
              storeDarkModeToggle();
            }}
            className="rail-btn"
          >
            {darkMode ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            <span className="rail-label">{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setSettings((v) => ({ ...v, displayName: v.displayName || currentUser?.name || '' }));
              setSettingsOpen(true);
            }}
            className="rail-btn"
          >
            <Settings size={18} strokeWidth={1.8} />
            <span className="rail-label">Settings</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setSettings((v) => ({ ...v, displayName: v.displayName || currentUser?.name || '' }));
              setSettingsOpen(true);
            }}
            className="rail-avatar"
            style={
              settings.avatarEmoji
                ? { background: 'transparent', fontSize: '1.35rem', lineHeight: 1 }
                : { background: currentUserColor }
            }
          >
            {settings.avatarEmoji || (currentUser?.initials ?? 'G')}
          </motion.button>

          {/* Notifications rail button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setNotificationsOpen(true)}
            className="rail-btn relative"
            style={unreadNotifications > 0 ? { color: '#ef4444' } : {}}
          >
            <Bell size={18} strokeWidth={2} />
            <span className="rail-label">Alerts</span>
            {unreadNotifications > 0 && (
              <span
                className="badge-pulse absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[8px] font-black text-white"
                style={{ background: '#ef4444' }}
              >
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </motion.button>
        </div>
      </nav>

      {/* ------------------------------------------------------ SIDEBAR ------------------------------------------------------ */}
      <aside className="workspace-sidebar">
        {/* ── Workspace header + search ─────────────────── */}
        <div className="sidebar-search-bar">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px] flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6C7BF5,#5055E8)', boxShadow: '0 2px 8px rgba(108,123,245,0.4)' }}>
                <span className="text-[11px] font-black text-white">E</span>
              </div>
              <span className="text-[13px] font-bold text-white tracking-[-0.01em] truncate">EduTechExOS</span>
            </div>
            {unreadNotifications > 0 && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setNotificationsOpen(true)}
                className="relative flex h-6 w-6 items-center justify-center rounded"
                style={{ color: 'rgba(255,255,255,0.55)' }}
                title="Notifications"
              >
                <Bell size={14} />
                <span
                  className="badge-pulse absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-black text-white"
                  style={{ background: '#ef4444' }}
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              </motion.button>
            )}
          </div>
          <button onClick={() => setGlobalSearchOpen(true)} className="sidebar-search-input w-full">
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
              onClick={() => setChannelsExpanded((v) => !v)}
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
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                          delay: i * 0.04,
                        }}
                        whileHover={{ x: isActive ? 0 : 5 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { setActiveChannel(item.id); clearUnread(item.id); }}
                        className={`sidebar-channel-btn${isActive ? ' active' : ''}`}
                      >
                        {/* Animated active-channel left bar — moves smoothly between channels */}
                        {isActive && (
                          <motion.span
                            layoutId="active-channel-bar"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full"
                            style={{ background: 'linear-gradient(180deg,#818CF8,#6C7BF5)', boxShadow: '0 0 8px rgba(108,123,245,0.6)' }}
                            transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                          />
                        )}
                        <Hash size={13} style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }} />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        {(() => {
                          const count = (unreadCounts[item.id] ?? 0) + (item.unread ?? 0);
                          return count > 0 && !isActive ? (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                              className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                              style={{ background: '#EF476F', color: '#ffffff' }}
                            >
                              {count > 99 ? '99+' : count}
                            </motion.span>
                          ) : null;
                        })()}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* People */}
          <section>
            <p className="sidebar-section-label mt-3">People</p>
            <div className="space-y-0.5">
              {people.map((member, i) => {
                const avatarColors = [
                  '#4338ca',
                  '#0891b2',
                  '#7c3aed',
                  '#059669',
                  '#d97706',
                  '#dc2626',
                  '#2563eb',
                ];
                const avatarBg = avatarColors[i % avatarColors.length];
                return (
                  <motion.div
                    key={member.id}
                    initial={{ x: -18, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                      delay: i * 0.045 + 0.12,
                    }}
                    whileHover={{ x: 4 }}
                    className="group flex h-9 items-center gap-2 rounded px-1.5 transition-colors duration-100 hover:bg-white/[0.06] cursor-pointer"
                  >
                    <motion.button
                      onClick={() => {
                        if (member.id === currentMemberId) {
                          setSettingsOpen(true);
                          setSettingsTab('profile');
                        } else {
                          setActiveChannel(member.id);
                        }
                      }}
                      whileTap={{ scale: 0.95 }}
                      title={member.id === currentMemberId ? 'Edit your profile' : `Chat with ${member.name}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <div
                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                        style={{ background: avatarBg }}
                      >
                        {member.initials}
                        {(() => {
                          const isSelf = member.id === currentMemberId;
                          const memberRecord = members.find(m => m.id === member.id);
                          const explicitStatus = memberRecord?.status;
                          const s = isSelf
                            ? settings.status
                            : explicitStatus ?? getPresenceStatus(member.email);
                          return (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${
                                s === 'online'     ? 'bg-emerald-400'
                                : s === 'away'       ? 'bg-amber-400'
                                : s === 'in-meeting' ? 'bg-red-400'
                                : 'bg-[#7C859E]'
                              }`}
                              style={{ boxShadow: '0 0 0 2px var(--sidebar-bg, #0E1120)' }}
                            />
                          );
                        })()}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col">
                        <span
                          className="truncate text-[13px] leading-tight"
                          style={{ color: 'var(--sidebar-text)' }}
                        >
                          {member.name}
                        </span>
                        {member.id !== currentMemberId && (() => {
                          const memberRecord = members.find(m => m.id === member.id);
                          if (memberRecord?.onLeave) {
                            return (
                              <span className="truncate text-[10px] font-bold leading-tight text-amber-400">
                                On leave
                              </span>
                            );
                          }
                          const label = getLastSeenLabel(member.email);
                          const isOnline = getPresenceStatus(member.email) === 'online';
                          if (!label) return null;
                          return (
                            <span
                              className="truncate text-[10px] leading-tight"
                              style={{ color: isOnline ? '#10C98A' : 'rgba(124,133,158,0.7)' }}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      {/* DM unread badge */}
                      {(() => {
                        const dmChId = member.id;
                        const dmUnread = unreadCounts[dmChId] ?? 0;
                        return dmUnread > 0 ? (
                          <span className="shrink-0 flex min-w-[18px] items-center justify-center rounded-full bg-[#EF476F] px-1 text-[9px] font-black text-white" style={{ height: 18 }}>
                            {dmUnread > 99 ? '99+' : dmUnread}
                          </span>
                        ) : null;
                      })()}
                    </motion.button>

                    <motion.button
                      onClick={() => setProfileMember(member)}
                      whileTap={{ scale: 0.88 }}
                      title={`View ${member.name}'s profile`}
                      className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md group-hover:flex"
                      style={{
                        color: 'var(--sidebar-muted)',
                        background: 'var(--sidebar-hover)',
                      }}
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
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200"
                style={{
                  background: 'rgba(108,123,245,0.12)',
                  color: '#818CF8',
                  border: '1px solid rgba(108,123,245,0.22)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(108,123,245,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(108,123,245,0.12)'; }}
              >
                <ShieldCheck size={13} strokeWidth={2.5} />
                Admin Control
              </Link>
              <motion.button
                whileHover={{ borderColor: 'rgba(62,74,137,0.30)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setNewChannelOpen(true)}
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-4 text-sm font-semibold transition-all duration-200"
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.38)',
                  border: '1px dashed rgba(255,255,255,0.15)',
                }}
              >
                <Plus size={14} />
                New channel
              </motion.button>
            </div>
          )}

          {/* ── Desktop Tracking Setup Banner ─────────────── */}
          {(showSetupBanner || (awStatus !== 'connected' && !awBannerDismissed)) && (
            <div style={{ margin: '14px 8px 8px', borderRadius: 14, background: '#1A1F35', border: '1.5px solid rgba(99,102,241,0.35)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF476F', flexShrink: 0, animation: 'ping 1.5s infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', flex: 1 }}>
                    Desktop Tracking Not Active
                  </span>
                  <button
                    onClick={() => { setAwBannerDismissed(true); localStorage.setItem('aw_banner_dismissed', '1'); setShowSetupBanner(false); }}
                    title="Dismiss setup banner"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(165,180,252,0.5)', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                  >×</button>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(165,180,252,0.85)', lineHeight: 1.55, margin: 0 }}>
                  Follow the 3 steps below so admin can see your <strong style={{ color: '#A5B4FC' }}>VS Code</strong>, <strong style={{ color: '#A5B4FC' }}>Chrome</strong> and <strong style={{ color: '#A5B4FC' }}>Figma</strong> activity in real time.
                </p>
              </div>

              {/* Steps */}
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* Step 1 */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,0.25)', border: '1.5px solid rgba(99,102,241,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#A5B4FC', flexShrink: 0, marginTop: 1 }}>1</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', margin: '0 0 3px' }}>Download &amp; Install ActivityWatch</p>
                    <p style={{ fontSize: 10.5, color: 'rgba(165,180,252,0.65)', margin: '0 0 6px', lineHeight: 1.5 }}>
                      Free &amp; open-source. Runs silently in the background and tracks which apps you use.
                    </p>
                    <a
                      href="https://activitywatch.net/downloads/"
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 7, background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(99,102,241,0.40)', padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#A5B4FC', textDecoration: 'none' }}
                    >
                      Download ActivityWatch →
                    </a>
                  </div>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,0.25)', border: '1.5px solid rgba(99,102,241,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#A5B4FC', flexShrink: 0, marginTop: 1 }}>2</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', margin: '0 0 3px' }}>Download the aw-sync.js Agent</p>
                    <p style={{ fontSize: 10.5, color: 'rgba(165,180,252,0.65)', margin: '0 0 6px', lineHeight: 1.5 }}>
                      This small script reads your ActivityWatch data and sends it to EduTechExOS every 5 minutes.
                    </p>
                    <a
                      href="/aw-sync.js"
                      download="aw-sync.js"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 7, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}
                    >
                      Download aw-sync.js ↓
                    </a>
                  </div>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,0.25)', border: '1.5px solid rgba(99,102,241,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#A5B4FC', flexShrink: 0, marginTop: 1 }}>3</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', margin: '0 0 3px' }}>Run the command in your terminal</p>
                    <p style={{ fontSize: 10.5, color: 'rgba(165,180,252,0.65)', margin: '0 0 6px', lineHeight: 1.5 }}>
                      Open a terminal in the folder where you saved <code style={{ fontSize: 10, color: '#A5B4FC', background: 'rgba(99,102,241,0.15)', borderRadius: 3, padding: '0 4px' }}>aw-sync.js</code> and run:
                    </p>
                    <div style={{ background: '#0D1020', borderRadius: 8, padding: '10px 12px', position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <code style={{ fontSize: 10.5, color: '#10B981', display: 'block', lineHeight: 2, whiteSpace: 'pre', fontFamily: 'monospace' }}>{`node aw-sync.js ^\n  --email ${currentUserEmail} ^\n  --password YOUR_PASSWORD ^\n  --startup`}</code>
                      <button
                        onClick={() => {
                          const cmd = `node aw-sync.js --email ${currentUserEmail} --password YOUR_PASSWORD --startup`;
                          navigator.clipboard?.writeText(cmd).then(() => {
                            const el = document.getElementById('aw-copy-btn');
                            if (el) { el.textContent = 'Copied!'; setTimeout(() => { if (el) el.textContent = 'Copy'; }, 2000); }
                          });
                        }}
                        id="aw-copy-btn"
                        style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, color: '#A5B4FC', background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}
                      >Copy</button>
                    </div>
                    <p style={{ fontSize: 10.5, color: 'rgba(165,180,252,0.60)', marginTop: 7, lineHeight: 1.6 }}>
                      Replace <code style={{ color: '#F59E0B', fontSize: 10, background: 'rgba(245,158,11,0.10)', borderRadius: 3, padding: '0 4px' }}>YOUR_PASSWORD</code> with your EduTechExOS login password.<br />
                      The <code style={{ color: '#A5B4FC', fontSize: 10, background: 'rgba(99,102,241,0.15)', borderRadius: 3, padding: '0 4px' }}>--startup</code> flag makes it auto-run every time Windows starts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning footer */}
              <div style={{ margin: '0 10px 10px', display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>⚠️</span>
                <span style={{ fontSize: 11, color: 'rgba(253,186,116,0.90)', lineHeight: 1.55 }}>
                  <strong style={{ color: '#FCD34D' }}>Important:</strong> Make sure ActivityWatch is open and running before you run the command above. This banner disappears automatically as soon as your activity is detected.
                </span>
              </div>
            </div>
          )}
        </div>

          {/* ── Restore banner link (shown when banner is dismissed) ── */}

        {/* ── Footer / User panel ─────────────────────────── */}
        <div className="sidebar-footer">
          <UserAttendanceCalendar />
          <SessionTimer />
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: currentUserColor }}
              >
                {currentUser?.initials ?? 'G'}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${settings.status === 'online' ? 'bg-emerald-400' : settings.status === 'away' ? 'bg-amber-400' : settings.status === 'in-meeting' ? 'bg-red-400' : 'bg-[#7C859E]'}`}
                style={{ borderColor: '#0E1120' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight" style={{ color: '#000000' }}>
                {currentUser?.name ?? 'Guest'}
              </p>
              <p className="text-[10.5px]" style={{ color: '#555555' }}>
                {currentUser?.role ?? 'Viewer'}
              </p>
              {/* Screen time */}
              <p className="text-[9.5px] font-bold tracking-wide" style={{ color: 'rgba(62,74,137,0.65)' }}>
                {(() => {
                  const h = Math.floor(sessionSeconds / 3600);
                  const m = Math.floor((sessionSeconds % 3600) / 60);
                  const s = sessionSeconds % 60;
                  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m screen time`;
                  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s screen time`;
                  return `${s}s screen time`;
                })()}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <motion.button
                whileTap={{ scale: 0.88 }}
                title="Set up desktop tracking"
                onClick={() => setShowSetupBanner((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded"
                style={{ color: showSetupBanner ? '#6366f1' : '#000000' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.07)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Monitor size={14} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                title="Activity"
                onClick={() => setActivityCalendarOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded"
                style={{ color: '#000000' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.07)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <CalendarDays size={14} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                title="Sign out"
                onClick={() => { toast.success('Signed out'); performSignOut(); }}
                className="flex h-7 w-7 items-center justify-center rounded"
                style={{ color: '#000000' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.14)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#000000';
                }}
              >
                <LogOut size={14} />
              </motion.button>
            </div>
          </div>
        </div>
      </aside>

      <main
        className={`workspace-chat${(pinnedMessageIds[activeChannelId]?.length ?? 0) > 0 ? ' workspace-chat-has-pin' : ''}`}
      >
        <header className="chat-header">
          {/* Channel name box */}
          <div className="min-w-0 relative">
            <div className="inline-flex items-center gap-2.5">
              {/* Hash badge */}
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-[14px] font-black"
                style={{
                  background: 'linear-gradient(135deg, #6C7BF5, #5055E8)',
                  boxShadow: '0 2px 12px rgba(108,123,245,0.40)',
                }}
              >
                #
              </span>
              {/* Channel name */}
              <span
                className="truncate text-[20px] font-black leading-tight max-w-[140px] sm:max-w-[260px]"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
              >
                {channel?.id.startsWith('member-') ? channel.name : channel?.name}
              </span>
            </div>

            {channel?.description && (
              <p
                className="mt-1 truncate text-[13px] font-medium pl-1"
                style={{ color: '#7C859E' }}
              >
                {channel.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              title="View channel members"
              onClick={() => setMembersOpen(true)}
              className="hidden h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold md:flex transition-all"
              style={{
                background: 'rgba(108,123,245,0.08)',
                color: '#6C7BF5',
                border: '1px solid rgba(108,123,245,0.16)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,123,245,0.14)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,123,245,0.08)'; }}
            >
              <Users size={14} strokeWidth={2} />
              {channel?.id.startsWith('member-') ? 2 : activeChannelMembers.length}
            </button>
            <button
              title="Search messages"
              onClick={() => setGlobalSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
              style={{ color: '#9CA3AF', background: 'rgba(108,123,245,0.06)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,123,245,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#6C7BF5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,123,245,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
            >
              <Search size={16} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMeetMenuOpen((value) => !value)}
                className={`flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-black uppercase text-white shadow-sm transition-all hover:scale-105 ${
                  meetingButtonState.link ? '' : 'bg-[#7C859E] cursor-default'
                }`}
                style={
                  meetingButtonState.link
                    ? {
                        background: 'linear-gradient(135deg, #6C7BF5, #5055E8)',
                        boxShadow: '0 2px 12px rgba(108,123,245,0.35)',
                      }
                    : undefined
                }
              >
                <Video size={16} />
                {meetingButtonState.label}
                <ChevronDown size={14} />
              </button>
              {meetMenuOpen && (
                <div className="absolute right-0 top-11 z-[300] w-68 rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-2 shadow-xl" style={{ width: 272 }}>
                  {/* Instant meet */}
                  <button
                    onClick={() => { setMeetMenuOpen(false); startNewMeeting(); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[rgba(62,74,137,0.08)] transition-colors group"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 group-hover:bg-green-200 transition-colors">
                      <Video size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1E2636]">Instant Meet</p>
                      <p className="text-[11px] text-[#7C859E]">Generate link &amp; share in chat</p>
                    </div>
                  </button>
                  <div className="my-1.5 h-px mx-1" style={{ background: 'rgba(62,74,137,0.08)' }} />
                  {/* Day-specific links */}
                  <p className="px-3 pb-1 text-[9px] font-black uppercase tracking-[0.15em] text-[#9BA6D3]">Team Meeting Links</p>
                  {getGoogleMeetLinks(settings).map(({ label, link, days }) => {
                    const isActive = meetingButtonState.link === link;
                    return (
                      <button
                        key={label}
                        onClick={() => { setMeetMenuOpen(false); window.open(link, '_blank', 'noreferrer'); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[rgba(62,74,137,0.06)] transition-colors group mt-0.5"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                          style={{ background: isActive ? 'rgba(108,123,245,0.15)' : 'rgba(62,74,137,0.07)' }}
                        >
                          <Video size={13} style={{ color: isActive ? '#6C7BF5' : '#7C859E' }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-[#1E2636]">{label}</p>
                          <p className="text-[10px] text-[#9BA6D3]">{days}</p>
                        </div>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-black text-[#6C7BF5]">Today</span>
                        )}
                      </button>
                    );
                  })}
                  {meetingButtonState.link && (
                    <>
                      <div className="my-1.5 h-px mx-1" style={{ background: 'rgba(62,74,137,0.08)' }} />
                      <button
                        onClick={() => { setMeetMenuOpen(false); setScheduleMeetOpen(true); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[rgba(62,74,137,0.06)] transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                          <CalendarDays size={15} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#4A5578]">Schedule Meeting</p>
                          <p className="text-[11px] text-[#7C859E]">Pick date &amp; invite team</p>
                        </div>
                      </button>
                    </>
                  )}
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
                    onClick={() => {
                      setMoreOpen(false);
                      setMembersOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Users size={15} /> View members
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setGlobalSearchOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Search size={15} /> Search messages
                  </button>

                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setWikiOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <BookOpen size={15} /> Knowledge base
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setKanbanOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Layout size={15} /> Task board
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setBookmarksPanelOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <Bookmark size={15} /> Saved messages
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setNotepadOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <StickyNote size={15} /> Notes
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setCalendarOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                  >
                    <CalendarDays size={15} /> Team calendar
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        setAnalyticsOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]"
                    >
                      <BarChart2 size={15} /> Analytics
                    </button>
                  )}


                </div>
              )}
            </div>
          </div>
        </header>
        {/* Pinned messages strip — click to jump to pinned message */}
        {channel &&
          (pinnedMessageIds[activeChannelId]?.length ?? 0) > 0 &&
          (() => {
            const pinIds = pinnedMessageIds[activeChannelId] ?? [];
            const idx = pinScrollIdx % pinIds.length;
            const targetId = pinIds[pinIds.length - 1 - idx];
            const targetMsg = channelMessages.find((m) => m.id === targetId);
            return (
              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById(`msg-${targetId}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setPinScrollIdx((s) => s + 1);
                }}
                className="flex w-full items-center gap-3 border-y border-amber-200 bg-amber-50/80 px-5 py-3 text-left shadow-sm transition-colors hover:bg-amber-100/80"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-white shadow-sm">
                  <Pin size={13} strokeWidth={2.5} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {pinIds.length > 1
                      ? `Pinned  ${idx + 1} of ${pinIds.length}`
                      : 'Pinned message'}
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
                const gap5m = (a: string, b: string) =>
                  new Date(b).getTime() - new Date(a).getTime() > 5 * 60 * 1000;
                const isFirst =
                  !prev ||
                  prev.sender !== message.sender ||
                  gap5m(prev.timestamp, message.timestamp);
                const isLast =
                  !next ||
                  next.sender !== message.sender ||
                  gap5m(message.timestamp, next.timestamp);
                const scheduledMeet = parseScheduledMeet(message.text);
                const isInstantMeet = message.id?.startsWith('meeting-started-');
                const instantMeetLink = isInstantMeet ? message.text?.match(/\[Click here to join the meeting\]\(([^)]+)\)/)?.[1] : undefined;
                const isPinned = (pinnedMessageIds[activeChannelId] ?? []).includes(message.id);
                const isBookmarked = bookmarkedMessageIds.includes(message.id);
                const taskCard = message.taskCard;

                return (
                  <div
                    key={message.id}
                    id={`msg-${message.id}`}
                    className={`flex items-end gap-2 ${isFirst ? (settings.compactChat ? 'mt-2' : 'mt-4') : 'mt-0.5'} ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar — receiver only, first in group */}
                    {!isOwn && (
                      <div className="shrink-0">
                        {isFirst ? (
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: message.color }}
                          >
                            {message.initials}
                          </div>
                        ) : (
                          <div className="h-8 w-8" />
                        )}
                      </div>
                    )}

                    {/* Bubble column */}
                    <div
                      className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender name — receiver, first in group only */}
                      {isFirst && !isOwn && (
                        <span
                          className="mb-0.5 ml-1 text-xs font-bold"
                          style={{ color: message.color }}
                        >
                          {message.sender}
                        </span>
                      )}

                      {/* Main bubble */}
                      {!message.poll && (
                        <div
                          className={`relative group/bubble rounded-2xl px-3.5 py-2.5 shadow-sm
                        ${
                          isOwn
                            ? `bg-[#1E2538] text-white border border-[rgba(62,74,137,0.15)] ${isLast ? 'bubble-own rounded-br-sm' : ''}`
                            : `bg-white border border-[rgba(62,74,137,0.08)] text-[#1E2636] ${isLast ? 'bubble-other rounded-bl-sm' : ''}`
                        }
                        ${isPinned ? 'ring-2 ring-amber-400' : ''}
                      `}
                        >
                          {/* Content */}
                          {taskCard ? (
                            /* -- Task Card -- */
                            <div style={{ width: 272, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(91,79,219,0.18)', border: '1px solid rgba(91,79,219,0.20)' }}>
                              <div style={{ height: 3, background: 'linear-gradient(90deg, #5B4FDB, #7B6FEB, #10C98A)' }} />
                              <div style={{ background: 'linear-gradient(135deg, #1A1B3A, #252D4A)', padding: '14px 16px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(91,79,219,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B6FEB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M7 6H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-2"/><path d="M9 12l2 2 4-4"/></svg>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(155,166,211,0.65)', margin: 0 }}>Task Assigned</p>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: '1px 0 0' }}>#{channel?.name}</p>
                                  </div>
                                  <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: '#10C98A', background: 'rgba(16,201,138,0.15)', padding: '3px 8px', borderRadius: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>TASK</span>
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(212,216,235,0.90)', margin: 0, lineHeight: 1.5 }}>
                                  {taskCard.taskText.slice(0, 120)}
                                </p>
                              </div>
                              <div style={{ background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: taskCard.assigneeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                  {taskCard.assigneeInitials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 10, color: 'rgba(90,95,128,0.55)', margin: 0, fontWeight: 600 }}>Assigned to</p>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1B3A', margin: '1px 0 0' }}>@{taskCard.assignee}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#5B4FDB' }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                  Kanban
                                </div>
                              </div>
                            </div>
                          ) : isInstantMeet && instantMeetLink ? (
                            <MeetingStartedCard
                              title={`${message.sender} started a meeting`}
                              subtitle="Join on Google Meet"
                              meetLink={instantMeetLink}
                            />
                          ) : scheduledMeet ? (
                            /* ── Meeting Scheduled Card ─────────────────── */
                            <div
                              className="w-full max-w-[288px] overflow-hidden rounded-2xl"
                              style={{
                                boxShadow:
                                  '0 8px 32px rgba(25,30,47,0.18), 0 2px 8px rgba(25,30,47,0.10)',
                                border: '1px solid rgba(155,166,211,0.22)',
                              }}
                            >
                              {/* ── Top accent line ── */}
                              <div
                                style={{
                                  height: '2px',
                                  background:
                                    'linear-gradient(90deg, transparent, #3E4A89, #9BA6D3, #3E4A89, transparent)',
                                }}
                              />

                              {/* ── Dark header ── */}
                              <div
                                className="relative px-4 pt-4 pb-4 overflow-hidden"
                                style={{
                                  background:
                                    'linear-gradient(135deg, #191E2F 0%, #1E2538 60%, #252D4A 100%)',
                                }}
                              >
                                {/* bg glow */}
                                <div
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    background:
                                      'radial-gradient(ellipse 70% 80% at 85% 30%, rgba(62,74,137,0.28), transparent 70%)',
                                  }}
                                />

                                <div className="relative flex items-start gap-3">
                                  {/* Icon */}
                                  <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 mt-0.5"
                                    style={{
                                      background: 'linear-gradient(135deg, #3E4A89, #2A3568)',
                                      boxShadow: '0 4px 14px rgba(62,74,137,0.50)',
                                    }}
                                  >
                                    <Video size={17} className="text-white" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    {/* Status pill */}
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <span
                                        className="inline-block w-1.5 h-1.5 rounded-full"
                                        style={{
                                          background: '#34D399',
                                          boxShadow: '0 0 6px rgba(52,211,153,0.70)',
                                          animation: 'badge-pulse 2.5s ease-in-out infinite',
                                        }}
                                      />
                                      <span
                                        className="text-[9px] font-black uppercase tracking-[0.22em]"
                                        style={{ color: 'rgba(155,166,211,0.80)' }}
                                      >
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
                                        style={{
                                          background: 'rgba(62,74,137,0.08)',
                                          border: '1px solid rgba(62,74,137,0.14)',
                                        }}
                                      >
                                        <CalendarDays size={13} style={{ color: '#3E4A89' }} />
                                      </div>
                                      <span
                                        className="text-[13px] font-bold"
                                        style={{ color: '#1E2636' }}
                                      >
                                        {scheduledMeet.time}
                                      </span>
                                    </div>
                                  )}
                                  {scheduledMeet.people &&
                                    scheduledMeet.people !== 'No mentions' && (
                                      <div className="flex items-center gap-2.5">
                                        <div
                                          className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                                          style={{
                                            background: 'rgba(62,74,137,0.08)',
                                            border: '1px solid rgba(62,74,137,0.14)',
                                          }}
                                        >
                                          <Users size={13} style={{ color: '#3E4A89' }} />
                                        </div>
                                        <span
                                          className="text-[13px] font-medium truncate"
                                          style={{ color: '#4A5578' }}
                                        >
                                          {scheduledMeet.people}
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </div>

                              {/* ── Divider ── */}
                              <div
                                style={{
                                  height: '1px',
                                  margin: '0 16px',
                                  background:
                                    'linear-gradient(90deg, transparent, rgba(62,74,137,0.18), transparent)',
                                }}
                              />

                              {/* ── Join button ── */}
                              <div className="px-4 pt-3 pb-4" style={{ background: '#FAF8F5' }}>
                                {meetJoinState[message.id] === 'denied' ? (
                                  <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-black" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                                    <Lock size={13} />
                                    You are not invited
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleJoinMeeting(message.id, scheduledMeet.link)}
                                    disabled={meetJoinState[message.id] === 'checking'}
                                    className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-black text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                                    style={{
                                      background: 'linear-gradient(135deg, #3E4A89 0%, #2A3568 100%)',
                                      boxShadow: '0 4px 14px rgba(62,74,137,0.38), inset 0 1px 0 rgba(255,255,255,0.12)',
                                    }}
                                  >
                                    {meetJoinState[message.id] === 'checking' ? (
                                      <>
                                        <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                        Checking access...
                                      </>
                                    ) : (
                                      <>
                                        <Video size={14} />
                                        Join Meeting
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`leading-relaxed ${settings.fontSize === 'large' ? 'text-xl' : 'text-[16px]'} ${isOwn ? 'text-white' : 'text-[#1E2636]'}`}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => (
                                    <p className="mb-1 last:mb-0">
                                      {React.Children.map(children, (child) =>
                                        typeof child === 'string'
                                          ? renderWithMentions(
                                              child,
                                              isOwn,
                                              members.map((m) => m.name)
                                            )
                                          : child
                                      )}
                                    </p>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-bold">{children}</strong>
                                  ),
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  code: ({ children, className }) => {
                                    const isBlock = String(className ?? '').includes('language-');
                                    return isBlock ? (
                                      <pre className="my-1 overflow-x-auto rounded-lg bg-black/20 p-2 text-xs text-green-300">
                                        <code>{children}</code>
                                      </pre>
                                    ) : (
                                      <code
                                        className={`rounded px-1 py-0.5 font-mono text-xs ${isOwn ? 'bg-white/20 text-white' : 'bg-[rgba(62,74,137,0.08)] text-[#3E4A89]'}`}
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                  blockquote: ({ children }) => (
                                    <blockquote
                                      className={`border-l-4 pl-3 italic text-xs ${isOwn ? 'border-white/40 text-white/80' : 'border-[rgba(62,74,137,0.25)] text-[#7C859E]'}`}
                                    >
                                      {children}
                                    </blockquote>
                                  ),
                                  a: ({ href, children }) => (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`underline ${isOwn ? 'text-white/90' : 'text-green-700'}`}
                                    >
                                      {children}
                                    </a>
                                  ),
                                }}
                              >
                                {message.text}
                              </ReactMarkdown>
                            </div>
                          )}

                          {/* Link preview card */}
                          {message.linkPreview && !scheduledMeet && (
                            <a
                              href={message.linkPreview.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-2 block overflow-hidden rounded-xl border transition-colors hover:opacity-90
                              ${isOwn ? 'border-white/20 bg-white/10' : 'border-[rgba(62,74,137,0.12)] bg-[#FAF8F5]'}`}
                            >
                              {message.linkPreview.image && (
                                <img
                                  src={message.linkPreview.image}
                                  alt=""
                                  className="h-32 w-full object-cover"
                                />
                              )}
                              <div className="px-3 py-2">
                                {message.linkPreview.siteName && (
                                  <p
                                    className={`text-[10px] font-black uppercase tracking-wider ${isOwn ? 'text-white/50' : 'text-[#7C859E]'}`}
                                  >
                                    {message.linkPreview.siteName}
                                  </p>
                                )}
                                {message.linkPreview.title && (
                                  <p
                                    className={`text-sm font-bold leading-snug ${isOwn ? 'text-white' : 'text-[#1E2636]'}`}
                                  >
                                    {message.linkPreview.title}
                                  </p>
                                )}
                                {message.linkPreview.description && (
                                  <p
                                    className={`mt-0.5 text-xs line-clamp-2 ${isOwn ? 'text-white/70' : 'text-[#7C859E]'}`}
                                  >
                                    {message.linkPreview.description}
                                  </p>
                                )}
                                <p
                                  className={`mt-1 flex items-center gap-1 text-[10px] ${isOwn ? 'text-white/40' : 'text-[#9BA6D3]'}`}
                                >
                                  <ExternalLink size={10} />
                                  {new URL(message.linkPreview.url).hostname}
                                </p>
                              </div>
                            </a>
                          )}

                          {/* Audio */}
                          {message.audioUrl && (
                            <div
                              className={`mt-2 rounded-xl p-2 ${isOwn ? 'bg-white/10' : 'bg-[#FAF8F5]'}`}
                            >
                              <audio className="w-48 h-8" controls src={message.audioUrl}>
                                <track kind="captions" />
                              </audio>
                              <p
                                className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}
                              >
                                Voice note
                              </p>
                            </div>
                          )}

                          {/* Video */}
                          {message.videoUrl && (
                            <div className="mt-2 w-56">
                              <video
                                className="w-full rounded-xl bg-black"
                                controls
                                src={message.videoUrl}
                              >
                                <track kind="captions" />
                              </video>
                              <p
                                className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}
                              >
                                Screen recording
                              </p>
                            </div>
                          )}

                          {/* Files */}
                          {message.files && message.files.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {message.files.map((file, fi) => (
                                <a
                                  key={fi}
                                  href={file.url}
                                  {...(file.url?.startsWith('data:')
                                    ? { download: file.name }
                                    : { target: '_blank', rel: 'noreferrer' })}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold transition-colors
                                  ${isOwn ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-[rgba(62,74,137,0.12)] bg-white text-[#4A5578] hover:border-[rgba(62,74,137,0.15)]'}`}
                                >
                                  📎 {file.name}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Timestamp + double-tick */}
                          <div
                            className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}
                          >
                            <span>{formatTime(message.timestamp)}</span>
                            {isOwn && (
                              <svg
                                width="16"
                                height="11"
                                viewBox="0 0 16 11"
                                fill="currentColor"
                                className="opacity-80"
                              >
                                <path d="M11.071.653a.75.75 0 0 1 .001 1.06l-5.78 5.79a.75.75 0 0 1-1.063 0L1.928 5.2a.75.75 0 1 1 1.062-1.059l1.769 1.77L10.01.653a.75.75 0 0 1 1.061 0z" />
                                <path
                                  d="M15.071.653a.75.75 0 0 1 .001 1.06l-5.78 5.79a.75.75 0 0 1-.532.22.75.75 0 0 1-.532-1.28L13.01.653a.75.75 0 0 1 1.061 0z"
                                  opacity="0.6"
                                />
                              </svg>
                            )}
                          </div>

                          {/* Hover action bar — floats beside the bubble */}
                          <div
                            className={`absolute ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} top-0 hidden group-hover/bubble:flex items-center`}
                          >
                            <div className="flex items-center gap-0.5 rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-1 shadow-lg">
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setHoverEmojiMsgId(
                                      hoverEmojiMsgId === message.id ? null : message.id
                                    )
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm hover:bg-[rgba(62,74,137,0.08)]"
                                  title="React"
                                >
                                  😊
                                </button>
                                {hoverEmojiMsgId === message.id && (
                                  <div
                                    className={`absolute top-full mt-1 z-30 flex gap-1 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white p-1.5 shadow-xl ${isOwn ? 'right-0' : 'left-0'}`}
                                  >
                                    {['👍', '❤️', '😂', '🔥', '👀', '✅', '🎉', '💯'].map((em) => (
                                      <button
                                        key={em}
                                        onClick={() => {
                                          toggleReaction(
                                            activeChannelId,
                                            message.id,
                                            em,
                                            currentUser?.email ?? ''
                                          );
                                          setHoverEmojiMsgId(null);
                                        }}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-lg hover:scale-110 hover:bg-[rgba(62,74,137,0.08)] transition-all"
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {!message.isDeleted && (
                                <button
                                  onClick={() => {
                                    setActiveThread(
                                      activeThreadId === message.id ? null : message.id
                                    );
                                    setThreadReplyText('');
                                  }}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(62,74,137,0.08)] ${activeThreadId === message.id ? 'text-[#3E4A89]' : 'text-[#7C859E] hover:text-[#3E4A89]'}`}
                                  title="Reply in thread"
                                >
                                  <MessageSquare size={13} />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  toggleBookmark(message.id, {
                                    channelId: activeChannelId,
                                    text: message.text,
                                    sender: message.sender,
                                    timestamp: message.timestamp,
                                  })
                                }
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(62,74,137,0.08)] ${isBookmarked ? 'text-amber-500' : 'text-[#7C859E] hover:text-amber-500'}`}
                                title={isBookmarked ? 'Remove bookmark' : 'Save'}
                              >
                                <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => {
                                  if (isPinned) {
                                    unpinMessage(activeChannelId, message.id);
                                  } else {
                                    pinMessage(activeChannelId, message.id);
                                  }
                                }}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(62,74,137,0.08)] ${isPinned ? 'text-amber-500' : 'text-[#7C859E] hover:text-amber-500'}`}
                                title={isPinned ? 'Unpin' : 'Pin'}
                              >
                                <Pin size={13} />
                              </button>
                              {!message.isDeleted && !message.poll && (
                                <button
                                  onClick={() =>
                                    setForwardingMsg({
                                      id: message.id,
                                      text: message.text ?? '',
                                      sender: message.sender,
                                    })
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#3E4A89]"
                                  title="Forward message"
                                >
                                  <Share2 size={13} />
                                </button>
                              )}
                              {(isOwn || isAdmin) && (
                                <button
                                  onClick={() => deleteMessage(activeChannelId, message.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-red-50 hover:text-red-600"
                                  title="Delete"
                                >
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
                          <p className="mb-3 text-sm font-bold text-[#1E2636]">
                            📊 {message.poll.question}
                          </p>
                          <div className="space-y-2">
                            {message.poll.options.map((opt, i) => {
                              const total = message.poll!.options.reduce(
                                (s, o) => s + o.votes.length,
                                0
                              );
                              const pct = total ? Math.round((opt.votes.length / total) * 100) : 0;
                              return (
                                <div
                                  key={i}
                                  className="relative overflow-hidden rounded-xl border border-[rgba(62,74,137,0.15)] bg-white"
                                >
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-l-xl bg-indigo-100"
                                    style={{ width: `${pct}%` }}
                                  />
                                  <div className="relative flex items-center justify-between px-3 py-2">
                                    <span className="text-sm font-semibold text-[#4A5578]">
                                      {opt.text}
                                    </span>
                                    <span className="text-xs font-bold text-green-700">{pct}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-[11px] text-[#7C859E]">
                            {message.poll.options.reduce((s, o) => s + o.votes.length, 0)} votes
                          </p>
                        </div>
                      )}

                      {/* Reactions */}
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div
                          className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          {Object.entries(message.reactions).map(([emoji, users]: [string, any]) =>
                            users.length > 0 ? (
                              <button
                                key={emoji}
                                onClick={() =>
                                  toggleReaction(
                                    activeChannelId,
                                    message.id,
                                    emoji,
                                    currentUser?.email ?? ''
                                  )
                                }
                                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all
                                ${
                                  users.includes(currentUser?.email ?? '')
                                    ? 'border-[rgba(62,74,137,0.15)] bg-indigo-100 font-bold text-[#3E4A89]'
                                    : 'border-[rgba(62,74,137,0.12)] bg-white text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)]'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{users.length}</span>
                              </button>
                            ) : null
                          )}
                        </div>
                      )}

                      {/* Thread reply count */}
                      {!message.isDeleted && replyCount(message.id) > 0 && (
                        <button
                          onClick={() => {
                            setActiveThread(activeThreadId === message.id ? null : message.id);
                            setThreadReplyText('');
                          }}
                          className={`mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold transition-colors
                          ${
                            activeThreadId === message.id
                              ? 'bg-indigo-50 text-[#3E4A89]'
                              : 'text-[#3E4A89] hover:bg-indigo-50'
                          }`}
                        >
                          <MessageSquare size={12} />
                          {replyCount(message.id)}{' '}
                          {replyCount(message.id) === 1 ? 'reply' : 'replies'}
                        </button>
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
        {channel &&
          (() => {
            const typers = (typingUsers[activeChannelId] ?? []).filter(
              (name) => name !== currentUser?.name
            );
            if (!typers.length) return null;
            const label =
              typers.length === 1
                ? `${typers[0]} is typing�¦`
                : typers.length === 2
                  ? `${typers[0]} and ${typers[1]} are typing�¦`
                  : 'Several people are typing�¦';
            return (
              <div className="flex items-center gap-2 px-5 py-1.5 text-[13px] text-[#616161]">
                <span className="flex gap-[3px] items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="typing-dot"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
                {label}
              </div>
            );
          })()}

        <footer className="shrink-0 border-t border-[rgba(62,74,137,0.08)] bg-[#FAF8F5]/95 backdrop-blur-md px-4 py-3">
          {/* Mention dropdown */}
          {mentionMenuOpen &&
            (broadcastSuggestions.length > 0 || mentionSuggestions.length > 0) && (
              <div className="mb-2 overflow-hidden rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] dark:bg-[#191E2F] shadow-xl">
                {broadcastSuggestions.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => insertMention(b.id.slice(1))}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-sm font-bold text-amber-700">
                      @
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                        {b.label}
                      </p>
                      <p className="text-xs text-[#7C859E]">{b.desc}</p>
                    </div>
                  </button>
                ))}
                {mentionSuggestions.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => insertMention(member.name)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[rgba(62,74,137,0.08)] transition-colors"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1E2636] dark:text-white">
                        {member.name}
                      </p>
                      <p className="text-xs text-[#7C859E]">{member.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

          {/* Emoji picker */}
          {emojiMenuOpen && (
            <div
              ref={emojiPanelRef}
              className="mb-2 rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-3 shadow-xl"
            >
              <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      insertComposerText(emoji);
                      setEmojiMenuOpen(false);
                    }}
                    className="flex h-8 items-center justify-center rounded-lg text-lg hover:scale-110 hover:bg-[rgba(62,74,137,0.08)] transition-all"
                  >
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
              <button
                ref={emojiBtnRef}
                onClick={() => {
                  setEmojiMenuOpen((v) => !v);
                  setMentionMenuOpen(false);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${emojiMenuOpen ? 'bg-[rgba(62,74,137,0.08)] text-green-700' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]'}`}
                title="Emoji"
              >
                <Smile size={18} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] transition-colors"
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={() => startRecording('audio')}
                disabled={recordingBusy || !!recordingType}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${recordingType === 'audio' ? 'animate-pulse bg-red-100 text-red-600' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]'}`}
                title="Voice note"
              >
                <Mic size={18} />
              </button>
              <button
                onClick={() => startRecording('video')}
                disabled={recordingBusy || !!recordingType}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${recordingType === 'video' ? 'animate-pulse bg-red-100 text-red-600' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]'}`}
                title="Screen record"
              >
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
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7C859E]">
                        Meeting
                      </p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => {
                          setMeetInputMenuOpen(false);
                          startNewMeeting();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[rgba(62,74,137,0.08)] transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-green-700 group-hover:bg-[rgba(62,74,137,0.12)] transition-colors">
                          <Video size={15} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#1E2636]">Start Meet</p>
                          <p className="text-[11px] text-[#7C859E]">Instant Google Meet</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setMeetInputMenuOpen(false);
                          openScheduleMeet();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                          <CalendarPlus size={15} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#1E2636]">Schedule Meet</p>
                          <p className="text-[11px] text-[#7C859E]">
                            {composerMessage.includes('@')
                              ? 'Uses your @mentions'
                              : 'Pick who to invite'}
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
              <div
                className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 mb-0.5"
                style={{
                  background: 'rgba(139,92,246,0.10)',
                  border: '1px solid rgba(139,92,246,0.22)',
                }}
              >
                {recordingType === 'audio' ? (
                  /* Voice → animated waveform */
                  <div className="flex items-center gap-[2.5px]" style={{ height: 28 }}>
                    {[
                      0.4, 0.7, 1, 0.6, 0.9, 0.5, 1, 0.75, 0.55, 0.85, 0.45, 0.95, 0.65, 0.8, 0.5,
                      0.7, 0.4, 0.9, 0.6, 1, 0.5, 0.75, 0.85, 0.45, 0.65,
                    ].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'inline-block',
                          width: 3,
                          borderRadius: 9999,
                          background: 'linear-gradient(to top, #7C859E, #C4CAE0)',
                          animationName: 'waveBar',
                          animationDuration: `${0.6 + (i % 5) * 0.12}s`,
                          animationDelay: `${(i * 0.04) % 0.5}s`,
                          animationTimingFunction: 'ease-in-out',
                          animationIterationCount: 'infinite',
                          animationDirection: 'alternate',
                          minHeight: 4,
                          maxHeight: 24,
                          height: `${h * 24}px`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  /* Screen → pulsing REC dot + monitor icon + label */
                  <div className="flex items-center gap-2" style={{ height: 28 }}>
                    <span className="relative flex h-2.5 w-2.5">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ background: '#ef4444' }}
                      />
                      <span
                        className="relative inline-flex h-2.5 w-2.5 rounded-full"
                        style={{ background: '#ef4444' }}
                      />
                    </span>
                    <Monitor size={17} style={{ color: '#C4CAE0' }} strokeWidth={2.2} />
                    <span className="text-xs font-bold" style={{ color: '#C4CAE0' }}>
                      Recording screen
                    </span>
                  </div>
                )}
                {/* Timer */}
                <span className="text-xs font-bold tabular-nums mx-1" style={{ color: '#C4CAE0' }}>
                  {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:
                  {String(recordingDuration % 60).padStart(2, '0')}
                </span>
                {/* Divider */}
                <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(139,92,246,0.25)' }} />
                {/* Stop button */}
                <button
                  onClick={() => stopRecording(false)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all hover:scale-105"
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.22)',
                  }}
                  title="Stop recording"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: '#ef4444' }}
                  />
                  Stop
                </button>
                {/* Preview button */}
                <button
                  onClick={() => stopRecording(true)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all hover:scale-105"
                  style={{
                    background: 'rgba(139,92,246,0.14)',
                    color: '#C4CAE0',
                    border: '1px solid rgba(139,92,246,0.25)',
                  }}
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
                  style={{
                    background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                    color: '#fff',
                    border: 'none',
                  }}
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
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
                if (event.key === 'Escape') {
                  setEmojiMenuOpen(false);
                  setMentionMenuOpen(false);
                }
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #C4CAE0, #7C859E)', color: '#191E2F' }}
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </main>

      {/* ------------------------------------------------------ RIGHT ICON RAIL ------------------------------------------------------ */}
      <nav className="workspace-right-rail">
        {/* Calendar / workspace tools — teal accent */}
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setAvailabilityOpen(true)} className="rail-btn"
          style={{ color: '#000000' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'rgba(20,184,166,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'transparent'; }}
        >
          <CalendarCheck size={18} strokeWidth={1.8} />
          <span className="rail-label">Avail.</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setPeopleStatusOpen(true)} className="rail-btn"
          style={{ color: '#000000' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'rgba(16,185,129,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Users size={18} strokeWidth={1.8} />
          <span className="rail-label">People</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setLeaveOpen(true)} className="rail-btn"
          style={{ color: '#000000' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'rgba(245,158,11,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'transparent'; }}
        >
          <CalendarX size={18} strokeWidth={1.8} />
          <span className="rail-label">Leave</span>
        </motion.button>



        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setStandupOpen(true)} className="rail-btn"
          style={{ color: '#000000' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'rgba(10,232,208,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Clock size={18} strokeWidth={1.8} />
          <span className="rail-label">Standup</span>
        </motion.button>

        {isAdmin && (
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setAnalyticsOpen(true)} className="rail-btn"
            style={{ color: '#000000' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#000000'; e.currentTarget.style.background = 'transparent'; }}
          >
            <BarChart2 size={18} strokeWidth={1.8} />
            <span className="rail-label">Analytics</span>
          </motion.button>
        )}

        <div className="rail-divider" />

        {/* Channel tools — Pinned + Saved */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setRightSidePanel(rightSidePanel === 'pinned' ? null : 'pinned')}
          className="rail-btn"
          style={rightSidePanel === 'pinned'
            ? { background: 'rgba(245,158,11,0.16)', color: '#000000' }
            : { color: '#000000' }}
        >
          <Pin size={18} strokeWidth={2} />
          <span className="rail-label">Pinned</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setRightSidePanel(rightSidePanel === 'bookmarked' ? null : 'bookmarked')}
          className="rail-btn"
          style={rightSidePanel === 'bookmarked'
            ? { background: 'rgba(245,158,11,0.16)', color: '#000000' }
            : { color: '#000000' }}
        >
          <Bookmark size={18} strokeWidth={2} />
          <span className="rail-label">Saved</span>
        </motion.button>

        {/* Bottom: Copilot */}
        <div style={{ marginTop: 'auto' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const next = rightPanel === 'ai' ? 'closed' : 'ai';
              if (next === 'ai') trackEvent('ai_copilot_opened', { channel: channel?.name });
              setRightPanel(next);
            }}
            className="rail-btn"
            style={rightPanel === 'ai'
              ? { color: '#000000', background: 'rgba(139,92,246,0.22)', border: '1px solid rgba(139,92,246,0.30)' }
              : { color: '#000000', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.18)' }}
          >
            <Bot size={18} strokeWidth={2} />
            <span className="rail-label">Copilot</span>
          </motion.button>
        </div>
      </nav>

      {/* ── AI Copilot modal overlay ───────────────────────────────── */}
      <AnimatePresence>
        {rightPanel === 'ai' && (
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[199] flex items-center justify-center bg-[rgba(15,18,34,0.55)] backdrop-blur-sm p-4"
            onClick={() => setRightPanel('closed')}
          >
            <motion.div
              key="ai-popup"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.7 }}
              className="w-full max-w-[420px] overflow-hidden rounded-2xl shadow-2xl"
              style={{ height: '82vh', display: 'flex', flexDirection: 'column' }}
              onClick={(e) => e.stopPropagation()}
            >
              <AIPanel activeChannel={activeChannelId} onClose={() => setRightPanel('closed')} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pinned messages slide-in panel ────────────────────────── */}
      <AnimatePresence>
        {rightSidePanel === 'pinned' &&
          (() => {
            const pinIds = pinnedMessageIds[activeChannelId] ?? [];
            const pinnedMsgs = pinIds
              .map((id) => channelMessages.find((m) => m.id === id))
              .filter(Boolean);
            return (
              <motion.div
                key="pinned-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                className="fixed top-0 right-14 z-[150] h-full w-80 border-l border-[rgba(62,74,137,0.08)] bg-white dark:bg-[#141928] shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.08)] dark:border-slate-800 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3E4A89]/10 dark:bg-[#3E4A89]/20">
                      <Pin size={13} className="text-[#3E4A89] dark:text-[#9BA6D3]" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1E2636] dark:text-white leading-none">Pinned</p>
                      <p className="text-[10px] text-[#7C859E] dark:text-slate-500 mt-0.5">#{channel?.name ?? activeChannelId}</p>
                    </div>
                    {pinIds.length > 0 && (
                      <span className="ml-1 rounded-full bg-[#3E4A89] px-2 py-0.5 text-[10px] font-black text-white">
                        {pinIds.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setRightSidePanel(null)}
                    className="rounded-lg p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800 hover:text-[#4A5578] transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {pinnedMsgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                        <Pin size={22} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-bold text-[#4A5578] dark:text-slate-400">Nothing pinned yet</p>
                      <p className="text-xs text-[#9BA6D3] dark:text-slate-600 mt-1 leading-relaxed">
                        Right-click any message and choose <strong>Pin</strong> to keep it here.
                      </p>
                    </div>
                  ) : (
                    pinnedMsgs.map(
                      (msg) =>
                        msg && (
                          <div
                            key={msg.id}
                            className="group rounded-xl border border-[rgba(62,74,137,0.1)] dark:border-slate-700 bg-[#F8F9FC] dark:bg-[#1A2035] overflow-hidden"
                          >
                            {/* Pin label */}
                            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                              <Pin size={9} className="text-[#3E4A89]/50 dark:text-slate-500" strokeWidth={2.5} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#3E4A89]/50 dark:text-slate-500">
                                Pinned message
                              </span>
                            </div>

                            {/* Message body */}
                            <div className="px-3 pb-2">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: msg.color }}
                                >
                                  {msg.initials}
                                </div>
                                <span className="text-xs font-bold text-[#1E2636] dark:text-white">{msg.sender}</span>
                                <span className="text-[10px] text-[#9BA6D3] dark:text-slate-500 ml-auto tabular-nums">
                                  {formatTime(msg.timestamp)}
                                </span>
                              </div>

                              {msg.text && (
                                <p className="text-xs text-[#4A5578] dark:text-[#9BA6D3] leading-relaxed line-clamp-4 mb-1.5">
                                  {msg.text}
                                </p>
                              )}

                              {/* File attachments */}
                              {msg.files && msg.files.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                                  {msg.files.map((f: {name: string; url: string; type: string}, fi: number) => (
                                    <a
                                      key={fi}
                                      href={f.url}
                                      {...(f.url?.startsWith('data:')
                                        ? { download: f.name }
                                        : { target: '_blank', rel: 'noreferrer' })}
                                      className="inline-flex items-center gap-1 rounded-lg border border-[rgba(62,74,137,0.15)] dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-[10px] font-semibold text-[#4A5578] dark:text-slate-300 hover:border-[#3E4A89]/30 transition-colors"
                                    >
                                      <Paperclip size={9} />
                                      <span className="max-w-[140px] truncate">{f.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 border-t border-[rgba(62,74,137,0.06)] dark:border-slate-700/50 px-3 py-2">
                              <button
                                onClick={() => {
                                  document
                                    .getElementById(`msg-${msg.id}`)
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-[#3E4A89] dark:text-[#9BA6D3] hover:text-[#2A3568] dark:hover:text-white transition-colors"
                              >
                                <ChevronDown size={10} className="-rotate-90" />
                                Jump to
                              </button>
                              <span className="text-[#E2E6F0] dark:text-slate-700">·</span>
                              <button
                                onClick={() => unpinMessage(activeChannelId, msg.id)}
                                className="text-[10px] font-bold text-[#7C859E] dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              >
                                Unpin
                              </button>
                            </div>
                          </div>
                        )
                    )
                  )}
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
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-600">
                  {bookmarkedMessageIds.length}
                </span>
              </div>
              <button
                onClick={() => setRightSidePanel(null)}
                className="rounded-lg p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]"
              >
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
              ) : (
                (() => {
                  const saved = bookmarkedMessageIds
                    .map((id) => {
                      const found = Object.values(messages)
                        .flatMap((arr) => arr)
                        .find((m) => m.id === id);
                      return found;
                    })
                    .filter(Boolean);
                  return saved.map(
                    (msg) =>
                      msg && (
                        <div
                          key={msg.id}
                          className="rounded-xl border border-[rgba(62,74,137,0.08)] bg-[#FAF8F5] p-3"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{ backgroundColor: msg.color }}
                            >
                              {msg.initials}
                            </div>
                            <span className="text-xs font-bold text-[#4A5578]">{msg.sender}</span>
                            <span className="text-[10px] text-[#7C859E] ml-auto">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-[#4A5578] leading-relaxed line-clamp-3">
                            {msg.text}
                          </p>
                          <button
                            onClick={() => toggleBookmark(msg.id)}
                            className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-700"
                          >
                            Remove bookmark
                          </button>
                        </div>
                      )
                  );
                })()
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Thread Panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {activeThreadId &&
          (() => {
            const rootMsg = channelMessages.find((m) => m.id === activeThreadId);
            const replies = channelMessages.filter((m) => m.parentId === activeThreadId);
            const sendReply = () => {
              const text = threadReplyText.trim();
              if (!text || !currentMember) return;
              addMessage(activeChannelId, {
                id: `msg-${Date.now()}`,
                sender: currentMember.name,
                initials: currentMember.initials,
                color: currentMember.color,
                timestamp: new Date().toISOString(),
                text,
                parentId: activeThreadId,
              });
              setThreadReplyText('');
            };
            return (
              <motion.div
                key="thread-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                className="fixed top-0 right-0 md:right-14 z-[150] h-full w-full md:w-[380px] border-l border-[rgba(62,74,137,0.08)] bg-[#FAF8F5]/97 backdrop-blur-md shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.12)] px-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-[#3E4A89]" />
                    <span className="text-sm font-bold text-[#1E2636]">Thread</span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-[#3E4A89]">
                      {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveThread(null)}
                    className="rounded-lg p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Root message */}
                {rootMsg && (
                  <div className="shrink-0 border-b border-[rgba(62,74,137,0.08)] bg-white/60 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: rootMsg.color }}
                      >
                        {rootMsg.initials}
                      </div>
                      <span className="text-xs font-bold text-[#4A5578]">{rootMsg.sender}</span>
                      <span className="text-[10px] text-[#9BA6D3] ml-auto">
                        {formatTime(rootMsg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-[#1E2636] leading-relaxed line-clamp-4">
                      {rootMsg.text}
                    </p>
                  </div>
                )}

                {/* Replies list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {replies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <MessageSquare size={32} className="mb-3 text-slate-200" />
                      <p className="text-sm font-semibold text-[#7C859E]">No replies yet</p>
                      <p className="text-xs text-[#9BA6D3] mt-1">Be the first to reply</p>
                    </div>
                  ) : (
                    replies.map((reply) => {
                      const replyIsOwn = reply.sender === currentUser?.name;
                      return (
                        <div
                          key={reply.id}
                          className={`flex items-start gap-2.5 ${replyIsOwn ? 'flex-row-reverse' : ''}`}
                        >
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: reply.color }}
                          >
                            {reply.initials}
                          </div>
                          <div
                            className={`max-w-[80%] ${replyIsOwn ? 'items-end' : 'items-start'} flex flex-col`}
                          >
                            <span className="mb-0.5 text-[11px] font-bold text-[#7C859E]">
                              {reply.sender}
                            </span>
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm
                          ${replyIsOwn ? 'bg-[#1E2538] text-white rounded-br-sm' : 'bg-white border border-[rgba(62,74,137,0.08)] text-[#1E2636] rounded-bl-sm'}`}
                            >
                              {reply.text}
                            </div>
                            <span className="mt-0.5 text-[10px] text-[#9BA6D3]">
                              {formatTime(reply.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply input */}
                <div className="shrink-0 border-t border-[rgba(62,74,137,0.08)] p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={threadReplyText}
                      onChange={(e) => setThreadReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Reply in thread…"
                      rows={1}
                      className="flex-1 resize-none rounded-2xl border border-[rgba(62,74,137,0.12)] bg-white px-3 py-2.5 text-sm text-[#1E2636] placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                      style={{ maxHeight: '100px', overflowY: 'auto' }}
                    />
                    <button
                      onClick={sendReply}
                      disabled={!threadReplyText.trim()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3E4A89] text-white hover:bg-[#2A3568] disabled:bg-slate-200 disabled:cursor-not-allowed transition-all"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <MyActivityCalendar
        open={activityCalendarOpen}
        onClose={() => setActivityCalendarOpen(false)}
      />

      {/* ── Feature panels (AnimatePresence enables exit animations) ── */}
      <AnimatePresence>
        {calendarOpen && <CalendarPanel key="calendar" onClose={() => setCalendarOpen(false)} />}
        {availabilityOpen && <AdminAvailabilityView key="availability" onClose={() => setAvailabilityOpen(false)} />}
        {peopleStatusOpen && <PeopleStatusPanel onClose={() => setPeopleStatusOpen(false)} />}
        {leaveOpen && <LeavePanel key="leave" onClose={() => setLeaveOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            key="settings"
            {...BACKDROP}
            className="fixed inset-0 z-[115] flex items-center justify-center bg-[rgba(15,18,34,0.55)] p-4 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              {...CARD}
              className="flex w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              style={{ maxHeight: '88vh', border: '1px solid rgba(62,74,137,0.10)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Left sidebar ── */}
              <div
                className="flex w-48 shrink-0 flex-col"
                style={{ background: '#F7F6F2', borderRight: '1px solid rgba(62,74,137,0.08)' }}
              >
                <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(62,74,137,0.07)]">
                  <div
                    className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-sm"
                    style={{ background: '#3E4A89' }}
                  >
                    {settings.avatarEmoji || currentUser?.initials || 'G'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#1E2636]">
                      {settings.displayName || currentUser?.name}
                    </p>
                    <p className="truncate text-[10px] text-[#9BA6D3]">{currentUser?.role}</p>
                  </div>
                </div>
                <nav className="flex-1 p-2 space-y-0.5">
                  {(
                    [
                      { id: 'profile', icon: UserCheck, label: 'Profile' },
                      { id: 'appearance', icon: Palette, label: 'Appearance' },
                      { id: 'notifications', icon: Bell, label: 'Notifications' },
                      { id: 'meeting', icon: Video, label: 'Meeting' },
                      { id: 'security', icon: ShieldCheck, label: 'Security' },
                      { id: 'privacy', icon: Eye, label: 'Privacy' },
                    ] as const
                  ).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSettingsTab(id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${
                        settingsTab === id
                          ? 'bg-[#3E4A89] text-white shadow-sm'
                          : 'text-[#4A5578] hover:bg-[rgba(62,74,137,0.07)] hover:text-[#1E2636]'
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </nav>
                <div className="p-2 border-t border-[rgba(62,74,137,0.07)]">
                  <button
                    type="button"
                    onClick={() => { toast.success('Signed out'); performSignOut(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>

              {/* ── Right content ── */}
              <form onSubmit={saveSettings} className="flex min-h-0 flex-1 flex-col bg-white">
                <div className="flex h-14 shrink-0 items-center justify-between px-6 border-b border-[rgba(62,74,137,0.08)]">
                  <div>
                    <h2 className="text-sm font-black text-[#1E2636]">
                      {settingsTab === 'profile' && 'Profile'}
                      {settingsTab === 'appearance' && 'Appearance'}
                      {settingsTab === 'notifications' && 'Notifications'}
                      {settingsTab === 'meeting' && 'Meeting'}
                      {settingsTab === 'security' && 'Security'}
                      {settingsTab === 'privacy' && 'Privacy & Monitoring'}
                    </h2>
                    <p className="text-[10px] text-[#9BA6D3]">
                      {settingsTab === 'profile' && 'Your identity in this workspace'}
                      {settingsTab === 'appearance' && 'Customize how the app looks and feels'}
                      {settingsTab === 'notifications' && 'Control how and when you get notified'}
                      {settingsTab === 'meeting' && 'Meeting links and schedule'}
                      {settingsTab === 'security' && 'Password and account security'}
                      {settingsTab === 'privacy' && 'What activity data the admin can see'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BA6D3] hover:bg-[rgba(62,74,137,0.06)] hover:text-[#4A5578] transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {/* ── PROFILE ── */}
                  {settingsTab === 'profile' && (
                    <>
                      {/* User card */}
                      <div
                        className="flex items-center gap-4 rounded-2xl p-4"
                        style={{ background: '#F7F6F2', border: '1px solid rgba(62,74,137,0.08)' }}
                      >
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                          style={
                            settings.avatarEmoji
                              ? {
                                  background: 'rgba(62,74,137,0.08)',
                                  border: '2px solid rgba(62,74,137,0.15)',
                                }
                              : { background: '#3E4A89' }
                          }
                        >
                          {settings.avatarEmoji ? (
                            settings.avatarEmoji
                          ) : (
                            <span className="text-base font-black text-white">
                              {currentUser?.initials ?? 'G'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-[#1E2636]">
                            {settings.displayName || currentUser?.name}
                          </p>
                          <p className="text-xs text-[#7C859E] mt-0.5">{currentUser?.email}</p>
                          <span className="mt-1.5 inline-flex rounded-lg bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#3E4A89]">
                            {currentUser?.role}
                          </span>
                        </div>
                      </div>

                      {/* Display name */}
                      <div
                        className="rounded-2xl p-4"
                        style={{ border: '1px solid rgba(62,74,137,0.08)' }}
                      >
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                          Display name
                        </label>
                        <input
                          value={settings.displayName}
                          onChange={(e) =>
                            setSettings((v) => ({ ...v, displayName: e.target.value }))
                          }
                          placeholder={currentUser?.name ?? 'Your name'}
                          className="mt-2 h-10 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-semibold text-[#1E2636] outline-none focus:border-[#3E4A89] focus:ring-2 focus:ring-indigo-100 placeholder:text-[#C4CAE0]"
                        />
                        <p className="mt-1.5 text-[11px] text-[#9BA6D3]">
                          Shown in chat messages and the people list.
                        </p>
                      </div>

                      {/* Status */}
                      <div
                        className="rounded-2xl p-4"
                        style={{ border: '1px solid rgba(62,74,137,0.08)' }}
                      >
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                          Status
                        </label>
                        <div className="mt-2.5 grid grid-cols-4 gap-2">
                          {(
                            [
                              { id: 'online',     label: 'Online',      dot: 'bg-emerald-500' },
                              { id: 'away',       label: 'Away',        dot: 'bg-amber-400' },
                              { id: 'in-meeting', label: 'In Meeting',  dot: 'bg-red-500' },
                              { id: 'offline',    label: 'Offline',     dot: 'bg-slate-300' },
                            ] as const
                          ).map(({ id, label, dot }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setSettings((v) => ({ ...v, status: id }))}
                              className={`flex flex-col items-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                                settings.status === id
                                  ? 'border-[#3E4A89] bg-indigo-50 text-[#3E4A89]'
                                  : 'border-[rgba(62,74,137,0.10)] bg-white text-[#7C859E] hover:border-[rgba(62,74,137,0.20)] hover:bg-[rgba(62,74,137,0.04)]'
                              }`}
                            >
                              <span className={`h-3 w-3 rounded-full ${dot}`} />
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-[#9BA6D3]">
                          Visible to everyone in the People list.
                        </p>
                      </div>

                      {/* Avatar picker */}
                      <div
                        className="rounded-2xl p-4"
                        style={{ border: '1px solid rgba(62,74,137,0.08)' }}
                      >
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                          Avatar emoji
                        </label>
                        <p className="mt-0.5 text-[11px] text-[#9BA6D3] mb-2.5">
                          Appears next to your name. Leave blank to use initials.
                        </p>
                        <div className="grid grid-cols-8 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSettings((v) => ({ ...v, avatarEmoji: '' }))}
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-[10px] font-black transition-all ${
                              !settings.avatarEmoji
                                ? 'border-[#3E4A89] bg-[#3E4A89] text-white'
                                : 'border-[rgba(62,74,137,0.12)] bg-white text-[#4A5578] hover:border-[rgba(62,74,137,0.30)]'
                            }`}
                          >
                            {currentUser?.initials ?? 'G'}
                          </button>
                          {AVATAR_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setSettings((v) => ({ ...v, avatarEmoji: emoji }))}
                              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition-all ${
                                settings.avatarEmoji === emoji
                                  ? 'border-[#3E4A89] bg-indigo-50 scale-110 shadow-sm'
                                  : 'border-[rgba(62,74,137,0.10)] bg-white hover:border-[rgba(62,74,137,0.25)] hover:scale-110'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── APPEARANCE ── */}
                  {settingsTab === 'appearance' && (
                    <div className="space-y-2">
                      {[
                        {
                          icon: <Sun size={15} />,
                          iconBg: 'bg-amber-50 text-amber-500',
                          title: 'Dark mode',
                          sub: darkMode
                            ? 'Currently on — switch to light'
                            : 'Currently off — switch to dark',
                          control: (
                            <button
                              type="button"
                              onClick={() => {
                                toggleTheme();
                                storeDarkModeToggle();
                              }}
                              className={`relative h-6 w-11 rounded-full transition-colors ${darkMode ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                            >
                              <span
                                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </button>
                          ),
                        },
                        {
                          icon: <Layout size={15} />,
                          iconBg: 'bg-violet-50 text-violet-500',
                          title: 'Compact chat',
                          sub: settings.compactChat
                            ? 'Messages are tightly spaced'
                            : 'Normal spacing between messages',
                          control: (
                            <button
                              type="button"
                              onClick={() =>
                                setSettings((v) => ({ ...v, compactChat: !v.compactChat }))
                              }
                              className={`relative h-6 w-11 rounded-full transition-colors ${settings.compactChat ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                            >
                              <span
                                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.compactChat ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </button>
                          ),
                        },
                        {
                          icon: <Send size={15} />,
                          iconBg: 'bg-blue-50 text-blue-500',
                          title: 'Enter to send',
                          sub: settings.enterToSend
                            ? 'Enter sends message · Shift+Enter for new line'
                            : 'Use the send button to post',
                          control: (
                            <button
                              type="button"
                              onClick={() =>
                                setSettings((v) => ({ ...v, enterToSend: !v.enterToSend }))
                              }
                              className={`relative h-6 w-11 rounded-full transition-colors ${settings.enterToSend ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                            >
                              <span
                                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.enterToSend ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </button>
                          ),
                        },
                      ].map((row) => (
                        <div
                          key={row.title}
                          className="flex items-center justify-between rounded-xl px-4 py-3.5"
                          style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${row.iconBg}`}
                            >
                              {row.icon}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-[#1E2636]">{row.title}</p>
                              <p className="text-[11px] text-[#9BA6D3]">{row.sub}</p>
                            </div>
                          </div>
                          {row.control}
                        </div>
                      ))}
                      <div
                        className="rounded-xl px-4 py-3.5"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                            <Type size={15} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#1E2636]">Message font size</p>
                            <p className="text-[11px] text-[#9BA6D3]">
                              Size of text in chat bubbles
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(
                            [
                              { id: 'normal', label: 'Normal', sub: '14px' },
                              { id: 'large', label: 'Large', sub: '16px' },
                            ] as const
                          ).map(({ id, label, sub }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setSettings((v) => ({ ...v, fontSize: id }))}
                              className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                                settings.fontSize === id
                                  ? 'border-[#3E4A89] bg-indigo-50 text-[#3E4A89]'
                                  : 'border-[rgba(62,74,137,0.10)] bg-white text-[#7C859E] hover:border-[rgba(62,74,137,0.20)]'
                              }`}
                            >
                              {label} <span className="opacity-60 font-medium">({sub})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── NOTIFICATIONS ── */}
                  {settingsTab === 'notifications' && (
                    <div className="space-y-2">
                      <div
                        className="flex items-center justify-between rounded-xl px-4 py-3.5"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                            <Mail size={15} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#1E2636]">Email on @mention</p>
                            <p className="text-[11px] text-[#9BA6D3]">
                              Receive an email when someone mentions you
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings((v) => ({
                              ...v,
                              emailNotifications: !v.emailNotifications,
                            }))
                          }
                          className={`relative h-6 w-11 rounded-full transition-colors ${settings.emailNotifications ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                      <div
                        className="rounded-xl px-4 py-3.5"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                              <Monitor size={15} />
                            </span>
                            <div>
                              <p className="text-xs font-bold text-[#1E2636]">
                                Desktop notifications
                              </p>
                              <p className="text-[11px] text-[#9BA6D3]">
                                Browser pop-up when new messages arrive
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !settings.desktopNotifications;
                              setSettings((v) => ({ ...v, desktopNotifications: next }));
                              if (
                                next &&
                                typeof Notification !== 'undefined' &&
                                Notification.permission === 'default'
                              )
                                Notification.requestPermission();
                            }}
                            className={`relative h-6 w-11 rounded-full transition-colors ${settings.desktopNotifications ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.desktopNotifications ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>
                        {settings.desktopNotifications &&
                          typeof Notification !== 'undefined' &&
                          Notification.permission === 'denied' && (
                            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-500">
                              Notifications blocked in your browser. Go to Site Settings to allow
                              them.
                            </p>
                          )}
                      </div>
                      <div
                        className="flex items-center justify-between rounded-xl px-4 py-3.5"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                            <Volume2 size={15} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#1E2636]">Sound alerts</p>
                            <p className="text-[11px] text-[#9BA6D3]">
                              Play a chime when new messages arrive
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={playNotificationSound}
                            className="rounded-lg border border-[rgba(62,74,137,0.10)] bg-white px-2.5 py-1 text-[10px] font-bold text-[#7C859E] hover:border-[rgba(62,74,137,0.25)] hover:text-[#3E4A89] transition-all"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSettings((v) => ({
                                ...v,
                                soundNotifications: !v.soundNotifications,
                              }))
                            }
                            className={`relative h-6 w-11 rounded-full transition-colors ${settings.soundNotifications ? 'bg-[#3E4A89]' : 'bg-slate-200'}`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.soundNotifications ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── MEETING ── */}
                  {settingsTab === 'meeting' && (
                    <>
                      <div
                        className="rounded-2xl p-4 space-y-2"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3] mb-3">
                          Recurring meet schedule
                        </p>
                        {[
                          {
                            days: 'Mon to Thu AM',
                            label: 'Main meet',
                            link: DEFAULT_COMPANY_MEET_LINK,
                            dot: 'bg-[#3E4A89]',
                          },
                          {
                            days: 'Thu from 2 PM',
                            label: 'Thursday PM',
                            link: THURSDAY_AFTERNOON_MEET_LINK,
                            dot: 'bg-amber-400',
                          },
                          {
                            days: 'Friday',
                            label: 'Friday meet',
                            link: FRIDAY_MEET_LINK,
                            dot: 'bg-emerald-500',
                          },
                          {
                            days: 'Sat and Sun',
                            label: 'No meeting',
                            link: null,
                            dot: 'bg-slate-200',
                          },
                        ].map(({ days, label, link, dot }) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-xl px-3 py-2.5"
                            style={{
                              border: '1px solid rgba(62,74,137,0.07)',
                              background: '#F7F6F2',
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                              <div>
                                <p className="text-xs font-bold text-[#1E2636]">{label}</p>
                                <p className="text-[10px] text-[#9BA6D3]">{days}</p>
                              </div>
                            </div>
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-[#3E4A89] hover:bg-indigo-100 transition-colors"
                              >
                                Join
                              </a>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-[#9BA6D3]">
                                Off
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div
                        className="rounded-2xl p-4"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                          Override main meet link (Mon–Thu AM)
                        </label>
                        <input
                          value={settings.meetLink}
                          onChange={(e) => setSettings((v) => ({ ...v, meetLink: e.target.value }))}
                          placeholder={DEFAULT_COMPANY_MEET_LINK}
                          className="mt-2 h-10 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-semibold text-[#1E2636] outline-none focus:border-[#3E4A89] focus:ring-2 focus:ring-indigo-100 placeholder:text-[#C4CAE0]"
                        />
                        <p className="mt-1.5 text-[11px] text-[#9BA6D3]">
                          Leave blank to use the built-in link.
                        </p>
                      </div>
                      <div
                        className="rounded-2xl p-4"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                          Thursday PM meet link
                        </label>
                        <input
                          value={settings.meetLinkThuPM}
                          onChange={(e) => setSettings((v) => ({ ...v, meetLinkThuPM: e.target.value }))}
                          placeholder={THURSDAY_AFTERNOON_MEET_LINK}
                          className="mt-2 h-10 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-semibold text-[#1E2636] outline-none focus:border-[#3E4A89] focus:ring-2 focus:ring-indigo-100 placeholder:text-[#C4CAE0]"
                        />
                        <p className="mt-1.5 text-[11px] text-[#9BA6D3]">
                          Leave blank to use the built-in link.
                        </p>
                      </div>
                      <div
                        className="rounded-2xl p-4"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                          Friday meet link
                        </label>
                        <input
                          value={settings.meetLinkFriday}
                          onChange={(e) => setSettings((v) => ({ ...v, meetLinkFriday: e.target.value }))}
                          placeholder={FRIDAY_MEET_LINK}
                          className="mt-2 h-10 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-semibold text-[#1E2636] outline-none focus:border-[#3E4A89] focus:ring-2 focus:ring-indigo-100 placeholder:text-[#C4CAE0]"
                        />
                        <p className="mt-1.5 text-[11px] text-[#9BA6D3]">
                          Leave blank to use the built-in link.
                        </p>
                      </div>
                    </>
                  )}

                  {/* ── SECURITY ── */}
                  {settingsTab === 'security' && (
                    <>
                      <div
                        className="flex items-start gap-3 rounded-2xl p-4"
                        style={{ background: '#F0F4FF', border: '1px solid rgba(62,74,137,0.12)' }}
                      >
                        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#3E4A89]" />
                        <div>
                          <p className="text-xs font-black text-[#3E4A89]">Change your password</p>
                          <p className="mt-0.5 text-[11px] text-[#7C859E] leading-relaxed">
                            Enter your current password to set a new one. Minimum 8 characters.
                          </p>
                        </div>
                      </div>
                      <div
                        className="rounded-2xl p-4 space-y-4"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                            Current password
                          </label>
                          <input
                            type="password"
                            value={pwCurrent}
                            onChange={(e) => setPwCurrent(e.target.value)}
                            placeholder="Enter your current password"
                            autoComplete="current-password"
                            className="mt-2 h-10 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-semibold outline-none focus:border-[#3E4A89] focus:ring-2 focus:ring-indigo-100 placeholder:text-[#C4CAE0]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                            New password
                          </label>
                          <input
                            type="password"
                            value={pwNew}
                            onChange={(e) => setPwNew(e.target.value)}
                            placeholder="Minimum 8 characters"
                            autoComplete="new-password"
                            className="mt-2 h-10 w-full rounded-xl border border-[rgba(62,74,137,0.12)] px-3 text-sm font-semibold outline-none focus:border-[#3E4A89] focus:ring-2 focus:ring-indigo-100 placeholder:text-[#C4CAE0]"
                          />
                          {pwNew.length > 0 && (
                            <div className="mt-2">
                              <div className="flex gap-1 mb-1">
                                {[8, 10, 12].map((t, i) => (
                                  <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                                      pwNew.length >= t
                                        ? i === 0
                                          ? 'bg-red-400'
                                          : i === 1
                                            ? 'bg-amber-400'
                                            : 'bg-emerald-500'
                                        : 'bg-slate-100'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-[10px] text-[#9BA6D3]">
                                {pwNew.length < 8
                                  ? 'Too short'
                                  : pwNew.length < 10
                                    ? 'Weak'
                                    : pwNew.length < 12
                                      ? 'Moderate'
                                      : 'Strong'}
                              </p>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                            Confirm new password
                          </label>
                          <input
                            type="password"
                            value={pwConfirm}
                            onChange={(e) => setPwConfirm(e.target.value)}
                            placeholder="Repeat new password"
                            autoComplete="new-password"
                            className={`mt-2 h-10 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-[#C4CAE0] ${
                              pwConfirm && pwNew !== pwConfirm
                                ? 'border-red-300 focus:border-red-400'
                                : 'border-[rgba(62,74,137,0.12)] focus:border-[#3E4A89]'
                            }`}
                          />
                          {pwConfirm && pwNew !== pwConfirm && (
                            <p className="mt-1.5 text-[11px] font-semibold text-red-500">
                              Passwords do not match.
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={pwLoading || !pwCurrent || !pwNew || pwNew !== pwConfirm}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E4A89] py-2.5 text-sm font-black text-white hover:bg-[#2A3568] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {pwLoading ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={15} />
                          )}
                          {pwLoading ? 'Updating...' : 'Update password'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── PRIVACY ── */}
                  {settingsTab === 'privacy' && (
                    <>
                      <div
                        className="flex items-start gap-3 rounded-2xl p-4"
                        style={{ background: '#F0F4FF', border: '1px solid rgba(62,74,137,0.12)' }}
                      >
                        <Eye size={16} className="mt-0.5 shrink-0 text-[#3E4A89]" />
                        <div>
                          <p className="text-xs font-black text-[#3E4A89]">
                            Activity monitoring is active
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#7C859E] leading-relaxed">
                            As a business platform, EduTechExOS tracks your in-app activity so
                            admins can manage workload and team engagement. Only activity{' '}
                            <strong>inside this app</strong> is tracked — nothing on your device,
                            browser history, or other applications.
                          </p>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl p-4 space-y-3"
                        style={{ border: '1px solid rgba(62,74,137,0.08)', background: '#fff' }}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3]">
                          What is collected
                        </p>
                        {[
                          {
                            icon: Clock,
                            label: 'Session time',
                            desc: 'How long you have the app open and active each day',
                          },
                          {
                            icon: MessageSquare,
                            label: 'Message count',
                            desc: 'Number of messages you send per day in workspace channels',
                          },
                          {
                            icon: CheckSquare,
                            label: 'Task activity',
                            desc: 'Tasks you create or complete (count only, not content)',
                          },
                          {
                            icon: Bell,
                            label: 'Login timestamps',
                            desc: 'When you sign in and which days you are active',
                          },
                        ].map(({ icon: Icon, label, desc }) => (
                          <div
                            key={label}
                            className="flex items-start gap-3 py-2 border-b border-[rgba(62,74,137,0.06)] last:border-0"
                          >
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                              style={{ background: 'rgba(62,74,137,0.08)' }}
                            >
                              <Icon size={13} className="text-[#3E4A89]" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-[#1E2636]">{label}</p>
                              <p className="text-[11px] text-[#7C859E]">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className="rounded-2xl p-4"
                        style={{
                          border: '1px solid rgba(16,185,129,0.18)',
                          background: 'rgba(16,185,129,0.04)',
                        }}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2">
                          What is NOT collected
                        </p>
                        <ul className="space-y-1.5">
                          {[
                            'Message content or file contents',
                            'Screen recordings or screenshots',
                            'Keyboard input or clipboard data',
                            'Websites visited or apps used outside EduTechExOS',
                            'Camera or microphone access',
                          ].map((item) => (
                            <li
                              key={item}
                              className="flex items-center gap-2 text-[11px] text-[#4A7C6F]"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div
                        className="flex items-start gap-3 rounded-2xl p-4"
                        style={{
                          background: 'rgba(241,245,249,0.7)',
                          border: '1px solid rgba(62,74,137,0.07)',
                        }}
                      >
                        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#9BA6D3]" />
                        <p className="text-[11px] text-[#7C859E] leading-relaxed">
                          Data is stored securely in the company database and visible only to
                          admins. It is used solely for team management — not shared with third
                          parties.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 border-t border-[rgba(62,74,137,0.08)]"
                  style={{ background: '#F7F6F2' }}
                >
                  <p className="text-[11px] text-[#9BA6D3]">
                    {settingsTab === 'security'
                      ? 'Use the button above to update password.'
                      : 'Changes save automatically.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="h-8 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-4 text-xs font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.05)] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-8 rounded-xl bg-[#3E4A89] px-5 text-xs font-bold text-white hover:bg-[#2A3568] transition-all"
                    >
                      Save
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
                style={{
                  background: 'linear-gradient(135deg, #191E2F 0%, #1E2538 60%, #252D4A 100%)',
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 60% 80% at 10% 50%, rgba(62,74,137,0.22) 0%, transparent 70%)',
                  }}
                />
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, #3E4A89, #9BA6D3, #3E4A89, transparent)',
                  }}
                />

                <div className="flex items-center gap-4 relative z-10">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #3E4A89, #2A3568)',
                      boxShadow: '0 4px 16px rgba(62,74,137,0.40)',
                    }}
                  >
                    <Video size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-black tracking-tight text-white leading-tight">
                      Schedule Meeting
                    </h2>
                    <p
                      className="text-[13px] font-medium mt-0.5"
                      style={{ color: 'rgba(155,166,211,0.75)' }}
                    >
                      #{channel?.name} &middot; Invitees get email + in-app alerts
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setScheduleMeetOpen(false)}
                  className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(196,202,224,0.80)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(196,202,224,0.80)';
                  }}
                  title="Close"
                >
                  <X size={17} />
                </button>
              </div>

              {/* ── Body (two-column) ───────────────────────────────────── */}
              <div
                className="flex flex-col sm:flex-row overflow-hidden flex-1 min-h-0"
                style={{ background: '#FAF8F5' }}
              >
                {/* Left � Details */}
                <div
                  className="flex flex-col gap-5 p-6 sm:w-[52%] sm:border-r overflow-y-auto"
                  style={{ borderColor: 'rgba(62,74,137,0.10)' }}
                >
                  {/* Title */}
                  <div>
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.14em] mb-2"
                      style={{ color: '#7C859E' }}
                    >
                      Meeting Title
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <FileText size={15} style={{ color: '#9BA6D3' }} />
                      </span>
                      <input
                        value={meetTitle}
                        onChange={(e) => setMeetTitle(e.target.value)}
                        className="w-full h-11 rounded-xl pl-9 pr-3 text-sm font-bold outline-none transition-all"
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid rgba(62,74,137,0.14)',
                          color: '#1E2636',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3E4A89';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62,74,137,0.10)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(62,74,137,0.14)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        placeholder="e.g. Product Review Sync"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Date + Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.14em] mb-2"
                        style={{ color: '#7C859E' }}
                      >
                        Date
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <CalendarDays size={14} style={{ color: '#9BA6D3' }} />
                        </span>
                        <input
                          type="date"
                          value={meetDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setMeetDate(e.target.value)}
                          className="w-full h-11 rounded-xl pl-9 pr-3 text-sm font-bold outline-none transition-all"
                          style={{
                            background: '#FFFFFF',
                            border: '1.5px solid rgba(62,74,137,0.14)',
                            color: '#1E2636',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#3E4A89';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62,74,137,0.10)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(62,74,137,0.14)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.14em] mb-2"
                        style={{ color: '#7C859E' }}
                      >
                        Time
                      </p>
                      <div className="relative">
                        <span
                          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: '#9BA6D3' }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </span>
                        <input
                          type="time"
                          value={meetTime}
                          onChange={(e) => setMeetTime(e.target.value)}
                          className="w-full h-11 rounded-xl pl-9 pr-3 text-sm font-bold outline-none transition-all"
                          style={{
                            background: '#FFFFFF',
                            border: '1.5px solid rgba(62,74,137,0.14)',
                            color: '#1E2636',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#3E4A89';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62,74,137,0.10)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(62,74,137,0.14)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live date preview */}
                  {meetDate && (
                    <div
                      className="rounded-2xl p-4 flex items-center gap-4"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(62,74,137,0.07), rgba(62,74,137,0.03))',
                        border: '1px solid rgba(62,74,137,0.12)',
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #3E4A89, #2A3568)',
                          boxShadow: '0 4px 12px rgba(62,74,137,0.30)',
                        }}
                      >
                        <span
                          className="text-[9px] font-black uppercase tracking-widest leading-none"
                          style={{ color: '#9BA6D3' }}
                        >
                          {new Date(meetDate).toLocaleDateString('en', { month: 'short' })}
                        </span>
                        <span className="text-[22px] font-black text-white leading-none mt-0.5">
                          {new Date(meetDate).getDate()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-black" style={{ color: '#1E2636' }}>
                          {new Date(meetDate).toLocaleDateString('en', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {meetTime && (
                          <p
                            className="text-[13px] font-semibold mt-0.5"
                            style={{ color: '#4A5578' }}
                          >
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
                      border: sendEmailInvite
                        ? '1.5px solid rgba(62,74,137,0.22)'
                        : '1.5px solid rgba(62,74,137,0.10)',
                    }}
                    onClick={() => setSendEmailInvite(!sendEmailInvite)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className="w-9 h-5 rounded-full flex items-center px-0.5 transition-all duration-200"
                        style={{ background: sendEmailInvite ? '#3E4A89' : 'rgba(62,74,137,0.15)' }}
                      >
                        <div
                          className="w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
                          style={{
                            transform: sendEmailInvite ? 'translateX(16px)' : 'translateX(0)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Mail
                          size={13}
                          style={{ color: sendEmailInvite ? '#3E4A89' : '#9BA6D3' }}
                        />
                        <span
                          className="text-sm font-black"
                          style={{ color: sendEmailInvite ? '#3E4A89' : '#7C859E' }}
                        >
                          Send email invites
                        </span>
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: '#7C859E' }}>
                        {sendEmailInvite
                          ? `Will email all ${members.filter((m) => m.email && m.email.toLowerCase() !== currentUserEmail).length} team members`
                          : 'In-app notification only'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right � People selector */}
                <div
                  className="flex flex-col sm:w-[48%] overflow-hidden"
                  style={{ background: '#F2F0EC' }}
                >
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.14em]"
                      style={{ color: '#7C859E' }}
                    >
                      @Mention in Chat &middot; {meetInviteeIds.length} selected
                    </span>
                    {availableInvitees.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMeetInviteeIds(
                            meetInviteeIds.length === availableInvitees.length
                              ? []
                              : availableInvitees.map((m) => m.id)
                          )
                        }
                        className="text-[10px] font-black uppercase tracking-[0.10em] transition-colors hover:underline"
                        style={{ color: '#3E4A89' }}
                      >
                        {meetInviteeIds.length === availableInvitees.length
                          ? 'Deselect all'
                          : 'Select all'}
                      </button>
                    )}
                  </div>

                  <div
                    className="flex-1 overflow-y-auto px-4 pb-4 space-y-2"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(62,74,137,0.18) transparent',
                    }}
                  >
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
                              border: checked
                                ? '1.5px solid rgba(62,74,137,0.20)'
                                : '1.5px solid transparent',
                              boxShadow: checked ? '0 2px 12px rgba(62,74,137,0.10)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (!checked)
                                (e.currentTarget as HTMLElement).style.background =
                                  'rgba(255,255,255,0.85)';
                            }}
                            onMouseLeave={(e) => {
                              if (!checked)
                                (e.currentTarget as HTMLElement).style.background =
                                  'rgba(255,255,255,0.55)';
                            }}
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
                                    <path
                                      d="M1 5l3.5 3.5L11 1"
                                      stroke="white"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                              )}
                            </div>

                            {/* Name + email */}
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-[14px] font-black leading-tight"
                                style={{ color: checked ? '#1E2636' : '#4A5578' }}
                              >
                                {member.name}
                              </p>
                              <p
                                className="truncate text-[12px] mt-0.5"
                                style={{ color: '#7C859E' }}
                              >
                                {member.role}
                              </p>
                            </div>

                            {/* Checkbox */}
                            <div
                              className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-md transition-all"
                              style={{
                                background: checked ? '#3E4A89' : 'transparent',
                                border: checked
                                  ? '1.5px solid #3E4A89'
                                  : '1.5px solid rgba(62,74,137,0.20)',
                              }}
                            >
                              {checked && (
                                <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                                  <path
                                    d="M1 5l3.5 3.5L11 1"
                                    stroke="white"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
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
                          style={{
                            background: 'rgba(62,74,137,0.08)',
                            border: '1px dashed rgba(62,74,137,0.20)',
                          }}
                        >
                          <Users size={22} style={{ color: '#9BA6D3' }} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: '#4A5578' }}>
                          No teammates yet
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#7C859E' }}>
                          Add members to this channel first.
                        </p>
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
                      {availableInvitees
                        .filter((m) => meetInviteeIds.includes(m.id))
                        .slice(0, 4)
                        .map((m) => (
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
                          style={{
                            background: 'rgba(62,74,137,0.15)',
                            color: '#3E4A89',
                            border: '2px solid #FAF8F5',
                          }}
                        >
                          +{meetInviteeIds.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-[13px] font-semibold" style={{ color: '#7C859E' }}>
                    {meetInviteeIds.length > 0
                      ? `${meetInviteeIds.length} @mentioned in chat`
                      : 'No one @mentioned'}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setScheduleMeetOpen(false)}
                    className="h-10 rounded-xl px-5 text-xs font-black uppercase tracking-[0.10em] transition-all hover:scale-[1.02]"
                    style={{
                      border: '1.5px solid rgba(62,74,137,0.15)',
                      background: 'transparent',
                      color: '#4A5578',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(62,74,137,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 rounded-xl px-6 text-xs font-black uppercase tracking-[0.10em] text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #3E4A89, #2A3568)',
                      boxShadow: '0 4px 16px rgba(62,74,137,0.35)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        '0 6px 20px rgba(62,74,137,0.50)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        '0 4px 16px rgba(62,74,137,0.35)';
                    }}
                  >
                    ✦ Schedule Meet
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}{' '}
      </AnimatePresence>

      {/* Recording overlay removed — controls are inline in the composer waveform bar */}

      <AnimatePresence>
        {recordedPreview && (
          <motion.div
            key="preview"
            {...BACKDROP}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(25,30,47,0.45)] p-4 backdrop-blur-sm dark:bg-black/70"
          >
            <motion.div
              {...CARD}
              className="w-full max-w-lg rounded-3xl border border-[rgba(62,74,137,0.12)] bg-white p-5 shadow-2xl  dark:bg-[#191E2F]"
            >
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
                        setMembersOpen(false);
                        setActiveChannel(member.id);
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
                      <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${
                        member.status === 'online' ? 'bg-emerald-50 text-emerald-700' :
                        member.status === 'in-meeting' ? 'bg-red-50 text-red-600' :
                        member.status === 'away' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          member.status === 'online' ? 'bg-emerald-500' :
                          member.status === 'in-meeting' ? 'bg-red-500' :
                          member.status === 'away' ? 'bg-amber-400' :
                          'bg-slate-400'
                        }`} />
                        {member.status === 'online' ? 'Active now' :
                         member.status === 'in-meeting' ? 'In Meeting' :
                         member.status === 'away' ? 'Away' : 'Offline'}
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
          <motion.div
            key="search"
            {...BACKDROP}
            className="fixed inset-0 z-[200] flex items-start justify-center bg-[rgba(25,30,47,0.50)] pt-20 backdrop-blur-sm"
            onClick={() => setGlobalSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={SPRING}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <SearchPanel onClose={() => setGlobalSearchOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <UserProfileModal member={profileMember} onClose={() => setProfileMember(null)} />

      {/* Wiki / Knowledge Base Panel */}
      <AnimatePresence>
        {wikiOpen && (
          <motion.div
            key="wiki"
            {...BACKDROP}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm"
            onClick={() => setWikiOpen(false)}
          >
            <motion.div
              {...CARD}
              className="h-full w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <WikiPanel
                onClose={() => {
                  setWikiOpen(false);
                  scrollToBottom();
                }}
                activeChannel={`personal-${currentUser?.email ?? 'guest'}`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Task Board */}
      <AnimatePresence>
        {kanbanOpen && (
          <motion.div
            key="kanban"
            {...BACKDROP}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm"
            onClick={() => setKanbanOpen(false)}
          >
            <motion.div
              {...CARD}
              className="h-full w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <KanbanBoard
                onClose={() => {
                  setKanbanOpen(false);
                  scrollToBottom();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Panel (Admin only) */}
      <AnimatePresence>
        {analyticsOpen && isAdmin && (
          <motion.div
            key="analytics"
            {...BACKDROP}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm"
            onClick={() => setAnalyticsOpen(false)}
          >
            <motion.div
              {...CARD}
              className="w-full max-w-4xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <AnalyticsPanel
                onClose={() => {
                  setAnalyticsOpen(false);
                  scrollToBottom();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Panel */}
      <AnimatePresence>
        {bookmarksPanelOpen && (
          <motion.div
            key="bookmarks"
            {...BACKDROP}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm"
            onClick={() => setBookmarksPanelOpen(false)}
          >
            <motion.div
              {...CARD}
              className="w-full max-w-xl max-h-[85vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <BookmarksPanel
                onClose={() => {
                  setBookmarksPanelOpen(false);
                  scrollToBottom();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notepad Panel */}
      <AnimatePresence>
        {notepadOpen && (
          <motion.div
            key="notepad"
            {...BACKDROP}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm"
            onClick={() => setNotepadOpen(false)}
          >
            <motion.div
              {...CARD}
              className="h-full w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <NotepadPanel
                onClose={() => {
                  setNotepadOpen(false);
                  scrollToBottom();
                }}
                activeChannel={activeChannel}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standup Panel */}
      <AnimatePresence>
        {standupOpen && <StandupPanel key="standup" onClose={() => setStandupOpen(false)} />}
      </AnimatePresence>

      {/* ─── Share Google Meet Link Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {shareMeetLinkOpen && (
          <motion.div
            key="share-meet-link"
            {...BACKDROP}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(25,30,47,0.55)] p-4 backdrop-blur-sm"
            onClick={() => setShareMeetLinkOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2636] border border-[rgba(62,74,137,0.14)] shadow-2xl p-6"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Video size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#1E2636] dark:text-white">Share Google Meet Link</p>
                  <p className="text-xs text-[#7C859E]">Google Meet has opened in a new tab</p>
                </div>
              </div>

              {/* Steps */}
              <div className="mb-4 rounded-xl bg-blue-50 dark:bg-[rgba(62,74,137,0.12)] border border-blue-100 dark:border-[rgba(62,74,137,0.2)] p-3 space-y-1.5">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">How to share:</p>
                <p className="text-xs text-[#4A5578] dark:text-[#9BA6D3]">1. Switch to the Google Meet tab that just opened</p>
                <p className="text-xs text-[#4A5578] dark:text-[#9BA6D3]">2. Copy the meeting link from your browser&apos;s address bar</p>
                <p className="text-xs text-[#4A5578] dark:text-[#9BA6D3]">3. Paste it below — it will be shared in the channel automatically</p>
              </div>

              {/* Input */}
              <input
                autoFocus
                type="url"
                value={shareMeetLinkValue}
                onChange={(e) => setShareMeetLinkValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') shareInstantMeetLink(); }}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                className="w-full rounded-xl border border-[rgba(62,74,137,0.2)] bg-[#FAF8F5] dark:bg-[#151B2B] px-4 py-2.5 text-sm text-[#1E2636] dark:text-white placeholder-[#C4CAE0] focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              />

              {/* Buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShareMeetLinkOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={shareInstantMeetLink}
                  disabled={!shareMeetLinkValue.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-5 py-2 text-sm font-black text-white transition-colors"
                >
                  Share in Channel
                </button>
              </div>
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

      {/* ─── Forward Message Modal ──────────────────────────────────────────── */}
      {forwardingMsg &&
        (() => {
          const sourceName = channel?.id.startsWith('member-')
            ? 'DM'
            : `#${channel?.name ?? activeChannelId}`;
          const wsChannels = channels.filter(
            (c) =>
              !c.id.startsWith('member-') && !c.id.startsWith('dm-') && c.id !== activeChannelId
          );
          const dmMembers = members.filter((m) => m.id !== currentMemberId);
          const q = forwardQuery.toLowerCase();
          const filteredWS = wsChannels.filter((c) => c.name.toLowerCase().includes(q));
          const filteredDMs = dmMembers.filter((m) => m.name.toLowerCase().includes(q));

          const doForward = (targetId: string, targetLabel: string) => {
            const preview =
              forwardingMsg.text.length > 300
                ? forwardingMsg.text.slice(0, 300) + '…'
                : forwardingMsg.text;
            const quoted = preview.replace(/\n/g, '\n> ');
            const fwdText = `↪ Forwarded from **${sourceName}** · *${forwardingMsg.sender}:*\n> ${quoted}`;
            addMessage(targetId, {
              id: `msg-${Date.now()}`,
              sender: currentMember?.name ?? currentUser?.name ?? 'You',
              initials: currentMember?.initials ?? currentUser?.initials ?? 'Y',
              color: currentMember?.color ?? '#64748b',
              timestamp: new Date().toISOString(),
              text: fwdText,
            });
            toast.success(`Forwarded to ${targetLabel}`);
            setForwardingMsg(null);
            setForwardQuery('');
          };

          return (
            <div
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
              onClick={() => {
                setForwardingMsg(null);
                setForwardQuery('');
              }}
            >
              <div
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[rgba(62,74,137,0.08)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Share2 size={15} className="text-[#3E4A89]" />
                    <h3 className="font-bold text-[#1E2636]">Forward message</h3>
                  </div>
                  <button
                    onClick={() => {
                      setForwardingMsg(null);
                      setForwardQuery('');
                    }}
                    className="text-[#7C859E] hover:text-[#4A5578]"
                  >
                    <X size={16} />
                  </button>
                </div>
                {/* Message preview */}
                <div className="border-b border-[rgba(62,74,137,0.08)] bg-[rgba(62,74,137,0.04)] px-4 py-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7C859E]">
                    From {sourceName}
                  </p>
                  <p className="line-clamp-2 text-sm italic text-[#4A5578]">
                    &quot;{forwardingMsg.text.slice(0, 120)}
                    {forwardingMsg.text.length > 120 ? '…' : ''}&quot;
                  </p>
                </div>
                {/* Search */}
                <div className="border-b border-[rgba(62,74,137,0.08)] px-4 py-2">
                  <input
                    autoFocus
                    type="text"
                    value={forwardQuery}
                    onChange={(e) => setForwardQuery(e.target.value)}
                    placeholder="Search channels or people…"
                    className="w-full rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
                {/* List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredWS.length > 0 && (
                    <>
                      <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-[#7C859E]">
                        Channels
                      </p>
                      {filteredWS.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => doForward(ch.id, `#${ch.name}`)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(62,74,137,0.06)]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                            <Hash size={14} className="text-[#3E4A89]" />
                          </div>
                          <span className="text-sm font-semibold text-[#1E2636]">{ch.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredDMs.length > 0 && (
                    <>
                      <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-[#7C859E]">
                        Direct Messages
                      </p>
                      {filteredDMs.map((m) => {
                        const sorted = [m.id, currentMemberId].sort();
                        const dmId = `dm-${sorted[0]}-${sorted[1]}`;
                        return (
                          <button
                            key={m.id}
                            onClick={() => doForward(dmId, m.name)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(62,74,137,0.06)]"
                          >
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: m.color }}
                            >
                              {m.initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1E2636]">{m.name}</p>
                              <p className="text-xs text-[#7C859E]">{m.role}</p>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                  {filteredWS.length === 0 && filteredDMs.length === 0 && (
                    <p className="py-8 text-center text-sm text-[#7C859E]">
                      {forwardQuery
                        ? `No results for "${forwardQuery}"`
                        : 'No destinations available'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* DM popup notifications */}
      <ToastContainer
        toasts={dmToasts}
        onDismiss={(id) => setDmToasts((prev) => prev.filter((t) => t.id !== id))}
      />

    </div>
  );
}
