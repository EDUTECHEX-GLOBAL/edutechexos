'use client';
import React, { useState, useRef } from 'react';

/**
 * VoiceRecorder – records audio via the microphone using MediaRecorder.
 * UI mimics a WhatsApp‑style voice note: start, stop, preview, and send.
 */
export default function VoiceRecorder({ onSend }: { onSend: (url: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        // Cleanup tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone access denied or unavailable', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendRecording = async () => {
    if (!previewUrl) return;
    // Convert the preview URL back to Blob for upload
    const response = await fetch(previewUrl);
    const blob = await response.blob();
    const form = new FormData();
    form.append('file', blob, 'voice-note.webm');
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      const { url } = await uploadRes.json();
      onSend(url);
      // reset UI
      setPreviewUrl(null);
    } catch (e) {
      console.error('Upload failed', e);
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={recording ? stopRecording : startRecording}
        style={recording ? styles.stopBtn : styles.recordBtn}
      >
        {recording ? '⏹ Stop' : '🎤 Record'}
      </button>
      {previewUrl && (
        <div style={styles.previewBox}>
          <audio controls src={previewUrl} />
          <button onClick={sendRecording} style={styles.sendBtn}>Send</button>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.8rem',
  },
  recordBtn: {
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '9999px',
    padding: '0.6rem 1.2rem',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  stopBtn: {
    background: '#EF4444',
    color: '#fff',
    border: 'none',
    borderRadius: '9999px',
    padding: '0.6rem 1.2rem',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  previewBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '0.5rem',
  },
  sendBtn: {
    background: '#10B981',
    color: '#fff',
    border: 'none',
    borderRadius: '0.4rem',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
  },
};
