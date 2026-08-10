/**
 * sessionTimer.ts — pause/resume daily session clock, backed by localStorage.
 *
 * Unlike a simple "time since first login today" clock, this tracks actual
 * logged-in segments: if you log in at 10am, log out at 1pm, and log back in
 * at 3pm, the timer resumes from the 3-hour mark banked at logout instead of
 * either resetting to zero or silently counting the 1pm-3pm gap as if you'd
 * stayed logged in.
 *
 * Storage keys (all reset automatically at the start of a new IST calendar day):
 *  - edutechex_session_date        YYYY-MM-DD (IST) these values belong to
 *  - edutechex_session_banked_ms   total elapsed ms from already-closed segments today
 *  - edutechex_session_active_start ISO timestamp the CURRENT segment began, or absent if logged out
 *  - edutechex_lunch_pause_ms      ms paused for lunch during the current segment
 */

const DATE_KEY = 'edutechex_session_date';
const BANKED_KEY = 'edutechex_session_banked_ms';
const ACTIVE_KEY = 'edutechex_session_active_start';
const LUNCH_KEY = 'edutechex_lunch_pause_ms';
const OWNER_KEY = 'edutechex_session_owner'; // email these values belong to

function todayIST(): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + istOffset).toISOString().slice(0, 10);
}

// The currently logged-in user's email, read from the stored auth token.
function currentEmail(): string {
  try {
    const raw = localStorage.getItem('edutechex_token');
    return raw ? String(JSON.parse(raw).user?.email ?? '').toLowerCase() : '';
  } catch {
    return '';
  }
}

// Reset the session clock when a new IST day starts OR a DIFFERENT user logs in
// on this browser — so a second user never inherits the previous user's time.
function ensureFreshSession(email?: string) {
  const today = todayIST();
  const owner = (email ?? '').toLowerCase();
  const dateChanged  = localStorage.getItem(DATE_KEY) !== today;
  const ownerChanged = owner !== '' && localStorage.getItem(OWNER_KEY) !== owner;
  if (dateChanged || ownerChanged) {
    localStorage.setItem(DATE_KEY, today);
    if (owner) localStorage.setItem(OWNER_KEY, owner);
    localStorage.setItem(BANKED_KEY, '0');
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.setItem(LUNCH_KEY, '0');
  } else if (owner && !localStorage.getItem(OWNER_KEY)) {
    localStorage.setItem(OWNER_KEY, owner);
  }
}

// Called on login / whenever the session clock UI mounts. Starts a fresh
// segment only if one isn't already active (e.g. a page refresh while still
// logged in should NOT start a new segment on top of the existing one).
export function startOrResumeSession(): { activeStart: string; bankedMs: number } {
  ensureFreshSession(currentEmail());
  let activeStart = localStorage.getItem(ACTIVE_KEY);
  if (!activeStart) {
    activeStart = new Date().toISOString();
    localStorage.setItem(ACTIVE_KEY, activeStart);
    localStorage.setItem(LUNCH_KEY, '0');
  }
  const bankedMs = parseInt(localStorage.getItem(BANKED_KEY) ?? '0', 10);
  return { activeStart, bankedMs };
}

// Called at every logout point. Folds the current segment's elapsed time into
// the banked total so a later login today resumes from here, then clears the
// "currently active" marker (but keeps the banked total, so it's not lost).
export function bankSessionTime() {
  ensureFreshSession(currentEmail());
  const activeStart = localStorage.getItem(ACTIVE_KEY);
  if (!activeStart) return;
  const lunchMs = parseInt(localStorage.getItem(LUNCH_KEY) ?? '0', 10);
  const elapsed = Math.max(0, Date.now() - new Date(activeStart).getTime() - lunchMs);
  const banked = parseInt(localStorage.getItem(BANKED_KEY) ?? '0', 10);
  localStorage.setItem(BANKED_KEY, String(banked + elapsed));
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.setItem(LUNCH_KEY, '0');
}

// Full reset — used when wiping all local session data (e.g. "forget me" flows).
export function clearSessionTime() {
  localStorage.removeItem(DATE_KEY);
  localStorage.removeItem(BANKED_KEY);
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(LUNCH_KEY);
  localStorage.removeItem(OWNER_KEY);
}
