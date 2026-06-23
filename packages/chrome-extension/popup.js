const API = 'https://edutechexos-ueoq.onrender.com';

const $ = (id) => document.getElementById(id);

async function loadAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userEmail', 'userToken', 'userName'], resolve);
  });
}

function showLogin() {
  $('login-view').style.display = 'block';
  $('main-view').style.display = 'none';
  $('status-dot').className = 'status-dot offline';
}

function showMain(email, name) {
  $('login-view').style.display = 'none';
  $('main-view').style.display = 'block';
  $('user-email-display').textContent = email ?? '—';
  $('user-name-display').textContent = name ?? email ?? '—';
}

function setDot(state) {
  const dot = $('status-dot');
  dot.className = 'status-dot ' + (state === 'active' ? 'active' : state === 'idle' ? 'idle' : 'offline');
}

function formatTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  } catch { return '—'; }
}

async function refreshStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (status) => {
    if (!status) return;
    $('curr-domain').textContent = status.currentDomain ?? '—';
    $('curr-title').textContent = status.currentTitle ?? '—';
    $('stat-pending').textContent = status.logCount ?? '0';
    $('stat-sync').textContent = formatTime(status.lastSync);
    $('sync-status').textContent = status.syncStatus ?? '—';

    const idle = status.idleStatus ?? 'active';
    const badge = $('idle-badge');
    badge.className = 'idle-badge ' + idle;
    $('idle-text').textContent = idle === 'active' ? 'Active' : idle === 'idle' ? 'Idle' : 'Locked';
    setDot(status.syncStatus === 'ok' || status.syncStatus === 'ready' ? (idle === 'active' ? 'active' : 'idle') : 'offline');
  });
}

async function init() {
  const { userEmail, userToken, userName } = await loadAuth();
  if (userEmail && userToken) {
    showMain(userEmail, userName);
    refreshStatus();
  } else {
    showLogin();
  }
}

$('login-btn').addEventListener('click', async () => {
  const email = $('email-input').value.trim();
  const password = $('password-input').value;
  const errEl = $('login-err');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Email and password are required.';
    errEl.style.display = 'block';
    return;
  }

  $('login-btn').textContent = 'Connecting…';
  $('login-btn').disabled = true;

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      errEl.textContent = data.error ?? 'Login failed. Check your credentials.';
      errEl.style.display = 'block';
    } else {
      chrome.runtime.sendMessage({
        type: 'SAVE_AUTH',
        email: data.user?.email ?? email,
        token: data.token,
      });
      await chrome.storage.local.set({ userName: data.user?.name ?? email });
      showMain(data.user?.email ?? email, data.user?.name ?? email);
      refreshStatus();
    }
  } catch {
    errEl.textContent = 'Could not reach server. Check your connection.';
    errEl.style.display = 'block';
  } finally {
    $('login-btn').textContent = 'Connect';
    $('login-btn').disabled = false;
  }
});

$('logout-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'LOGOUT' });
  showLogin();
  $('email-input').value = '';
  $('password-input').value = '';
});

$('sync-btn').addEventListener('click', () => {
  $('sync-btn').textContent = 'Syncing…';
  $('sync-btn').disabled = true;
  chrome.runtime.sendMessage({ type: 'FORCE_SYNC' }, () => {
    refreshStatus();
    $('sync-btn').textContent = 'Sync now';
    $('sync-btn').disabled = false;
  });
});

// Refresh status every 3 seconds while popup is open
init();
setInterval(refreshStatus, 3000);
