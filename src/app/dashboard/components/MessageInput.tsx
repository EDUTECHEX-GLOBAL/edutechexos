'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, Video, X, Loader2 } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { uploadLocalFile } from '@/app/actions/dbActions';
import { toast } from 'sonner';

interface MessageInputProps {
  channelId: string;
  channelName: string;
}

type RecordedPreview = {
  kind: 'audio' | 'video';
  blob: Blob;
  url: string;
  mimeType: string;
};

const EMOJI_LIST = [
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
  '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
  '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
  '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝',
  '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
  '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
  '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡',
  '😠', '🤬', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
  '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
  '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕',
  '💞', '💓', '💗', '💖', '💘', '💝', '💟', '❣️', '💌', '💔',
  '🔥', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆',
  '✅', '❌', '❓', '❗', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡',
  '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🚀', '👀', '🎯', '💡',
];

export default function MessageInput({ channelId, channelName }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedPreview, setRecordedPreview] = useState<RecordedPreview | null>(null);
  const [recordingSending, setRecordingSending] = useState(false);
  const addMessage = useDashboardStore((s) => s.addMessage);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const discardRecordingRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close emoji panel on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        emojiPanelRef.current && !emojiPanelRef.current.contains(e.target as Node) &&
        emojiBtnRef.current && !emojiBtnRef.current.contains(e.target as Node)
      ) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [emojiOpen]);

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

  useEffect(() => {
    return () => {
      if (recordedPreview) URL.revokeObjectURL(recordedPreview.url);
    };
  }, [recordedPreview]);

  const handleSend = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const newMessage = {
        id: `msg-${Date.now()}`,
        sender: 'You',
        initials: 'Y',
        color: '#6366f1',
        timestamp: new Date().toISOString(),
        text: message,
      };

      addMessage(channelId, newMessage);
      setMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setMessage((prev) => prev + emoji);
      return;
    }
    const start = ta.selectionStart ?? message.length;
    const end = ta.selectionEnd ?? message.length;
    const next = message.slice(0, start) + emoji + message.slice(end);
    setMessage(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + emoji.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  async function startRecording(kind: 'audio' | 'video') {
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const stoppedStream = mediaStreamRef.current;
        stoppedStream?.getTracks().forEach((t) => t.stop());
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
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
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
    if (!recordedPreview) return;

    setRecordingSending(true);
    try {
      const file = new File([recordedPreview.blob], `${recordedPreview.kind}-note-${Date.now()}.webm`, {
        type: recordedPreview.mimeType,
      });
      const fd = new FormData();
      fd.append('file', file);
      const result = await uploadLocalFile(fd);

      if (!result.success || !result.url) {
        toast.error(`${recordedPreview.kind === 'video' ? 'Video' : 'Audio'} upload failed.`);
        return;
      }

      addMessage(channelId, {
        id: `msg-${recordedPreview.kind}-${Date.now()}`,
        sender: 'You',
        initials: 'Y',
        color: '#6366f1',
        timestamp: new Date().toISOString(),
        text: message.trim() || (recordedPreview.kind === 'video' ? 'Screen recording' : 'Voice note'),
        ...(recordedPreview.kind === 'video' ? { videoUrl: result.url } : { audioUrl: result.url }),
      });
      setMessage('');
      discardRecordedPreview();
      toast.success(`${recordedPreview.kind === 'video' ? 'Screen recording' : 'Voice note'} sent`);
    } catch {
      toast.error(`Could not save the ${recordedPreview.kind} recording.`);
    } finally {
      setRecordingSending(false);
    }
  }

  return (
    <div className="space-y-3 py-3">
      {/* Typing Indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-400">
          {message.length > 0 && `${message.length} characters`}
        </div>
        {recordingType && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:
            {String(recordingDuration % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1">
        <button
          ref={emojiBtnRef}
          onClick={() => setEmojiOpen((v) => !v)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            emojiOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title="Add emoji"
        >
          <Smile size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => startRecording('audio')}
            disabled={recordingBusy || !!recordingType}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              recordingType === 'audio' ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Record voice note"
          >
            <Mic size={16} />
          </button>
        </div>

        <button
          onClick={() => startRecording('video')}
          disabled={recordingBusy || !!recordingType}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            recordingType === 'video' ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title="Record screen"
        >
          <Video size={16} />
        </button>

        <div className="flex-1" />

        {/* Recording controls */}
        {recordingType && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => stopRecording(false)}
              className="flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
            <button
              onClick={() => stopRecording(true)}
              className="flex h-7 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[10px] font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              Stop & share
            </button>
          </div>
        )}
      </div>

      {/* Emoji Picker */}
      {emojiOpen && (
        <div
          ref={emojiPanelRef}
          className="relative z-50"
        >
          <div className="absolute bottom-0 left-0 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Emoji
            </div>
            <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
              {EMOJI_LIST.map((emoji, idx) => (
                <button
                  key={`emoji-${idx}`}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-8 items-center justify-center rounded-lg text-lg hover:bg-indigo-50 hover:scale-110 transition-all"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        <div className="flex-1 flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}...`}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            rows={3}
          />
          <div className="text-xs text-slate-400">
            Press Ctrl+Enter to send
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          title="Send message"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {recordedPreview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Preview {recordedPreview.kind === 'video' ? 'screen recording' : 'voice note'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Review it before sending to #{channelName}.
                </p>
              </div>
              <button
                type="button"
                onClick={discardRecordedPreview}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <audio src={recordedPreview.url} className="w-full" controls />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={discardRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={sendRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {recordingSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
