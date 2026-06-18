/* ============================================================
   EduTechExOS Copilot — Website Embed Widget  v1.0
   Usage:
     <script src="https://YOUR_DOMAIN/embed.js" async></script>
   Optional config (set BEFORE the script tag):
     <script>window.EduTechWidget = { label: 'Chat with us' };</script>
   ============================================================ */
(function () {
  'use strict';

  /* ── Guard against double-init ───────────────────────────────────── */
  if (window.__etWidgetLoaded) return;
  window.__etWidgetLoaded = true;

  /* ── Detect origin from script src ──────────────────────────────── */
  var scripts = document.querySelectorAll('script[src*="embed.js"]');
  var scriptSrc = (scripts[scripts.length - 1] || {}).src || '';
  var ORIGIN = scriptSrc
    ? scriptSrc.replace(/\/embed\.js(\?.*)?$/, '')
    : window.location.origin;

  var cfg = window.EduTechWidget || {};
  var WIDGET_URL = ORIGIN + '/widget';
  var FAB_LABEL = cfg.label || 'Chat with AI Copilot';

  /* ── SVG icons ───────────────────────────────────────────────────── */
  var ICON_CHAT = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"',
    ' fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    '<circle cx="9" cy="10" r="1" fill="white"/>',
    '<circle cx="12" cy="10" r="1" fill="white"/>',
    '<circle cx="15" cy="10" r="1" fill="white"/>',
    '</svg>',
  ].join('');

  var ICON_CLOSE = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"',
    ' fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round">',
    '<line x1="18" y1="6" x2="6" y2="18"/>',
    '<line x1="6" y1="6" x2="18" y2="18"/>',
    '</svg>',
  ].join('');

  /* ── CSS ─────────────────────────────────────────────────────────── */
  var CSS = [
    /* Reset scope */
    '#et-widget-root * { box-sizing: border-box; }',

    /* ── Floating button ── */
    '#et-fab {',
    '  position: fixed;',
    '  bottom: 24px; right: 24px;',
    '  z-index: 2147483640;',
    '  width: 60px; height: 60px;',
    '  border-radius: 50%;',
    '  border: none;',
    '  cursor: pointer;',
    '  background: linear-gradient(145deg, #1a3a2a 0%, #2d6a4f 100%);',
    '  box-shadow: 0 6px 24px rgba(26,58,42,0.48), 0 2px 8px rgba(0,0,0,0.18);',
    '  display: flex; align-items: center; justify-content: center;',
    '  outline: none;',
    '  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1),',
    '              box-shadow 0.22s ease;',
    '  overflow: visible;',
    '}',
    '#et-fab:hover {',
    '  transform: scale(1.10) translateY(-2px);',
    '  box-shadow: 0 10px 32px rgba(26,58,42,0.52), 0 4px 12px rgba(0,0,0,0.18);',
    '}',
    '#et-fab:active { transform: scale(0.94); }',

    /* ── Pulse rings ── */
    '.et-ring {',
    '  position: absolute;',
    '  inset: -1px;',
    '  border-radius: 50%;',
    '  border: 2px solid rgba(82,183,136,0.55);',
    '  animation: etRing 2.6s ease-out infinite;',
    '  pointer-events: none;',
    '}',
    '.et-ring:nth-child(2) { animation-delay: 0.85s; }',
    '.et-ring:nth-child(3) { animation-delay: 1.70s; }',
    '@keyframes etRing {',
    '  0%   { transform: scale(1);   opacity: 0.7; }',
    '  80%  { opacity: 0.05; }',
    '  100% { transform: scale(2.6); opacity: 0; }',
    '}',
    '#et-widget-root.et-open .et-ring { animation: none; opacity: 0; transition: opacity 0.2s; }',

    /* ── Icon swap ── */
    '.et-icon {',
    '  position: absolute;',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: opacity 0.22s ease, transform 0.26s cubic-bezier(0.34,1.56,0.64,1);',
    '}',
    '.et-icon-chat  { opacity: 1; transform: rotate(0deg) scale(1); }',
    '.et-icon-close { opacity: 0; transform: rotate(-45deg) scale(0.5); }',
    '#et-widget-root.et-open .et-icon-chat  { opacity: 0; transform: rotate(45deg) scale(0.5); }',
    '#et-widget-root.et-open .et-icon-close { opacity: 1; transform: rotate(0deg) scale(1); }',

    /* ── Tooltip ── */
    '#et-tooltip {',
    '  position: absolute;',
    '  right: 70px; top: 50%;',
    '  transform: translateY(-50%);',
    '  background: #1a3a2a;',
    '  color: white;',
    '  font-family: system-ui, -apple-system, sans-serif;',
    '  font-size: 12.5px; font-weight: 500;',
    '  padding: 7px 13px;',
    '  border-radius: 10px;',
    '  white-space: nowrap;',
    '  pointer-events: none;',
    '  opacity: 0;',
    '  transition: opacity 0.18s, transform 0.18s;',
    '  transform: translateY(-50%) translateX(4px);',
    '  box-shadow: 0 4px 14px rgba(0,0,0,0.18);',
    '}',
    '#et-tooltip::after {',
    '  content: "";',
    '  position: absolute; left: 100%; top: 50%;',
    '  transform: translateY(-50%);',
    '  border: 5px solid transparent;',
    '  border-left-color: #1a3a2a;',
    '}',
    '#et-fab:hover #et-tooltip {',
    '  opacity: 1;',
    '  transform: translateY(-50%) translateX(0);',
    '}',
    '#et-widget-root.et-open #et-tooltip { opacity: 0 !important; }',

    /* ── Unread badge ── */
    '#et-badge {',
    '  position: absolute; top: -3px; right: -3px;',
    '  width: 19px; height: 19px;',
    '  border-radius: 50%;',
    '  background: #ef4444;',
    '  color: white;',
    '  font-family: system-ui, sans-serif;',
    '  font-size: 10.5px; font-weight: 700;',
    '  display: none; align-items: center; justify-content: center;',
    '  border: 2px solid white;',
    '  animation: etBadgePop 0.35s cubic-bezier(0.34,1.56,0.64,1);',
    '}',
    '@keyframes etBadgePop {',
    '  0%   { transform: scale(0); }',
    '  100% { transform: scale(1); }',
    '}',
    '#et-badge.et-badge-show { display: flex; }',
    '#et-widget-root.et-open #et-badge { display: none; }',

    /* ── Chat panel ── */
    '#et-panel {',
    '  position: fixed;',
    '  bottom: 96px; right: 24px;',
    '  z-index: 2147483639;',
    '  width: 380px; height: 580px;',
    '  max-height: calc(100vh - 120px);',
    '  border-radius: 20px;',
    '  overflow: hidden;',
    '  box-shadow:',
    '    0 24px 64px rgba(0,0,0,0.16),',
    '    0 8px 24px rgba(0,0,0,0.10),',
    '    0 0 0 1px rgba(0,0,0,0.05);',
    '  transform-origin: bottom right;',
    '  opacity: 0;',
    '  transform: scale(0.85) translateY(20px);',
    '  pointer-events: none;',
    '  transition:',
    '    opacity 0.30s cubic-bezier(0.22,0.61,0.36,1),',
    '    transform 0.30s cubic-bezier(0.22,0.61,0.36,1);',
    '}',
    '#et-widget-root.et-open #et-panel {',
    '  opacity: 1;',
    '  transform: scale(1) translateY(0);',
    '  pointer-events: auto;',
    '}',
    '#et-iframe {',
    '  width: 100%; height: 100%;',
    '  border: none; display: block;',
    '}',

    /* ── Entrance animation for fab itself ── */
    '@keyframes etFabEntrance {',
    '  0%   { transform: scale(0) rotate(-15deg); opacity: 0; }',
    '  60%  { transform: scale(1.12) rotate(3deg); opacity: 1; }',
    '  100% { transform: scale(1) rotate(0deg); opacity: 1; }',
    '}',
    '#et-fab { animation: etFabEntrance 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }',

    /* ── Mobile ── */
    '@media (max-width: 480px) {',
    '  #et-panel {',
    '    right: 8px; bottom: 84px;',
    '    width: calc(100vw - 16px);',
    '    height: calc(100dvh - 106px);',
    '    border-radius: 16px;',
    '  }',
    '  #et-fab { bottom: 16px; right: 16px; width: 56px; height: 56px; }',
    '}',
  ].join('\n');

  /* ── Inject styles ───────────────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ── Build DOM ───────────────────────────────────────────────────── */
  var root = document.createElement('div');
  root.id = 'et-widget-root';

  /* Panel */
  var panel = document.createElement('div');
  panel.id = 'et-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'EduTechExOS Copilot Chat');

  var iframe = document.createElement('iframe');
  iframe.id = 'et-iframe';
  iframe.title = 'EduTechExOS Copilot';
  iframe.allow = 'clipboard-write';
  /* Lazy-load: only set src when panel first opens */
  iframe.setAttribute('data-src', WIDGET_URL);
  panel.appendChild(iframe);

  /* FAB */
  var fab = document.createElement('button');
  fab.id = 'et-fab';
  fab.setAttribute('type', 'button');
  fab.setAttribute('aria-label', FAB_LABEL);
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'et-panel');

  /* Pulse rings */
  for (var r = 0; r < 3; r++) {
    var ring = document.createElement('span');
    ring.className = 'et-ring';
    ring.setAttribute('aria-hidden', 'true');
    fab.appendChild(ring);
  }

  /* Icons */
  var iconChat = document.createElement('span');
  iconChat.className = 'et-icon et-icon-chat';
  iconChat.setAttribute('aria-hidden', 'true');
  iconChat.innerHTML = ICON_CHAT;

  var iconClose = document.createElement('span');
  iconClose.className = 'et-icon et-icon-close';
  iconClose.setAttribute('aria-hidden', 'true');
  iconClose.innerHTML = ICON_CLOSE;

  /* Tooltip */
  var tooltip = document.createElement('span');
  tooltip.id = 'et-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.textContent = FAB_LABEL;

  /* Badge */
  var badge = document.createElement('span');
  badge.id = 'et-badge';
  badge.setAttribute('aria-label', '1 new message');
  badge.textContent = '1';

  fab.appendChild(iconChat);
  fab.appendChild(iconClose);
  fab.appendChild(tooltip);
  fab.appendChild(badge);

  root.appendChild(panel);
  root.appendChild(fab);
  document.body.appendChild(root);

  /* ── State & toggle ──────────────────────────────────────────────── */
  var open = false;
  var iframeLoaded = false;

  function openPanel() {
    open = true;
    root.classList.add('et-open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Close chat');
    /* Lazy-load iframe on first open */
    if (!iframeLoaded) {
      iframe.src = iframe.getAttribute('data-src') || WIDGET_URL;
      iframeLoaded = true;
    }
  }

  function closePanel() {
    open = false;
    root.classList.remove('et-open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', FAB_LABEL);
  }

  fab.addEventListener('click', function () {
    if (open) {
      closePanel();
    } else {
      openPanel();
    }
  });

  /* Close on Escape key */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) closePanel();
  });

  /* Close when clicking outside the panel (but not the fab) */
  document.addEventListener('mousedown', function (e) {
    if (!open) return;
    var target = e.target;
    if (target && !panel.contains(target) && target !== fab && !fab.contains(target)) {
      closePanel();
    }
  });

  /* Optional: show badge after 8s if user hasn't opened the widget yet */
  setTimeout(function () {
    if (!open && !iframeLoaded) {
      badge.classList.add('et-badge-show');
    }
  }, 8000);

  /* ── Public API ──────────────────────────────────────────────────── */
  window.EduTechWidget = Object.assign(cfg, {
    open: openPanel,
    close: closePanel,
    toggle: function () { open ? closePanel() : openPanel(); },
  });
})();
