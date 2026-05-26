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
  '👉', '👆', '👇', '☝️', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🖤', '🤍', '🤎', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
  '💟', '❣️', '💌', '💔', '🔥', '⭐', '🌟', '✨', '💫', '🎉',
  '🎊', '🎈', '🎁', '🏆', '✅', '❌', '❓', '❗', '‼️', '⁉️',
  '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪',
  '🚀', '👀', '🎯', '💡',
];

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const discardRecordingRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close emoji panel on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(e.target as Node) &&
        emojiBtnRef.current &&
        !emojiBtnRef.current.contains(e.target as Node)
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

      // Always use getUserMedia — audio for voice notes, video+audio for camera recording
      const constraints: MediaStreamConstraints =
        kind === 'video' ? { video: true, audio: true } : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // Show live camera preview during video recording
      if (kind === 'video' && liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
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
        // Stop live preview
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
        }
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
          return { kind, blob, mimeType, url: URL.createObjectURL(blob) };
        });
        toast.success(`${kind === 'video' ? 'Camera recording' : 'Voice note'} ready — review before sending`);
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
          ? `Browser blocked ${kind} access — allow permissions and try again.`
          : `Could not start ${kind} recording. Check that a ${kind === 'video' ? 'camera' : 'microphone'} is connected.`
      );
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
    const preview = recordedPreview;
    setRecordingSending(true);

    try {
      let mediaUrl: string | null = null;

      // Try server upload first (works in local dev)
      try {
        const file = new File(
          [preview.blob],
          `${preview.kind}-note-${Date.now()}.webm`,
          { type: preview.mimeType }
        );
        const fd = new FormData();
        fd.append('file', file);
        const result = await uploadLocalFile(fd);
        if (result.success && result.url) {
          mediaUrl = result.url;
        }
      } catch {
        // Server upload unavailable — fall through to data URL
      }

      // Fallback: embed as data URL so it works in any environment
      if (!mediaUrl) {
        mediaUrl = await blobToDataUrl(preview.blob);
      }

      addMessage(channelId, {
        id: `msg-${preview.kind}-${Date.now()}`,
        sender: 'You',
        initials: 'Y',
        color: '#6366f1',
        timestamp: new Date().toISOString(),
        text:
          message.trim() ||
          (preview.kind === 'video' ? 'Camera recording' : 'Voice note'),
        ...(preview.kind === 'video'
          ? { videoUrl: mediaUrl }
          : { audioUrl: mediaUrl }),
      });

      setMessage('');
      URL.revokeObjectURL(preview.url);
      setRecordedPreview(null);
      toast.success(
        `${preview.kind === 'video' ? 'Camera recording' : 'Voice note'} sent!`
      );
    } catch {
      toast.error(`Could not send the ${preview.kind} recording.`);
    } finally {
      setRecordingSending(false);
    }
  }

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    toast.info(`${files.length} file(s) selected — file sharing coming soon.`);
    e.target.value = '';
  };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-2 py-3">
      {/* Live camera preview strip */}
      {recordingType === 'video' && (
        <div className="relative mx-1 overflow-hidden rounded-2xl border border-red-200 bg-black shadow-lg">
          <video
            ref={liveVideoRef}
            className="h-36 w-full object-cover"
            muted
            playsInline
          />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE · {formatDuration(recordingDuration)}
          </div>
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-400">
          {message.length > 0 && `${message.length} chars`}
        </div>
        {recordingType === 'audio' && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            REC · {formatDuration(recordingDuration)}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1">
        <button
          ref={emojiBtnRef}
          onClick={() => setEmojiOpen((v) => !v)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            emojiOpen
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title="Add emoji"
        >
          <Smile size={16} />
        </button>

        <button
          onClick={() =>
            recordingType === 'audio' ? stopRecording(true) : startRecording('audio')
          }
          disabled={recordingBusy || recordingType === 'video'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            recordingType === 'audio'
              ? 'animate-pulse bg-red-100 text-red-600'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title={recordingType === 'audio' ? 'Stop & preview voice note' : 'Record voice note'}
        >
          <Mic size={16} />
        </button>

        <button
          onClick={() =>
            recordingType === 'video' ? stopRecording(true) : startRecording('video')
          }
          disabled={recordingBusy || recordingType === 'audio'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            recordingType === 'video'
              ? 'animate-pulse bg-red-100 text-red-600'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title={recordingType === 'video' ? 'Stop & preview camera recording' : 'Record camera video'}
        >
          <Video size={16} />
        </button>

        <div className="flex-1" />

        {/* Recording cancel */}
        {recordingType && (
          <button
            onClick={() => stopRecording(false)}
            className="flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <X size={12} />
            Cancel
          </button>
        )}
      </div>

      {/* Emoji Picker */}
      {emojiOpen && (
        <div ref={emojiPanelRef} className="relative z-50">
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
                  className="flex h-8 items-center justify-center rounded-lg text-lg transition-all hover:scale-110 hover:bg-indigo-50"
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileAttach}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        <div className="flex flex-1 flex-col gap-1.5">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}…`}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            rows={3}
          />
          <div className="text-[11px] text-slate-400">Ctrl+Enter to send</div>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          title="Send message"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Recorded Preview Modal */}
      {recordedPreview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 p-5 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {recordedPreview.kind === 'video' ? '🎥 Camera recording' : '🎙️ Voice note'}
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-slate-500">
                  Review before sending to <span className="font-black text-slate-800">#{channelName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={discardRecordedPreview}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Discard"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="px-5">
              {recordedPreview.kind === 'video' ? (
                <video
                  src={recordedPreview.url}
                  className="aspect-video w-full rounded-2xl bg-black object-contain"
                  controls
                />
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
                  <audio src={recordedPreview.url} className="w-full" controls />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-5 pt-4">
              <button
                type="button"
                onClick={discardRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={sendRecordedPreview}
                disabled={recordingSending}
                className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {recordingSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Sending…
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
