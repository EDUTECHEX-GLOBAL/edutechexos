'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Video,
  X,
  Loader2,
  BarChart2,
  Code2,
  Zap,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { smartUpload, uploadToFirebase } from '@/lib/uploadToFirebase';
import { blobToDataUrl } from '@/lib/uploadToR2';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';

interface MessageInputProps {
  channelId: string;
  channelName: string;
  replyToId?: string; // for thread replies
}

type RecordedPreview = { kind: 'audio' | 'video'; blob: Blob; url: string; mimeType: string };

const EMOJI_LIST = [
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
  '🙃',
  '🤒',
  '😲',
  '☹️',
  '🙏',
  '😖',
  '😞',
  '😟',
  '😤',
  '😢',
  '😭',
  '😦',
  '😧',
  '😨',
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
  '👋',
  '🤲',
  '🤝',
  '🙏',
  '✌️',
  '🤞',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '💕',
  '💞',
  '💓',
  '💗',
  '💖',
  '💘',
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
  '💯',
  '🚀',
  '👀',
  '🎯',
  '💡',
];

const AI_SUGGESTIONS = [
  'Can you summarize the recent discussion?',
  'What are the open action items?',
  'Give me a status update on this project.',
];

export default function MessageInput({ channelId, channelName, replyToId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedPreview, setRecordedPreview] = useState<RecordedPreview | null>(null);
  const [recordingSending, setRecordingSending] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [linkPreview, setLinkPreview] = useState<{
    url: string;
    title: string;
    description: string;
    image: string;
    siteName: string;
  } | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const linkPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMessage = useDashboardStore((s) => s.addMessage);
  const addNotification = useDashboardStore((s) => s.addNotification);
  const setTyping = useDashboardStore((s) => s.setTyping);
  const channels = useDashboardStore((s) => s.channels);
  const members = useDashboardStore((s) => s.members);
  const activeChannelId = useDashboardStore((s) => s.activeChannel);

  const channel = channels.find((c) => c.id === channelId);
  const channelMembers = members.filter((m) => channel?.memberIds?.includes(m.id) ?? true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const discardRecordingRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current user from localStorage
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    initials: string;
    color: string;
  } | null>(null);
  useEffect(() => {
    try {
      const auth = localStorage.getItem('edutechex_token');
      if (auth) {
        const { user } = JSON.parse(auth);
        if (user) {
          const initials =
            user.name
              ?.split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) ?? 'Y';
          setCurrentUser({ ...user, initials, color: '#3E4A89' });
        }
      }
    } catch {
      /* */
    }
  }, []);

  // Close emoji panel on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const h = (e: MouseEvent) => {
      if (
        emojiPanelRef.current?.contains(e.target as Node) ||
        emojiBtnRef.current?.contains(e.target as Node)
      )
        return;
      setEmojiOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [emojiOpen]);

  // Recording timer
  useEffect(() => {
    if (recordingType) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [recordingType]);

  // @mention detection
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? message.length;
    const before = message.slice(0, cursor);
    const match = before.match(/@([\w\s]*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
    }
  }, [message]);

  // URL detection for link preview — debounced 800 ms
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
  useEffect(() => {
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      setLinkPreview(null);
      return;
    }
    const url = urlMatch[0].replace(/[.,!?)]+$/, '');
    if (linkPreview?.url === url) return;
    if (linkPreviewTimerRef.current) clearTimeout(linkPreviewTimerRef.current);
    linkPreviewTimerRef.current = setTimeout(async () => {
      setLinkPreviewLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/og?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (
          data.success &&
          (data.preview.title || data.preview.description || data.preview.image)
        ) {
          setLinkPreview({ ...data.preview, url });
        } else {
          setLinkPreview(null);
        }
      } catch {
        setLinkPreview(null);
      } finally {
        setLinkPreviewLoading(false);
      }
    }, 800);
    return () => {
      if (linkPreviewTimerRef.current) clearTimeout(linkPreviewTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // Typing indicator â€” updates local state AND broadcasts via socket
  const handleTyping = useCallback(() => {
    if (!currentUser?.name) return;
    setTyping(channelId, currentUser.name, true);
    getSocket().emit('typing_start', { channelId, userName: currentUser.name });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(channelId, currentUser.name, false);
      getSocket().emit('typing_stop', { channelId, userName: currentUser.name });
    }, 2000);
  }, [channelId, currentUser?.name, setTyping]);

  const mentionSuggestions = channelMembers
    .filter((m) => !mentionQuery || m.name.toLowerCase().includes(mentionQuery))
    .slice(0, 5);

  const insertMention = (name: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? message.length;
    const before = message.slice(0, cursor).replace(/@[\w\s]*$/, `@${name} `);
    setMessage(before + message.slice(cursor));
    setShowMentionDropdown(false);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(before.length, before.length);
    });
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsLoading(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (currentUser?.name) {
      setTyping(channelId, currentUser.name, false);
      getSocket().emit('typing_stop', { channelId, userName: currentUser.name });
    }
    try {
      addMessage(channelId, {
        id: `msg-${Date.now()}`,
        sender: currentUser?.name ?? 'You',
        initials: currentUser?.initials ?? 'Y',
        color: currentUser?.color ?? '#3E4A89',
        timestamp: new Date().toISOString(),
        text: message,
        ...(replyToId ? { parentId: replyToId } : {}),
        ...(linkPreview ? { linkPreview } : {}),
      });

      // Parse @mentions and send a targeted notification to each mentioned member
      const mentionMatches = message.match(/@([\w. ]+)/g) ?? [];
      if (mentionMatches.length > 0) {
        const mentionedNames = mentionMatches.map((m) => m.slice(1).trim().toLowerCase());
        const mentioned = members.filter((mem) =>
          mentionedNames.some(
            (n) =>
              mem.name.toLowerCase().includes(n) || n.includes(mem.name.toLowerCase().split(' ')[0])
          )
        );
        mentioned.forEach((mem) => {
          if (mem.email && mem.name !== currentUser?.name) {
            addNotification({
              type: 'mention',
              actor: currentUser?.name ?? 'Someone',
              actorInitials: currentUser?.initials ?? '?',
              actorColor: currentUser?.color ?? '#3E4A89',
              channel: channelId,
              message: message.slice(0, 120),
              recipientEmails: [mem.email],
            });
          }
        });
      }

      setMessage('');
      setLinkPreview(null);
      setShowAISuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowMentionDropdown(false);
      setEmojiOpen(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setMessage((p) => p + emoji);
      return;
    }
    const s = ta.selectionStart ?? message.length,
      end = ta.selectionEnd ?? message.length;
    const next = message.slice(0, s) + emoji + message.slice(end);
    setMessage(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      ta.focus();
      const c = s + emoji.length;
      ta.setSelectionRange(c, c);
    });
  };

  const insertCodeBlock = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart,
      end = ta.selectionEnd;
    const selected = message.slice(s, end);
    const block = selected ? `\`\`\`\n${selected}\n\`\`\`` : '```\ncode here\n```';
    setMessage(message.slice(0, s) + block + message.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
    });
  };

  async function startRecording(kind: 'audio' | 'video') {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Recording not supported in this browser.');
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
      if (kind === 'video') {
        try {
          const track = stream.getVideoTracks()[0];
          if (track && liveVideoRef.current) {
            liveVideoRef.current.srcObject = new MediaStream([track]);
            liveVideoRef.current.play().catch(() => {});
          }
        } catch {
          /* ignore preview error */
        }
      }
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
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecordingType(null);
        setRecordingBusy(false);
        if (discardRecordingRef.current || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType });
        if (kind === 'video') {
          await sendMedia(kind, blob, mimeType);
        } else {
          setRecordedPreview((e) => {
            if (e) URL.revokeObjectURL(e.url);
            return { kind, blob, mimeType, url: URL.createObjectURL(blob) };
          });
          toast.success(`Voice note ready â€” review before sending`);
        }
      };
      mediaRecorderRef.current = recorder;
      setRecordingType(kind);
      recorder.start();
      toast.success(`${kind === 'video' ? 'Camera' : 'Voice'} recording started`);
    } catch (err: unknown) {
      setRecordingBusy(false);
      setRecordingType(null);
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      toast.error(
        isDenied
          ? `Browser blocked ${kind} access â€” allow permissions.`
          : `Could not start ${kind} recording.`
      );
    }
  }

  function stopRecording(save: boolean) {
    if (!mediaRecorderRef.current) return;
    discardRecordingRef.current = !save;
    mediaRecorderRef.current.stop();
  }

  // Stop recording and immediately send (used for screen recording stop button)
  const handleStopAndSend = async () => {
    stopRecording(true);
  };

  function discardPreview() {
    setRecordedPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
  }

  // Helper to send media (used for auto-sending video recordings)
  async function sendMedia(kind: 'audio' | 'video', blob: Blob, mimeType: string) {
    setRecordingSending(true);
    const toastId = toast.loading(
      `Uploading ${kind === 'video' ? 'recording' : 'voice note'} to Cloudinary…`
    );
    try {
      // Upload to Cloudinary (free 25 GB); falls back to base64 if not configured
      const file = new File([blob], `${kind}-${Date.now()}.webm`, { type: mimeType });
      const folder = kind === 'video' ? 'video' : 'audio';
      const mediaUrl = await smartUpload(file, {
        folder,
        onProgress: (pct) => {
          toast.loading(`Uploading… ${pct}%`, { id: toastId });
        },
      });
      // Always send to the current channel — never redirect to #general
      addMessage(channelId, {
        id: `msg-${kind}-${Date.now()}`,
        sender: currentUser?.name ?? 'You',
        initials: currentUser?.initials ?? 'Y',
        color: currentUser?.color ?? '#3E4A89',
        timestamp: new Date().toISOString(),
        text: kind === 'video' ? '🎥 Screen recording' : '🎤 Voice note',
        ...(kind === 'video' ? { videoUrl: mediaUrl } : { audioUrl: mediaUrl }),
        ...(replyToId ? { parentId: replyToId } : {}),
      });
      toast.success(`${kind === 'video' ? 'Screen recording' : 'Voice note'} sent!`, {
        id: toastId,
      });
    } catch {
      toast.error(`Could not upload the ${kind} recording.`, { id: toastId });
    } finally {
      setRecordingSending(false);
    }
  }

  // Send recorded preview (used for audio) by delegating to sendMedia
  async function sendRecordedPreview(targetChannelId?: string) {
    if (!recordedPreview) return;
    const { kind, blob, mimeType } = recordedPreview;
    await sendMedia(kind, blob, mimeType);
    // sendMedia already shows a success toast — just clear preview
    setRecordedPreview(null);
    setMessage('');
  }

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      try {
        // Upload to Firebase Storage; falls back to base64 if not configured
        const fileUrl = await smartUpload(file, { folder: 'files' });

        addMessage(channelId, {
          id: `msg-file-${Date.now()}`,
          sender: currentUser?.name ?? 'You',
          initials: currentUser?.initials ?? 'Y',
          color: currentUser?.color ?? '#3E4A89',
          timestamp: new Date().toISOString(),
          text: message.trim() || '',
          files: [{ name: file.name, url: fileUrl, type: file.type }],
          ...(replyToId ? { parentId: replyToId } : {}),
        });
        toast.success(`${file.name} shared`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setMessage('');
    e.target.value = '';
  };

  const sendPoll = () => {
    const q = pollQuestion.trim();
    const opts = pollOptions.filter((o) => o.trim());
    if (!q || opts.length < 2) {
      toast.error('Add a question and at least 2 options');
      return;
    }
    addMessage(channelId, {
      id: `msg-poll-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUser?.color ?? '#3E4A89',
      timestamp: new Date().toISOString(),
      text: `📊 Poll: ${q}`,
      poll: { question: q, options: opts.map((text) => ({ text, votes: [] })) },
      ...(replyToId ? { parentId: replyToId } : {}),
    });
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollOpen(false);
    toast.success('Poll created!');
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-2 py-2">
      {/* Live camera preview */}
      {recordingType === 'video' && (
        <div className="relative mx-1 overflow-hidden rounded-2xl border border-red-200 bg-black shadow-lg video-preview">
          <video ref={liveVideoRef} className="h-32 w-full object-cover" muted playsInline />
          <div className="absolute top-2 right-2">
            <button
              onClick={handleStopAndSend}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
              title="Stop & share to #general"
            >
              <X size={20} />
            </button>
          </div>
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE · {fmt(recordingDuration)}
          </div>
        </div>
      )}

      {/* @mention dropdown */}
      {showMentionDropdown && mentionSuggestions.length > 0 && (
        <div className="mx-1 overflow-hidden rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-xl  dark:bg-slate-800">
          {mentionSuggestions.map((m) => (
            <button
              key={m.id}
              onClick={() => insertMention(m.name)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-indigo-900/20 transition-colors"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: m.color }}
              >
                {m.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1E2636]">{m.name}</p>
                <p className="text-xs text-[#7C859E]">{m.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* AI suggestions */}
      {showAISuggestions && (
        <div className="mx-1 flex gap-2 flex-wrap">
          {AI_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setMessage(s);
                setShowAISuggestions(false);
                textareaRef.current?.focus();
              }}
              className="rounded-full border border-[rgba(62,74,137,0.15)] bg-[rgba(62,74,137,0.08)] px-3 py-1 text-sm font-semibold text-[#3E4A89] hover:bg-indigo-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Poll creator */}
      {pollOpen && (
        <div className="mx-1 rounded-2xl border border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-[#1E2636]">📊 Create Poll</p>
            <button
              onClick={() => setPollOpen(false)}
              className="rounded-lg p-1 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)]"
            >
              <X size={14} />
            </button>
          </div>
          <input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Your questionâ€¦"
            className="mb-2 w-full rounded-xl border border-[rgba(62,74,137,0.12)]  bg-[#FAF8F5] dark:bg-[#191E2F] px-3 py-2 text-sm focus:border-[#3E4A89] focus:outline-none"
          />
          {pollOptions.map((opt, i) => (
            <div key={i} className="mb-1.5 flex gap-2">
              <input
                value={opt}
                onChange={(e) => {
                  const next = [...pollOptions];
                  next[i] = e.target.value;
                  setPollOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-xl border border-[rgba(62,74,137,0.12)]  bg-[#FAF8F5] dark:bg-[#191E2F] px-3 py-1.5 text-sm focus:border-[#3E4A89] focus:outline-none"
              />
              {pollOptions.length > 2 && (
                <button
                  onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                  className="rounded-lg p-1.5 text-[#7C859E] hover:text-red-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="mt-1 text-sm font-bold text-[#3E4A89] hover:text-indigo-800"
            >
              + Add option
            </button>
          )}
          <button
            onClick={sendPoll}
            className="mt-3 w-full rounded-xl bg-[#3E4A89] py-2 text-sm font-black text-white hover:bg-[#2A3568] transition-colors"
          >
            Create Poll
          </button>
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[11px] text-[#7C859E]">
          {message.length > 0 && `${message.length} chars`}
        </div>
        {recordingType === 'audio' && (
          <div className="voice-recording-overlay flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            {/* Waveform animation bars */}
            <div className="flex space-x-0.5 ml-2 items-center">
              <span className="wave-bar" style={{ animationDelay: '0s' }} />
              <span className="wave-bar" style={{ animationDelay: '0.1s' }} />
              <span className="wave-bar" style={{ animationDelay: '0.2s' }} />
              <span className="wave-bar" style={{ animationDelay: '0.3s' }} />
              <span className="wave-bar" style={{ animationDelay: '0.4s' }} />
            </div>
            REC · {fmt(recordingDuration)}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5">
        <button
          ref={emojiBtnRef}
          onClick={() => setEmojiOpen((v) => !v)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${emojiOpen ? 'bg-[rgba(62,74,137,0.08)] text-[#3E4A89]' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800'}`}
          title="Emoji"
        >
          <Smile size={16} />
        </button>
        <button
          onClick={() =>
            recordingType === 'audio' ? stopRecording(true) : startRecording('audio')
          }
          disabled={recordingBusy || recordingType === 'video'}
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${recordingType === 'audio' ? 'animate-pulse bg-red-100 text-red-600' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800'}`}
        >
          {recordingType === 'audio' ? (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-red-600 animate-pulse opacity-30 pointer-events-none"></span>
              <Mic size={16} />
            </>
          ) : (
            <Mic size={16} />
          )}
        </button>
        <button
          onClick={() =>
            recordingType === 'video' ? stopRecording(true) : startRecording('video')
          }
          disabled={recordingBusy || recordingType === 'audio'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${recordingType === 'video' ? 'animate-pulse bg-red-100 text-red-600' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800'}`}
          title="Screen recording"
        >
          <Video size={16} />
        </button>
        <button
          onClick={() => setPollOpen((v) => !v)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${pollOpen ? 'bg-[rgba(62,74,137,0.08)] text-[#3E4A89]' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800'}`}
          title="Create poll"
        >
          <BarChart2 size={16} />
        </button>
        <button
          onClick={insertCodeBlock}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800 transition-colors"
          title="Insert code block"
        >
          <Code2 size={16} />
        </button>
        <button
          onClick={() => setShowAISuggestions((v) => !v)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${showAISuggestions ? 'bg-violet-50 text-violet-600' : 'text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800'}`}
          title="AI suggestions"
        >
          <Zap size={16} />
        </button>
        <div className="flex-1" />
        {recordingType && (
          <button
            onClick={() => stopRecording(true)}
            className="flex h-7 items-center gap-1 rounded-lg border border-[rgba(62,74,137,0.12)] bg-white px-2.5 text-[11px] font-bold text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)] transition-colors"
          >
            <X size={12} /> Stop
          </button>
        )}
      </div>

      {/* Emoji picker */}
      {emojiOpen && (
        <div ref={emojiPanelRef} className="relative z-50">
          <div className="absolute bottom-0 left-0 w-72 rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-3 shadow-xl  dark:bg-slate-800">
            <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#7C859E]">
              Emoji
            </div>
            <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
              {EMOJI_LIST.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-8 items-center justify-center rounded-lg text-lg transition-all hover:scale-110 hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-indigo-900/20"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {recordingType === 'audio' && (
        <style jsx>{`
          .voice-recording-overlay {
            background: repeating-linear-gradient(
              45deg,
              rgba(255, 0, 0, 0.2) 0,
              rgba(255, 0, 0, 0.2) 10px,
              transparent 10px,
              transparent 20px
            );
            animation: moveStripes 2s linear infinite;
          }
          @keyframes moveStripes {
            from {
              background-position: 0 0;
            }
            to {
              background-position: 20px 0;
            }
          }
          @keyframes wave {
            0%,
            100% {
              transform: scaleY(1);
            }
            50% {
              transform: scaleY(0.5);
            }
          }
        `}</style>
      )}

      {/* Link preview card */}
      {(linkPreviewLoading || linkPreview) && (
        <div className="mx-1 overflow-hidden rounded-xl border border-[rgba(62,74,137,0.12)] bg-white shadow-sm">
          {linkPreviewLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#7C859E]">
              <Loader2 size={12} className="animate-spin" /> Fetching preview…
            </div>
          ) : (
            linkPreview && (
              <div className="flex gap-3 p-2.5">
                {linkPreview.image && (
                  <img
                    src={linkPreview.image}
                    alt=""
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {linkPreview.siteName && (
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7C859E]">
                      {linkPreview.siteName}
                    </p>
                  )}
                  {linkPreview.title && (
                    <p className="truncate text-sm font-bold text-[#1E2636]">{linkPreview.title}</p>
                  )}
                  {linkPreview.description && (
                    <p className="line-clamp-1 text-xs text-[#7C859E]">{linkPreview.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setLinkPreview(null)}
                  className="shrink-0 self-start rounded p-1 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)]"
                >
                  <X size={12} />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileAttach}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578] dark:hover:bg-slate-800 transition-colors"
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        <div className="flex flex-1 flex-col gap-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={replyToId ? `Reply in thread…` : `Message #${channelName}…`}
            className="w-full resize-none rounded-full border border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-[#1E2636] placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            rows={1}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <div className="text-[11px] text-[#7C859E] pl-2">
            Enter to send · Shift+Enter for new line
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3E4A89] text-white hover:bg-[#2A3568] disabled:cursor-not-allowed disabled:bg-slate-300 transition-all shadow-md hover:shadow-indigo-300/50 hover:scale-105 active:scale-95"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Recorded preview modal */}
      {recordedPreview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(25,30,47,0.50)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl  dark:bg-[#191E2F]">
            <div className="flex items-start justify-between gap-4 p-5 pb-4">
              <div>
                <h2 className="text-lg font-black text-[#1E2636]">
                  {recordedPreview.kind === 'video' ? '🎥 Screen recording' : '🎤 Voice note'}
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-[#7C859E]">
                  Review before sending to{' '}
                  <span className="font-black text-[#1E2636]">#{channelName}</span>
                </p>
              </div>
              <button
                onClick={discardPreview}
                className="rounded-lg p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800 hover:text-[#4A5578]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5">
              {recordedPreview.kind === 'video' ? (
                <video
                  src={recordedPreview.url}
                  className="aspect-video w-full rounded-2xl bg-black object-contain"
                  controls
                />
              ) : (
                <div className="rounded-2xl border border-[rgba(62,74,137,0.08)] bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
                  <audio src={recordedPreview.url} className="w-full" controls />
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 pt-4">
              <button
                onClick={discardPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white text-sm font-black text-[#4A5578] hover:bg-[rgba(62,74,137,0.06)] disabled:opacity-60"
              >
                Discard
              </button>
              <button
                onClick={() => sendRecordedPreview()}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl bg-[#3E4A89] text-sm font-black text-white hover:bg-[#2A3568] disabled:opacity-60"
              >
                {recordingSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Sendingâ€¦
                  </span>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
