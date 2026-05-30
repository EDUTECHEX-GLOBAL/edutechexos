'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../dashboard.css';
import AppLogo from '@/components/ui/AppLogo';
import { MOCK_AI_RESPONSES } from '@/data/mockData';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTheme } from '@/components/ThemeProvider';
import { askCopilot, extractActionItems } from '@/app/actions/aiActions';
import {
  sendMeetingEmailInvitation,
  sendMentionEmailNotification,
  uploadLocalFile,
  changePassword,
} from '@/app/actions/dbActions';
import NotificationPanel from './NotificationPanel';
import { getSocket } from '@/lib/socket';

import MyActivityCalendar from './MyActivityCalendar';
import SearchPanel from './SearchPanel';
import FigmaPanel from './FigmaPanel';
import CalendarPanel from './CalendarPanel';

import UserProfileModal from './UserProfileModal';
import WikiPanel from './WikiPanel';
import KanbanBoard from './KanbanBoard';
import AnalyticsPanel from './AnalyticsPanel';
import BookmarksPanel from './BookmarksPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import {
  AtSign,
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
  UserCheck,
  Users,
  Video,
  Volume2,
  X,
  Zap,
  Layout,
  Layers,
} from 'lucide-react';

type AIMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citation?: string;
  timestamp: string;
};

type CurrentUser = {
  name: string;
  email: string;
  role: string;
  initials: string;
};

const DEFAULT_COMPANY_MEET_LINK = 'https://meet.google.com/uie-jxkt-vkx';
const THURSDAY_AFTERNOON_MEET_LINK = 'https://meet.google.com/dss-wmvy-cuq';
const FRIDAY_MEET_LINK = 'https://meet.google.com/eeq-maem-ztc';
const SETTINGS_KEY = 'edutechex_dashboard_settings';
const EMOJI_OPTIONS = [
  '😀',
  '😁',
  '😂',
  '🤣',
  '😃',
  '😄',
  '😅',
  '😆',
  '😉',
  '😊',
  '😋',
  '😎',
  '😍',
  '🥰',
  '😘',
  '😗',
  '😙',
  '😚',
  '🙂',
  '🤗',
  '🤩',
  '🤔',
  '🤨',
  '😐',
  '😑',
  '😶',
  '🙄',
  '😏',
  '😣',
  '😥',
  '😮',
  '🤐',
  '😯',
  '😪',
  '😫',
  '😴',
  '😌',
  '😛',
  '😜',
  '😝',
  '🤤',
  '😒',
  '😓',
  '😔',
  '😕',
  '🙃',
  '🤑',
  '😲',
  '☹️',
  '🙁',
  '😖',
  '😞',
  '😟',
  '😤',
  '😢',
  '😭',
  '😦',
  '😧',
  '😨',
  '😩',
  '🤯',
  '😬',
  '😰',
  '😱',
  '🥵',
  '🥶',
  '😳',
  '🤪',
  '😵',
  '😡',
  '😠',
  '🤬',
  '👍',
  '👎',
  '👊',
  '✊',
  '🤛',
  '🤜',
  '👏',
  '🙌',
  '👐',
  '🤲',
  '🤝',
  '🙏',
  '✌️',
  '🤞',
  '🤟',
  '🤘',
  '🤙',
  '👈',
  '👉',
  '👆',
  '👇',
  '☝️',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '🤎',
  '💕',
  '💞',
  '💓',
  '💗',
  '💖',
  '💘',
  '💝',
  '💟',
  '❣️',
  '💌',
  '💔',
  '🔥',
  '⭐',
  '🌟',
  '✨',
  '💫',
  '🎉',
  '🎊',
  '🎈',
  '🎁',
  '🏆',
  '✅',
  '❌',
  '❓',
  '❗',
  '‼️',
  '⁉️',
  '💯',
  '🔴',
  '🟠',
  '🟡',
  '🟢',
  '🔵',
  '🟣',
  '🟤',
  '⚫',
  '⚪',
  '🚀',
  '👀',
  '🎯',
  '💡',
];

