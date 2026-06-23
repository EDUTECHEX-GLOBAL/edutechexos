const API = 'https://edutechexos-ueoq.onrender.com';
const SYNC_INTERVAL_MINUTES = 0.5; // every 30 seconds
const IDLE_THRESHOLD_SECONDS = 60;

// ── State ──────────────────────────────────────────────────────────────────
let activeEntry = null; // { url, domain, title, startTime }
let sessionLog = [];    // [ { url, domain, title, start, end, duration } ]
let userEmail = null;
let userToken = null;
let isIdle = false;

// ── Helpers ────────────────────────────────────────────────────────────────
function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function isTrackable(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function nowMs() {
  return Date.now();
}

// ── Auth ───────────────────────────────────────────────────────────────────
async function loadAuth() {
  const data = await chrome.storage.local.get(['userEmail', 'userToken']);
  userEmail = data.userEmail ?? null;
  userToken = data.userToken ?? null;
}

// ── Active entry management ────────────────────────────────────────────────
function startEntry(url, title) {
  if (!isTrackable(url)) return;
  activeEntry = {
    url,
    domain: getDomain(url),
    title: title || url,
    startTime: nowMs(),
  };
}

function endEntry() {
  if (!activeEntry) return;
  const end = nowMs();
  const duration = Math.round((end - activeEntry.startTime) / 1000); // seconds
  if (duration >= 2) {
    sessionLog.push({
      url: activeEntry.url,
      domain: activeEntry.domain,
      title: activeEntry.title,
      start: new Date(activeEntry.startTime).toISOString(),
      end: new Date(end).toISOString(),
      duration,
    });
  }
  activeEntry = null;
}

// ── Sync to backend ────────────────────────────────────────────────────────
async function syncToBackend() {
  // Flush current active entry into log temporarily
  if (activeEntry && !isIdle) {
    const now = nowMs();
    const duration = Math.round((now - activeEntry.startTime) / 1000);
    if (duration >= 2) {
      sessionLog.push({
        url: activeEntry.url,
        domain: activeEntry.domain,
        title: activeEntry.title,
        start: new Date(activeEntry.startTime).toISOString(),
        end: new Date(now).toISOString(),
        duration,
      });
      // Reset start so next sync doesn't double-count
      activeEntry.startTime = now;
    }
  }

  if (sessionLog.length === 0) return;
  if (!userEmail || !userToken) return;

  const payload = {
    email: userEmail,
    timestamp: new Date().toISOString(),
    activities: sessionLog.slice(),
  };

  try {
    const res = await fetch(`${API}/api/activity-watch/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      sessionLog = []; // clear only on success
      await chrome.storage.local.set({ lastSync: new Date().toISOString(), syncStatus: 'ok' });
    } else {
      await chrome.storage.local.set({ syncStatus: `error ${res.status}` });
    }
  } catch (e) {
    await chrome.storage.local.set({ syncStatus: 'offline' });
  }
}

// ── Tab/window event listeners ─────────────────────────────────────────────
async function onActiveTabChanged(tabId, url, title) {
  endEntry();
  if (!isIdle) startEntry(url, title);
  await chrome.storage.local.set({
    currentDomain: getDomain(url),
    currentTitle: title || url,
    currentUrl: url,
  });
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await onActiveTabChanged(tabId, tab.url, tab.title);
  } catch (_) {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id === tabId) {
      await onActiveTabChanged(tabId, tab.url, tab.title);
    }
  } catch (_) {}
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus — pause tracking
    endEntry();
    return;
  }
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab) {
      await onActiveTabChanged(activeTab.id, activeTab.url, activeTab.title);
    }
  } catch (_) {}
});

// ── Idle detection ─────────────────────────────────────────────────────────
chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' || state === 'locked') {
    isIdle = true;
    endEntry();
    chrome.storage.local.set({ idleStatus: state });
  } else if (state === 'active') {
    isIdle = false;
    chrome.storage.local.set({ idleStatus: 'active' });
    // Resume tracking current tab
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && isTrackable(tab.url)) {
        startEntry(tab.url, tab.title);
      }
    });
  }
});

// ── Periodic sync alarm ────────────────────────────────────────────────────
chrome.alarms.create('sync', { periodInMinutes: SYNC_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sync') {
    await loadAuth();
    await syncToBackend();
  }
});

// ── On install / startup ───────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ syncStatus: 'ready', idleStatus: 'active' });
  chrome.alarms.create('sync', { periodInMinutes: SYNC_INTERVAL_MINUTES });
});

chrome.runtime.onStartup.addListener(async () => {
  await loadAuth();
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => [null]);
  if (activeTab && isTrackable(activeTab.url)) {
    startEntry(activeTab.url, activeTab.title);
  }
});

// ── Message from popup ────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SAVE_AUTH') {
    userEmail = msg.email;
    userToken = msg.token;
    chrome.storage.local.set({ userEmail: msg.email, userToken: msg.token });
    sendResponse({ ok: true });
  }
  if (msg.type === 'GET_STATUS') {
    chrome.storage.local.get(
      ['currentDomain', 'currentTitle', 'lastSync', 'syncStatus', 'idleStatus'],
      (data) => sendResponse({ ...data, logCount: sessionLog.length, isIdle }),
    );
    return true;
  }
  if (msg.type === 'FORCE_SYNC') {
    syncToBackend().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'LOGOUT') {
    userEmail = null;
    userToken = null;
    chrome.storage.local.remove(['userEmail', 'userToken']);
    endEntry();
    sendResponse({ ok: true });
  }
  return true;
});
