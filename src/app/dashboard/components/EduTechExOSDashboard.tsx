'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../dashboard.css';
import AppLogo from '@/components/ui/AppLogo';
import { MOCK_AI_RESPONSES, MOCK_TASKS } from '@/data/mockData';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTheme } from '@/components/ThemeProvider';
import { askCopilot, extractActionItems } from '@/app/actions/aiActions';
import {
  sendMeetingEmailInvitation,
  sendMentionEmailNotification,
  uploadLocalFile,
} from '@/app/actions/dbActions';
import NotificationPanel from './NotificationPanel';
import NotepadPanel from './NotepadPanel';
import MyActivityCalendar from './MyActivityCalendar';
import { toast } from 'sonner';
import {
  AtSign,
  Bell,
  CalendarPlus,
  Bot,
  CalendarDays,
  ChevronDown,
  FileText,
  Hash,
  CheckSquare,
  Loader2,
  LogOut,
  Mic,
  Moon,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Square,
  Sun,
  UserCheck,
  Users,
  Video,
  X,
  Zap,
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
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
  '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
  '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
  '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝',
  '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
  '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
  '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡',
  '😠', '🤬', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
  '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
  '👉', '👆', '👇', '☝️', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🖤', '🤍', '🤎', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
  '💟', '❣️', '💌', '💔', '🔥', '⭐', '🌟', '✨', '💫', '🎉',
  '🎊', '🎈', '🎁', '🏆', '✅', '❌', '❓', '❗', '‼️', '⁉️',
  '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪',
  '🚀', '👀', '🎯', '💡',
];

