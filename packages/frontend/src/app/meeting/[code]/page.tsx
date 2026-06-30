'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  DecoCorner,
  DecoDiamond,
  DecoEyebrow,
  DecoStyles,
} from '@/app/components/LandingDeco';

export default function MeetingJoinPage() {
  const params = useParams();
  const code = params?.code as string;
  const [info, setInfo] = useState<{ messageId: string; channelId: string; hostEmail: string; meetLink: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    const backend = process.env.NEXT_PUBLIC_API_URL || 'https://edutechexos-backend.onrender.com';
    let token = '';
    try { token = JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? ''; } catch { /* not logged in */ }
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`${backend}/api/meetings/code/${encodeURIComponent(code)}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInfo(d);
        else if (d.error === 'Authentication required' || d.error?.includes('auth')) {
          // Token missing or expired — redirect to login then back
          window.location.replace(`/sign-up-login-screen?mode=user&redirect=/meeting/${encodeURIComponent(code)}`);
        } else setError(d.error || 'Meeting not found');
      })
      .catch(() => setError('Could not load meeting details'))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dot-grid">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="mt-4 text-sm text-ink-light font-medium">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dot-grid p-4 relative overflow-hidden">
        <DecoStyles />
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#DDD8F6]/20 via-transparent to-background pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 orb-indigo opacity-60 pointer-events-none" />
        
        <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-white/90 p-8 text-center shadow-[0_24px_64px_rgba(26,27,58,0.08)] backdrop-blur-md">
          {/* Deco elements */}
          <div className="absolute top-2 left-2"><DecoCorner corner="tl" size={32} opacity={0.35} /></div>
          <div className="absolute top-2 right-2"><DecoCorner corner="tr" size={32} opacity={0.35} /></div>
          <div className="absolute bottom-2 left-2"><DecoCorner corner="bl" size={32} opacity={0.35} /></div>
          <div className="absolute bottom-2 right-2"><DecoCorner corner="br" size={32} opacity={0.35} /></div>

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <span className="text-2xl text-secondary">&#x2716;</span>
          </div>
          <h1 className="text-xl font-bold text-foreground font-display">Meeting Not Found</h1>
          <p className="mt-2 text-sm text-ink">{error}</p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/dashboard"
              className="btn-primary btn-md rounded-xl"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hostName = info?.hostEmail?.split('@')[0] || 'A team member';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background dot-grid p-4 relative overflow-hidden">
      <DecoStyles />
      {/* Background orbs */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#DDD8F6]/20 via-transparent to-background pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 orb-indigo opacity-60 pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 orb-purple opacity-50 pointer-events-none" />

      <div className="relative w-full max-w-lg rounded-3xl border border-border/50 bg-white/95 p-8 shadow-[0_32px_80px_rgba(26,27,58,0.08)] backdrop-blur-xl">
        {/* Deco corners */}
        <div className="absolute top-3 left-3"><DecoCorner corner="tl" size={48} opacity={0.45} /></div>
        <div className="absolute top-3 right-3"><DecoCorner corner="tr" size={48} opacity={0.45} /></div>
        <div className="absolute bottom-3 left-3"><DecoCorner corner="bl" size={48} opacity={0.45} /></div>
        <div className="absolute bottom-3 right-3"><DecoCorner corner="br" size={48} opacity={0.45} /></div>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-[0_8px_24px_rgba(91,79,219,0.2)]">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="text-center">
          <DecoEyebrow label="Workspace Link" align="center" />
          <h1 className="mt-3 text-2xl font-bold text-foreground font-display">Meeting Invitation</h1>
          <p className="mt-2 text-sm text-ink">
            You have been invited to join a meeting by <strong className="text-foreground font-semibold">{hostName}</strong>
          </p>
        </div>

        {info?.channelId && (
          <div className="mt-6 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Channel</p>
            <p className="mt-0.5 text-sm font-bold text-foreground">#{info.channelId}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {info?.meetLink && (
            <a
              href={info.meetLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8941E] px-5 py-3.5 text-sm font-bold text-foreground transition-all hover:brightness-105 active:scale-[0.98] shadow-md"
              style={{ color: '#1A1B3A' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Join on Google Meet
            </a>
          )}
          
          <a
            href={`/dashboard?channel=${info?.channelId || 'general'}`}
            className="btn-primary py-3.5 rounded-xl text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Open in Chat
          </a>

          <Link
            href="/dashboard"
            className="btn-ghost py-3.5 rounded-xl text-sm"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <DecoDiamond size={4} />
          <p className="text-center text-xs text-ink-light font-mono">
            code: {code}
          </p>
          <DecoDiamond size={4} />
        </div>
      </div>
    </div>
  );
}
