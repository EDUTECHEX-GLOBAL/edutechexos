'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Square, Send, Trash2, Sparkles, Volume2, Loader2 } from 'lucide-react';
import { smartUpload } from '@/lib/uploadToFirebase';

interface VoiceRecorderProps {
  onSend: (url: string) => void;
}

type Mode = 'idle' | 'recording' | 'preview' | 'ai-connecting' | 'ai-listening' | 'ai-speaking';

// -”-”- Classic voice note recorder -”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-
function useVoiceNote(onSend: (url: string) => void) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.start();
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      return true;
    } catch {
      return false;
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const send = async () => {
    if (!previewUrl) return;
    const res = await fetch(previewUrl);
    const blob = await res.blob();
    try {
      // Try server-side Cloudinary upload first (via /api/upload)
      const form = new FormData();
      form.append('file', blob, 'voice-note.webm');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        if (url) {
          onSend(url);
          setPreviewUrl(null);
          setDuration(0);
          return;
        }
      }
    } catch {
      /* fall through to browser-direct upload */
    }
    try {
      // Browser-direct Cloudinary upload (no server hop) — also free & permanent
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
      const url = await smartUpload(file, { folder: 'audio' });
      onSend(url);
    } catch {
      // Last resort: send base64 data URL (self-contained, playable by all users)
      const reader = new FileReader();
      reader.onload = () => onSend(reader.result as string);
      reader.readAsDataURL(blob);
    }
    setPreviewUrl(null);
    setDuration(0);
  };

  const discard = () => {
    setPreviewUrl(null);
    setDuration(0);
  };

  return { start, stop, send, discard, previewUrl, duration };
}

// -”-”- OpenAI Realtime API voice-to-voice AI tutor -”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-
function useAIVoice() {
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const connect = async (): Promise<boolean> => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) return false;

    try {
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        ['realtime', `openai-insecure-api-key.${apiKey}`, 'openai-beta.realtime-v1']
      );
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('WebSocket error'));
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Configure session: EdTech tutor persona, voice output enabled
      ws.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions:
              'You are an expert EdTech AI tutor. Help students and educators with learning, curriculum design, and educational technology questions. Be concise, encouraging, and pedagogically sound.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
          },
        })
      );

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          setTranscript(msg.transcript || '');
        }
        if (msg.type === 'response.text.delta') {
          setAiResponse((prev) => prev + (msg.delta || ''));
        }
        if (msg.type === 'response.audio.delta') {
          playAudioChunk(msg.delta);
        }
      };

      return true;
    } catch {
      return false;
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      const ctx = audioCtxRef.current;
      const raw = atob(base64Audio);
      const buf = new ArrayBuffer(raw.length * 2);
      const view = new DataView(buf);
      for (let i = 0; i < raw.length; i++) view.setInt16(i * 2, raw.charCodeAt(i) - 128, true);
      ctx
        .decodeAudioData(buf)
        .then((decoded) => {
          const source = ctx.createBufferSource();
          source.buffer = decoded;
          source.connect(ctx.destination);
          source.start();
        })
        .catch(() => {});
    } catch {
      /* audio playback error */
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 24000, channelCount: 1 },
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const buf = await e.data.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: b64 }));
        }
      };
      recorder.start(250); // chunk every 250ms
    } catch {
      return false;
    }
    return true;
  };

  const stopListening = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const disconnect = () => {
    stopListening();
    wsRef.current?.close();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setTranscript('');
    setAiResponse('');
  };

  return { connect, startListening, stopListening, disconnect, transcript, aiResponse };
}