type DashboardSettings = {
  // Profile
  displayName: string;
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
    addNotification,
    loadLocalMessages,
    loadLocalWikiPages,
    loadLocalKanbanTasks,
    loadLocalNotifications,
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
  const [copilotTab, setCopilotTab] = useState<'chat' | 'tasks'>('chat');
  const [rightPanel, setRightPanel] = useState<'ai' | 'closed'>('ai');
  const [composerMessage, setComposerMessage] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(MOCK_AI_RESPONSES);
  const [isThinking, setIsThinking] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityCalendarOpen, setActivityCalendarOpen] = useState(false);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
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
  // Keep settings + currentUser accessible inside socket handlers without stale-closure issues
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  const [hoverEmojiMsgId, setHoverEmojiMsgId] = useState<string | null>(null);
  const [pinScrollIdx, setPinScrollIdx] = useState(0);
  const aiBottomRef = useRef<HTMLDivElement>(null);
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
  // Helper to stop recording and immediately send (used for screen recordings)
  const handleStopAndSend = async () => {
    stopRecording(true);
    // Wait briefly for onstop to generate preview
    await new Promise((res) => setTimeout(res, 600));
    if (recordedPreview) {
      await sendRecordedPreview();
    }
  };
  // ─── New panel states ────────────────────────────────────────────────────────
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const [wikiOpen, setWikiOpen] = useState(false);
  const [kanbanOpen, setKanbanOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const [figmaOpen, setFigmaOpen]       = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<(typeof members)[0] | null>(null);
  const currentMember = currentUser?.email
    ? members.find((member) => member.email.toLowerCase() === currentUser.email.toLowerCase())
    : null;
  const currentMemberId = currentMember?.id ?? '';
  const isAdmin = currentUser?.role === 'Admin';
  const currentUserColor = currentMember?.color ?? (isAdmin ? '#4f46e5' : '#64748b');
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
    const interval = setInterval(() => {
      loadLocalMessages?.();
      loadLocalWikiPages?.();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadLocalMessages, loadLocalWikiPages, loadLocalKanbanTasks]);

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

    socket.on('connect', handleReconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleUpdatedMessage);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleUpdatedMessage);
      socket.emit('leave_channel', activeChannelId);
    };
  }, [activeChannelId, addMessageFromSocket, updateMessageFromSocket]);

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
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      setSettings((value) => ({ ...value, ...JSON.parse(saved) }));
    }
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
        .map((part: string) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      setCurrentUser({ ...user, name: settings.displayName || user.name, initials });
      setAuthChecked(true);
    } catch {
      router.push('/sign-up-login-screen?mode=user&redirect=/dashboard');
    }
  }, [router, settings.displayName]);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages.length, copilotTab]);

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

  const visibleMessages = useMemo(() => {
    const needle = chatSearch.trim().toLowerCase();
    if (!needle) return channelMessages;
    return channelMessages.filter((message) =>
      [message.sender, message.text].join(' ').toLowerCase().includes(needle)
    );
  }, [channelMessages, chatSearch]);

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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
          `${recordedPreview.kind === 'video' ? '📹 Screen recording' : '🎙️ Voice note'}`,
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

  async function askAI(nextPrompt?: string) {
    const question = (nextPrompt ?? aiInput).trim();
    if (!question || isThinking) return;

    setCopilotTab('chat');
    setRightPanel('ai');
    setAiMessages((prev) => [
      ...prev,
      {
        id: `ai-user-${Date.now()}`,
        role: 'user',
        text: question,
        timestamp: new Date().toISOString(),
      },
    ]);
    setAiInput('');
    setIsThinking(true);

    try {
      const result = await askCopilot(
        channelMessages,
        question,
        channel?.name ?? activeChannel,
        workspaceChannels.map((item) => item.name)
      );
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-reply-${Date.now()}`,
          role: 'assistant',
          text: result.success
            ? result.data || 'No response generated.'
            : 'Sorry, I encountered an error.',
          citation: `Scoped to #${channel?.name ?? activeChannel}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      toast.error('Failed to communicate with Copilot');
    } finally {
      setIsThinking(false);
    }
  }

  async function extractTasks() {
    setCopilotTab('tasks');
    setRightPanel('ai');
    toast.info('Extracting action items from this channel...');
    try {
      const result = await extractActionItems(channelMessages);
      if (!result.success || !Array.isArray(result.data)) {
        toast.error('Could not extract tasks from the conversation.');
        return;
      }
      if (result.data.length === 0) {
        toast.success('No new tasks found.');
        return;
      }
      const channelName = `#${channel?.name ?? activeChannel}`;
      result.data.forEach((task: any) => {
        const assigneeName: string = task.assignee || 'Unassigned';
        // Try to match the AI-returned assignee name to a real member to get their email
        const matchedMember = members.find(
          (m) => m.name.toLowerCase() === assigneeName.toLowerCase()
        );
        addKanbanTask({
          text: task.text,
          assignee: assigneeName,
          assigneeInitials: task.assigneeInitials || '?',
          assigneeEmail: matchedMember?.email,
          sourceChannel: channelName,
          status: 'todo',
        });
      });
      toast.success(
        `Extracted ${result.data.length} task${result.data.length === 1 ? '' : 's'} → added to shared Kanban board`
      );
    } catch {
      toast.error('Task extraction failed.');
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

    if (sendEmailInvite) {
      const emailResult = await sendMeetingEmailInvitation(title, timeLabel, inviteeEmails, meetLink);
      if (emailResult.success) {
        toast.success(
          emailResult.previewUrl
            ? `Meeting scheduled. Email preview ready for ${inviteeEmails.length} recipient${inviteeEmails.length === 1 ? '' : 's'}.`
            : `Meeting scheduled. Email invite sent to ${inviteeEmails.length} recipient${inviteeEmails.length === 1 ? '' : 's'}.`
        );
      } else {
        toast.warning('Meeting scheduled, but email delivery failed. Check SMTP settings.');
      }
    } else {
      toast.success('Meeting scheduled. No email invites sent.');
    }

    setScheduleMeetOpen(false);
    setMeetTitle('');
    setMeetDate('');
    setMeetTime('');
    setMeetInviteeIds([]);
    // Give the modal time to unmount before scrolling chat into view
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
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
      text: `🟢 **Meeting Started**\n\nJoin on Google Meet:\n${meetLink}`,
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-black shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Loader2 size={18} className="animate-spin text-indigo-600" />
          Checking workspace access
        </div>
      </div>
    );
  }


    return (
    <div className={`dashboard-root dashboard-workspace text-slate-900 ${rightPanel === 'closed' ? 'dashboard-workspace-panel-closed' : ''}`}>
      <aside className="workspace-sidebar">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200/80 px-3">
          <AppLogo size={26} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-black leading-5 tracking-tight text-slate-900">
              EDUTECHEX<span className="text-indigo-600">OS</span>
            </p>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Workspace
            </p>
          </div>
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-black text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <section>
            <button
              onClick={() => setChannelsExpanded((value) => !value)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                <ChevronDown
                  size={15}
                  className={`transition ${channelsExpanded ? '' : '-rotate-90'}`}
                />
                Channels
              </span>
              <span className="text-xs font-black text-slate-400">{workspaceChannels.length}</span>
            </button>
            {channelsExpanded && (
              <div className="mt-3 space-y-1">
                {workspaceChannels.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveChannel(item.id)}
                    className={`flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-bold transition ${
                      activeChannel === item.id
                        ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                    }`}
                  >
                    <Hash size={15} />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.unread > 0 && (
                      <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-black text-teal-700">
                        {item.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mt-7">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              People
            </p>
            <div className="space-y-3">
              {people.map((member) => (
                <div key={member.id} className="group flex items-center gap-3 rounded-lg py-1.5 transition hover:bg-white/70">
                  {/* Click avatar/name → open DM */}
                  <button
                    onClick={() => setActiveChannel(member.id)}
                    title={`Chat with ${member.name}`}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {member.initials}
                      {(() => {
                        const s = member.id === currentMemberId ? settings.status : member.status;
                        return (
                          <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#f4f7fb] ${
                            s === 'online' ? 'bg-emerald-500' :
                            s === 'away'   ? 'bg-amber-400'  :
                            s === 'busy'   ? 'bg-red-500'    : 'bg-slate-300'
                          }`} />
                        );
                      })()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-600">
                      {member.name}
                    </span>
                  </button>
                  {/* Profile icon visible on hover */}
                  <button
                    onClick={() => setProfileMember(member)}
                    title={`View ${member.name}'s profile`}
                    className="mr-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 group-hover:flex"
                  >
                    <UserCheck size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {isAdmin && (
            <>
              <Link
                href="/admin"
                className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-50 px-4 text-xs font-black uppercase tracking-[0.1em] text-indigo-700 transition hover:bg-indigo-100"
              >
                <ShieldCheck size={16} strokeWidth={2.5} />
                Admin dashboard
              </Link>
              <button
                onClick={() => setNewChannelOpen(true)}
                className="mt-3 flex h-11 w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-600"
              >
                <Plus size={17} />
                New channel
              </button>
            </>
          )}
        </div>

        <div className="border-t border-slate-200/80 bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-200">
              {currentUser?.initials ?? 'G'}
              <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white ${
                settings.status === 'online' ? 'bg-emerald-500' :
                settings.status === 'away'   ? 'bg-amber-400'  :
                settings.status === 'busy'   ? 'bg-red-500'    : 'bg-slate-300'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">
                {currentUser?.name ?? 'Guest'}
              </p>
              <span className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                {currentUser?.role ?? 'Viewer'}
              </span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 rounded-xl bg-slate-50 p-1 dark:bg-slate-800/50">
            {[
              {
                icon: CalendarDays,
                title: 'Open activity calendar',
                action: () => setActivityCalendarOpen(true),
              },
              {
                icon: darkMode ? Sun : Moon,
                title: darkMode ? 'Switch to light mode' : 'Switch to dark mode',
                action: () => { toggleTheme(); storeDarkModeToggle(); },
              },
              {
                icon: Settings,
                title: 'Open workspace settings',
                action: () => {
                  setSettings((value) => ({
                    ...value,
                    displayName: value.displayName || currentUser?.name || '',
                  }));
                  setSettingsOpen(true);
                },
              },
              {
                icon: LogOut,
                title: 'Sign out',
                action: () => {
                  localStorage.removeItem('edutechex_token');
                  toast.success('Signed out');
                  router.push('/sign-up-login-screen');
                },
              },
            ].map(({ icon: Icon, title, action }, index) => (
              <button
                key={index}
                title={title}
                onClick={action}
                className="flex h-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <Icon size={17} />
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className={`workspace-chat${(pinnedMessageIds[activeChannelId]?.length ?? 0) > 0 ? ' workspace-chat-has-pin' : ''}`}>
        <header className="chat-header">
          <div className="min-w-0">
            <h1 className="flex items-center gap-1 truncate text-[22px] font-black text-slate-950">
              <Hash size={24} className="text-slate-400" />
              {channel?.id.startsWith('member-') ? channel.name : channel?.name}
            </h1>
            <p className="mt-1 truncate text-[15px] font-medium text-slate-500">
              {channel?.description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              title="View channel members"
              onClick={() => setMembersOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-bold text-slate-500 md:flex"
            >
              <Users size={16} />
              {channel?.id.startsWith('member-') ? 2 : activeChannelMembers.length}
            </button>
            <button
              title="Search messages"
              onClick={() => setGlobalSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Search size={20} />
            </button>

            <button
              title="Knowledge base"
              onClick={() => setWikiOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:flex"
            >
              <BookOpen size={18} />
            </button>
            <button
              title="Task board"
              onClick={() => setKanbanOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:flex"
            >
              <Layout size={18} />
            </button>
            <button
              title="Saved messages"
              onClick={() => setBookmarksPanelOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 xl:flex"
            >
              <Bookmark size={18} />
            </button>
            {isAdmin && (
              <button
                title="Analytics"
                onClick={() => setAnalyticsOpen(true)}
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 xl:flex"
              >
                <BarChart2 size={18} />
              </button>
            )}
            {/* ── New Feature Buttons ─────────────────────────── */}
            <button
              title="Figma Viewer — embed design files"
              onClick={() => setFigmaOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 xl:flex transition-colors"
            >
              <Layers size={18} />
            </button>
            <button
              title="Team Calendar"
              onClick={() => setCalendarOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 xl:flex transition-colors"
            >
              <CalendarDays size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMeetMenuOpen((value) => !value)}
                className={`flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-black uppercase text-white shadow-sm ${
                  meetingButtonState.link
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-slate-500 hover:bg-slate-600'
                }`}
              >
                <Video size={16} />
                {meetingButtonState.label}
                <ChevronDown size={14} />
              </button>
              {meetMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-3 py-2 text-xs font-bold text-slate-500">
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
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Video size={16} className="text-indigo-600" />
                    Join meet
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setRightPanel('ai');
                setCopilotTab('chat');
              }}
              title="Open Copilot"
              className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-black uppercase text-white shadow-sm hover:bg-indigo-700"
            >
              <Bot size={16} />
              AI
            </button>

            <div className="relative">
              <button
                title="More channel actions"
                onClick={() => setMoreOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <MoreHorizontal size={20} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={() => { setMoreOpen(false); setMembersOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Users size={15} /> View members
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setGlobalSearchOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Search size={15} /> Search messages
                  </button>

                  <button
                    onClick={() => { setMoreOpen(false); setWikiOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <BookOpen size={15} /> Knowledge base
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setKanbanOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Layout size={15} /> Task board
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setBookmarksPanelOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Bookmark size={15} /> Saved messages
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setMoreOpen(false); setAnalyticsOpen(true); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <BarChart2 size={15} /> Analytics
                    </button>
                  )}
                  <button
                    onClick={() => { setMoreOpen(false); setFigmaOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Layers size={15} /> Figma viewer
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); setCalendarOpen(true); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <CalendarDays size={15} /> Team calendar
                  </button>

                </div>
              )}
            </div>
          </div>
        </header>
        {searchOpen && (
          <div className="border-b border-slate-200 bg-white/90 px-6 py-3">
            <label className="mx-auto flex h-11 max-w-3xl items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-500">
              <Search size={18} />
              <input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                placeholder={`Search #${channel?.name}`}
                autoFocus
              />
              <button
                onClick={() => {
                  setChatSearch('');
                  setSearchOpen(false);
                }}
                className="rounded-lg p-1 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </label>
          </div>
        )}

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
                          ? `bg-indigo-600 text-white ${isLast ? 'bubble-own rounded-br-sm' : ''}`
                          : `bg-white border border-slate-100 text-slate-900 ${isLast ? 'bubble-other rounded-bl-sm' : ''}`
                        }
                        ${isPinned ? 'ring-2 ring-amber-400' : ''}
                      `}>

                        {/* Content */}
                        {scheduledMeet ? (
                          <div className="w-56 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">📅 Meeting</p>
                            <p className="mt-1 font-black text-slate-900 text-sm">{scheduledMeet.title}</p>
                            {scheduledMeet.time && <p className="mt-0.5 text-xs text-slate-500">🕐 {scheduledMeet.time}</p>}
                            <a href={scheduledMeet.link} target="_blank" rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors">
                              Join →
                            </a>
                          </div>
                        ) : (
                          <div className={`leading-relaxed ${settings.fontSize === 'large' ? 'text-base' : 'text-sm'} ${isOwn ? 'text-white' : 'text-slate-900'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children, className }) => {
                                  const isBlock = String(className ?? '').includes('language-');
                                  return isBlock
                                    ? <pre className="my-1 overflow-x-auto rounded-lg bg-black/20 p-2 text-xs text-green-300"><code>{children}</code></pre>
                                    : <code className={`rounded px-1 py-0.5 font-mono text-xs ${isOwn ? 'bg-white/20 text-white' : 'bg-slate-100 text-indigo-700'}`}>{children}</code>;
                                },
                                blockquote: ({ children }) => <blockquote className={`border-l-4 pl-3 italic text-xs ${isOwn ? 'border-white/40 text-white/80' : 'border-indigo-300 text-slate-500'}`}>{children}</blockquote>,
                                a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className={`underline ${isOwn ? 'text-white/90' : 'text-indigo-600'}`}>{children}</a>,
                              }}>
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Audio */}
                        {message.audioUrl && (
                          <div className={`mt-2 rounded-xl p-2 ${isOwn ? 'bg-white/10' : 'bg-slate-50'}`}>
                            <audio className="w-48 h-8" controls src={message.audioUrl}><track kind="captions" /></audio>
                            <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>Voice note</p>
                          </div>
                        )}

                        {/* Video */}
                        {message.videoUrl && (
                          <div className="mt-2 w-56">
                            <video className="w-full rounded-xl bg-black" controls src={message.videoUrl}><track kind="captions" /></video>
                            <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>Screen recording</p>
                          </div>
                        )}

                        {/* Files */}
                        {message.files && message.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {message.files.map((file, fi) => (
                              <a key={fi} href={file.url} target="_blank" rel="noreferrer"
                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold transition-colors
                                  ${isOwn ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
                                📎 {file.name}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Timestamp + double-tick */}
                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
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
                          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                            <div className="relative">
                              <button
                                onClick={() => setHoverEmojiMsgId(hoverEmojiMsgId === message.id ? null : message.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm hover:bg-slate-100"
                                title="React">😊</button>
                              {hoverEmojiMsgId === message.id && (
                                <div className={`absolute top-full mt-1 z-30 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${isOwn ? 'right-0' : 'left-0'}`}>
                                  {['👍','❤️','😂','🔥','👀','✅','🎉','💯'].map((em) => (
                                    <button key={em}
                                      onClick={() => { toggleReaction(activeChannelId, message.id, em, currentUser?.email ?? ''); setHoverEmojiMsgId(null); }}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-lg hover:scale-110 hover:bg-slate-100 transition-all">
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => toggleBookmark(message.id)}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 ${isBookmarked ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
                              title={isBookmarked ? 'Remove bookmark' : 'Save'}>
                              <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => { isPinned ? unpinMessage(activeChannelId, message.id) : pinMessage(activeChannelId, message.id); }}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 ${isPinned ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
                              title={isPinned ? 'Unpin' : 'Pin'}>
                              <Pin size={13} />
                            </button>
                            {(isOwn || isAdmin) && (
                              <button
                                onClick={() => deleteMessage(activeChannelId, message.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
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
                      <div className="mt-1 w-64 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                        <p className="mb-3 text-sm font-bold text-slate-900">📊 {message.poll.question}</p>
                        <div className="space-y-2">
                          {message.poll.options.map((opt, i) => {
                            const total = message.poll!.options.reduce((s, o) => s + o.votes.length, 0);
                            const pct = total ? Math.round((opt.votes.length / total) * 100) : 0;
                            return (
                              <div key={i} className="relative overflow-hidden rounded-xl border border-indigo-200 bg-white">
                                <div className="absolute inset-y-0 left-0 rounded-l-xl bg-indigo-100" style={{ width: `${pct}%` }} />
                                <div className="relative flex items-center justify-between px-3 py-2">
                                  <span className="text-sm font-semibold text-slate-700">{opt.text}</span>
                                  <span className="text-xs font-bold text-indigo-600">{pct}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">{message.poll.options.reduce((s, o) => s + o.votes.length, 0)} votes</p>
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
                                  ? 'border-indigo-200 bg-indigo-100 font-bold text-indigo-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
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
            ? `${typers[0]} is typing…`
            : typers.length === 2
            ? `${typers[0]} and ${typers[1]} are typing…`
            : 'Several people are typing…';
          return (
            <div className="flex items-center gap-2 px-6 py-1.5 text-xs font-semibold text-slate-400">
              <span className="flex gap-0.5">
                {[0,1,2].map(i => (
                  <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
              {label}
            </div>
          );
        })()}

        <footer className="shrink-0 border-t border-slate-200/50 bg-white/80 backdrop-blur-md px-4 py-3">
          {/* Mention dropdown */}
          {mentionMenuOpen && mentionSuggestions.length > 0 && (
            <div className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {mentionSuggestions.map((member) => (
                <button key={member.id} onClick={() => insertMention(member.name)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-indigo-50 transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: member.color }}>{member.initials}</div>
                  <div><p className="text-sm font-bold text-slate-900">{member.name}</p><p className="text-xs text-slate-400">{member.role}</p></div>
                </button>
              ))}
            </div>
          )}

          {/* Emoji picker */}
          {emojiMenuOpen && (
            <div ref={emojiPanelRef} className="mb-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji, idx) => (
                  <button key={idx} type="button"
                    onClick={() => { insertComposerText(emoji); setEmojiMenuOpen(false); }}
                    className="flex h-8 items-center justify-center rounded-lg text-lg hover:scale-110 hover:bg-indigo-50 transition-all">
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
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${emojiMenuOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title="Emoji">
                <Smile size={18} />
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Attach file">
                <Paperclip size={18} />
              </button>
              <button onClick={() => startRecording('audio')} disabled={recordingBusy || !!recordingType}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${recordingType === 'audio' ? 'animate-pulse bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title="Voice note">
                <Mic size={18} />
              </button>
              <button onClick={() => startRecording('video')} disabled={recordingBusy || !!recordingType}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${recordingType === 'video' ? 'animate-pulse bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title="Screen record">
                <Video size={18} />
              </button>
              {/* Meet dropdown */}
              <div className="relative" ref={meetInputMenuRef}>
                <button
                  onClick={() => setMeetInputMenuOpen((v) => !v)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${meetInputMenuOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  title="Meet options"
                >
                  <PhoneCall size={17} />
                </button>
                {meetInputMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meeting</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => { setMeetInputMenuOpen(false); startNewMeeting(); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors group"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                          <Video size={15} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Start Meet</p>
                          <p className="text-[11px] text-slate-400">Instant Jitsi room</p>
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
                          <p className="text-sm font-bold text-slate-800">Schedule Meet</p>
                          <p className="text-[11px] text-slate-400">
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
                        background: 'linear-gradient(to top, #7c3aed, #a78bfa)',
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
                    <Monitor size={17} style={{ color: '#7c3aed' }} strokeWidth={2.2} />
                    <span className="text-xs font-bold" style={{ color: '#7c3aed' }}>Recording screen</span>
                  </div>
                )}
                {/* Timer */}
                <span className="text-xs font-bold tabular-nums mx-1" style={{ color: '#7c3aed' }}>
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
                  style={{ background: 'rgba(139,92,246,0.14)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.25)' }}
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
                if (event.key === 'Enter' && !event.shiftKey && settings.enterToSend) { event.preventDefault(); sendMessage(); }
                if (event.key === 'Escape') { setEmojiMenuOpen(false); setMentionMenuOpen(false); }
              }}
              placeholder={`Message #${channel?.name ?? ''}… (Enter to send · Shift+Enter for new line)`}
              className="flex-1 resize-none rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              rows={1}
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />

            {/* Round indigo send button */}
            <button
              onClick={sendMessage}
              disabled={!composerMessage.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:shadow-indigo-300/50 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </main>

      <aside className={`copilot-panel ${rightPanel === 'closed' ? 'copilot-panel-closed' : ''}`}>
        {rightPanel !== 'closed' ? (
          <>
            <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
                AI
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-black text-slate-950">Channel Copilot</h2>
                <p className="truncate text-xs font-bold text-slate-400">
                  Only using #{channel?.name ?? activeChannel} context
                </p>
              </div>
              <button
                title="Close Copilot"
                onClick={() => setRightPanel('closed')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-200">
              <button
                title="Copilot chat tab"
                onClick={() => setCopilotTab('chat')}
                className={`h-13 border-b-2 text-xs font-black uppercase tracking-[0.12em] ${
                  copilotTab === 'chat'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Chat
              </button>
              <button
                title="Copilot tasks tab"
                onClick={() => setCopilotTab('tasks')}
                className={`h-13 border-b-2 text-xs font-black uppercase tracking-[0.12em] ${
                  copilotTab === 'tasks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Tasks
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {copilotTab === 'chat' ? (
                <div className="space-y-4">
                  {aiMessages.map((message) => (
                    <div
                      key={message.id}
                      className={message.role === 'user' ? 'flex justify-end' : ''}
                    >
                      <div
                        className={`max-w-[92%] rounded-[1.35rem] border p-5 text-[15px] font-medium leading-7 shadow-sm ${
                          message.role === 'user'
                            ? 'rounded-tr-sm border-indigo-600 bg-indigo-600 text-white'
                            : 'rounded-tl-sm border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        {message.text}
                      </div>
                      {message.role === 'assistant' && message.citation && (
                        <p className="mt-3 text-xs font-black uppercase tracking-tight text-slate-400">
                          {message.citation}
                        </p>
                      )}
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500">
                      <Loader2 size={15} className="animate-spin text-indigo-600" />
                      Copilot is thinking...
                    </div>
                  )}
                  <div ref={aiBottomRef} />
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={extractTasks}
                    className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-indigo-700 hover:bg-indigo-100"
                  >
                    Extract Action Items
                  </button>
                  {(() => {
                    const channelName = `#${channel?.name ?? activeChannel}`;
                    const myEmail = currentUserEmail;
                    const myName = currentUser?.name?.toLowerCase() ?? '';
                    const channelTasks = kanbanTasks.filter((t) => {
                      if (t.sourceChannel !== channelName) return false;
                      // Show the task only to the assigned person
                      if (t.assigneeEmail) return t.assigneeEmail.toLowerCase() === myEmail;
                      return t.assignee.toLowerCase() === myName;
                    });
                    if (channelTasks.length === 0) {
                      return (
                        <p className="mt-4 text-center text-xs font-semibold text-slate-400 leading-relaxed">
                          No tasks assigned to you in {channelName}.<br />
                          Ask a teammate to @mention you with an action word, or use &ldquo;Extract Action Items&rdquo; above.
                        </p>
                      );
                    }
                    return channelTasks.slice(0, 10).map((task) => (
                      <article
                        key={task.id}
                        className={`rounded-xl border border-slate-200 bg-white p-3 ${task.status === 'done' ? 'opacity-55' : ''}`}
                      >
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              updateKanbanTaskStatus(
                                task.id,
                                task.status === 'done' ? 'todo' : 'done'
                              )
                            }
                            className="mt-0.5 text-slate-300 hover:text-indigo-600"
                          >
                            {task.status === 'done' ? (
                              <CheckSquare size={17} className="text-emerald-500" />
                            ) : (
                              <Square size={17} />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-bold leading-5 text-slate-800 ${task.status === 'done' ? 'line-through' : ''}`}
                            >
                              {task.text}
                            </p>
                            <div className="mt-3 flex items-center justify-between text-xs font-black text-slate-400">
                              <span>{task.sourceChannel}</span>
                              <span>{task.assigneeInitials}</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ));
                  })()}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-5">
              {copilotTab === 'chat' && (
                <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
                  <input
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && askAI()}
                    className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none placeholder:text-slate-400"
                    placeholder={`Ask #${channel?.name ?? activeChannel} Copilot...`}
                  />
                  <button
                    onClick={() => askAI()}
                    disabled={!aiInput.trim() || isThinking}
                    className="text-slate-300 hover:text-indigo-600 disabled:hover:text-slate-300"
                  >
                    {isThinking ? (
                      <Loader2 size={21} className="animate-spin" />
                    ) : (
                      <Send size={21} />
                    )}
                  </button>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    askAI(`What is the latest status in #${channel?.name ?? activeChannel}?`)
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-indigo-600"
                >
                  Channel status
                </button>
                <button
                  onClick={extractTasks}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-indigo-600"
                >
                  Extract tasks
                </button>
                <button
                  onClick={() => askAI(`Summarize only #${channel?.name ?? activeChannel}.`)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-indigo-600"
                >
                  Channel summary
                </button>
              </div>
            </div>
          </>
        ) : null}
      </aside>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <MyActivityCalendar
        open={activityCalendarOpen}
        onClose={() => setActivityCalendarOpen(false)}
      />

      {/* ── Feature panels ─────────────────────────────────────────── */}
      {figmaOpen    && <FigmaPanel    onClose={() => setFigmaOpen(false)} />}
      {calendarOpen && <CalendarPanel onClose={() => setCalendarOpen(false)} />}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm dark:bg-black/70"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="flex w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Left nav ──────────────────────────────────────── */}
            <div className="flex w-44 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-4 dark:border-slate-700">
                <Settings size={16} className="shrink-0 text-indigo-600" />
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">Settings</span>
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
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </nav>
              {/* Sign out shortcut */}
              <div className="border-t border-slate-200 p-2 dark:border-slate-700">
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
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-700">
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {settingsTab === 'profile'       && 'Profile'}
                  {settingsTab === 'appearance'    && 'Appearance'}
                  {settingsTab === 'notifications' && 'Notifications'}
                  {settingsTab === 'meeting'       && 'Meeting'}
                  {settingsTab === 'security'      && 'Security'}
                </h2>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
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
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-200">
                        {currentUser?.initials ?? 'G'}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-slate-100">{settings.displayName || currentUser?.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser?.email}</p>
                        <span className="mt-1 inline-flex rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {currentUser?.role}
                        </span>
                      </div>
                    </div>

                    {/* Display name */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Display name
                      </label>
                      <input
                        value={settings.displayName}
                        onChange={(e) => setSettings((v) => ({ ...v, displayName: e.target.value }))}
                        placeholder={currentUser?.name ?? 'Your name'}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
                      />
                      <p className="mt-1.5 text-xs text-slate-400">This name appears in chat messages and the team list.</p>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
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
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            <span className={`h-3 w-3 rounded-full ${dot}`} />
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">Your status dot is visible to everyone in the People list.</p>
                    </div>
                  </>
                )}

                {/* ── APPEARANCE ──────────────────────────────────── */}
                {settingsTab === 'appearance' && (
                  <>
                    {/* Dark mode */}
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Dark mode</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Currently {darkMode ? 'on' : 'off'} — affects the whole app</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { toggleTheme(); storeDarkModeToggle(); }}
                        className={`relative h-6 w-11 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Compact chat */}
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <Layout size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Compact chat</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Reduce spacing between messages</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings((v) => ({ ...v, compactChat: !v.compactChat }))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${settings.compactChat ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.compactChat ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Font size */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <Type size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Message font size</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Controls the size of text in chat bubbles</p>
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
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Enter to send */}
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <Send size={15} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Enter to send</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {settings.enterToSend
                              ? 'Enter sends · Shift+Enter for new line'
                              : 'Click the send button to post'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings((v) => ({ ...v, enterToSend: !v.enterToSend }))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${settings.enterToSend ? 'bg-indigo-600' : 'bg-slate-200'}`}
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
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                          <Mail size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Email on @mention</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Send an email when someone @mentions you</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings((v) => ({ ...v, emailNotifications: !v.emailNotifications }))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${settings.emailNotifications ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Desktop notifications */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                            <Monitor size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">Desktop notifications</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Browser pop-up for incoming messages</p>
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
                          className={`relative h-6 w-11 rounded-full transition-colors ${settings.desktopNotifications ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.desktopNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {settings.desktopNotifications && typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          ⚠ Notifications are blocked in your browser. Go to browser Site Settings to allow them.
                        </p>
                      )}
                    </div>

                    {/* Sound */}
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                          <Volume2 size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Sound alerts</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Play a soft chime when new messages arrive</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={playNotificationSound}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                          title="Preview sound"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings((v) => ({ ...v, soundNotifications: !v.soundNotifications }))}
                          className={`relative h-6 w-11 rounded-full transition-colors ${settings.soundNotifications ? 'bg-indigo-600' : 'bg-slate-200'}`}
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
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Scheduled meeting links
                      </p>
                      <div className="space-y-2.5">
                        {[
                          { days: 'Mon – Thu (before 2 PM)', label: 'Main meet',      link: DEFAULT_COMPANY_MEET_LINK,     dot: 'bg-indigo-500' },
                          { days: 'Thursday from 2 PM',      label: 'Thursday PM',    link: THURSDAY_AFTERNOON_MEET_LINK,  dot: 'bg-amber-500'  },
                          { days: 'Friday (all day)',         label: 'Friday meet',    link: FRIDAY_MEET_LINK,              dot: 'bg-emerald-500'},
                          { days: 'Saturday & Sunday',        label: 'No meeting',     link: null,                          dot: 'bg-slate-300'  },
                        ].map(({ days, label, link, dot }) => (
                          <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p>
                                <p className="text-[11px] text-slate-400">{days}</p>
                              </div>
                            </div>
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                              >
                                Open ↗
                              </a>
                            ) : (
                              <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                                Off
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Override main link */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Override main meet link
                      </label>
                      <input
                        value={settings.meetLink}
                        onChange={(e) => setSettings((v) => ({ ...v, meetLink: e.target.value }))}
                        placeholder={DEFAULT_COMPANY_MEET_LINK}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
                      />
                      <p className="mt-1.5 text-xs text-slate-400">Replaces the Mon–Thu default link. Leave blank to use the built-in link.</p>
                    </div>
                  </>
                )}
                {/* ── SECURITY ────────────────────────────────────── */}
                {settingsTab === 'security' && (
                  <>
                    {/* Info banner */}
                    <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
                      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <p className="text-sm font-black text-indigo-800 dark:text-indigo-300">Change your password</p>
                        <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
                          You must enter your current password to set a new one. Minimum 8 characters.
                          System accounts (admin, core team) must contact admin to change passwords.
                        </p>
                      </div>
                    </div>

                    {/* Change password — uses a div + button, NOT a nested form (HTML forbids form-in-form) */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          Current password
                        </label>
                        <input
                          type="password"
                          value={pwCurrent}
                          onChange={(e) => setPwCurrent(e.target.value)}
                          placeholder="Enter your current password"
                          autoComplete="current-password"
                          required
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          New password
                        </label>
                        <input
                          type="password"
                          value={pwNew}
                          onChange={(e) => setPwNew(e.target.value)}
                          placeholder="Min 8 characters"
                          autoComplete="new-password"
                          required
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
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
                            <p className="text-[10px] text-slate-400">
                              {pwNew.length < 8  ? 'Too short' :
                               pwNew.length < 10 ? 'Weak — try adding numbers or symbols' :
                               pwNew.length < 12 ? 'Moderate' : 'Strong ✓'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          Confirm new password
                        </label>
                        <input
                          type="password"
                          value={pwConfirm}
                          onChange={(e) => setPwConfirm(e.target.value)}
                          placeholder="Repeat new password"
                          autoComplete="new-password"
                          required
                          className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 ${
                            pwConfirm && pwNew !== pwConfirm
                              ? 'border-red-400 focus:border-red-400'
                              : 'border-slate-200 focus:border-indigo-400 dark:border-slate-600'
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
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                      >
                        {pwLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {pwLoading ? 'Changing password…' : 'Change password'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-semibold text-slate-400">
                  {settingsTab === 'security' ? 'Password is saved separately — use the button above.' : 'Changes apply immediately after saving.'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-[0.1em] text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    Save settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {scheduleMeetOpen && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/70"
          onClick={() => setScheduleMeetOpen(false)}
        >
          <form
            onSubmit={scheduleMeet}
            className="w-full max-w-xl flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{ maxHeight: '90vh' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white dark:border-slate-700">
              <div>
                <h2 className="text-lg font-black tracking-tight">Schedule meet</h2>
                <p className="mt-1 text-sm font-semibold text-slate-300 dark:text-slate-400">
                  Mention people from #{channel?.name}; they receive email and in-app notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleMeetOpen(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white dark:text-slate-500"
                title="Close schedule meet"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-5 overflow-y-auto flex-1">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Meeting title
                </span>
                <input
                  value={meetTitle}
                  onChange={(event) => setMeetTitle(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-500"
                  placeholder="Product review sync"
                  autoFocus
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Date
                  </span>
                  <input
                    type="date"
                    value={meetDate}
                    onChange={(event) => setMeetDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Time
                  </span>
                  <input
                    type="time"
                    value={meetTime}
                    onChange={(event) => setMeetTime(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-indigo-500"
                  />
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Mention people
                  </span>
                  {availableInvitees.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMeetInviteeIds(availableInvitees.map((member) => member.id))
                      }
                      className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Select channel
                    </button>
                  )}
                </div>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  {availableInvitees.length ? (
                    availableInvitees.map((member) => {
                      const checked = meetInviteeIds.includes(member.id);
                      return (
                        <button
                          key={`invite-${member.id}`}
                          type="button"
                          onClick={() => toggleInvitee(member.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                            checked
                              ? 'border-indigo-200 bg-white text-indigo-700 shadow-sm dark:border-indigo-600 dark:bg-slate-800 dark:text-indigo-300'
                              : 'border-transparent bg-white/60 text-slate-700 hover:bg-white dark:bg-slate-800/30 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-white"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black">
                              @{member.name}
                            </span>
                            <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {member.email}
                            </span>
                          </span>
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
                              checked
                                ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                                : 'border-slate-200 bg-white text-transparent dark:border-slate-600 dark:bg-slate-800'
                            }`}
                          >
                            <UserCheck size={14} strokeWidth={2.5} />
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                      This channel has no other people to mention yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email invite toggle + recipient preview */}
            <div className="px-5 pb-4 flex-shrink-0">
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${sendEmailInvite ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'}`}>
                <div className="mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={sendEmailInvite}
                    onChange={(e) => setSendEmailInvite(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className={sendEmailInvite ? 'text-indigo-600' : 'text-slate-400'} />
                    <span className={`text-sm font-black ${sendEmailInvite ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      Send email invites to assigned members
                    </span>
                  </div>
                  {sendEmailInvite && selectedInvitees.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedInvitees.map((inv) => (
                        <span key={inv.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          <Mail size={10} />
                          {inv.email}
                        </span>
                      ))}
                    </div>
                  ) : sendEmailInvite ? (
                    <p className="mt-1 text-xs text-slate-400">Select at least one person above to send invites.</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">No email will be sent — in-app notification only.</p>
                  )}
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {selectedInvitees.length} person{selectedInvitees.length === 1 ? '' : 's'} selected
                {sendEmailInvite && selectedInvitees.length > 0 && <span className="ml-1 text-indigo-600 dark:text-indigo-400">· email invite will be sent</span>}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleMeetOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-[0.1em] text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Schedule meet
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Recording overlay removed — controls are inline in the composer waveform bar */}

      {recordedPreview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">
                  Preview {recordedPreview.kind === 'video' ? 'screen recording' : 'voice note'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Review it before sending to #{channel?.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={discardRecordedPreview}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <audio src={recordedPreview.url} className="w-full" controls />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={discardRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={sendRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {recordingSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {membersOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onClick={() => setMembersOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Channel members</h2>
                <p className="text-sm font-semibold text-slate-500">#{channel?.name}</p>
              </div>
              <button
                title="Close members"
                onClick={() => setMembersOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-900">
                        {member.name}
                      </span>
                      <span className="block truncate text-xs font-semibold text-slate-500">
                        {member.email}
                      </span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                      {member.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
                  No users have been granted this channel yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── New Feature Panels ─────────────────────────────────────────────── */}

      {/* Global Search Panel */}
      {globalSearchOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/50 pt-20 backdrop-blur-sm" onClick={() => setGlobalSearchOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl">
            <SearchPanel onClose={() => setGlobalSearchOpen(false)} />
          </div>
        </div>
      )}



      {/* User Profile Modal */}
      <UserProfileModal
        member={profileMember}
        onClose={() => setProfileMember(null)}
      />

      {/* Wiki / Knowledge Base Panel */}
      {wikiOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="h-full w-full max-w-4xl">
            <WikiPanel
              onClose={() => { setWikiOpen(false); scrollToBottom(); }}
              activeChannel={`personal-${currentUser?.email ?? 'guest'}`}
            />
          </div>
        </div>
      )}

      {/* Kanban Task Board */}
      {kanbanOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="h-full w-full max-w-5xl">
            <KanbanBoard onClose={() => { setKanbanOpen(false); scrollToBottom(); }} />
          </div>
        </div>
      )}

      {/* Analytics Panel (Admin only) */}
      {analyticsOpen && isAdmin && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <AnalyticsPanel onClose={() => { setAnalyticsOpen(false); scrollToBottom(); }} />
          </div>
        </div>
      )}

      {/* Bookmarks Panel */}
      {bookmarksPanelOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[85vh] overflow-auto">
            <BookmarksPanel onClose={() => { setBookmarksPanelOpen(false); scrollToBottom(); }} />
          </div>
        </div>
      )}

      {newChannelOpen && isAdmin && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onClick={() => setNewChannelOpen(false)}
        >
          <form
            onSubmit={createChannel}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">New channel</h2>
                <p className="text-sm font-semibold text-slate-500">
                  Create a workspace discussion lane.
                </p>
              </div>
              <button
                title="Close new channel"
                type="button"
                onClick={() => setNewChannelOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Name
            </label>
            <input
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="for example, school-pilots"
              autoFocus
            />
            <label className="mt-4 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Description
            </label>
            <input
              value={newChannelDescription}
              onChange={(event) => setNewChannelDescription(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="What this channel is for"
            />
            <button
              type="submit"
              className="mt-5 h-11 w-full rounded-xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700"
            >
              Create channel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
