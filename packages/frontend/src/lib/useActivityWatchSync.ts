'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// On localhost the Next.js dev-server proxies /aw-proxy/* → localhost:5600/*
// so the browser avoids the CORS port-mismatch. On deployed (Vercel) we skip
// the direct AW check entirely and rely on the backend status poll instead.
const AW_PROXY    = '/api/aw-proxy';
const API_BASE    = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';
const SYNC_MS     = 5 * 60 * 1000;   // push AW data every 5 min
const CHECK_MS    = 30 * 1000;        // re-check AW locally every 30 s
const BE_CHECK_MS = 2 * 60 * 1000;   // poll backend status every 2 min

export type AWStatus = 'checking' | 'connected' | 'offline';

const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Daily working-hours bound, mirroring scripts/aw-sync.js (the standalone
// agent already enforces this — this hook is the browser-based path, used
// just by having the dashboard open, and previously had no such gate at all).
// Outside this window, no ActivityWatch data is collected or sent, even if
// the dashboard tab stays open and the user is still logged in.
const WORK_START_MIN = 10 * 60;      // 10:00
const WORK_END_MIN   = 18 * 60 + 30; // 18:30

function isWithinWorkingHours(): boolean {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= WORK_START_MIN && mins < WORK_END_MIN;
}

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

async function getEventsForDate(bucketId: string, date: Date): Promise<Record<string, unknown>[]> {
  const start  = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  const end    = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
  const params = new URLSearchParams({ start, end, limit: '2000' });
  const res    = await awFetch(`/api/0/buckets/${encodeURIComponent(bucketId)}/events?${params}`);
  if (!res?.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function getTodayEvents(bucketId: string): Promise<Record<string, unknown>[]> {
  return getEventsForDate(bucketId, new Date());
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url.split('/')[0] || url; }
}

// The user's EduTechExOS web-login time for a day (ms), or null if not logged in.
async function getSessionStartMs(dateStr: string): Promise<number | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/activity/session-start?date=${dateStr}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.sessionStart ? Date.parse(data.sessionStart) : null;
  } catch {
    return null;
  }
}

// Seconds of an AW event that fall AFTER the login gate (clamps pre-login part).
function secsAfter(ev: Record<string, unknown>, gateMs: number): number {
  const ts = ev.timestamp as string | undefined;
  const start = ts ? Date.parse(ts) : NaN;
  if (!Number.isFinite(start)) return 0;
  const end = start + ((ev.duration as number) || 0) * 1000;
  return Math.max(0, (end - Math.max(start, gateMs)) / 1000);
}

