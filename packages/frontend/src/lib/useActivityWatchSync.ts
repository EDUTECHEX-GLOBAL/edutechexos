'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const AW_BASE      = 'http://localhost:5600';
const API_BASE     = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';
const SYNC_MS      = 5 * 60 * 1000;  // sync every 5 min
const CHECK_MS     = 30 * 1000;      // re-check AW availability every 30 s when offline

export type AWStatus = 'checking' | 'connected' | 'offline';

function getToken(): string | null {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}

// ActivityWatch runs on the user's local machine (localhost:5600).
// Calling it from a deployed origin (Vercel) is always blocked by the browser's
// CORS policy — only attempt it when the app itself is running on localhost.
const IS_LOCALHOST = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

async function awFetch(path: string, timeout = 4000): Promise<Response | null> {
  if (!IS_LOCALHOST) return null; // skip silently on deployed app — aw-sync.js handles it
  try {
    const ctrl = new AbortController();
    const id   = setTimeout(() => ctrl.abort(), timeout);
    const res  = await fetch(`${AW_BASE}${path}`, { signal: ctrl.signal });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

async function isAWRunning(): Promise<boolean> {
  if (!IS_LOCALHOST) return false;
  const res = await awFetch('/api/0/info');
  return !!res?.ok;
}

async function getBuckets(): Promise<Record<string, { type: string }>> {
  const res = await awFetch('/api/0/buckets/');
  if (!res?.ok) return {};
  try { return await res.json(); } catch { return {}; }
}

async function getLatestEvent(bucketId: string): Promise<Record<string, unknown> | null> {
  const res = await awFetch(`/api/0/buckets/${encodeURIComponent(bucketId)}/events?limit=1`);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch { return null; }
}

async function getTodayEvents(bucketId: string): Promise<Record<string, unknown>[]> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end   = now.toISOString();
  const params = new URLSearchParams({ start, end, limit: '2000' });
  const res   = await awFetch(`/api/0/buckets/${encodeURIComponent(bucketId)}/events?${params}`);
  if (!res?.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url.split('/')[0] || url; }
}

async function buildSummary() {
  const buckets = await getBuckets();
  const keys    = Object.keys(buckets);

  const windowBucket = keys.find(
    (k) => (buckets[k] as { type: string }).type === 'currentwindow' || k.includes('aw-watcher-window')
  );
  const afkBucket = keys.find(
    (k) => (buckets[k] as { type: string }).type === 'afkstatus' || k.includes('aw-watcher-afk')
  );
  // aw-watcher-web creates buckets like: aw-watcher-web-chrome, aw-watcher-web-firefox, aw-watcher-web-edge
  const webBuckets = keys.filter(
    (k) => k.includes('aw-watcher-web') || (buckets[k] as { type: string }).type === 'web.tab.current'
  );

  if (!windowBucket) return null;

  // Current active app + title (from window watcher)
  const cur          = await getLatestEvent(windowBucket);
  const curData      = cur?.data as Record<string, string> | undefined;
  const currentApp   = curData?.app   || curData?.title || '';
  const currentTitle = curData?.title || '';

  // Today's window events → app breakdown + total active time
  const windowEvents = await getTodayEvents(windowBucket);
  const appSecs: Record<string, number> = {};
  let totalActiveSec = 0;

  for (const ev of windowEvents) {
    const dur = (ev.duration as number) || 0;
    const d   = ev.data as Record<string, string> | undefined;
    const app = d?.app || d?.title || 'Unknown';
    appSecs[app] = (appSecs[app] || 0) + dur;
    totalActiveSec += dur;
  }

  const appBreakdown = Object.entries(appSecs)
    .map(([app, secs]) => ({ app, minutes: Math.round(secs / 60) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 15);

  // AFK
  let isAfk       = false;
  let totalAfkSec = 0;

  if (afkBucket) {
    const afkEvents = await getTodayEvents(afkBucket);
    const latestAfk = afkEvents[0] as { data?: { status?: string } } | undefined;
    isAfk = latestAfk?.data?.status === 'afk';
    for (const ev of afkEvents) {
      const e = ev as { duration?: number; data?: { status?: string } };
      if (e.data?.status === 'afk') totalAfkSec += e.duration || 0;
    }
  }

  // ── Web watcher (aw-watcher-web-chrome / firefox / edge) ──────────────────
  let currentUrl       = '';
  let currentPageTitle = '';
  const domainSecs: Record<string, { minutes: number; title: string }> = {};

  for (const wb of webBuckets) {
    // Current tab in this browser
    const latestWeb = await getLatestEvent(wb);
    if (latestWeb) {
      const wd = latestWeb.data as { url?: string; title?: string; incognito?: boolean } | undefined;
      if (wd?.url && !wd.incognito) {
        currentUrl       = wd.url;
        currentPageTitle = wd.title || '';
      }
    }

    // All today's web events for domain breakdown
    const webEvents = await getTodayEvents(wb);
    for (const ev of webEvents) {
      const dur = (ev.duration as number) || 0;
      const d   = ev.data as { url?: string; title?: string; incognito?: boolean } | undefined;
      if (!d?.url || d.incognito) continue; // skip incognito tabs

      const domain = extractDomain(d.url);
      if (!domainSecs[domain]) domainSecs[domain] = { minutes: 0, title: d.title || domain };
      domainSecs[domain].minutes += dur / 60;
    }
  }

  const webBreakdown = Object.entries(domainSecs)
    .map(([domain, v]) => ({ domain, minutes: Math.round(v.minutes), title: v.title }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 20);

  return {
    currentApp,
    currentTitle,
    currentUrl,
    currentPageTitle,
    isAfk,
    totalActiveMinutes: Math.round(totalActiveSec / 60),
    totalAfkMinutes:    Math.round(totalAfkSec / 60),
    appBreakdown,
    webBreakdown,
  };
}

export function useActivityWatchSync(active: boolean) {
  const [status, setStatus] = useState<AWStatus>('checking');
  const syncTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted  = useRef(true);

  const stopTimers = () => {
    if (syncTimer.current)  { clearInterval(syncTimer.current);  syncTimer.current  = null; }
    if (checkTimer.current) { clearInterval(checkTimer.current); checkTimer.current = null; }
  };

  const sync = useCallback(async () => {
    const token = getToken();
    if (!token || !isMounted.current) return;
    try {
      const summary = await buildSummary();
      if (!summary || !isMounted.current) return;
      await fetch(`${API_BASE}/api/activity/aw-sync`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(summary),
      });
    } catch { /* non-fatal */ }
  }, []);

  const startSyncing = useCallback(() => {
    if (syncTimer.current) return; // already running
    setStatus('connected');
    sync(); // immediate first sync
    syncTimer.current = setInterval(sync, SYNC_MS);
  }, [sync]);

  // Periodically re-check AW when it's offline so we auto-connect once it starts
  const startChecking = useCallback(() => {
    if (checkTimer.current) return;
    checkTimer.current = setInterval(async () => {
      if (!isMounted.current) return;
      const running = await isAWRunning();
      if (running) {
        if (checkTimer.current) { clearInterval(checkTimer.current); checkTimer.current = null; }
        startSyncing();
      }
    }, CHECK_MS);
  }, [startSyncing]);

  useEffect(() => {
    isMounted.current = true;
    if (!active) {
      stopTimers();
      setStatus('checking');
      return;
    }

    (async () => {
      const running = await isAWRunning();
      if (!isMounted.current) return;
      if (running) {
        startSyncing();
      } else {
        setStatus('offline');
        startChecking();
      }
    })();

    return () => {
      isMounted.current = false;
      stopTimers();
    };
  }, [active, startSyncing, startChecking]);

  return status;
}