// -”-”- Main VoiceRecorder component -”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-”-
export default function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const voiceNote = useVoiceNote(onSend);
  const aiVoice = useAIVoice();

  const hasOpenAIKey = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Classic recording
  const handleStartRecording = async () => {
    const ok = await voiceNote.start();
    if (ok) setMode('recording');
  };

  const handleStopRecording = () => {
    voiceNote.stop();
    setMode('preview');
  };

  const handleSend = async () => {
    await voiceNote.send();
    setMode('idle');
  };

  const handleDiscard = () => {
    voiceNote.discard();
    setMode('idle');
  };

  // AI voice mode
  const handleStartAI = async () => {
    setMode('ai-connecting');
    const connected = await aiVoice.connect();
    if (!connected) {
      setMode('idle');
      return;
    }
    const listening = await aiVoice.startListening();
    setMode(listening ? 'ai-listening' : 'idle');
  };

  const handleStopAI = () => {
    aiVoice.disconnect();
    setMode('idle');
  };

  return (
    <div className=-flex flex-col items-center gap-3 rounded-2xl border border-[rgba(62,74,137,0.08)] bg-white p-4 shadow-sm w-full max-w-[320px]->
      <p className=-text-[10px] font-black uppercase tracking-widest text-[#7C859E]->Voice</p>

      {/* Idle state */}
      {mode === 'idle' && (
        <div className=-flex gap-3->
          <button
            onClick={handleStartRecording}
            className=-flex items-center gap-2 rounded-xl bg-[#3E4A89] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[rgba(62,74,137,0.12)] hover:bg-[rgba(62,74,137,0.08)]0 transition-all-
          >
            <Mic size={14} strokeWidth={2.5} />
            Voice Note
          </button>
          {hasOpenAIKey && (
            <button
              onClick={handleStartAI}
              className=-flex items-center gap-2 rounded-xl border border-[rgba(62,74,137,0.15)] bg-[rgba(62,74,137,0.08)] px-4 py-2.5 text-xs font-bold text-[#3E4A89] hover:bg-indigo-100 transition-all-
            >
              <Sparkles size={14} strokeWidth={2.5} />
              AI Tutor
            </button>
          )}
        </div>
      )}

      {/* Recording */}
      {mode === 'recording' && (
        <div className=-flex flex-col items-center gap-3->
          <div className=-flex items-center gap-2->
            <div className=-h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse- />
            <span className=-font-mono text-sm font-bold text-[#4A5578]->
              {fmt(voiceNote.duration)}
            </span>
          </div>
          <div className=-flex gap-2->
            <button
              onClick={handleStopRecording}
              className=-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition-all-
            >
              <Square size={14} strokeWidth={2.5} />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {mode === 'preview' && voiceNote.previewUrl && (
        <div className=-flex flex-col items-center gap-3 w-full->
          <audio controls src={voiceNote.previewUrl} className=-w-full h-8 rounded-lg- />
          <div className=-flex gap-2->
            <button
              onClick={handleDiscard}
              className=-flex items-center gap-1.5 rounded-xl border border-[rgba(62,74,137,0.12)] px-3 py-2 text-xs font-bold text-[#7C859E] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all-
            >
              <Trash2 size={13} strokeWidth={2.5} />
              Discard
            </button>
            <button
              onClick={handleSend}
              className=-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all-
            >
              <Send size={13} strokeWidth={2.5} />
              Send
            </button>
          </div>
        </div>
      )}

      {/* AI connecting */}
      {mode === 'ai-connecting' && (
        <div className=-flex items-center gap-2 text-[#7C859E]->
          <Loader2 size={16} className=-animate-spin text-[#3E4A89]- />
          <span className=-text-xs font-medium->Connecting to AI Tutor...</span>
        </div>
      )}

      {/* AI listening */}
      {mode === 'ai-listening' && (
        <div className=-flex flex-col items-center gap-3 w-full->
          <div className=-flex items-center gap-2->
            <div className=-flex gap-0.5->
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className=-w-1 bg-[rgba(62,74,137,0.08)]0 rounded-full animate-pulse-
                  style={{
                    height: `${12 + Math.sin(i * 0.8) * 8}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
            <span className=-text-xs font-medium text-[#4A5578]->AI Tutor is listening...</span>
          </div>
          {aiVoice.transcript && (
            <p className=-text-[11px] text-[#7C859E] italic max-w-[220px] text-center leading-relaxed->
              &quot;{aiVoice.transcript}&quot;
            </p>
          )}
          {aiVoice.aiResponse && (
            <div className=-rounded-xl bg-[rgba(62,74,137,0.08)] border border-[rgba(62,74,137,0.10)] p-3 max-w-[220px]->
              <div className=-flex items-center gap-1.5 mb-1.5->
                <Volume2 size={11} className=-text-indigo-500- />
                <span className=-text-[9px] font-black uppercase tracking-widest text-indigo-500->
                  AI Response
                </span>
              </div>
              <p className=-text-[11px] text-indigo-800 leading-relaxed->{aiVoice.aiResponse}</p>
            </div>
          )}
          <button
            onClick={handleStopAI}
            className=-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition-all-
          >
            <MicOff size={14} strokeWidth={2.5} />
            End Session
          </button>
        </div>
      )}

      {/* No OpenAI key hint */}
      {mode === 'idle' && !hasOpenAIKey && (
        <p className=-text-[9px] text-[#7C859E] text-center leading-relaxed->
          Add{' '}
          <code className=-bg-[rgba(62,74,137,0.08)] px-1 rounded->NEXT_PUBLIC_OPENAI_API_KEY</code>{' '}
          to unlock AI Tutor voice mode
        </p>
      )}
    </div>
  );
}