type DashboardSettings = {
  displayName: string;
  meetLink: string;
  emailNotifications: boolean;
  compactChat: boolean;
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
    addNotification,
    loadLocalMessages,
    notifications,
  } = useDashboardStore();
  const [copilotTab, setCopilotTab] = useState<'chat' | 'tasks'>('chat');
  const [rightPanel, setRightPanel] = useState<'ai' | 'notepad' | 'closed'>('ai');
  const [composerMessage, setComposerMessage] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(MOCK_AI_RESPONSES);
  const [tasks, setTasks] = useState(MOCK_TASKS);
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
  const [scheduleMeetOpen, setScheduleMeetOpen] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetInviteeIds, setMeetInviteeIds] = useState<string[]>([]);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>({
    displayName: '',
    meetLink: DEFAULT_COMPANY_MEET_LINK,
    emailNotifications: true,
    compactChat: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const aiBottomRef = useRef<HTMLDivElement>(null);
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
  const channelMessages = messages[channel?.id ?? 'general'] ?? [];
  const people = isAdmin ? members : members.slice(0, 7);
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
  }, [loadLocalMessages]);

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
    if (!authChecked) return;

    const active = channels.find((item) => item.id === activeChannel);
    if (!active || active.id.startsWith('member-') || isAdmin || active.id === 'general') return;

    if (!currentMemberId || !active.memberIds?.includes(currentMemberId)) {
      setActiveChannel('general');
    }
  }, [activeChannel, authChecked, channels, currentMemberId, isAdmin, setActiveChannel]);

  function sendMessage() {
    const text = composerMessage.trim();
    if (!text || !channel) return;

    const mentionedMembers = activeChannelMembers.filter(
      (member) =>
        member.email.toLowerCase() !== currentUserEmail &&
        text.toLowerCase().includes(`@${member.name}`.toLowerCase())
    );

    addMessage(channel.id, {
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
    setCurrentUser((user) =>
      user ? { ...user, name: settings.displayName.trim() || user.name } : user
    );
    setSettingsOpen(false);
    toast.success('Settings saved');
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !channel) return;

    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await uploadLocalFile(formData);
      if (!result.success || !result.url) {
        toast.error('File upload failed.');
        return;
      }
      addMessage(channel.id, {
        id: `msg-file-${Date.now()}`,
        sender: currentUser?.name ?? 'You',
        initials: currentUser?.initials ?? 'Y',
        color: currentUserColor,
        timestamp: new Date().toISOString(),
        text: composerMessage.trim(),
        files: [
          { name: result.name || file.name, url: result.url, type: result.type || file.type },
        ],
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
        kind === 'video' && navigator.mediaDevices.getDisplayMedia
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
      const result = await uploadLocalFile(formData);

      if (!result.success || !result.url) {
        toast.error(`${recordedPreview.kind === 'video' ? 'Video' : 'Audio'} upload failed.`);
        return;
      }

      addMessage(channel.id, {
        id: `msg-${recordedPreview.kind}-${Date.now()}`,
        sender: currentUser?.name ?? 'You',
        initials: currentUser?.initials ?? 'Y',
        color: currentUserColor,
        timestamp: new Date().toISOString(),
        text:
          composerMessage.trim() ||
          `${recordedPreview.kind === 'video' ? 'Screen recording' : 'Voice note'}`,
        ...(recordedPreview.kind === 'video'
          ? { videoUrl: result.url }
          : { audioUrl: result.url }),
      });
      setComposerMessage('');
      discardRecordedPreview();
      toast.success(`${recordedPreview.kind === 'video' ? 'Screen recording' : 'Voice note'} sent`);
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
      const newTasks = result.data.map((task: any) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        text: task.text,
        assignee: task.assignee || 'Unassigned',
        assigneeInitials: task.assigneeInitials || '?',
        sourceChannel: `#${channel?.name ?? activeChannel}`,
        done: false,
      }));
      setTasks((prev) => [...newTasks, ...prev]);
      toast.success(`Extracted ${newTasks.length} task${newTasks.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Task extraction failed.');
    }
  }

  function toggleTask(taskId: string) {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
    );
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
    setMeetInviteeIds(availableInvitees.map((member) => member.id));
    setMeetMenuOpen(false);
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

    addMessage(channel.id, {
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

    const emailResult = await sendMeetingEmailInvitation(title, timeLabel, inviteeEmails, meetLink);
    if (emailResult.success) {
      toast.success(
        emailResult.previewUrl
          ? 'Meeting scheduled. Email preview created.'
          : 'Meeting scheduled and email invitations sent.'
      );
    } else {
      toast.error('Meeting scheduled, but email delivery failed in this environment.');
    }

    setScheduleMeetOpen(false);
    setMeetTitle('');
    setMeetDate('');
    setMeetTime('');
    setMeetInviteeIds([]);
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
    <div
      className={`dashboard-root dashboard-workspace text-slate-900 ${rightPanel === 'closed' ? 'dashboard-workspace-panel-closed' : ''}`}
    >
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
                <button
                  key={member.id}
                  onClick={() => setActiveChannel(member.id)}
                  className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left transition hover:bg-white/70"
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {member.initials}
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#f4f7fb] ${
                        member.status === 'online'
                          ? 'bg-emerald-500'
                          : member.status === 'away'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-600">
                    {member.name}
                  </span>
                </button>
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
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
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
          <div className="mt-3 grid grid-cols-4 rounded-xl bg-slate-50 p-1 dark:bg-slate-800/50">
            {[
              {
                icon: CalendarDays,
                title: 'Open activity calendar',
                action: () => setActivityCalendarOpen(true),
              },
              {
                icon: theme === 'dark' ? Sun : Moon,
                title: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
                action: () => toggleTheme(),
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

      <main className="workspace-chat">
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
              onClick={() => setSearchOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Search size={20} />
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
                    Start meet
                  </button>
                  <button
                    onClick={openScheduleMeet}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarPlus size={16} className="text-emerald-600" />
                    Schedule meet
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
            <button
              onClick={() => setRightPanel('notepad')}
              title="Open Notepad"
              className="hidden h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 lg:flex"
            >
              <FileText size={17} />
              Notepad
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
                <div className="absolute right-0 top-11 z-40 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setMembersOpen(true);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    View members
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setSearchOpen(true);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Search messages
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setRightPanel('notepad');
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Open notepad
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      toast.success(`#${channel?.name} copied to workspace clipboard`);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Copy channel link
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

        <section className="chat-scroll">
          <div className="date-divider">
            <span />
            <strong>{firstMessageDate}</strong>
            <span />
          </div>

          <div className="message-stream">
            {visibleMessages.map((message, index) => {
              const compactWithPrevious =
                index > 0 && visibleMessages[index - 1].sender === message.sender;
              const scheduledMeet = parseScheduledMeet(message.text);
              return (
                <article
                  key={message.id}
                  className={`chat-message ${compactWithPrevious ? 'chat-message-compact' : ''}`}
                >
                  {!compactWithPrevious ? (
                    <div
                      className="message-avatar shadow-lg"
                      style={{ backgroundColor: message.color }}
                    >
                      {message.initials}
                    </div>
                  ) : (
                    <div className="w-12 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    {!compactWithPrevious && (
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">{message.sender}</p>
                        {message.sender === 'Aditya Cherikuri' && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-indigo-600">
                            Admin
                          </span>
                        )}
                        <span className="text-xs font-black uppercase text-slate-400">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}
                    {scheduledMeet ? (
                      <div className="mt-2 max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                              Scheduled meet
                            </p>
                            <h3 className="mt-1 text-lg font-black text-slate-950">
                              {scheduledMeet.title}
                            </h3>
                          </div>
                          <CalendarPlus size={20} className="text-emerald-600" />
                        </div>
                        <div className="space-y-2 text-sm font-semibold text-slate-700">
                          <p>{scheduledMeet.time}</p>
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                            {scheduledMeet.people}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open(scheduledMeet.link, '_blank')}
                          className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-[0.08em] text-white hover:bg-emerald-700"
                        >
                          <Video size={15} />
                          Join meet
                        </button>
                      </div>
                    ) : (
                      <p className="max-w-4xl whitespace-pre-line text-[18px] font-medium leading-8 text-slate-700">
                        {message.text}
                      </p>
                    )}
                    {message.audioUrl && (
                      <audio className="mt-3 w-full max-w-md" controls src={message.audioUrl}>
                        <track kind="captions" />
                      </audio>
                    )}
                    {message.videoUrl && (
                      <video
                        className="mt-3 w-full max-w-xl rounded-2xl border border-slate-200 bg-black"
                        controls
                        src={message.videoUrl}
                      >
                        <track kind="captions" />
                      </video>
                    )}
                    {message.files?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.files.map((file) => (
                          <a
                            key={`${message.id}-${file.url}`}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm hover:text-indigo-600"
                          >
                            {file.name}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="composer-wrap">
          <div className="composer">
            <div className="composer-toolbar">
              <button
                onClick={() => insertComposerText('**', '**')}
                className="font-black"
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => insertComposerText('*', '*')}
                className="italic"
                title="Italic"
              >
                I
              </button>
              <button
                onClick={() => insertComposerText('<u>', '</u>')}
                className="underline"
                title="Underline"
              >
                U
              </button>
              <button onClick={() => insertComposerText('`', '`')} title="Inline code">
                `
              </button>
              <span />              <button onClick={() => { insertComposerText('@'); setMentionMenuOpen(true); setEmojiMenuOpen(false); }} title="Mention">
                <AtSign size={17} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} title="Attach file">
                <Paperclip size={17} />
              </button>
              <button
                ref={emojiBtnRef}
                onClick={() => {
                  setEmojiMenuOpen((value) => !value);
                  setMentionMenuOpen(false);
                }}
                title="Add emoji"
                className={emojiMenuOpen ? 'text-indigo-600' : ''}
              >
                <Smile size={17} />
              </button>
          <span />
          {recordingType ? (
            <span className="flex items-center gap-1.5 text-xs font-black text-red-500 px-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
            </span>
          ) : null}
          <button
            onClick={() => startRecording('audio')}
            disabled={recordingBusy || !!recordingType}
            title="Record voice note"
            className={recordingType === 'audio' ? 'text-red-500' : ''}
          >
            <Mic size={17} />
          </button>
          <button
            onClick={() => startRecording('video')}
            disabled={recordingBusy || !!recordingType}
            title="Record screen"
          >
            <Video size={17} />
          </button>
            </div>
            {(mentionMenuOpen || emojiMenuOpen) && (
              <div className="relative">
                {mentionMenuOpen && mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-2 left-4 z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {mentionSuggestions.map((member) => (
                      <button
                        key={`mention-${member.id}`}
                        type="button"
                        onClick={() => insertMention(member.name)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-800">
                            @{member.name}
                          </span>
                          <span className="block truncate text-xs font-semibold text-slate-500">
                            {member.email}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {emojiMenuOpen && (
                  <div
                    ref={emojiPanelRef}
                    className="absolute bottom-full right-0 mb-2 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
                  >
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Emoji
                    </div>
                    <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto">
                      {EMOJI_OPTIONS.map((emoji, idx) => (
                        <button
                          key={`${emoji}-${idx}`}
                          type="button"
                          onClick={() => {
                            insertComposerText(emoji);
                            setEmojiMenuOpen(false);
                          }}
                          className="flex h-8 items-center justify-center rounded-xl text-lg hover:bg-indigo-50 hover:scale-110 transition-all"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <input ref={fileInputRef} onChange={handleFileUpload} type="file" className="hidden" />
            <div className="flex items-center gap-3 px-5 py-4">
              <input
                ref={composerRef}
                className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                value={composerMessage}
                onChange={(event) => {
                  const next = event.target.value;
                  setComposerMessage(next);
                  setMentionMenuOpen(/@[\w\s.-]*$/.test(next));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    sendMessage();
                  }
                }}
                placeholder={`Message #${channel?.name}... (Drop screenshots, type @ to mention)`}
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(companyMeetLink, '_blank')}
                  className="flex h-9 items-center gap-2 rounded-xl bg-indigo-50 px-3 text-xs font-black uppercase text-indigo-700"
                >
                  <Video size={15} />
                  Start
                </button>
                <button
                  onClick={openScheduleMeet}
                  className="flex h-9 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-black uppercase text-emerald-700"
                >
                  <CalendarPlus size={15} />
                  Schedule
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden items-center gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-300 sm:flex">
                  <Zap size={13} className="text-amber-400" />
                  Ctrl + Enter to send
                </span>
                <button
                  onClick={sendMessage}
                  disabled={!composerMessage.trim()}
                  className="flex h-9 items-center rounded-xl bg-slate-100 px-6 text-xs font-black uppercase text-slate-400 transition enabled:bg-indigo-600 enabled:text-white enabled:hover:bg-indigo-700"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <aside className={`copilot-panel ${rightPanel === 'closed' ? 'copilot-panel-closed' : ''}`}>
        {rightPanel === 'notepad' ? (
          <NotepadPanel
            onClose={() => setRightPanel('ai')}
            activeChannel={channel?.id ?? activeChannel}
          />
        ) : (
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
                  {tasks.slice(0, 8).map((task) => (
                    <article
                      key={task.id}
                      className={`rounded-xl border border-slate-200 bg-white p-3 ${task.done ? 'opacity-55' : ''}`}
                    >
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="mt-0.5 text-slate-300 hover:text-indigo-600"
                        >
                          {task.done ? (
                            <CheckSquare size={17} className="text-emerald-500" />
                          ) : (
                            <Square size={17} />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold leading-5 text-slate-800 ${task.done ? 'line-through' : ''}`}
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
                  ))}
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
        )}
      </aside>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <MyActivityCalendar
        open={activityCalendarOpen}
        onClose={() => setActivityCalendarOpen(false)}
      />

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/70"
          onClick={() => setSettingsOpen(false)}
        >
          <form
            onSubmit={saveSettings}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white dark:border-slate-700">
              <div>
                <h2 className="text-lg font-black tracking-tight">Settings</h2>
                <p className="mt-1 text-sm font-semibold text-slate-300 dark:text-slate-400">
                  Profile, meeting link, and notification controls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white dark:text-slate-500"
                title="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Display name
                </span>
                <input
                  value={settings.displayName}
                  onChange={(event) =>
                    setSettings((value) => ({ ...value, displayName: event.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-500"
                  placeholder={currentUser?.name ?? 'Your name'}
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Company meeting link
                </span>
                <input
                  value={settings.meetLink}
                  onChange={(event) =>
                    setSettings((value) => ({ ...value, meetLink: event.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-500"
                  placeholder={DEFAULT_COMPANY_MEET_LINK}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <span>
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-200">Email mentions</span>
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Send email when people are mentioned.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(event) =>
                      setSettings((value) => ({
                        ...value,
                        emailNotifications: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 dark:accent-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <span>
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-200">Compact chat</span>
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Use tighter message spacing.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.compactChat}
                    onChange={(event) =>
                      setSettings((value) => ({ ...value, compactChat: event.target.checked }))
                    }
                    className="h-5 w-5 dark:accent-indigo-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-[0.1em] text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Save settings
              </button>
            </div>
          </form>
        </div>
      )}

      {scheduleMeetOpen && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/70"
          onClick={() => setScheduleMeetOpen(false)}
        >
          <form
            onSubmit={scheduleMeet}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
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

            <div className="grid gap-4 p-5">
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

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {selectedInvitees.length} mentioned person{selectedInvitees.length === 1 ? '' : 's'}{' '}
                will be notified.
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

      {recordingType && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {recordingType === 'video' ? <Video size={24} /> : <Mic size={24} />}
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-slate-100">
              Recording {recordingType === 'video' ? 'screen' : 'voice note'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Save it to post directly into #{channel?.name}.
            </p>

            {recordingType === 'video' && (
              <video
                ref={videoPreviewRef}
                className="mt-5 aspect-video w-full rounded-2xl bg-black object-cover"
                autoPlay
                muted
                playsInline
              />
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => stopRecording(false)}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => stopRecording(true)}
                className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Stop & share
              </button>
            </div>
          </div>
        </div>
      )}

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
