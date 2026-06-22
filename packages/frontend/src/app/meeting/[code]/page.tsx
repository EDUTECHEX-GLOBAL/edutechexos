'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function MeetingJoinPage() {
  const params = useParams();
  const code = params?.code as string;
  const [info, setInfo] = useState<{ messageId: string; channelId: string; hostEmail: string; meetLink: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    const backend = process.env.NEXT_PUBLIC_API_URL || 'https://edutechexos-ueoq.onrender.com';
    fetch(`${backend}/api/meetings/code/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInfo(d);
        else setError(d.error || 'Meeting not found');
      })
      .catch(() => setError('Could not load meeting details'))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1220]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#3E4A89] border-t-transparent" />
          <p className="mt-4 text-sm text-[#7C859E]">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1220] p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <span className="text-3xl">&#x2716;</span>
          </div>
          <h1 className="text-xl font-black text-white">Meeting Not Found</h1>
          <p className="mt-2 text-sm text-[#7C859E]">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#3E4A89] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2A3568]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hostName = info?.hostEmail?.split('@')[0] || 'A team member';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1220] p-4">
      <div className="w-full max-w-lg rounded-3xl border border-[rgba(155,166,211,0.18)] bg-gradient-to-b from-[#191E2F] to-[#1E2538] p-8 shadow-[0_32px_80px_rgba(25,30,47,0.45)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3E4A89] to-[#2A3568] shadow-[0_4px_16px_rgba(62,74,137,0.40)]">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-center text-2xl font-black text-white">Meeting Invitation</h1>
        <p className="mt-2 text-center text-sm text-[#9BA6D3]">
          You have been invited to join a meeting by <strong className="text-white">{hostName}</strong>
        </p>

        {info?.channelId && (
          <div className="mt-4 rounded-xl bg-[rgba(62,74,137,0.12)] px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7C859E]">Channel</p>
            <p className="mt-0.5 text-sm font-bold text-white">#{info.channelId}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {info?.meetLink && (
            <a
              href={info.meetLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8941E] px-5 py-3 text-sm font-bold text-[#0A1128] transition-colors hover:from-[#E0BB4F] hover:to-[#C8A32E]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Join on Google Meet
            </a>
          )}
          <a
            href={`/dashboard?channel=${info?.channelId || 'general'}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#3E4A89] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2A3568]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Open in Chat
          </a>

          <Link
            href="/dashboard"
            className="flex items-center justify-center rounded-xl border border-[rgba(155,166,211,0.18)] px-5 py-3 text-sm font-bold text-[#9BA6D3] transition-colors hover:bg-[rgba(155,166,211,0.06)] hover:text-white"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-[#5A6380]">
          Meeting code: {code}
        </p>
      </div>
    </div>
  );
}