async function buildSummary(forDate: Date = new Date()) {
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

  // Only count activity from the moment the user opened EduTechExOS that day.
  const istOffset = 5.5 * 60 * 60 * 1000;
  const dateStr = new Date(forDate.getTime() + istOffset).toISOString().slice(0, 10);
  const gateMs = await getSessionStartMs(dateStr);
  if (!gateMs) return null;

  // ── Working-hours window: 10:00–18:30, and never before login ────────────────
  const today = new Date(forDate);
  const winOpen = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, WORK_START_MIN, 0, 0).getTime();
  const winClose = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, WORK_END_MIN, 0, 0).getTime();
  const winStart = Math.max(winOpen, gateMs);
  const isToday = forDate.toDateString() === new Date().toDateString();
  const winEnd   = isToday ? Math.min(winClose, Date.now()) : winClose;

  // Clamps an event's timestamp to the working hours window
  const secsInWindow = (ev: Record<string, unknown>): number => {
    const ts = ev.timestamp as string | undefined;
    const start = ts ? Date.parse(ts) : NaN;
    if (!Number.isFinite(start)) return 0;
    const end = start + ((ev.duration as number) || 0) * 1000;
    const cs = Math.max(start, winStart);
    const ce = Math.min(end, winEnd);
    return Math.max(0, (ce - cs) / 1000);
  };

  const isTimeOverlap = (ev: Record<string, unknown>): boolean => {
    const ts = ev.timestamp as string | undefined;
    const start = ts ? Date.parse(ts) : NaN;
    if (!Number.isFinite(start)) return false;
    const end = start + ((ev.duration as number) || 0) * 1000;
    return Math.min(end, winEnd) > Math.max(start, winStart);
  };

  let currentApp = '';
  let currentTitle = '';
  let currentUrl = '';
  let currentPageTitle = '';

  // Before 10:00 (or window otherwise empty) → nothing counted yet.
  if (winEnd <= winStart) {
    return {
      dateStr,
      currentApp, currentTitle, currentUrl, currentPageTitle,
      isAfk: false,
      totalActiveSeconds: 0,
      totalAfkSeconds: 0,
      totalActiveMinutes: 0,
      totalAfkMinutes:    0,
      appBreakdown: [], webBreakdown: [],
    };
  }

  if (isToday) {
    const cur = await getLatestEvent(windowBucket);
    const curData = cur?.data as Record<string, string> | undefined;
    currentApp = curData?.app || curData?.title || '';
    currentTitle = curData?.title || '';
  }

  const windowEvents  = await getEventsForDate(windowBucket, forDate);
  const appSecs: Record<string, number> = {};
  let totalActiveSec  = 0;

  for (const ev of windowEvents) {
    const dur = secsInWindow(ev);
    if (dur <= 0) continue;
    const d   = ev.data as Record<string, string> | undefined;
    const app = d?.app || d?.title || 'Unknown';
    appSecs[app] = (appSecs[app] || 0) + dur;
    totalActiveSec += dur;
  }

  const appBreakdown = Object.entries(appSecs)
    .map(([app, secs]) => ({ app, seconds: Math.round(secs), minutes: Math.round(secs / 60) }))
    .filter((a) => a.seconds >= 1)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 300);

  let isAfk       = false;
  let totalAfkSec = 0;

  if (afkBucket) {
    const afkEvents  = await getEventsForDate(afkBucket, forDate);
    const latestAfk  = afkEvents[0] as { data?: { status?: string } } | undefined;
    isAfk = latestAfk?.data?.status === 'afk';
    for (const ev of afkEvents) {
      const e = ev as { data?: { status?: string } };
      if (e.data?.status === 'afk') totalAfkSec += secsInWindow(ev);
    }
  }

  const domainSecs: Record<string, { seconds: number; domain: string }> = {};

  for (const wb of webBuckets) {
    if (isToday && !currentUrl) {
      const latestWeb = await getLatestEvent(wb);
      if (latestWeb && isTimeOverlap(latestWeb)) {
        const wd = latestWeb.data as { url?: string; title?: string; incognito?: boolean } | undefined;
        if (wd?.url && !wd.incognito) {
          currentUrl       = wd.url;
          currentPageTitle = wd.title || '';
        }
      }
    }

    const webEvents = await getEventsForDate(wb, forDate);
    for (const ev of webEvents) {
      const dur = secsInWindow(ev);
      if (dur <= 0) continue;
      const d   = ev.data as { url?: string; title?: string; incognito?: boolean } | undefined;
      if (!d?.url || d.incognito) continue;

      const domain = extractDomain(d.url);
      const title = (d.title || '').trim() || domain; // group per tab (title)
      if (!domainSecs[title]) domainSecs[title] = { seconds: 0, domain };
      domainSecs[title].seconds += dur;
    }
  }

  const webBreakdown = Object.entries(domainSecs)
    .map(([title, v]) => ({ domain: v.domain, seconds: Math.round(v.seconds), minutes: Math.round(v.seconds / 60), title }))
    .filter((w) => w.seconds >= 5)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 20);

  return {
    dateStr,
    currentApp, currentTitle, currentUrl, currentPageTitle,
    isAfk,
    totalActiveSeconds: Math.round(totalActiveSec),
    totalAfkSeconds:    Math.round(totalAfkSec),
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
    // Outside 10:00-18:30, don't collect or push any activity data at all.
    if (!isWithinWorkingHours()) return;
    try {
      const today     = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // Always push today's data
      const summary = await buildSummary(today);
      if (!summary || !isMounted.current) return;
      await fetch(`${API_BASE}/api/activity/aw-sync`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(summary),
      });

      // Also push yesterday's data so admin sees full history even if browser was closed
      if (!isMounted.current) return;
      const ySummary = await buildSummary(yesterday);
      if (ySummary && ySummary.totalActiveMinutes > 0 && isMounted.current) {
        await fetch(`${API_BASE}/api/activity/aw-sync`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify(ySummary),
        });
      }
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
          // Re-check with exponential backoff so we don't spam the console when AW is offline.
          // Starts at 30s, doubles each miss, caps at 10 minutes.
          let backoff = CHECK_MS;
          const scheduleNextCheck = () => {
            if (!isMounted.current) return;
            checkTimer.current = setTimeout(async () => {
              if (!isMounted.current) return;
              const running = await isAWRunning();
              if (running) {
                startBrowserSync();
              } else {
                backoff = Math.min(backoff * 2, 10 * 60 * 1000);
                scheduleNextCheck();
              }
            }, backoff) as unknown as ReturnType<typeof setInterval>;
          };
          scheduleNextCheck();
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
