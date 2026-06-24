'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// On localhost the Next.js dev-server proxies /aw-proxy/* → localhost:5600/*
// so the browser avoids the CORS port-mismatch. On deployed (Vercel) we skip
// the direct AW check entirely and rely on the backend status poll instead.
const AW_PROXY    = '/aw-proxy';
const API_BASE    = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
const SYNC_MS     = 5 * 60 * 1000;   // push AW data every 5 min
const CHECK_MS    = 30 * 1000;        // re-check AW locally every 30 s
const BE_CHECK_MS = 2 * 60 * 1000;   // poll backend status every 2 min

export type AWStatus = 'checking' | 'connected' | 'offline';

const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

function getToken(): string | null {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
  catch { return null; }
}

async function awFetch(path: string, timeout = 4000): Promise<Response | null> {
  if (!IS_LOCALHOST) return null;
  try {
    const ctrl = new AbortController();
    const id   = setTimeout(() => ctrl.abort(), timeout);
    const res  = await fetch(`${AW_PROXY}${path}`, { signal: ctrl.signal });
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
  const now    = new Date();
  const start  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end    = now.toISOString();
  const params = new URLSearchParams({ start, end, limit: '2000' });
  const res    = await awFetch(`/api/0/buckets/${encodeURIComponent(bucketId)}/events?${params}`);
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
    (k) => (buckets[k] as { type: string }).type === 'currentwindow' || k.includes('aw-watcher-window'),
  );
  const afkBucket = keys.find(
    (k) => (buckets[k] as { type: string }).type === 'afkstatus' || k.includes('aw-watcher-afk'),
  );
  const webBuckets = keys.filter(
    (k) => k.includes('aw-watcher-web') || (buckets[k] as { type: string }).type === 'web.tab.current',
  );

  if (!windowBucket) return null;

  const cur          = await getLatestEvent(windowBucket);
  const curData      = cur?.data as Record<string, string> | undefined;
  const currentApp   = curData?.app   || curData?.title || '';
  const currentTitle = curData?.title || '';

  const windowEvents  = await getTodayEvents(windowBucket);
  const appSecs: Record<string, number> = {};
  let totalActiveSec  = 0;

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

  let isAfk       = false;
  let totalAfkSec = 0;

  if (afkBucket) {
    const afkEvents  = await getTodayEvents(afkBucket);
    const latestAfk  = afkEvents[0] as { data?: { status?: string } } | undefined;
    isAfk = latestAfk?.data?.status === 'afk';
    for (const ev of afkEvents) {
      const e = ev as { duration?: number; data?: { status?: string } };
      if (e.data?.status === 'afk') totalAfkSec += e.duration || 0;
    }
  }

  let currentUrl       = '';
  let currentPageTitle = '';
  const domainSecs: Record<string, { minutes: number; title: string }> = {};

  for (const wb of webBuckets) {
    const latestWeb = await getLatestEvent(wb);
    if (latestWeb) {
      const wd = latestWeb.data as { url?: string; title?: string; incognito?: boolean } | undefined;
      if (wd?.url && !wd.incognito) {
        currentUrl       = wd.url;
        currentPageTitle = wd.title || '';
      }
    }

    const webEvents = await getTodayEvents(wb);
    for (const ev of webEvents) {
      const dur = (ev.duration as number) || 0;
      const d   = ev.data as { url?: string; title?: string; incognito?: boolean } | undefined;
      if (!d?.url || d.incognito) continue;

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
    currentApp, currentTitle, currentUrl, currentPageTitle,
    isAfk,
    totalActiveMinutes: Math.round(totalActiveSec / 60),
    totalAfkMinutes:    Math.round(totalAfkSec / 60),
    appBreakdown, webBreakdown,
  };
}

// Poll backend to see if aw-sync.js has recently pushed data (works for all users)
async function checkBackendAWStatus(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/activity/aw-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.connected;
  } catch {
    return false;
  }
}

export function useActivityWatchSync(active: boolean) {
  const [status, setStatus]   = useState<AWStatus>('checking');
  const syncTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const beTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted   = useRef(true);

  const stopTimers = () => {
    if (syncTimer.current)  { clearInterval(syncTimer.current);  syncTimer.current  = null; }
    if (checkTimer.current) { clearInterval(checkTimer.current); checkTimer.current = null; }
    if (beTimer.current)    { clearInterval(beTimer.current);    beTimer.current    = null; }
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

  const startBrowserSync = useCallback(() => {
    if (syncTimer.current) return;
    setStatus('connected');
    sync();
    syncTimer.current = setInterval(sync, SYNC_MS);
  }, [sync]);

  // Periodically re-check backend status (covers aw-sync.js users on deployed app)
  const startBackendPolling = useCallback(() => {
    if (beTimer.current) return;
    beTimer.current = setInterval(async () => {
      if (!isMounted.current) return;
      const connected = await checkBackendAWStatus();
      if (connected && isMounted.current) setStatus('connected');
    }, BE_CHECK_MS);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (!active) {
      stopTimers();
      setStatus('checking');
      return;
    }

    (async () => {
      // 1. Try browser → ActivityWatch (only works on localhost via /aw-proxy)
      const awRunning = await isAWRunning();
      if (!isMounted.current) return;

      if (awRunning) {
        startBrowserSync();
      } else {
        // 2. Fallback: check if aw-sync.js has already pushed data to backend
        const beConnected = await checkBackendAWStatus();
        if (!isMounted.current) return;
        if (beConnected) {
          setStatus('connected');
        } else {
          setStatus('offline');
          // Keep re-checking locally every 30s so it auto-connects if AW starts
          checkTimer.current = setInterval(async () => {
            if (!isMounted.current) return;
            const running = await isAWRunning();
            if (running) {
              if (checkTimer.current) { clearInterval(checkTimer.current); checkTimer.current = null; }
              startBrowserSync();
            }
          }, CHECK_MS);
        }
      }

      // Always poll backend so aw-sync.js users show connected throughout the session
      startBackendPolling();
    })();

    return () => {
      isMounted.current = false;
      stopTimers();
    };
  }, [active, startBrowserSync, startBackendPolling]);

  return status;
}
