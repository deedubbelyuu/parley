// Parley — UI + chat + WebRTC calling.
// Runs inside the Electron desktop app, and also in Chrome/Edge when opened from the server URL.
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const electron = window.parley || null;
  const isWeb = !electron;

  // ------------------------------------------------------------------ icons
  const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    logo: P('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-5.2A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>'),
    settings: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    logout: P('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
    chat: P('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    phone: P('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
    video: P('<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>'),
    videoOff: P('<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.7 0H14a2 2 0 0 1 2 2v3.3l1 1L23 7v10"/><path d="M1 1l22 22"/>'),
    mic: P('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>'),
    micOff: P('<path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V4a3 3 0 0 0-5.9-.6"/><path d="M17 16.9A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.1 1.2M12 19v4M8 23h8"/>'),
    screen: P('<path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"/><path d="M8 21h8M12 17v4"/><path d="M17 8l5-5M17 3h5v5"/>'),
    film: P('<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="M6.2 5.3l3.1 3.9M12.4 3.4l3.1 4M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'),
    mini: P('<path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/>'),
    expand: P('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
    backToCall: P('<path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M21 3l-9 9"/>'),
    fullscreen: P('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    fullscreenExit: P('<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>'),
    // a handset lying down: the usual "hang up" sign
    hangup: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 8.6c-3.7 0-7.2 1.2-9.6 3.3-.6.5-.7 1.4-.3 2.1l1.5 2.3c.4.6 1.2.9 1.9.6l3-1.2c.6-.2 1-.8 1-1.4v-2c.8-.3 1.6-.4 2.5-.4s1.7.1 2.5.4v2c0 .6.4 1.2 1 1.4l3 1.2c.7.3 1.5 0 1.9-.6l1.5-2.3c.4-.7.3-1.6-.3-2.1-2.4-2.1-5.9-3.3-9.6-3.3z"/></svg>',
    send: P('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>'),
    volume: P('<path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    sidebar: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
    panelLeftClose: P('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M16 15l-3-3 3-3"/>'),
    panelLeftOpen: P('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M14 9l3 3-3 3"/>'),
    panelRightClose: P('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18M8 9l3 3-3 3"/>'),
    panelRightOpen: P('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18M10 15l-3-3 3-3"/>'),
    reply: P('<path d="M9 17l-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>'),
    more: P('<circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/>'),
    smilePlus: P('<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M16 5h6M19 2v6"/>'),
    copy: P('<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
    edit: P('<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
    trash: P('<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>'),
    x: P('<path d="M18 6L6 18M6 6l12 12"/>'),
    image: P('<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
    link: P('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    chevronDown: P('<path d="M6 9l6 6 6-6"/>'),
    chevronUp: P('<path d="M18 15l-6-6-6 6"/>'),
    chevronLeft: P('<path d="M15 18l-6-6 6-6"/>'),
    chevronRight: P('<path d="M9 18l6-6-6-6"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    unread: P('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>'),
    playFill: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
    phoneMissed: P('<path d="M22 2l-6 6M16 2l6 6"/><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
    play: P('<path d="M7 4l13 8-13 8V4z" fill="currentColor"/>'),
    pause: P('<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'),
    back10: P('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">10</text>'),
    fwd10: P('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">10</text>'),
    search: P('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    download: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
    down: P('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
    paperclip: P('<path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>'),
    smile: P('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>'),
    check: P('<path d="M20 6L9 17l-5-5"/>'),
    checks: P('<path d="M18 6L7 17l-5-5M22 10l-7.5 7.5L13 16"/>'),
    clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    alert: P('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
    retry: P('<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/>'),
    folder: P('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
  };
  const icon = (name) => ICONS[name] || '';
  const paintIcons = (root = document) =>
    root.querySelectorAll('[data-icon]').forEach((el) => {
      const svg = icon(el.dataset.icon);
      if (el.tagName === 'BUTTON' && el.textContent.trim()) el.insertAdjacentHTML('afterbegin', svg);
      else el.innerHTML = svg;
    });
  const setIcon = (el, name) => {
    el.dataset.icon = name;
    el.innerHTML = icon(name);
  };

  // ------------------------------------------------------------------ helpers
  const keyOf = (n) => String(n || '').trim().toLowerCase();
  const IS_MAC = /Mac/i.test(navigator.platform || '') || electron?.platform === 'darwin';
  const KEY_MOD = IS_MAC ? '⌘' : 'Ctrl';
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem('parley:' + k);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem('parley:' + k, JSON.stringify(v));
      } catch {}
    },
    del(k) {
      try {
        localStorage.removeItem('parley:' + k);
      } catch {}
    },
  };
  const hue = (name) => {
    let h = 0;
    for (const c of keyOf(name)) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  };
  const initials = (name) =>
    String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const fmtDay = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const y = new Date(Date.now() - 864e5);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const fmtShort = (ts) => {
    const d = new Date(ts);
    if (d.toDateString() === new Date().toDateString()) return fmtTime(ts);
    if (Date.now() - ts < 6 * 864e5) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const fmtAgo = (ts) => {
    if (!ts) return 'Offline';
    const s = (Date.now() - ts) / 1000;
    if (s < 90) return 'Last seen just now';
    if (s < 3600) return `Last seen ${Math.round(s / 60)}m ago`;
    if (s < 86400) return `Last seen ${Math.round(s / 3600)}h ago`;
    return `Last seen ${fmtDay(ts)}`;
  };
  const fmtDur = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  };
  const fmtSize = (b) => {
    if (!b && b !== 0) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${Math.round(b / 1024)} KB`;
    if (b < 1073741824) return `${(b / 1048576).toFixed(b < 10485760 ? 1 : 0)} MB`;
    return `${(b / 1073741824).toFixed(1)} GB`;
  };
  let toastTimer;
  function toast(text, ms = 3500, action) {
    const t = $('#toast');
    t.textContent = text;
    if (action) {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = action.label;
      b.onclick = () => {
        t.classList.remove('show');
        action.fn();
      };
      t.append(' ', b);
    }
    t.style.pointerEvents = action ? 'auto' : '';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
  // Writes to the console and (desktop app) to parley.log — "Open log file" in Settings.
  function log(...parts) {
    const flat = parts.map((p) => (p instanceof Error ? `${p.name}: ${p.message}` : p));
    console.log('[parley]', ...flat);
    try {
      electron?.log?.(...flat.map((p) => (typeof p === 'object' ? JSON.parse(JSON.stringify(p ?? null)) : p)));
    } catch {}
  }
  const errText = (e) => (e ? `${e.name || 'Error'}${e.message ? ': ' + e.message : ''}` : 'unknown error');
  window.addEventListener('error', (e) => log('window error', e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', (e) => log('unhandled rejection', errText(e.reason)));

  // Light formatting, like Teams/Skype: *bold*, _italic_, ~strike~, `code`, ```code block```. Links are clickable.
  const INLINE_RE =
    '(https?:\\/\\/[^\\s<]+[^\\s<.,;:!?)\\]\'"])' + // link
    '|(\\x60[^\\x60\\n]+\\x60)' + // `code`
    '|((?<![\\p{L}\\p{N}*])\\*(?!\\s)[^*\\n]+?(?<!\\s)\\*(?![\\p{L}\\p{N}*]))' + // *bold*
    '|((?<![\\p{L}\\p{N}_])_(?!\\s)[^_\\n]+?(?<!\\s)_(?![\\p{L}\\p{N}_]))' + // _italic_
    '|((?<![\\p{L}\\p{N}~])~(?!\\s)[^~\\n]+?(?<!\\s)~(?![\\p{L}\\p{N}~]))'; // ~strike~
  function inlineFormat(el, text) {
    const re = new RegExp(INLINE_RE, 'gu');
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) el.append(text.slice(last, m.index));
      const tok = m[0];
      if (m[1]) {
        const a = document.createElement('a');
        a.href = tok;
        a.textContent = prettyUrl(tok);
        if (a.textContent !== tok) a.title = tok;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        el.append(a);
      } else if (m[2]) {
        const c = document.createElement('code');
        c.textContent = tok.slice(1, -1);
        el.append(c);
      } else {
        const n = document.createElement(m[3] ? 'strong' : m[4] ? 'em' : 's');
        inlineFormat(n, tok.slice(1, -1));
        el.append(n);
      }
      last = m.index + tok.length;
    }
    if (last < text.length) el.append(text.slice(last));
  }
  function formatText(el, text) {
    const parts = String(text || '').split('```');
    parts.forEach((part, i) => {
      if (i % 2 === 1 && i < parts.length - 1) {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = part.replace(/^[^\S\n]*\n/, '').replace(/\n$/, '');
        pre.append(code);
        el.append(pre);
      } else inlineFormat(el, i % 2 === 1 ? '```' + part : part);
    });
  }
  const firstUrl = (text) => (String(text || '').match(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/) || [])[0] || null;
  const fmtFull = (ts) => new Date(ts).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  function notify(title, body, peer) {
    if (Presence.manual === 'dnd') return; // Do not disturb: no pop-ups
    if (electron) return electron.notify(title, body, true, peer);
    if (!document.hidden) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, { body });
      n.onclick = () => {
        window.focus();
        if (peer) openConvo(peer);
        n.close();
      };
    }
  }

  // A message that's only 1–3 emoji is shown big, without a bubble.
  const graphemes = (s) => (Intl.Segmenter ? [...new Intl.Segmenter().segment(s)].length : [...s].length);
  function isJumbo(text) {
    const t = String(text || '').replace(/\s+/g, '');
    if (!t || t.length > 40) return false;
    if (!/\p{Extended_Pictographic}/u.test(t)) return false;
    const rest = t.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}‍️⃣]/gu, '');
    return !rest && graphemes(t) <= 3;
  }

  // ------------------------------------------------------------------ color schemes
  const G = (a, b) => `linear-gradient(135deg, ${a}, ${b})`;
  const THEMES = {
    midnight: { name: 'Midnight', dark: true, bg: '#0d131a', panel: '#141c25', panel2: '#1a2430', hover: '#1f2b3a', active: '#1c3449', line: '#233041', text: '#e8eef5', muted: '#8a9aae', accent: '#2aa8f2', accent2: '#1688cc', me: G('#2b94dc', '#1f6fa8'), them: '#202c3a' },
    light: { name: 'Daylight', dark: false, bg: '#f3f5f9', panel: '#ffffff', panel2: '#eef1f6', hover: '#e8edf4', active: '#dcecfc', line: '#e1e6ee', text: '#16202b', muted: '#667385', accent: '#1a8fe3', accent2: '#0f76c4', me: G('#2c9cf2', '#1678d0'), them: '#eceff4', themText: '#16202b', linkThem: '#0b6fc0', stage: '#0b0f14' },
    graphite: { name: 'Graphite', dark: true, bg: '#111113', panel: '#19191c', panel2: '#222226', hover: '#2a2a2f', active: '#30303a', line: '#2b2b31', text: '#ececf0', muted: '#9898a3', accent: '#8b93ff', accent2: '#6e76f0', me: G('#8b93ff', '#6a62e8'), them: '#26262b', linkThem: '#b9beff' },
    ocean: { name: 'Ocean', dark: true, bg: '#071519', panel: '#0c1f25', panel2: '#112a31', hover: '#15333b', active: '#10414a', line: '#1a3940', text: '#e2f3f3', muted: '#84a7ab', accent: '#1fc7b6', accent2: '#12a596', accentText: '#03201d', me: G('#17a99b', '#0e7a83'), them: '#15313a', linkThem: '#7ff0e4' },
    forest: { name: 'Forest', dark: true, bg: '#0b130e', panel: '#111c15', panel2: '#17261c', hover: '#1c2e22', active: '#1d3b27', line: '#22362a', text: '#e6f1e8', muted: '#8ea494', accent: '#4cc674', accent2: '#36a95c', accentText: '#05200d', me: G('#3aa862', '#23804b'), them: '#1b2c21', linkThem: '#9be8b4' },
    sunset: { name: 'Sunset', dark: true, bg: '#180f12', panel: '#211519', panel2: '#2b1b21', hover: '#342128', active: '#43232e', line: '#3a262d', text: '#f7ebe8', muted: '#b69c99', accent: '#ff7a59', accent2: '#f0603e', accentText: '#2a0c06', me: G('#f26b55', '#d6406f'), them: '#2f1f25', linkThem: '#ffb49e' },
    grape: { name: 'Grape', dark: true, bg: '#110e1b', panel: '#181427', panel2: '#201b33', hover: '#272140', active: '#2f2550', line: '#2c2645', text: '#ece8f8', muted: '#9d95bb', accent: '#a77bff', accent2: '#8f5ff5', me: G('#9c6cff', '#7346e0'), them: '#241f38', linkThem: '#cdb6ff' },
    rose: { name: 'Rose', dark: false, bg: '#fbf4f6', panel: '#ffffff', panel2: '#f8eaef', hover: '#f5e1e8', active: '#fbd9e5', line: '#f0dce3', text: '#2a1a20', muted: '#8b6d77', accent: '#e0457b', accent2: '#c9336a', me: G('#ef5a8c', '#d23c72'), them: '#f6e6ec', themText: '#2a1a20', linkThem: '#b0285a', stage: '#120a0d' },
    oled: { name: 'Black', dark: true, bg: '#000000', panel: '#0a0a0a', panel2: '#141414', hover: '#1c1c1c', active: '#10283a', line: '#1f1f1f', text: '#f2f2f2', muted: '#8a8a8a', accent: '#2aa8f2', accent2: '#1688cc', me: G('#2b94dc', '#1f6fa8'), them: '#1a1a1a', stage: '#000000' },
  };
  const themeId = () => store.get('theme', 'midnight');
  function resolveTheme(id) {
    if (id === 'auto') return matchMedia('(prefers-color-scheme: light)').matches ? THEMES.light : THEMES.midnight;
    return THEMES[id] || THEMES.midnight;
  }
  function applyTheme(id = themeId()) {
    const t = resolveTheme(id);
    const r = document.documentElement.style;
    const vars = {
      bg: t.bg, panel: t.panel, 'panel-2': t.panel2, hover: t.hover, active: t.active, line: t.line, text: t.text, muted: t.muted,
      accent: t.accent, 'accent-2': t.accent2, 'accent-text': t.accentText || '#ffffff',
      'accent-soft': `color-mix(in srgb, ${t.accent} ${t.dark ? 18 : 14}%, transparent)`,
      'bubble-me': t.me, 'bubble-me-text': t.meText || '#ffffff', 'bubble-them': t.them, 'bubble-them-text': t.themText || t.text,
      'link-me': t.linkMe || '#e6f4ff', 'link-them': t.linkThem || '#8fd2ff', stage: t.stage || '#05080b',
      shadow: t.dark ? '0 18px 50px rgba(0,0,0,.45)' : '0 14px 40px rgba(30,40,60,.16)',
    };
    for (const [k, v] of Object.entries(vars)) r.setProperty('--' + k, v);
    r.colorScheme = t.dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = id;
    electron?.setTheme?.(t.dark, t.bg);
  }
  matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => themeId() === 'auto' && applyTheme());
  applyTheme();

  // ------------------------------------------------------------------ sounds (generated, no files needed)
  // seq: [frequency, start (s), duration (s)]. env 'pluck' = fast attack + natural decay (bells, marimba).
  const Sound = {
    ctx: null,
    loop: null,
    get() {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    play(seq, gain = 0.12, wave = 'sine', env = 'flat') {
      try {
        const ctx = this.get();
        const t0 = ctx.currentTime + 0.02;
        for (const [f, start, dur] of seq) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = wave;
          o.frequency.value = f;
          const a = t0 + start;
          g.gain.setValueAtTime(0, a);
          if (env === 'pluck') {
            g.gain.linearRampToValueAtTime(gain, a + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, a + dur);
          } else {
            g.gain.linearRampToValueAtTime(gain, a + 0.02);
            g.gain.setValueAtTime(gain, a + dur - 0.04);
            g.gain.linearRampToValueAtTime(0, a + dur);
          }
          o.connect(g).connect(ctx.destination);
          o.start(a);
          o.stop(a + dur + 0.05);
        }
      } catch {}
    },
    repeat(seq, every, gain, wave, env) {
      this.stop();
      this.play(seq, gain, wave, env);
      this.loop = setInterval(() => this.play(seq, gain, wave, env), every);
    },
    stop() {
      clearInterval(this.loop);
      this.loop = null;
      Ring.stopAudio();
    },
    ring() {
      Ring.start();
    },
    ringback() {
      this.repeat([[440, 0, 1.2], [480, 0, 1.2]], 4000, 0.05);
    },
    blip() {
      if (Presence.manual === 'dnd' || !store.get('msgSound', true)) return;
      this.play([[880, 0, 0.07], [1320, 0.08, 0.12]], 0.08);
    },
    end() {
      this.play([[520, 0, 0.14], [390, 0.16, 0.24]], 0.1);
    },
  };

  // ------------------------------------------------------------------ ringtones
  const trill = (a, b, len, step = 0.05) => {
    const out = [];
    for (let t = 0, i = 0; t < len; t += step, i++) out.push([i % 2 ? b : a, t, step]);
    return out;
  };
  const RINGTONES = {
    classic: { name: 'Classic', seq: [[784, 0, 0.16], [988, 0.18, 0.16], [1175, 0.36, 0.3], [784, 0.9, 0.16], [988, 1.08, 0.16], [1175, 1.26, 0.3]], every: 3200, gain: 0.14 },
    marimba: { name: 'Marimba', seq: [[1047, 0, 0.5], [784, 0.15, 0.5], [880, 0.3, 0.5], [1319, 0.45, 0.8], [1047, 1.1, 0.5], [784, 1.25, 0.5], [880, 1.4, 0.5], [1319, 1.55, 0.9]], every: 3400, gain: 0.3, env: 'pluck' },
    chime: { name: 'Soft chime', seq: [[659, 0, 1.4], [523, 0.4, 1.4], [784, 0.8, 1.8]], every: 3600, gain: 0.22, wave: 'triangle', env: 'pluck' },
    bell: { name: 'Old phone bell', seq: [...trill(1100, 1350, 1.0, 0.045), ...trill(1100, 1350, 1.0, 0.045).map(([f, t, d]) => [f, t + 1.4, d])], every: 4200, gain: 0.07, wave: 'square' },
    digital: { name: 'Digital', seq: [[1400, 0, 0.09], [1400, 0.14, 0.09], [1400, 0.28, 0.09], [1400, 0.42, 0.09]], every: 1500, gain: 0.06, wave: 'square' },
    rise: { name: 'Rising', seq: [[523, 0, 0.16], [659, 0.17, 0.16], [784, 0.34, 0.16], [1047, 0.51, 0.4]], every: 2400, gain: 0.14, wave: 'triangle' },
    pulse: { name: 'Pulse', seq: [[660, 0, 0.35], [660, 0.5, 0.35]], every: 2000, gain: 0.12, wave: 'sine' },
  };

  // Custom ringtone files live in IndexedDB (too big for localStorage).
  const FileStore = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('parley', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => res((this.db = r.result));
        r.onerror = () => rej(r.error);
      });
    },
    async get(key) {
      const db = await this.open();
      return new Promise((res) => {
        const q = db.transaction('files').objectStore('files').get(key);
        q.onsuccess = () => res(q.result || null);
        q.onerror = () => res(null);
      });
    },
    async put(key, val) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(val, key);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
  };

  const Ring = {
    url: null,
    previewTimer: null,
    choice() {
      return store.get('ringtone', 'classic');
    },
    volume() {
      return Number(store.get('ringVolume', 0.8));
    },
    async start(preview) {
      this.stopAudio();
      clearInterval(Sound.loop);
      const id = this.choice();
      const vol = this.volume();
      if (!preview && Presence.manual === 'dnd') return; // Do not disturb: calls show, but quietly
      const spk = store.get('devices', {}).speaker;
      if (id === 'custom') {
        const f = await FileStore.get('ringtone').catch(() => null);
        if (f && f.blob) {
          if (!preview && Call.state !== 'incoming') return; // call was answered while loading
          const a = $('#ringAudio');
          if (this.url) URL.revokeObjectURL(this.url);
          this.url = URL.createObjectURL(f.blob);
          a.src = this.url;
          a.volume = Math.min(1, vol);
          a.loop = true;
          if (spk && a.setSinkId) a.setSinkId(spk).catch(() => {});
          a.play().catch((e) => log('ringtone play failed', errText(e)));
          return;
        }
      }
      const r = RINGTONES[id] || RINGTONES.classic;
      const ctx = Sound.get();
      if (spk && ctx.setSinkId) ctx.setSinkId(spk).catch(() => {});
      Sound.repeat(r.seq, r.every, r.gain * vol * 1.25, r.wave || 'sine', r.env || 'flat');
    },
    stopAudio() {
      const a = document.getElementById('ringAudio');
      if (a && !a.paused) a.pause();
      if (a) a.currentTime = 0;
    },
    preview() {
      clearTimeout(this.previewTimer);
      const playing = Sound.loop || !$('#ringAudio').paused;
      if (playing && Call.state !== 'incoming') {
        Sound.stop();
        $('#ringPreviewBtn').textContent = '▶ Preview';
        return;
      }
      this.start(true);
      $('#ringPreviewBtn').textContent = '■ Stop';
      this.previewTimer = setTimeout(() => {
        if (Call.state !== 'incoming') Sound.stop();
        $('#ringPreviewBtn').textContent = '▶ Preview';
      }, 6500);
    },
  };


  // ------------------------------------------------------------------ status (presence)
  // What others see next to your name: Online (green), Away (yellow — set by hand, or by
  // itself after 10 minutes without using the computer), In a call (red), Do not disturb (red with a bar).
  const STATUS_TEXT = { online: 'Online', away: 'Away', busy: 'In a call', dnd: 'Do not disturb', offline: 'Offline' };
  const AWAY_AFTER = 10 * 60; // seconds
  const Presence = {
    manual: store.get('manualStatus', 'auto'), // auto | away | dnd
    idle: false,
    sent: null,
    lastInput: Date.now(),
    current() {
      if (Call.state !== 'idle') return 'busy';
      if (this.manual === 'dnd') return 'dnd';
      if (this.manual === 'away' || this.idle) return 'away';
      return 'online';
    },
    push(force) {
      const st = this.current();
      this.render(st);
      if (!force && st === this.sent) return;
      if (wsSend({ type: 'status', status: st })) this.sent = st;
    },
    render(st = this.current()) {
      const t = document.getElementById('myStatusText');
      if (!t) return;
      t.textContent = STATUS_TEXT[st];
      // the colored dot is on your picture (like everyone else's); the line under your name is just the word
      const my = document.getElementById('myAvatar');
      if (my && S.me) paintAvatar(my, S.me, st);
      document.querySelectorAll('#statusMenu button').forEach((b) => b.classList.toggle('on', b.dataset.status === this.manual));
    },
    set(m) {
      this.manual = m;
      store.set('manualStatus', m);
      this.push();
    },
    async poll() {
      let idleSec = (Date.now() - this.lastInput) / 1000;
      let locked = false;
      if (electron?.systemIdle) {
        const r = await electron.systemIdle().catch(() => null);
        if (r) {
          idleSec = r.idle;
          locked = r.locked;
        }
      }
      const idle = locked || idleSec >= AWAY_AFTER;
      if (idle !== this.idle) {
        this.idle = idle;
        log('away (idle):', idle);
        if (S.signedIn) this.push();
      }
    },
    start() {
      const touch = () => {
        this.lastInput = Date.now();
        if (this.idle && !electron) this.poll();
      };
      for (const ev of ['pointerdown', 'keydown', 'wheel', 'pointermove']) window.addEventListener(ev, touch, { passive: true, capture: true });
      setInterval(() => this.poll(), 30_000);
      electron?.onPower?.((ev) => {
        if (ev === 'lock-screen' || ev === 'suspend') this.idle = true;
        else this.idle = false;
        if (S.signedIn) this.push();
        if (ev === 'unlock-screen' || ev === 'resume') this.poll();
      });
    },
  };

  // ------------------------------------------------------------------ app state
  const S = {
    serverUrl: '',
    myName: '',
    code: '',
    me: null, // confirmed name from server
    ws: null,
    signedIn: false,
    fatal: false,
    retry: 0,
    reconnectTimer: null,
    iceServers: [],
    users: new Map(), // key -> {name, online, status, lastSeen, avatarRev}
    active: null, // name of open conversation
    unread: store.get('unread', {}),
    outbox: [], // ws payloads typed while disconnected
    lastTypingSent: 0,
    typingTimer: null,
    typingFrom: null,
    limits: { maxFileMB: 100 },
    readSent: {}, // peerKey -> newest ts we told them we've read
    stick: true, // chat is scrolled to the newest message
    drafts: {}, // peerKey -> unsent text
    replyTo: null, // {id, from, text} while replying
    editing: null, // message being edited
    newFrom: null, // id of the first unread message when the conversation was opened
  };

  // ------------------------------------------------------------------ profile pictures
  // Everyone's picture is cached here (key -> {rev, data}); the server only tells us a
  // short "rev" in presence, and we ask for the image when it changes.
  const Avatars = {
    map: store.get('avatars', {}),
    asked: new Set(),
    get(name) {
      return this.map[keyOf(name)]?.data || '';
    },
    save() {
      store.set('avatars', this.map);
    },
    want(name, rev) {
      const k = keyOf(name);
      const have = this.map[k];
      if (!rev) {
        if (have) {
          delete this.map[k];
          this.save();
          repaintAvatars();
        }
        return;
      }
      if (have?.rev === rev || this.asked.has(k + rev)) return;
      this.asked.add(k + rev);
      wsSend({ type: 'get-avatar', name });
    },
    got(name, rev, data) {
      const k = keyOf(name);
      if (data && rev) this.map[k] = { rev, data };
      else delete this.map[k];
      this.save();
      repaintAvatars();
    },
  };
  function paintAvatar(el, name, status) {
    el.style.setProperty('--h', hue(name));
    const img = Avatars.get(name);
    el.classList.toggle('has-img', !!img);
    el.style.backgroundImage = img ? `url("${img}")` : '';
    el.textContent = initials(name);
    if (status) {
      const dot = document.createElement('span');
      dot.className = 'dot ' + (STATUS_TEXT[status] ? status : 'online');
      dot.title = STATUS_TEXT[status] || '';
      el.appendChild(dot);
    }
  }
  function repaintAvatars() {
    if (!S.signedIn) return;
    paintAvatar($('#myAvatar'), S.me, Presence.current());
    paintAvatar($('#settingsAvatar'), S.me);
    renderContacts();
    if (S.active) {
      renderHeader();
      MsgView.invalidate();
      renderMessages(false);
    }
    if (Call.peer) {
      const av = $('#remoteAvatar .avatar');
      if (av) paintAvatar(av, Call.peer);
    }
  }
  // Square-crop a picture to 256 px JPEG (~20–40 KB).
  async function makeAvatar(file) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(bmp.width, bmp.height);
    const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 256, 256);
    bmp.close?.();
    let q = 0.88;
    let url = c.toDataURL('image/jpeg', q);
    while (url.length > 110 * 1024 && q > 0.4) url = c.toDataURL('image/jpeg', (q -= 0.12));
    return url;
  }
  const myAvatarKey = () => `myAvatar:${keyOf(S.me)}`;
  async function setMyAvatar(file) {
    try {
      const data = file ? await makeAvatar(file) : '';
      store.set(myAvatarKey(), { data, rev: '' });
      Avatars.got(S.me, data ? 'local' : '', data);
      wsSend({ type: 'profile', avatar: data || null });
    } catch (e) {
      log('avatar failed', errText(e));
      toast('Couldn’t use that picture.');
    }
  }

  // ------------------------------------------------------------------ history
  const histKey = (peer) => `hist:${keyOf(S.me)}:${keyOf(peer)}`;
  const histCache = new Map();
  function history(peer) {
    const k = histKey(peer);
    if (!histCache.has(k)) {
      const h = store.get(k, []);
      // an upload that was cut off by closing the app
      for (const m of h) if (m.status === 'uploading') m.status = 'failed';
      histCache.set(k, h);
    }
    return histCache.get(k);
  }
  function saveHistory(peer) {
    const h = history(peer);
    if (h.length > 500) h.splice(0, h.length - 500);
    store.set(histKey(peer), h);
  }
  function addToHistory(peer, entry) {
    rememberContact(peer);
    history(peer).push(entry);
    saveHistory(peer);
    if (S.active && keyOf(S.active) === keyOf(peer)) renderMessages(entry.dir === 'out');
  }
  function findMessage(id) {
    for (const [k, h] of histCache) {
      const m = h.find((x) => x.id === id);
      if (m) return { m, k, h };
    }
    return null;
  }
  function systemLine(peer, text, extra) {
    addToHistory(peer, { id: uid(), system: true, text, ts: Date.now(), ...(extra || {}) });
    renderContacts();
  }
  const peerOf = (m) => (m.dir === 'in' ? m.from : m.to);
  const bump = (m) => (m.rev = (m.rev || 0) + 1);
  function snippetOf(m) {
    if (!m) return '';
    if (m.deleted) return 'Deleted message';
    if (m.sticker || m.file?.sticker) return 'Sticker';
    if (m.file) return m.file.kind === 'image' ? '📷 Photo' : `📎 ${m.file.name}`;
    return String(m.text || '').replace(/\s+/g, ' ').slice(0, 140);
  }
  function rememberContact(name) {
    const k = `contacts:${keyOf(S.me)}`;
    const list = store.get(k, []);
    if (!list.some((n) => keyOf(n) === keyOf(name))) {
      list.push(name);
      store.set(k, list);
    }
    if (!S.users.has(keyOf(name))) {
      S.users.set(keyOf(name), { name, online: false, status: 'offline', lastSeen: 0 });
    }
  }
  function previewOf(m) {
    if (!m) return '';
    if (m.system) return m.text;
    return (m.dir === 'out' ? 'You: ' : '') + snippetOf(m);
  }

  // ------------------------------------------------------------------ connection
  function wsUrl() {
    return S.serverUrl.replace(/^http/i, 'ws') + '/ws';
  }
  function wsSend(obj) {
    if (S.ws && S.ws.readyState === WebSocket.OPEN) {
      S.ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  function connect() {
    clearTimeout(S.reconnectTimer);
    S.fatal = false;
    let ws;
    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      loginError('That server address doesn’t look right.');
      return;
    }
    S.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', name: S.myName, code: S.code }));
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      try {
        handleServer(msg);
      } catch (err) {
        log('handler error', msg.type, errText(err), err.stack);
      }
    };
    ws.onclose = (ev) => {
      if (S.ws !== ws) return;
      if (S.fatal || ev.code === 4001 || ev.code === 4002 || ev.code === 4003) {
        if (ev.code === 4003) {
          signOut(false);
          loginError('You signed in from another window or computer.');
        }
        return;
      }
      if (!S.signedIn) {
        $('#loginBtn').disabled = false;
        loginError('Couldn’t reach the server. Check the address and that it’s running.');
        return;
      }
      $('#connBanner').classList.remove('hidden');
      const delay = Math.min(15000, 1000 * 2 ** S.retry++);
      S.reconnectTimer = setTimeout(connect, delay);
    };
  }

  function handleServer(msg) {
    switch (msg.type) {
      case 'welcome': {
        const first = !S.signedIn;
        S.me = msg.you;
        S.signedIn = true;
        S.retry = 0;
        S.iceServers = msg.iceServers || [];
        if (msg.limits) S.limits = msg.limits;
        S.readSent = store.get(`readSent:${keyOf(S.me)}`, {});
        $('#connBanner').classList.add('hidden');
        if (first) {
          store.set('login', {
            serverUrl: S.serverUrl,
            name: S.myName,
            code: S.code,
            auto: $('#autoLogin').checked,
          });
          showMain();
          electron?.configureUpdates?.(S.serverUrl, S.code);
        }
        // The server forgets pictures when it restarts; send ours again if needed.
        const mine = store.get(myAvatarKey(), null);
        if (mine?.data && mine.rev !== msg.avatarRev) wsSend({ type: 'profile', avatar: mine.data });
        else if (!mine && msg.avatarRev) Avatars.want(S.me, msg.avatarRev);
        setUsers(msg.users);
        // resend anything typed while disconnected
        for (const p of S.outbox.splice(0)) wsSend(p);
        Presence.sent = null;
        Presence.push(true);
        if (S.active) sendRead(S.active);
        break;
      }
      case 'error':
        S.fatal = true;
        $('#loginBtn').disabled = false;
        if (!S.signedIn) loginError(msg.message || 'Sign-in failed.');
        else toast(msg.message || 'Server error');
        break;
      case 'presence':
        setUsers(msg.users);
        if (Call.peer) {
          const u = S.users.get(keyOf(Call.peer));
          if (u && !u.online && Call.state !== 'active') Call.end(`${Call.peer} went offline`);
        }
        break;
      case 'profile-ok': {
        const mine = store.get(myAvatarKey(), { data: '' });
        mine.rev = msg.avatarRev || '';
        store.set(myAvatarKey(), mine);
        Avatars.got(S.me, mine.rev, mine.data);
        break;
      }
      case 'avatar':
        Avatars.got(msg.name, msg.rev, msg.data);
        break;
      case 'chat': {
        const peer = msg.from;
        const entry = { id: msg.id, from: msg.from, text: msg.file || msg.sticker ? '' : msg.text, ts: msg.ts, dir: 'in' };
        if (msg.sticker) entry.sticker = msg.sticker;
        if (msg.file) entry.file = { ...msg.file, key: `file:${msg.file.id}` };
        if (msg.reply && msg.reply.id) entry.reply = { id: String(msg.reply.id), from: String(msg.reply.from || ''), text: String(msg.reply.text || '') };
        if (history(peer).some((m) => m.id === msg.id)) break; // duplicate after reconnect
        addToHistory(peer, entry);
        if (entry.file && (entry.file.kind === 'image' || entry.file.sticker)) Files.ensure(entry);
        clearTyping();
        const viewing = isViewing(peer);
        if (!viewing) {
          S.unread[keyOf(peer)] = (S.unread[keyOf(peer)] || 0) + 1;
          store.set('unread', S.unread);
          notify(peer, previewOf(entry).slice(0, 140), peer);
          updateUnreadBadge();
        } else sendRead(peer);
        Sound.blip();
        renderContacts();
        break;
      }
      case 'chat-ack': {
        const f = findMessage(msg.id);
        if (f && f.m.status !== 'read') {
          f.m.status = msg.delivered ? 'sent' : 'queued';
          f.m.ts = msg.ts;
          store.set(f.k, f.h);
          if (S.active) renderMessages(false);
        }
        break;
      }
      case 'read': {
        const h = history(msg.from);
        let changed = false;
        for (const m of h) {
          if (m.dir === 'out' && m.ts <= msg.ts && (m.status === 'sent' || m.status === 'queued')) {
            m.status = 'read';
            changed = true;
          }
        }
        if (changed) {
          saveHistory(msg.from);
          if (S.active && keyOf(S.active) === keyOf(msg.from)) renderMessages(false);
        }
        break;
      }
      case 'react':
      case 'edit':
      case 'delete': {
        const h = history(msg.from);
        const m = h.find((x) => x.id === msg.id);
        if (!m || m.system) break;
        if (msg.type === 'react') {
          applyReaction(m, msg.from, msg.emoji, msg.on);
          if (msg.on && m.dir === 'out' && !isViewing(msg.from)) notify(msg.from, `Reacted ${msg.emoji} to “${snippetOf(m).slice(0, 60)}”`, msg.from);
        } else if (m.dir === 'in' && !m.deleted) {
          if (msg.type === 'edit') {
            m.text = String(msg.text || '');
            m.edited = msg.ts || Date.now();
          } else {
            m.deleted = true;
            m.text = '';
            delete m.reactions;
            delete m.reply;
          }
          bump(m);
        } else break;
        saveHistory(msg.from);
        if (S.active && keyOf(S.active) === keyOf(msg.from)) renderMessages(false);
        renderContacts();
        break;
      }
      case 'typing':
        if (S.active && keyOf(S.active) === keyOf(msg.from)) {
          S.typingFrom = msg.from;
          $('#typing').textContent = `${msg.from} is typing`;
          renderHeader();
          clearTimeout(S.typingTimer);
          S.typingTimer = setTimeout(clearTyping, 4000);
        }
        break;
      case 'signal':
        Call.onSignal(msg.from, msg.data || {});
        break;
      case 'signal-error':
        if (msg.data && msg.data.kind === 'invite') Call.end(`${msg.to} is offline`);
        break;
    }
  }
  function clearTyping() {
    $('#typing').textContent = '';
    if (S.typingFrom) {
      S.typingFrom = null;
      if (S.active) renderHeader();
    }
  }

  // ------------------------------------------------------------------ read receipts
  const chatVisible = () => !document.hidden && !$('#convo').classList.contains('hidden') && !($('#convo').classList.contains('in-call') && $('#convo').classList.contains('chat-hidden'));
  const isViewing = (peer) => S.active && keyOf(S.active) === keyOf(peer) && chatVisible();
  function sendRead(peer) {
    if (!peer || !isViewing(peer) || !store.get('readReceipts', true)) return;
    let newest = 0;
    for (const m of history(peer)) if (m.dir === 'in' && m.ts > newest) newest = m.ts;
    const k = keyOf(peer);
    if (!newest || newest <= (S.readSent[k] || 0)) return;
    S.readSent[k] = newest;
    store.set(`readSent:${keyOf(S.me)}`, S.readSent);
    const payload = { type: 'read', to: peer, ts: newest };
    if (!wsSend(payload)) S.outbox.push(payload);
  }
  function updateUnreadBadge() {
    const n = Object.values(S.unread).reduce((a, b) => a + (b || 0), 0);
    electron?.setUnread?.(n);
    document.title = n ? `(${n}) Parley` : 'Parley';
    renderToggles();
  }
  // The contacts button (left) and chat button (right) show what you're missing while they're closed.
  function renderToggles() {
    const sideHidden = $('#main').classList.contains('sidebar-hidden');
    // the open chat's own unread count shows on the chat button instead
    const others = Object.entries(S.unread).reduce((a, [k, v]) => a + (S.active && k === keyOf(S.active) ? 0 : v || 0), 0);
    document.querySelectorAll('.sidebar-toggle').forEach((b) => {
      const ic = b.querySelector('.ic');
      const want = sideHidden ? 'panelLeftOpen' : 'panelLeftClose';
      if (ic.dataset.icon !== want) setIcon(ic, want);
      b.title = `${sideHidden ? 'Show' : 'Hide'} contacts (${KEY_MOD}+B)`;
      const badge = b.querySelector('.btn-badge');
      badge.textContent = others > 99 ? '99+' : others;
      badge.classList.toggle('hidden', !sideHidden || !others);
    });
    const chatHidden = $('#convo').classList.contains('chat-hidden');
    const cb = $('#chatPanelBtn');
    const ic = cb.querySelector('.ic');
    const want = chatHidden ? 'panelRightOpen' : 'panelRightClose';
    if (ic.dataset.icon !== want) setIcon(ic, want);
    cb.title = `${chatHidden ? 'Show' : 'Hide'} chat (${KEY_MOD}+Shift+C)`;
    const mine = (S.active && S.unread[keyOf(S.active)]) || 0;
    const badge = cb.querySelector('.btn-badge');
    badge.textContent = mine > 99 ? '99+' : mine;
    badge.classList.toggle('hidden', !chatHidden || !mine);
  }

  // ------------------------------------------------------------------ login / main
  function loginError(t) {
    $('#loginError').textContent = t || '';
  }
  function normalizeUrl(u) {
    u = String(u || '').trim().replace(/\/+$/, '');
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = (/^(localhost|127\.|192\.168\.|10\.)/.test(u) ? 'http://' : 'https://') + u;
    return u;
  }
  function initLogin() {
    if (isWeb) $('#serverField').classList.add('hidden');
    const saved = store.get('login', {});
    $('#serverUrl').value = saved.serverUrl || '';
    $('#displayName').value = saved.name || '';
    $('#accessCode').value = saved.code || '';
    $('#autoLogin').checked = saved.auto !== false;

    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      loginError('');
      S.serverUrl = isWeb ? location.origin : normalizeUrl($('#serverUrl').value);
      S.myName = $('#displayName').value.trim();
      S.code = $('#accessCode').value.trim();
      if (!S.serverUrl) return loginError('Enter your server address.');
      if (S.myName.length < 2) return loginError('Name must be at least 2 characters.');
      $('#loginBtn').disabled = true;
      Sound.get(); // unlock audio with this click
      if ('Notification' in window && isWeb && Notification.permission === 'default') Notification.requestPermission();
      connect();
    });

    if (saved.auto && saved.name && (saved.serverUrl || isWeb)) {
      $('#loginForm').requestSubmit();
    }
  }
  function showMain() {
    $('#login').classList.add('hidden');
    $('#main').classList.remove('hidden');
    $('#loginBtn').disabled = false;
    $('#myName').textContent = S.me;
    const mine = store.get(myAvatarKey(), null);
    if (mine?.data) Avatars.map[keyOf(S.me)] = { rev: mine.rev || 'local', data: mine.data };
    S.drafts = store.get(`drafts:${keyOf(S.me)}`, {});
    Presence.render();
    $('#accountText').textContent = `Signed in as ${S.me}${isWeb ? '' : ' · ' + S.serverUrl.replace(/^https?:\/\//, '')}`;
    for (const n of store.get(`contacts:${keyOf(S.me)}`, [])) rememberContact(n);
    renderContacts();
    updateUnreadBadge();
    const last = store.get(`lastActive:${keyOf(S.me)}`);
    if (last) openConvo(last);
  }
  function signOut(clearAuto = true) {
    if (Call.state !== 'idle') Call.hangup();
    S.signedIn = false;
    S.fatal = true;
    const ws = S.ws;
    S.ws = null;
    if (ws) ws.close();
    clearTimeout(S.reconnectTimer);
    if (clearAuto) {
      const saved = store.get('login', {});
      saved.auto = false;
      store.set('login', saved);
      $('#autoLogin').checked = false;
    }
    S.users.clear();
    histCache.clear();
    MsgView.invalidate();
    S.active = null;
    $('#main').classList.add('hidden');
    $('#login').classList.remove('hidden');
  }

  // ------------------------------------------------------------------ contacts
  function setUsers(list) {
    for (const u of list || []) {
      if (keyOf(u.name) === keyOf(S.me)) continue;
      S.users.set(keyOf(u.name), u);
      rememberContact(u.name);
      Avatars.want(u.name, u.avatarRev);
    }
    renderContacts();
    if (S.active) renderHeader();
  }
  function statusText(u) {
    if (!u) return '';
    if (u.online) return STATUS_TEXT[u.status] || 'Online';
    return fmtAgo(u.lastSeen);
  }
  function lastOf(name) {
    const h = history(name);
    return h.length ? h[h.length - 1] : null;
  }
  function renderContacts() {
    const q = keyOf($('#search').value);
    const ul = $('#contacts');
    ul.innerHTML = '';
    const list = [...S.users.values()]
      .filter((u) => keyOf(u.name) !== keyOf(S.me) && (!q || keyOf(u.name).includes(q)))
      .map((u) => ({ u, last: lastOf(u.name) }))
      .sort(
        (a, b) =>
          (S.unread[keyOf(b.u.name)] ? 1 : 0) - (S.unread[keyOf(a.u.name)] ? 1 : 0) ||
          (b.last?.ts || 0) - (a.last?.ts || 0) ||
          b.u.online - a.u.online ||
          a.u.name.localeCompare(b.u.name)
      );
    for (const { u, last } of list) {
      const li = document.createElement('li');
      const n = S.unread[keyOf(u.name)];
      if (S.active && keyOf(S.active) === keyOf(u.name)) li.classList.add('active');
      if (n) li.classList.add('unread');
      const av = document.createElement('div');
      av.className = 'avatar';
      paintAvatar(av, u.name, u.online ? u.status : 'offline');
      const tx = document.createElement('div');
      tx.className = 'c-text';
      const top = document.createElement('div');
      top.className = 'c-top';
      const nm = document.createElement('div');
      nm.className = 'c-name';
      nm.textContent = u.name;
      top.append(nm);
      if (last) {
        const tm = document.createElement('span');
        tm.className = 'c-time';
        tm.textContent = fmtShort(last.ts);
        top.append(tm);
      }
      const bottom = document.createElement('div');
      bottom.className = 'c-bottom';
      const st = document.createElement('div');
      st.className = 'c-preview';
      st.textContent = last ? previewOf(last) : statusText(u);
      bottom.append(st);
      if (n) {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = n > 99 ? '99+' : n;
        bottom.append(b);
      }
      tx.append(top, bottom);
      li.append(av, tx);
      li.title = `${u.name} · ${statusText(u)}`;
      li.addEventListener('click', () => openConvo(u.name));
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const canCall = u.online && Call.state === 'idle';
        Menu.show(e.clientX, e.clientY, [
          { icon: 'chat', label: 'Open chat', action: () => openConvo(u.name) },
          { icon: 'video', label: 'Video call', disabled: !canCall, action: () => Call.start(u.name, true) },
          { icon: 'phone', label: 'Voice call', disabled: !canCall, action: () => Call.start(u.name, false) },
          '-',
          n
            ? { icon: 'check', label: 'Mark as read', action: () => markUnread(u.name, false) }
            : { icon: 'unread', label: 'Mark as unread', action: () => markUnread(u.name, true) },
        ]);
      });
      ul.append(li);
    }
  }

  function markUnread(name, on) {
    if (on) {
      S.unread[keyOf(name)] = Math.max(1, S.unread[keyOf(name)] || 0);
      if (S.active && keyOf(S.active) === keyOf(name)) {
        S.active = null;
        $('#convo').classList.add('hidden');
        $('#empty').classList.remove('hidden');
        if (Call.state !== 'idle') openConvo(Call.peer);
      }
    } else delete S.unread[keyOf(name)];
    store.set('unread', S.unread);
    updateUnreadBadge();
    renderContacts();
  }
  function saveDraft() {
    if (!S.active || S.editing) return;
    const k = keyOf(S.active);
    const v = $('#msgInput').value;
    if (v.trim()) S.drafts[k] = v;
    else delete S.drafts[k];
    store.set(`drafts:${keyOf(S.me)}`, S.drafts);
  }

  // ------------------------------------------------------------------ conversation
  function openConvo(name) {
    const changed = !S.active || keyOf(S.active) !== keyOf(name);
    if (changed) {
      cancelCompose(true);
      saveDraft();
      // where the unread messages start, for the "New messages" line
      const n = S.unread[keyOf(name)] || 0;
      const ins = history(name).filter((m) => m.dir === 'in' && !m.system);
      S.newFrom = n ? ins[Math.max(0, ins.length - n)]?.id || null : null;
    }
    S.active = name;
    store.set(`lastActive:${keyOf(S.me)}`, name);
    delete S.unread[keyOf(name)];
    store.set('unread', S.unread);
    updateUnreadBadge();
    $('#empty').classList.add('hidden');
    $('#convo').classList.remove('hidden');
    if (changed) {
      clearTyping();
      MsgView.invalidate();
      Picker.close();
      if (Find.isOpen()) Find.close();
      $('#msgInput').value = S.drafts[keyOf(name)] || '';
      autoGrow();
      Tray.render();
    }
    renderHeader();
    renderContacts();
    renderMessages(true);
    sendRead(name);
    if (Call.state === 'idle') $('#msgInput').focus();
  }
  function renderHeader() {
    const u = S.users.get(keyOf(S.active)) || { name: S.active, online: false };
    $('#peerName').textContent = u.name;
    const ps = $('#peerStatus');
    const typing = S.typingFrom && keyOf(S.typingFrom) === keyOf(S.active);
    ps.textContent = typing ? 'typing…' : statusText(u);
    ps.classList.toggle('typing-now', !!typing);
    paintAvatar($('#peerAvatar'), u.name, u.online ? u.status : 'offline');
    const canCall = u.online && Call.state === 'idle';
    $('#audioCallBtn').disabled = !canCall;
    $('#videoCallBtn').disabled = !canCall;
  }

  // ---- message list
  // Messages are rendered from history; each message's DOM node is reused while it hasn't
  // changed (so photos don't flicker or reload). The list sticks to the bottom: new
  // messages, photos finishing loading, the window resizing — all keep you at the newest
  // message unless you've scrolled up, in which case a "New messages" pill appears.
  const MsgView = {
    nodes: new Map(), // id -> {sig, node}
    invalidate() {
      this.nodes.clear();
    },
  };
  const box = () => $('#messages');
  function atBottom() {
    const b = box();
    return b.scrollHeight - b.scrollTop - b.clientHeight < 60;
  }
  function scrollToBottom() {
    const b = box();
    const before = b.scrollTop;
    b.scrollTop = b.scrollHeight;
    // The scroll event for this arrives a frame later. If a photo or link card has grown
    // the list by then, we're no longer at the bottom, and the handler would wrongly read
    // that as "you scrolled up" and stop following the chat. Mark it as ours.
    if (b.scrollTop !== before) S.autoScroll = true;
    S.stick = true;
    $('#jumpBtn').classList.add('hidden');
  }
  // While you're reading further up, keep the message at the top of the view exactly where
  // it is when things above it change height (a card or photo loading, a reaction row).
  const Anchor = {
    id: null,
    off: 0,
    capture() {
      const b = box();
      const top = b.getBoundingClientRect().top;
      this.id = null;
      // the first message that starts inside the view (not one cut off at the top edge:
      // if that one grew, everything you're reading below it would still move)
      let fallback = null;
      for (const n of $('#msgList').children) {
        if (!n.dataset.id) continue;
        const r = n.getBoundingClientRect();
        if (r.bottom <= top + 1) continue;
        fallback ||= [n, r];
        if (r.top >= top - 1) {
          fallback = [n, r];
          break;
        }
      }
      if (fallback) {
        this.id = fallback[0].dataset.id;
        this.off = fallback[1].top - top;
      }
    },
    restore() {
      if (!this.id) return;
      const n = document.querySelector(`#msgList .msg[data-id="${CSS.escape(this.id)}"]`);
      if (!n) return;
      const b = box();
      const d = n.getBoundingClientRect().top - b.getBoundingClientRect().top - this.off;
      if (Math.abs(d) >= 1) b.scrollTop += d;
    },
  };
  const GROUP_MS = 3 * 60 * 1000;
  function renderMessages(forceBottom) {
    if (!S.active) return;
    const list = $('#msgList');
    const h = history(S.active);
    const wasStuck = S.stick || forceBottom;
    if (!wasStuck) Anchor.capture(); // before anything below touches nodes that are on screen
    const prevCount = list.querySelectorAll('.msg.in').length;
    // newest outgoing message the other person has seen
    let seenId = null;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].dir === 'out' && h[i].status === 'read') {
        seenId = h[i].id;
        break;
      }
    }
    const out = [];
    let lastDay = '';
    for (let i = 0; i < h.length; i++) {
      const m = h[i];
      const day = fmtDay(m.ts);
      if (day !== lastDay) {
        const d = document.createElement('div');
        d.className = 'day';
        d.textContent = day;
        out.push(d);
        lastDay = day;
      }
      if (m.id === S.newFrom) {
        const d = document.createElement('div');
        d.className = 'new-divider';
        d.textContent = 'New messages';
        out.push(d);
      }
      if (m.system) {
        out.push(buildSystem(m));
        continue;
      }
      const prev = h[i - 1];
      const next = h[i + 1];
      const same = (a, b) => a && b && !a.system && !b.system && a.dir === b.dir && Math.abs(a.ts - b.ts) < GROUP_MS && fmtDay(a.ts) === fmtDay(b.ts);
      const first = !same(prev, m);
      const last = !same(m, next);
      const seen = m.id === seenId;
      const f = m.file;
      const sig = [m.status, first, last, seen, f?.id, f?.gone, f?.saved, m.failed, m.rev || 0, Avatars.get(m.dir === 'in' ? S.active : '').length].join('|');
      const rx = m.deleted ? '' : JSON.stringify(m.reactions || {});
      let cached = MsgView.nodes.get(m.id);
      if (!cached || cached.sig !== sig) {
        cached = { sig, rx, node: buildMessage(m, { first, last, seen }) };
        MsgView.nodes.set(m.id, cached);
      } else if (cached.rx !== rx) {
        patchReactions(cached.node, m);
        cached.rx = rx;
      }
      out.push(cached.node);
    }
    list.replaceChildren(...out);
    if (Find.isOpen()) Find.paint();
    const newIn = list.querySelectorAll('.msg.in').length > prevCount && prevCount > 0;
    if (wasStuck) scrollToBottom();
    else Anchor.restore();
    if (!wasStuck && newIn) {
      $('#jumpText').textContent = 'New messages';
      $('#jumpBtn').classList.remove('hidden');
    }
  }

  function tickFor(m) {
    const t = document.createElement('span');
    t.className = 'tick';
    const map = { sending: ['clock', 'Sending…'], uploading: ['clock', 'Uploading…'], queued: ['check', 'Sent — they’ll get it when they come online'], sent: ['checks', 'Delivered'], read: ['checks', 'Seen'] };
    const [ic, title] = map[m.status] || map.sent;
    t.innerHTML = icon(ic);
    t.title = title;
    if (m.status === 'read') t.classList.add('read');
    return t;
  }

  function buildSystem(m) {
    const s = document.createElement('div');
    s.className = 'sys' + (m.missed ? ' missed' : '');
    if (m.missed) s.insertAdjacentHTML('beforeend', icon('phoneMissed'));
    s.append(`${m.text} · ${fmtTime(m.ts)}`);
    if (m.callback && S.active) {
      const u = S.users.get(keyOf(S.active));
      if (u?.online) {
        const b = document.createElement('button');
        b.textContent = m.missed ? 'Call back' : 'Call again';
        b.onclick = () => Call.start(S.active, m.video !== false);
        b.disabled = Call.state !== 'idle';
        s.append(b);
      }
    }
    return s;
  }

  const QUICK = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  function buildMessage(m, { first, last, seen }) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${m.dir === 'in' ? 'in' : 'out'}${first ? ' first' : ''}${last ? ' last has-meta' : ''}`;
    wrap.dataset.id = m.id;
    wrap.title = fmtFull(m.ts);
    if (m.dir === 'in') {
      const av = document.createElement('div');
      av.className = 'avatar mini-avatar';
      paintAvatar(av, m.from || S.active);
      wrap.append(av);
    }
    if (m.reply && !m.deleted) wrap.append(quoteEl(m.reply));
    const f = m.file;
    if (m.deleted) {
      const b = document.createElement('div');
      b.className = 'bubble deleted';
      b.textContent = m.dir === 'out' ? 'You deleted this message' : 'This message was deleted';
      wrap.append(b);
    } else if (m.sticker) {
      const st = (window.PARLEY_STICKERS || []).find((s) => s.id === m.sticker);
      const img = document.createElement('img');
      img.className = 'sticker';
      img.alt = st ? st.name : 'Sticker';
      img.src = st ? st.src : '';
      wrap.append(img);
    } else if (f && (f.kind === 'image' || f.sticker)) {
      const pw = document.createElement('div');
      pw.className = 'photo-wrap';
      pw.append(Files.photo(m));
      if (!f.sticker && !f.gone && m.status !== 'uploading') {
        const tools = document.createElement('div');
        tools.className = 'photo-tools';
        const sv = document.createElement('button');
        sv.title = electron ? 'Save to Downloads' : 'Download';
        sv.innerHTML = icon('download');
        sv.onclick = (e) => {
          e.stopPropagation();
          Files.saveImage(m, 'downloads');
        };
        tools.append(sv);
        pw.append(tools);
      }
      wrap.append(pw);
    } else if (f) {
      wrap.append(Files.card(m));
    } else {
      const b = document.createElement('div');
      b.className = 'bubble';
      if (isJumbo(m.text)) {
        b.classList.add('jumbo');
        b.textContent = m.text.trim();
      } else formatText(b, m.text || '');
      wrap.append(b);
      const url = Previews.enabled() && firstUrl(m.text);
      if (url) Previews.attach(b, url); // inside the bubble, under the text, like Teams
    }
    const rx = !m.deleted && reactionsEl(m);
    if (rx) wrap.append(rx);
    if (last || m.edited) {
      const meta = document.createElement('div');
      meta.className = 'meta';
      if (m.status === 'failed') {
        meta.innerHTML = `<span class="tick">${icon('alert')}</span>`;
        const r = document.createElement('button');
        r.className = 'btn small';
        r.textContent = 'Not sent · Retry';
        r.onclick = () => Files.retry(m);
        meta.append(r);
      } else {
        if (m.edited && !m.deleted) {
          const e = document.createElement('span');
          e.className = 'edited';
          e.textContent = 'Edited';
          e.title = `Edited ${fmtFull(m.edited)}`;
          meta.append(e, last ? ' · ' : '');
        }
        if (last) meta.append(fmtTime(m.ts));
        if (last && m.dir === 'out') meta.append(tickFor(m));
      }
      wrap.append(meta);
    }
    if (seen) {
      const s = document.createElement('div');
      s.className = 'seen';
      s.textContent = 'Seen';
      wrap.append(s);
    }
    if (!m.deleted && m.status !== 'uploading') wrap.append(actionsBar(m));
    wrap.addEventListener('contextmenu', (e) => {
      if (m.deleted || window.getSelection().toString()) return; // keep the normal Copy menu for selected text
      e.preventDefault();
      showMessageMenu(m, e.clientX, e.clientY, wrap);
    });
    return wrap;
  }

  function quoteEl(r) {
    const q = document.createElement('div');
    q.className = 'quote';
    q.title = 'Go to message';
    const b = document.createElement('b');
    b.textContent = keyOf(r.from) === keyOf(S.me) ? 'You' : r.from;
    const t = document.createElement('span');
    t.textContent = r.text || 'Message';
    q.append(b, t);
    q.onclick = () => jumpTo(r.id);
    return q;
  }
  function jumpTo(id) {
    const node = document.querySelector(`#msgList .msg[data-id="${CSS.escape(id)}"]`);
    if (!node) return toast('That message isn’t in this chat any more.');
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    S.stick = false;
    node.classList.remove('flash');
    void node.offsetWidth;
    node.classList.add('flash');
    setTimeout(() => node.classList.remove('flash'), 1500);
  }

  function reactionsEl(m) {
    const r = m.reactions || {};
    const keys = Object.keys(r).filter((k) => r[k]?.length);
    if (!keys.length) return null;
    const row = document.createElement('div');
    row.className = 'reactions';
    for (const k of keys) {
      const names = r[k];
      const mine = names.some((n) => keyOf(n) === keyOf(S.me));
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'reaction' + (mine ? ' mine' : '');
      chip.innerHTML = '<span class="e"></span><span class="n"></span>';
      chip.querySelector('.e').textContent = k;
      chip.querySelector('.n').textContent = names.length;
      chip.title = names.map((n) => (keyOf(n) === keyOf(S.me) ? 'You' : n)).join(', ') + (mine ? ' · click to remove' : '');
      chip.onclick = () => react(m, k);
      row.append(chip);
    }
    return row;
  }
  function applyReaction(m, who, emoji, on) {
    const r = (m.reactions ||= {});
    const list = (r[emoji] || []).filter((n) => keyOf(n) !== keyOf(who));
    if (on) list.push(who);
    if (list.length) r[emoji] = list;
    else delete r[emoji];
    // no bump(m): renderMessages swaps just the reaction row in place, so the message
    // (and its photo or link card) isn't rebuilt and nothing around it moves
  }
  function patchReactions(node, m) {
    node.querySelector(':scope > .reactions')?.remove();
    const rx = !m.deleted && reactionsEl(m);
    if (rx) node.insertBefore(rx, node.querySelector(':scope > .meta, :scope > .seen, :scope > .msg-actions'));
  }
  function relay(payload) {
    if (!wsSend(payload)) S.outbox.push(payload);
  }
  function react(m, emoji) {
    const peer = peerOf(m);
    const mine = (m.reactions?.[emoji] || []).some((n) => keyOf(n) === keyOf(S.me));
    applyReaction(m, S.me, emoji, !mine);
    saveHistory(peer);
    renderMessages(false);
    relay({ type: 'react', to: peer, id: m.id, emoji, on: !mine });
  }

  function actionsBar(m) {
    const bar = document.createElement('div');
    bar.className = 'msg-actions';
    const btn = (cls, html, title, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      if (cls === 'emo') b.textContent = html;
      else b.innerHTML = html;
      b.title = title;
      b.onclick = (e) => {
        e.stopPropagation();
        fn(b);
      };
      bar.append(b);
      return b;
    };
    for (const e of QUICK.slice(0, 5)) btn('emo', e, `React ${e}`, () => react(m, e));
    btn('', icon('smilePlus'), 'More reactions', (b) => Picker.openFor(b, (e) => react(m, e)));
    const sep = document.createElement('span');
    sep.className = 'sep';
    bar.append(sep);
    btn('', icon('reply'), 'Reply', () => startReply(m));
    btn('', icon('more'), 'More', (b) => {
      const r = b.getBoundingClientRect();
      showMessageMenu(m, r.left, r.bottom + 4, bar.parentElement);
    });
    return bar;
  }

  function showMessageMenu(m, x, y, node) {
    const mine = m.dir === 'out';
    const f = m.file;
    const img = f && f.kind === 'image' && !f.sticker && !f.gone;
    const url = !f && firstUrl(m.text);
    const items = [{ reactRow: (e) => react(m, e), more: (anchor) => Picker.openFor(anchor, (e) => react(m, e)) }, '-'];
    items.push({ icon: 'reply', label: 'Reply', action: () => startReply(m) });
    if (!f && !m.sticker && m.text) items.push({ icon: 'copy', label: 'Copy text', action: () => copyText(m.text) });
    if (url) items.push({ icon: 'link', label: 'Copy link', action: () => copyText(url) });
    if (img) {
      items.push('-');
      items.push({ icon: 'download', label: electron ? 'Save image' : 'Download image', action: () => Files.saveImage(m, 'downloads') });
      if (electron) items.push({ icon: 'folder', label: 'Save image as…', action: () => Files.saveImage(m, 'as') });
      items.push({ icon: 'copy', label: 'Copy image', action: () => Files.saveImage(m, 'copy') });
    } else if (f && !f.sticker && !f.gone) {
      items.push({ icon: 'download', label: electron ? 'Save to Downloads' : 'Download', action: () => Files.download(m) });
      if (electron) items.push({ icon: 'folder', label: 'Save as…', action: () => Files.download(m, 'as') });
    }
    if (mine && !f && !m.sticker) items.push('-', { icon: 'edit', label: 'Edit', kbd: '↑', action: () => startEdit(m) });
    if (mine) {
      if (f || m.sticker) items.push('-');
      items.push({
        icon: 'trash',
        label: 'Delete',
        danger: true,
        action: () =>
          Menu.show(x, y, [
            { icon: 'trash', label: 'Delete for everyone', danger: true, action: () => deleteMessage(m) },
            { icon: 'x', label: 'Cancel', action: () => {} },
          ]),
      });
    }
    node?.classList.add('menu-open');
    Menu.show(x, y, items, () => node?.classList.remove('menu-open'));
  }
  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
      toast('Copied', 1500);
    } catch {
      toast('Couldn’t copy.');
    }
  }

  // ---- search in this chat (Ctrl+F)
  const Find = {
    hits: [],
    i: -1,
    isOpen() {
      return !$('#findBar').classList.contains('hidden');
    },
    open() {
      $('#findBar').classList.remove('hidden');
      $('#findInput').focus();
      $('#findInput').select();
      this.run();
    },
    close() {
      $('#findBar').classList.add('hidden');
      $('#findInput').value = '';
      this.hits = [];
      this.i = -1;
      this.paint();
    },
    run() {
      const q = $('#findInput').value.trim().toLowerCase();
      this.hits =
        !q || !S.active
          ? []
          : history(S.active)
              .filter((m) => !m.system && !m.deleted && `${m.text || ''} ${m.file?.name || ''}`.toLowerCase().includes(q))
              .map((m) => m.id);
      this.i = this.hits.length - 1; // start at the newest
      this.paint();
      this.go();
    },
    step(d) {
      if (!this.hits.length) return;
      this.i = (this.i + d + this.hits.length) % this.hits.length;
      this.paint();
      this.go();
    },
    go() {
      const id = this.hits[this.i];
      const node = id && document.querySelector(`#msgList .msg[data-id="${CSS.escape(id)}"]`);
      if (!node) return;
      S.stick = false;
      node.scrollIntoView({ block: 'center' });
    },
    paint() {
      document.querySelectorAll('#msgList .msg.hit').forEach((n) => n.classList.remove('hit', 'hit-current'));
      this.hits.forEach((id, k) => {
        const n = document.querySelector(`#msgList .msg[data-id="${CSS.escape(id)}"]`);
        if (n) n.classList.add('hit', ...(k === this.i ? ['hit-current'] : []));
      });
      const q = $('#findInput').value.trim();
      $('#findCount').textContent = !q ? '' : this.hits.length ? `${this.i + 1} of ${this.hits.length}` : 'No matches';
    },
  };

  // ---- replying, editing, deleting
  function showBanner(kind, title, sub) {
    setIcon($('#composeIcon'), kind === 'edit' ? 'edit' : 'reply');
    $('#composeTitle').textContent = title;
    $('#composeSub').textContent = sub || '';
    $('#composeBanner').classList.remove('hidden');
    $('#composeBanner').dataset.kind = kind;
  }
  function cancelCompose(silent) {
    if (S.editing) {
      $('#msgInput').value = S.preEdit || '';
      if (!silent) autoGrow();
    }
    S.editing = null;
    S.replyTo = null;
    S.preEdit = '';
    $('#composeBanner').classList.add('hidden');
  }
  function startReply(m) {
    if (S.editing) cancelCompose();
    const from = m.dir === 'in' ? m.from || S.active : S.me;
    S.replyTo = { id: m.id, from, text: snippetOf(m) };
    showBanner('reply', `Replying to ${m.dir === 'in' ? from : 'yourself'}`, snippetOf(m));
    if (!chatVisible() && Call.state !== 'idle') setChatHidden(false);
    $('#msgInput').focus();
  }
  function startEdit(m) {
    if (!m || m.dir !== 'out' || m.file || m.sticker || m.deleted) return;
    if (!S.editing) S.preEdit = $('#msgInput').value;
    S.replyTo = null;
    S.editing = m;
    const t = $('#msgInput');
    t.value = m.text;
    autoGrow();
    showBanner('edit', 'Editing message', 'Enter to save · Esc to cancel');
    t.focus();
    t.selectionStart = t.selectionEnd = t.value.length;
  }
  function finishEdit(text) {
    const m = S.editing;
    if (!m) return;
    if (!text.trim()) return toast('A message can’t be empty — use Delete instead.');
    if (text !== m.text) {
      m.text = text;
      m.edited = Date.now();
      bump(m);
      saveHistory(m.to);
      relay({ type: 'edit', to: m.to, id: m.id, text });
    }
    cancelCompose();
    renderMessages(false);
    renderContacts();
  }
  function deleteMessage(m) {
    if (S.editing === m) cancelCompose();
    m.deleted = true;
    m.text = '';
    delete m.reactions;
    delete m.reply;
    bump(m);
    saveHistory(m.to);
    renderMessages(false);
    renderContacts();
    relay({ type: 'delete', to: m.to, id: m.id });
  }
  function lastOwnText() {
    const h = history(S.active);
    for (let i = h.length - 1; i >= Math.max(0, h.length - 60); i--) {
      const m = h[i];
      if (m.dir === 'out' && !m.file && !m.sticker && !m.deleted && !m.system) return m;
    }
    return null;
  }

  // ---- link previews (the server fetches the page; we cache the card on this computer)
  const Previews = {
    mem: new Map(),
    enabled() {
      return store.get('linkPreviews', true);
    },
    get(url) {
      if (this.mem.has(url)) return this.mem.get(url);
      const job = (async () => {
        const cached = await FileStore.get('lp:' + url).catch(() => null);
        if (cached && cached.at && Date.now() - cached.at < 7 * 864e5) return cached.data;
        const miss = store.get('lpMiss', {});
        if (miss[url] && Date.now() - miss[url] < 864e5) return null;
        try {
          const r = await fetch(`${S.serverUrl}/preview?url=${encodeURIComponent(url)}`, { headers: Files.headers() });
          if (r.ok) {
            const data = await r.json();
            if (data && data.title) {
              FileStore.put('lp:' + url, { at: Date.now(), data }).catch(() => {});
              return data;
            }
          }
          if (r.status === 404 || r.status === 400 || r.ok) {
            const keep = Object.entries(miss).filter(([, t]) => Date.now() - t < 864e5).slice(-200);
            store.set('lpMiss', Object.fromEntries([...keep, [url, Date.now()]]));
          }
        } catch {}
        return null;
      })();
      this.mem.set(url, job);
      job.then((d) => this.done.set(url, d));
      return job;
    },
    done: new Map(), // url -> data (or null) once known, so rebuilt messages get their card at once
    attach(wrap, url) {
      if (this.done.has(url)) {
        const d = this.done.get(url);
        if (d) wrap.append(this.card(d, url));
        return;
      }
      const slot = document.createElement('div');
      slot.className = 'lp-slot';
      wrap.append(slot);
      this.get(url).then((d) => {
        if (d && slot.isConnected !== undefined) slot.replaceWith(this.card(d, url));
        else slot.remove();
      });
    },
    // Teams-style card inside the message bubble: a fixed-size thumbnail on the left,
    // then title (the link), channel or description, and the site at the bottom.
    card(d, url) {
      const video = d.kind === 'video';
      const a = document.createElement('a');
      a.className = 'lp' + (video ? ' video' : '');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = url;
      if (d.image && /^data:image\//.test(d.image)) {
        const im = document.createElement('div');
        im.className = 'lp-img';
        im.style.backgroundImage = `url("${d.image}")`;
        if (video) im.insertAdjacentHTML('beforeend', `<span class="lp-play">${icon('playFill')}</span>`);
        else if (d._small !== undefined) a.classList.toggle('small', d._small);
        else {
          // small, square-ish pictures (logos, icons) are shown whole in a square instead of cropped
          const probe = new Image();
          probe.onload = () => {
            d._small = probe.naturalWidth < 360 || probe.naturalWidth / probe.naturalHeight < 1.3;
            a.classList.toggle('small', d._small);
          };
          probe.src = d.image;
        }
        a.append(im);
      } else a.classList.add('no-img');
      const body = document.createElement('div');
      body.className = 'lp-body';
      const author = d.author || (video ? d.description : '');
      const sub = video ? author : d.description;
      for (const [cls, text] of [['lp-title', d.title], ['lp-desc', sub]]) {
        if (!text) continue;
        const e = document.createElement('div');
        e.className = cls;
        e.textContent = text;
        body.append(e);
      }
      const site = document.createElement('div');
      site.className = 'lp-site';
      site.innerHTML = icon(video ? 'video' : 'link');
      site.append(d.site || d.domain || hostOf(url));
      body.append(site);
      a.append(body);
      return a;
    },
  };
  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
  // Long links read badly in a bubble ("https://www.youtube.com/watch?v=…&si=…&pp=…"), so the
  // text shows a tidy version; the link itself (and its tooltip) is the full address.
  function prettyUrl(url) {
    let u;
    try {
      u = new URL(url);
    } catch {
      return url;
    }
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname)) for (const k of ['si', 'feature', 'pp', 'ab_channel', 'embeds_referring_euri']) u.searchParams.delete(k);
    let t = u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname) + u.search + u.hash;
    t = t.replace(/\/$/, '');
    if (url.length <= 48) return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return t.length > 52 ? t.slice(0, 36) + '…' + t.slice(-12) : t;
  }

  function sendPayload(m, extra) {
    const payload = { type: 'chat', to: m.to, id: m.id, text: m.text || '', ...(m.reply ? { reply: m.reply } : {}), ...extra };
    if (!wsSend(payload)) S.outbox.push(payload);
  }
  async function sendChat() {
    const input = $('#msgInput');
    const text = input.value.replace(/\s+$/, '');
    if (S.editing) return finishEdit(text);
    if (!S.active) return;
    const to = S.active;
    const items = Tray.take(to);
    if (!text.trim() && !items.length) return;
    let reply = S.replyTo;
    input.value = '';
    autoGrow();
    cancelCompose();
    Picker.close();
    delete S.drafts[keyOf(to)];
    store.set(`drafts:${keyOf(S.me)}`, S.drafts);
    S.newFrom = null;
    // photos/files first (in the order you added them), then the text. The text waits until the
    // uploads are done so your friend gets them in the same order.
    const uploads = [];
    for (const it of items) {
      uploads.push(await Files.send(it.file, { to, reply: text.trim() ? null : reply }));
      if (!text.trim()) reply = null;
      if (it.url) setTimeout(() => URL.revokeObjectURL(it.url), 60000);
    }
    if (text.trim()) {
      const m = { id: uid(), from: S.me, to, text, ts: Date.now(), dir: 'out', status: 'sending', ...(reply ? { reply } : {}) };
      addToHistory(to, m);
      if (uploads.length) await Promise.allSettled(uploads);
      sendPayload(m);
    }
    renderContacts();
  }
  function sendSticker(id) {
    if (!S.active) return;
    const st = (window.PARLEY_STICKERS || []).find((s) => s.id === id);
    const m = { id: uid(), from: S.me, to: S.active, text: '', sticker: id, ts: Date.now(), dir: 'out', status: 'sending' };
    addToHistory(S.active, m);
    sendPayload(m, { text: `[${st ? st.name : 'Sticker'} sticker]`, sticker: id });
    renderContacts();
  }
  function autoGrow() {
    const t = $('#msgInput');
    t.style.height = 'auto';
    t.style.height = Math.min(140, t.scrollHeight) + 'px';
  }

  // ------------------------------------------------------------------ photos & files
  // Upload: the file goes to the server over HTTP (with a progress bar), then a small chat
  // message carries its id. Photos are shrunk to ≤2048 px first. Everything you send or
  // receive is also kept on this computer (IndexedDB) so it still shows after the server's
  // copy expires.
  const blobUrls = new Map(); // key -> object URL
  const Files = {
    downloads: new Map(), // key -> Promise<Blob|null>
    photoEls: new Map(), // key -> element (reused across renders)

    headers() {
      return { 'x-parley-code': S.code, 'x-parley-name': S.me || '' };
    },
    async blob(key) {
      const v = await FileStore.get(key).catch(() => null);
      return v && v.blob ? v.blob : null;
    },
    async url(key) {
      if (blobUrls.has(key)) return blobUrls.get(key);
      const b = await this.blob(key);
      if (!b) return null;
      const u = URL.createObjectURL(b);
      blobUrls.set(key, u);
      return u;
    },
    fitSize(f, max = 280, maxH = 300) {
      const w = f.w || 320;
      const h = f.h || 240;
      const s = Math.min(1, max / w, maxH / h);
      return { w: Math.max(60, Math.round(w * s)), h: Math.max(48, Math.round(h * s)) };
    },

    // ---- sending
    async prepare(file, sticker) {
      const type = file.type || '';
      if (!/^image\/(jpeg|png|webp|gif|bmp|avif)$/.test(type)) return { blob: file, name: file.name, type: type || 'application/octet-stream', kind: 'file' };
      let bmp;
      try {
        bmp = await createImageBitmap(file);
      } catch {
        return { blob: file, name: file.name, type, kind: 'file' };
      }
      const w = bmp.width;
      const h = bmp.height;
      const gif = type === 'image/gif';
      const max = sticker ? 320 : 2048;
      const big = Math.max(w, h) > max;
      const heavy = file.size > (sticker ? 400e3 : 1.5e6);
      if (gif || (!big && !heavy)) {
        bmp.close?.();
        return { blob: file, name: file.name || 'photo', type, kind: 'image', w, h };
      }
      const s = Math.min(1, max / Math.max(w, h));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(w * s), height: Math.round(h * s) });
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close?.();
      const keepAlpha = sticker || type === 'image/png' || type === 'image/webp';
      const outType = keepAlpha ? 'image/webp' : 'image/jpeg';
      const blob = await new Promise((r) => c.toBlob(r, outType, 0.86));
      const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
      return { blob, name: `${base}.${keepAlpha ? 'webp' : 'jpg'}`, type: outType, kind: 'image', w: c.width, h: c.height };
    },

    async send(file, { sticker = false, to = S.active, reply = null } = {}) {
      if (!to) return;
      const maxB = (S.limits.maxFileMB || 100) * 1048576;
      if (file.size > maxB) return toast(`${file.name || 'That file'} is too big (max ${S.limits.maxFileMB} MB).`, 5000);
      const p = await this.prepare(file, sticker);
      const id = uid();
      const key = `f:${id}`;
      await FileStore.put(key, { blob: p.blob, name: p.name }).catch((e) => log('local file save failed', errText(e)));
      const m = {
        id, from: S.me, to, text: '', ts: Date.now(), dir: 'out', status: 'uploading',
        file: { key, name: p.name, size: p.blob.size, type: p.type, kind: p.kind, w: p.w, h: p.h, sticker },
        ...(reply ? { reply } : {}),
      };
      addToHistory(to, m);
      renderContacts();
      return this.upload(m, p.blob);
    },

    // Resolves once the chat message for this file has gone out (or the upload failed).
    upload(m, blob) {
      let done;
      const finished = new Promise((r) => (done = r));
      const f = m.file;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', S.serverUrl + '/files');
      for (const [k, v] of Object.entries(this.headers())) xhr.setRequestHeader(k, v);
      xhr.setRequestHeader('x-file-name', encodeURIComponent(f.name));
      xhr.setRequestHeader('x-file-type', f.type || 'application/octet-stream');
      xhr.setRequestHeader('content-type', 'application/octet-stream');
      xhr.upload.onprogress = (e) => e.lengthComputable && this.progress(m.id, e.loaded / e.total);
      const fail = (why) => {
        done();
        log('upload failed', f.name, why);
        m.status = 'failed';
        saveHistory(m.to);
        if (S.active && keyOf(S.active) === keyOf(m.to)) renderMessages(false);
        toast(why === 413 ? `${f.name} is too big for the server.` : `Couldn’t send ${f.name}. Check your connection and press Retry.`, 5000);
      };
      xhr.onerror = () => fail('network');
      xhr.onload = () => {
        if (xhr.status !== 200) return fail(xhr.status);
        let res;
        try {
          res = JSON.parse(xhr.responseText);
        } catch {
          return fail('bad reply');
        }
        f.id = res.id;
        m.status = 'sending';
        saveHistory(m.to);
        // also keep it under the shared key so it survives in this device's cache
        this.blob(f.key).then((b) => b && FileStore.put(`file:${res.id}`, { blob: b, name: f.name }).catch(() => {}));
        const label = f.sticker ? '[Sticker]' : f.kind === 'image' ? '📷 Photo' : `📎 ${f.name} (${fmtSize(f.size)})`;
        sendPayload(m, { text: label, file: { id: res.id, kind: f.kind, w: f.w, h: f.h, sticker: !!f.sticker } });
        if (S.active && keyOf(S.active) === keyOf(m.to)) renderMessages(false);
        done();
      };
      xhr.send(blob);
      return finished;
    },
    async retry(m) {
      const b = await this.blob(m.file?.key);
      if (!b) return toast('That file isn’t on this computer any more.');
      m.status = 'uploading';
      saveHistory(m.to);
      renderMessages(false);
      this.upload(m, b);
    },
    progress(id, frac) {
      const bar = document.querySelector(`.msg[data-id="${CSS.escape(id)}"] .progress > div`);
      if (bar) bar.style.width = Math.round(frac * 100) + '%';
    },

    // ---- receiving
    ensure(m) {
      const f = m.file;
      if (!f || !f.id) return Promise.resolve(null);
      if (this.downloads.has(f.key)) return this.downloads.get(f.key);
      const job = (async () => {
        const have = await this.blob(f.key);
        if (have) return have;
        const r = await fetch(`${S.serverUrl}/files/${f.id}`, { headers: this.headers() });
        if (r.status === 404) {
          f.gone = true;
          saveHistory(m.dir === 'in' ? m.from : m.to);
          return null;
        }
        if (!r.ok) throw new Error('download failed ' + r.status);
        const total = Number(r.headers.get('content-length')) || f.size || 0;
        const reader = r.body.getReader();
        const parts = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          got += value.length;
          if (total) this.progress(m.id, got / total);
        }
        const b = new Blob(parts, { type: f.type || 'application/octet-stream' });
        // cache photos/stickers (and files up to 50 MB) on this computer
        if (f.kind === 'image' || f.sticker || b.size < 50e6) await FileStore.put(f.key, { blob: b, name: f.name }).catch(() => {});
        return b;
      })().catch((e) => {
        log('download failed', f.name, errText(e));
        this.downloads.delete(f.key);
        return null;
      });
      this.downloads.set(f.key, job);
      return job;
    },

    photo(m) {
      const f = m.file;
      const key = f.key;
      let el = this.photoEls.get(key);
      const size = f.sticker ? this.fitSize(f, 150, 150) : this.fitSize(f);
      if (!el) {
        el = document.createElement('div');
        el.className = f.sticker ? 'photo sticker-photo loading' : 'photo loading';
        el.style.width = size.w + 'px';
        el.style.height = size.h + 'px';
        this.photoEls.set(key, el);
        const show = (u) => {
          if (!u) return;
          const img = new Image();
          img.alt = f.name || '';
          img.onload = () => el.classList.remove('loading');
          img.src = u;
          if (f.sticker) {
            img.style.objectFit = 'contain';
            el.style.background = 'none';
            el.style.cursor = 'default';
          }
          el.replaceChildren(img);
        };
        this.url(key).then(async (u) => {
          if (u) return show(u);
          if (m.dir === 'in' || f.id) {
            const b = await this.ensure(m);
            if (b) show(await this.url(key));
            else if (f.gone) {
              el.classList.remove('loading');
              el.classList.add('gone');
              el.innerHTML = '<span class="gone-text">Photo expired on the server</span>';
            }
          }
        });
        if (!f.sticker) el.addEventListener('click', () => !f.gone && Lightbox.open(m));
      }
      // upload progress bar while sending
      const bar = el.querySelector('.progress');
      if (m.status === 'uploading' && !bar) el.insertAdjacentHTML('beforeend', '<div class="progress"><div></div></div>');
      else if (m.status !== 'uploading' && bar) bar.remove();
      return el;
    },

    card(m) {
      const f = m.file;
      const card = document.createElement('div');
      card.className = 'file-card' + (f.gone ? ' gone' : '');
      const ext = (f.name.match(/\.([a-z0-9]{1,5})$/i) || [, 'file'])[1];
      card.innerHTML = `<div class="file-icon">${ext}</div><div class="file-info"><div class="file-name"></div><div class="file-sub"></div></div>`;
      card.querySelector('.file-name').textContent = f.name;
      const sub = card.querySelector('.file-sub');
      sub.textContent = fmtSize(f.size) + (f.gone ? ' · expired on the server' : '');
      if (f.saved && electron) {
        const o = document.createElement('button');
        o.textContent = 'Open';
        o.onclick = () => electron.openPath(f.saved);
        const s = document.createElement('button');
        s.textContent = 'Show in folder';
        s.onclick = () => electron.showInFolder(f.saved);
        sub.append(' · Saved', o, s);
      }
      if (!f.gone && m.status !== 'uploading') {
        const dl = document.createElement('button');
        dl.className = 'icon-btn';
        dl.title = electron ? 'Save to Downloads' : 'Download';
        dl.innerHTML = icon('download');
        dl.onclick = () => this.download(m, dl);
        card.append(dl);
      }
      if (m.status === 'uploading') card.insertAdjacentHTML('beforeend', '<div class="progress"><div></div></div>');
      return card;
    },

    async download(m, btn, how) {
      if (typeof btn === 'string') {
        how = btn;
        btn = null;
      }
      const f = m.file;
      if (btn) btn.disabled = true;
      const card = btn?.closest('.file-card');
      if (card && !card.querySelector('.progress')) card.insertAdjacentHTML('beforeend', '<div class="progress"><div></div></div>');
      const b = m.dir === 'out' ? (await this.blob(f.key)) || (await this.ensure(m)) : await this.ensure(m);
      if (!b) {
        if (btn) btn.disabled = false;
        card?.querySelector('.progress')?.remove();
        if (f.gone) renderMessages(false);
        return toast(f.gone ? 'That file has expired on the server.' : 'Download failed. Try again.');
      }
      card?.querySelector('.progress')?.remove();
      if (btn) btn.disabled = false;
      if (how === 'as') await this.saveBlobAs(b, f.name, m);
      else await this.saveBlob(b, f.name, m);
    },
    async saveBlob(b, name, m) {
      if (electron?.saveDownload) {
        try {
          const p = await electron.saveDownload(name, await b.arrayBuffer());
          if (m?.file) {
            m.file.saved = p;
            saveHistory(m.dir === 'in' ? m.from : m.to);
            renderMessages(false);
          }
          toast(`Saved to Downloads: ${p.split(/[\\/]/).pop()}`, 5000, { label: 'Show in folder', fn: () => electron.showInFolder(p) });
        } catch (e) {
          log('save failed', errText(e));
          toast('Couldn’t save the file.');
        }
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = name || 'file';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    },
    async saveBlobAs(b, name, m) {
      if (!electron?.saveAs) return this.saveBlob(b, name, m);
      try {
        const p = await electron.saveAs(name, await b.arrayBuffer());
        if (!p) return;
        if (m?.file) {
          m.file.saved = p;
          saveHistory(m.dir === 'in' ? m.from : m.to);
          renderMessages(false);
        }
        toast(`Saved: ${p.split(/[\\/]/).pop()}`, 5000, { label: 'Show in folder', fn: () => electron.showInFolder(p) });
      } catch (e) {
        log('save as failed', errText(e));
        toast('Couldn’t save the file.');
      }
    },
    // Photos: save to Downloads, "Save as…", or copy to the clipboard.
    async saveImage(m, how) {
      const f = m.file;
      const b = (await this.blob(f.key)) || (await this.ensure(m));
      if (!b) return toast(f.gone ? 'That photo has expired on the server.' : 'Couldn’t get the photo. Try again.');
      if (how === 'copy') return copyImage(b);
      if (how === 'as') return this.saveBlobAs(b, f.name, null);
      return this.saveBlob(b, f.name, null);
    },
  };
  async function copyImage(blob) {
    try {
      const bmp = await createImageBitmap(blob);
      const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
      c.getContext('2d').drawImage(bmp, 0, 0);
      bmp.close?.();
      const png = await new Promise((r) => c.toBlob(r, 'image/png'));
      if (electron?.copyImage) {
        if (!(await electron.copyImage(await png.arrayBuffer()))) throw new Error('clipboard refused');
      } else await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast('Image copied', 1800);
    } catch (e) {
      log('copy image failed', errText(e));
      toast('Couldn’t copy the image.');
    }
  }

  // ---- attachments wait in a tray above the message box until you press Send
  const Tray = {
    byPeer: new Map(), // peerKey -> [{id, file, url}]
    items() {
      return S.active ? this.byPeer.get(keyOf(S.active)) || [] : [];
    },
    add(files) {
      if (!S.active || !files.length) return;
      const k = keyOf(S.active);
      const list = this.byPeer.get(k) || [];
      const maxB = (S.limits.maxFileMB || 100) * 1048576;
      for (const f of files) {
        if (f.size > maxB) {
          toast(`${f.name || 'That file'} is too big (max ${S.limits.maxFileMB} MB).`, 5000);
          continue;
        }
        if (list.length >= 20) {
          toast('That’s a lot of files — send these first.');
          break;
        }
        list.push({ id: uid(), file: f, url: /^image\//.test(f.type) ? URL.createObjectURL(f) : null });
      }
      this.byPeer.set(k, list);
      this.render();
      if (!chatVisible() && Call.state !== 'idle') setChatHidden(false);
      $('#msgInput').focus();
    },
    remove(id) {
      const list = this.items();
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return;
      const [it] = list.splice(i, 1);
      if (it.url) URL.revokeObjectURL(it.url);
      this.render();
    },
    take(peer) {
      const k = keyOf(peer);
      const list = this.byPeer.get(k) || [];
      this.byPeer.delete(k);
      this.render();
      return list;
    },
    render() {
      const tray = $('#tray');
      const list = this.items();
      tray.innerHTML = '';
      tray.classList.toggle('hidden', !list.length);
      if (!list.length) return;
      for (const it of list) {
        const d = document.createElement('div');
        d.className = 'tray-item' + (it.url ? '' : ' file');
        d.title = `${it.file.name} · ${fmtSize(it.file.size)}`;
        if (it.url) {
          const img = document.createElement('img');
          img.src = it.url;
          img.alt = '';
          d.append(img);
        } else {
          const ext = ((it.file.name || '').match(/\.([a-z0-9]{1,5})$/i) || [, 'file'])[1];
          d.innerHTML = `<div class="file-icon"></div><div class="tf"><b></b><span></span></div>`;
          d.querySelector('.file-icon').textContent = ext;
          d.querySelector('.tf b').textContent = it.file.name || 'file';
          d.querySelector('.tf span').textContent = fmtSize(it.file.size);
        }
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'rm';
        rm.title = 'Remove';
        rm.innerHTML = icon('x');
        rm.onclick = () => this.remove(it.id);
        d.append(rm);
        tray.append(d);
      }
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'tray-add';
      add.title = 'Add more';
      add.innerHTML = icon('plus');
      add.onclick = () => {
        $('#attachFile').value = '';
        $('#attachFile').click();
      };
      tray.append(add);
    },
  };

  // ---- small menus (right-click, "More", status)
  const Menu = {
    onClose: null,
    show(x, y, items, onClose) {
      this.close();
      const el = $('#ctxMenu');
      el.innerHTML = '';
      for (const it of items) {
        if (it === '-') {
          if (el.lastChild && el.lastChild.tagName !== 'HR') el.append(document.createElement('hr'));
          continue;
        }
        if (it.reactRow) {
          const row = document.createElement('div');
          row.className = 'react-row';
          for (const e of QUICK) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = e;
            b.title = `React ${e}`;
            b.onclick = () => {
              this.close();
              it.reactRow(e);
            };
            row.append(b);
          }
          const more = document.createElement('button');
          more.type = 'button';
          more.innerHTML = icon('smilePlus');
          more.title = 'More reactions';
          more.onclick = () => {
            const r = more.getBoundingClientRect();
            this.close();
            it.more({ getBoundingClientRect: () => r });
          };
          row.append(more);
          el.append(row);
          continue;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = icon(it.icon || '');
        const l = document.createElement('span');
        l.textContent = it.label;
        b.append(l);
        if (it.kbd) b.insertAdjacentHTML('beforeend', `<span class="kbd">${it.kbd}</span>`);
        if (it.danger) b.classList.add('danger');
        if (it.disabled) b.disabled = true;
        b.onclick = () => {
          this.close();
          it.action();
        };
        el.append(b);
      }
      if (el.lastChild?.tagName === 'HR') el.lastChild.remove();
      el.classList.remove('hidden');
      const r = el.getBoundingClientRect();
      el.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
      el.style.top = (y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y) + 'px';
      this.onClose = onClose || null;
    },
    isOpen() {
      return !$('#ctxMenu').classList.contains('hidden');
    },
    close() {
      const el = $('#ctxMenu');
      if (el.classList.contains('hidden')) return;
      el.classList.add('hidden');
      const cb = this.onClose;
      this.onClose = null;
      cb?.();
    },
  };

  const Lightbox = {
    m: null,
    list() {
      return S.active ? history(S.active).filter((x) => x.file && x.file.kind === 'image' && !x.file.sticker && !x.file.gone && !x.deleted) : [];
    },
    async open(m) {
      this.m = m;
      const u = (await Files.url(m.file.key)) || ((await Files.ensure(m)) && (await Files.url(m.file.key)));
      if (!u || this.m !== m) return;
      $('#lightboxImg').src = u;
      const who = m.dir === 'in' ? m.from : 'You';
      $('#lightboxName').textContent = `${who} · ${fmtFull(m.ts)} · ${fmtSize(m.file.size)}`;
      $('#lightbox').classList.remove('hidden');
      const list = this.list();
      const i = list.indexOf(m);
      $('#lightboxPrev').disabled = i <= 0;
      $('#lightboxNext').disabled = i < 0 || i >= list.length - 1;
    },
    step(d) {
      const list = this.list();
      const i = list.indexOf(this.m);
      const next = list[i + d];
      if (next) this.open(next);
    },
    close() {
      $('#lightbox').classList.add('hidden');
      $('#lightboxImg').removeAttribute('src');
      this.m = null;
    },
    isOpen() {
      return !$('#lightbox').classList.contains('hidden');
    },
    save(how) {
      if (this.m) Files.saveImage(this.m, how);
    },
  };

  // ------------------------------------------------------------------ emoji & sticker picker
  const Picker = {
    built: false,
    pickCb: null, // set while choosing a reaction
    open() {
      if (!this.built) this.build();
      this.pickCb = null;
      const p = $('#picker');
      p.style.left = p.style.top = p.style.bottom = '';
      p.classList.remove('react-mode');
      this.tab(store.get('pickerTab', 'emoji'));
      this.renderStickers();
      this.renderRecent();
      p.classList.remove('hidden');
    },
    // Emoji only, next to the button that asked (for reactions).
    openFor(anchor, cb) {
      if (!this.built) this.build();
      const p = $('#picker');
      const panel = $('#chatPanel').getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      this.renderRecent();
      p.classList.add('react-mode');
      this.tab('emoji', true);
      p.classList.remove('hidden');
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const left = Math.max(8, Math.min(a.left - panel.left - w / 2, panel.width - w - 8));
      let top = a.bottom - panel.top + 6;
      if (top + h > panel.height - 8) top = Math.max(8, a.top - panel.top - h - 6);
      Object.assign(p.style, { left: left + 'px', top: top + 'px', bottom: 'auto' });
      this.pickCb = cb;
    },
    close() {
      $('#picker').classList.add('hidden');
      this.pickCb = null;
    },
    toggle() {
      $('#picker').classList.contains('hidden') ? this.open() : this.close();
    },
    tab(name, temporary) {
      document.querySelectorAll('#picker .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
      $('#pickerEmoji').classList.toggle('hidden', name !== 'emoji');
      $('#pickerStickers').classList.toggle('hidden', name !== 'stickers');
      if (!temporary) store.set('pickerTab', name);
    },
    grid(list) {
      const g = document.createElement('div');
      g.className = 'emoji-grid';
      for (const e of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = e;
        b.onclick = () => this.insert(e);
        g.append(b);
      }
      return g;
    },
    build() {
      this.built = true;
      const body = $('#pickerEmoji');
      body.innerHTML = '';
      const rec = document.createElement('div');
      rec.id = 'recentEmoji';
      body.append(rec);
      for (const c of window.PARLEY_EMOJI || []) {
        const l = document.createElement('div');
        l.className = 'cat-label';
        l.textContent = c.label;
        body.append(l, this.grid(c.list.split(' ').filter(Boolean)));
      }
      this.tab(store.get('pickerTab', 'emoji'));
    },
    renderRecent() {
      const rec = $('#recentEmoji');
      if (!rec) return;
      const list = store.get('recentEmoji', []);
      rec.innerHTML = '';
      if (!list.length) return;
      const l = document.createElement('div');
      l.className = 'cat-label';
      l.textContent = 'Recently used';
      rec.append(l, this.grid(list));
    },
    insert(e) {
      const list0 = store.get('recentEmoji', []).filter((x) => x !== e);
      if (this.pickCb) {
        const cb = this.pickCb;
        this.close();
        store.set('recentEmoji', [e, ...list0].slice(0, 16));
        return cb(e);
      }
      const t = $('#msgInput');
      const s = t.selectionStart ?? t.value.length;
      const end = t.selectionEnd ?? s;
      t.value = t.value.slice(0, s) + e + t.value.slice(end);
      t.selectionStart = t.selectionEnd = s + e.length;
      t.focus();
      autoGrow();
      const list = store.get('recentEmoji', []).filter((x) => x !== e);
      list.unshift(e);
      store.set('recentEmoji', list.slice(0, 16));
    },
    async renderStickers() {
      const body = $('#pickerStickers');
      body.innerHTML = '';
      const mineLabel = document.createElement('div');
      mineLabel.className = 'cat-label';
      mineLabel.textContent = 'Your stickers';
      const mine = document.createElement('div');
      mine.className = 'sticker-grid';
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'add';
      add.textContent = '+ Add your own';
      add.title = 'Any picture or GIF (PNG with a transparent background looks best)';
      add.onclick = () => {
        $('#stickerFile').value = '';
        $('#stickerFile').click();
      };
      mine.append(add);
      for (const s of store.get('myStickers', [])) {
        const u = await Files.url(`sticker:${s.id}`);
        if (!u) continue;
        const b = document.createElement('button');
        b.type = 'button';
        b.title = 'Send';
        b.innerHTML = `<img alt="">`;
        b.querySelector('img').src = u;
        b.onclick = () => this.sendCustom(s);
        const del = document.createElement('span');
        del.className = 'del';
        del.textContent = '×';
        del.title = 'Remove from your stickers';
        del.onclick = (ev) => {
          ev.stopPropagation();
          store.set('myStickers', store.get('myStickers', []).filter((x) => x.id !== s.id));
          this.renderStickers();
        };
        b.append(del);
        mine.append(b);
      }
      const pipLabel = document.createElement('div');
      pipLabel.className = 'cat-label';
      pipLabel.textContent = 'Pip';
      const pips = document.createElement('div');
      pips.className = 'sticker-grid';
      for (const s of window.PARLEY_STICKERS || []) {
        const b = document.createElement('button');
        b.type = 'button';
        b.title = s.name;
        b.innerHTML = `<img alt="">`;
        b.querySelector('img').src = s.src;
        b.onclick = () => {
          sendSticker(s.id);
          this.close();
        };
        pips.append(b);
      }
      body.append(pipLabel, pips, mineLabel, mine);
    },
    async addCustom(file) {
      if (!/^image\//.test(file.type)) return toast('Stickers need to be a picture or GIF.');
      if (file.size > 4e6) return toast('That sticker is too big (4 MB max).');
      const p = await Files.prepare(file, true);
      const id = uid();
      await FileStore.put(`sticker:${id}`, { blob: p.blob, name: p.name });
      const list = store.get('myStickers', []);
      list.unshift({ id, w: p.w, h: p.h, type: p.type, name: p.name });
      store.set('myStickers', list.slice(0, 60));
      this.renderStickers();
      this.tab('stickers');
    },
    async sendCustom(s) {
      const b = await Files.blob(`sticker:${s.id}`);
      if (!b) return;
      this.close();
      Files.send(new File([b], s.name || 'sticker.png', { type: s.type || b.type }), { sticker: true });
    },
  };

  // ------------------------------------------------------------------ media helpers
  function blackVideoTrack() {
    const c = Object.assign(document.createElement('canvas'), { width: 640, height: 360 });
    const g = c.getContext('2d');
    const draw = () => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, c.width, c.height);
    };
    draw();
    const stream = c.captureStream(2);
    const t = stream.getVideoTracks()[0];
    const iv = setInterval(draw, 500);
    t.addEventListener('ended', () => clearInterval(iv));
    t._parleyPlaceholder = true;
    t._stopDraw = () => clearInterval(iv);
    return t;
  }
  function silentAudioTrack() {
    const ctx = Sound.get();
    const dst = ctx.createMediaStreamDestination();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(dst);
    o.start();
    const t = dst.stream.getAudioTracks()[0];
    t._parleyPlaceholder = true;
    return t;
  }
  function audioConstraints() {
    const p = store.get('devices', {});
    // 'all' = remove everything the computer plays (shared videos, notifications) from the mic,
    // not just the call audio. Engines that don't know 'all' treat it as plain `true`.
    // The built-in noise filter only handles steady hiss; when the AI filter is on we turn the
    // built-in one off so the two don't fight (double filtering makes voices watery).
    return {
      echoCancellation: 'all',
      noiseSuppression: NoiseFX.mode() === 'off',
      autoGainControl: true,
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48000 },
      ...(p.mic ? { deviceId: { ideal: p.mic } } : {}),
    };
  }

  // ------------------------------------------------------------------ AI background-noise removal
  // RNNoise ("standard") or GTCRN ("strong") running in an AudioWorklet, from
  // @sapphi-red/web-noise-suppressor (MIT), vendored in renderer/vendor/noise.
  // Raw mic → worklet → new track. The raw track is kept on the processed one (track._raw).
  const NoiseFX = {
    ctx: null,
    modules: {},
    wasm: {},
    IDS: { standard: '@sapphi-red/web-noise-suppressor/rnnoise', strong: '@sapphi-red/web-noise-suppressor/gtcrn' },
    mode() {
      const m = store.get('noise', 'standard');
      return m in this.IDS || m === 'off' ? m : 'standard';
    },
    supported() {
      return typeof AudioWorkletNode !== 'undefined' && typeof WebAssembly !== 'undefined';
    },
    async context() {
      if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    async load(mode) {
      const ctx = await this.context();
      if (!this.modules[mode]) {
        this.modules[mode] = ctx.audioWorklet.addModule(mode === 'strong' ? 'vendor/noise/gtcrn-worklet.js' : 'vendor/noise/rnnoise-worklet.js');
      }
      await this.modules[mode];
      if (!this.wasm[mode]) {
        const simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
        const file = mode === 'strong' ? 'gtcrn.wasm' : simd ? 'rnnoise_simd.wasm' : 'rnnoise.wasm';
        const res = await fetch('vendor/noise/' + file);
        if (!res.ok) throw new Error('could not load ' + file);
        this.wasm[mode] = await res.arrayBuffer();
      }
      return ctx;
    },
    // Returns a processed track (or the raw one if the filter is off / unavailable).
    async process(raw, mode = this.mode()) {
      if (!raw || raw._parleyPlaceholder || mode === 'off' || !this.supported()) return raw;
      try {
        const ctx = await this.load(mode);
        const src = ctx.createMediaStreamSource(new MediaStream([raw]));
        const node = new AudioWorkletNode(ctx, this.IDS[mode], {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          channelCountMode: 'explicit',
          outputChannelCount: [1],
          processorOptions: { maxChannels: 1, wasmBinary: this.wasm[mode].slice(0) },
        });
        const dst = ctx.createMediaStreamDestination();
        dst.channelCount = 1;
        src.connect(node).connect(dst);
        const out = dst.stream.getAudioTracks()[0];
        out._raw = raw;
        out._noise = mode;
        out._cleanup = () => {
          try {
            node.port.postMessage('destroy');
            src.disconnect();
            node.disconnect();
          } catch {}
        };
        // If the mic is unplugged, end the processed track too.
        raw.addEventListener('ended', () => out.stop());
        log('noise removal on:', mode);
        return out;
      } catch (e) {
        log('noise removal failed, using plain mic', errText(e));
        toast('Couldn’t start background-noise removal. Using the normal microphone.');
        return raw;
      }
    },
  };
  // Stop a (possibly processed) mic track and everything behind it.
  function stopMic(t) {
    if (!t) return;
    try {
      t._cleanup?.();
      t.stop();
      t._raw?.stop();
    } catch {}
  }

  // ------------------------------------------------------------------ audio quality
  // Opus bitrates per preset: voice (mic) and music (shared computer sound / watch-together).
  const QUALITY = {
    low: { mic: 24_000, music: 64_000 },
    high: { mic: 64_000, music: 192_000 },
    max: { mic: 128_000, music: 320_000 },
  };
  const quality = () => QUALITY[store.get('quality', 'high')] || QUALITY.high;

  // Chrome sends Opus as mono ~32 kbps by default. We rewrite the *remote* description so our
  // encoder is allowed to send stereo (for music/movies) at a real bitrate, with forward error
  // correction for packet loss. The first audio section is always the microphone.
  function tuneOpus(sdp) {
    if (!sdp || !/opus\/48000/i.test(sdp)) return sdp;
    const q = quality();
    const parts = sdp.split(/(?=\r?\nm=)/);
    let audioIdx = 0;
    return parts
      .map((sec) => {
        if (!/^\r?\nm=audio/.test(sec)) return sec;
        const isMic = audioIdx++ === 0;
        const want = {
          minptime: '10',
          useinbandfec: '1',
          usedtx: '0',
          stereo: isMic ? '0' : '1',
          'sprop-stereo': isMic ? '0' : '1',
          maxaveragebitrate: String(isMic ? q.mic : q.music),
          maxplaybackrate: '48000',
        };
        const pts = [...sec.matchAll(/a=rtpmap:(\d+) opus\/48000\/2/gi)].map((m) => m[1]);
        for (const pt of pts) {
          const re = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
          const fmt = (map) => [...map].map(([k, v]) => `${k}=${v}`).join(';');
          if (re.test(sec)) {
            sec = sec.replace(re, (_, params) => {
              const map = new Map(params.split(';').map((kv) => kv.trim().split('=')).filter((a) => a[0]));
              for (const [k, v] of Object.entries(want)) map.set(k, v);
              return `a=fmtp:${pt} ${fmt(map)}`;
            });
          } else {
            sec = sec.replace(new RegExp(`(a=rtpmap:${pt} opus/48000/2)(\\r?\\n)`, 'i'), `$1$2a=fmtp:${pt} ${fmt(new Map(Object.entries(want)))}$2`);
          }
        }
        return sec;
      })
      .join('');
  }
  // Our own offer/answer gets the same treatment: the *receiving* side only decodes stereo if its
  // own description says stereo=1. (Without this, shared movies and screen sound arrived in mono.)
  async function setLocal(pc, type) {
    const d = type === 'offer' ? await pc.createOffer() : await pc.createAnswer();
    if (type === 'offer' && pc.signalingState !== 'stable') return false;
    try {
      await pc.setLocalDescription({ type: d.type, sdp: tuneOpus(d.sdp) });
    } catch (e) {
      log('tuned local description refused, using the plain one', errText(e));
      await pc.setLocalDescription();
    }
    return true;
  }
  async function setAudioParams(sender, bps) {
    for (let i = 0; i < 20; i++) {
      try {
        const p = sender.getParameters();
        if (p.encodings && p.encodings.length) {
          p.encodings[0].maxBitrate = bps;
          p.encodings[0].priority = 'high';
          p.encodings[0].networkPriority = 'high';
          await sender.setParameters(p);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  function videoConstraints() {
    const p = store.get('devices', {});
    return { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, ...(p.cam ? { deviceId: { ideal: p.cam } } : {}) };
  }
  const waitFor = (fn, ms) =>
    new Promise((res) => {
      const t0 = Date.now();
      const tick = () => (fn() || Date.now() - t0 > ms ? res() : setTimeout(tick, 50));
      tick();
    });
  async function setMaxBitrate(sender, bps, pref) {
    for (let i = 0; i < 20; i++) {
      try {
        const p = sender.getParameters();
        if (p.encodings && p.encodings.length) {
          p.encodings[0].maxBitrate = bps;
          if (pref) p.degradationPreference = pref;
          await sender.setParameters(p);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // ------------------------------------------------------------------ calls
  const el = {
    stage: $('#stage'),
    remote: $('#remoteVideo'),
    local: $('#localVideo'),
    media: $('#mediaVideo'),
    screen: $('#screenVideo'),
    status: $('#stageStatus'),
    timer: $('#callTimer'),
  };

  const Call = {
    state: 'idle', // idle | outgoing | incoming | connecting | active
    peer: null,
    id: null,
    polite: false,
    pc: null,
    audioTrack: null,
    camTrack: null,
    blackTrack: null,
    screenTrack: null,
    screenAudio: null, // { raw, send, stream, sender, guard }
    screenSender: null, // the screen picture goes out as its own track, so your camera keeps going too
    screenStream: null,
    video: true, // was it a video call (for "Call back")
    audioSender: null,
    videoSender: null,
    micOn: true,
    camOn: false,
    makingOffer: false,
    ignoreOffer: false,
    canOffer: false,
    pendingIce: [],
    roles: {},
    remoteCamStream: null,
    mediaStream: null,
    mediaSenders: [],
    mediaUrl: null,
    remoteMediaId: null,
    startedAt: 0,
    timers: {},
    everConnected: false,

    sig(data) {
      wsSend({ type: 'signal', to: this.peer, data: { ...data, callId: this.id } });
    },

    // ---- outgoing
    async start(peer, video) {
      if (this.state !== 'idle') return toast('You’re already in a call.');
      this.state = 'outgoing';
      this.peer = peer;
      this.id = uid();
      this.polite = false;
      this.video = !!video;
      openConvo(peer);
      this.showStage(`Calling ${peer}…`);
      const ok = await this.getLocalMedia(video);
      if (!ok || this.state !== 'outgoing') return;
      this.sig({ kind: 'invite', video });
      Sound.ringback();
      this.timers.ring = setTimeout(() => {
        if (this.state === 'outgoing') {
          this.sig({ kind: 'cancel' });
          systemLine(peer, `${peer} didn’t answer`, { callback: true, video: this.video });
          this.end('No answer');
        }
      }, 45000);
    },

    // ---- incoming
    onInvite(from, data) {
      if (this.state !== 'idle') {
        wsSend({ type: 'signal', to: from, data: { kind: 'busy', callId: data.callId } });
        systemLine(from, `Missed call from ${from} (you were in another call)`, { missed: true, callback: true, video: !!data.video });
        notify('Missed call', `${from} tried to call you`, from);
        return;
      }
      this.state = 'incoming';
      this.peer = from;
      this.id = data.callId;
      this.polite = true;
      this.video = !!data.video;
      paintAvatar($('#incomingAvatar'), from);
      $('#incomingName').textContent = from;
      $('#incomingKind').textContent = data.video ? 'is video calling you…' : 'is calling you…';
      $('#incoming').classList.remove('hidden');
      Sound.ring();
      electron?.attention();
      electron?.incomingCall?.();
      notify('Incoming call', `${from} is calling you`);
      this.setBusy(true);
      this.timers.ring = setTimeout(() => {
        if (this.state === 'incoming') {
          this.sig({ kind: 'decline', reason: 'no-answer' });
          systemLine(from, `Missed call from ${from}`, { missed: true, callback: true, video: this.video });
          notify('Missed call', `${from} tried to call you`, from);
          this.end('');
        }
      }, 45000);
    },

    async accept(video) {
      if (this.state !== 'incoming') return;
      $('#incoming').classList.add('hidden');
      Sound.stop();
      clearTimeout(this.timers.ring);
      this.state = 'connecting';
      electron?.focusWindow();
      openConvo(this.peer);
      this.showStage('Connecting…');
      const ok = await this.getLocalMedia(video);
      if (!ok || this.state !== 'connecting') return;
      this.createPC(false);
      this.sig({ kind: 'accept' });
      this.armConnectTimeout();
    },

    decline() {
      if (this.state !== 'incoming') return;
      this.sig({ kind: 'decline' });
      systemLine(this.peer, `You declined a call from ${this.peer}`);
      this.end('');
    },

    hangup() {
      if (this.state === 'idle') return;
      if (this.state === 'incoming') return this.decline();
      this.sig({ kind: this.state === 'outgoing' ? 'cancel' : 'hangup' });
      this.end('Call ended');
    },

    armConnectTimeout() {
      clearTimeout(this.timers.connect);
      this.timers.connect = setTimeout(() => {
        if (!this.everConnected && this.state !== 'idle') {
          this.sig({ kind: 'hangup' });
          this.end('Couldn’t connect. One of your networks may need a TURN server (see README).', 8000);
        }
      }, 30000);
    },

    // ---- signal router
    async onSignal(from, data) {
      if (data.kind === 'invite') return this.onInvite(from, data);
      if (!this.peer || keyOf(from) !== keyOf(this.peer) || data.callId !== this.id) return;
      switch (data.kind) {
        case 'accept':
          if (this.state !== 'outgoing') return;
          Sound.stop();
          clearTimeout(this.timers.ring);
          this.state = 'connecting';
          this.setStatus('Connecting…');
          this.createPC(true);
          this.armConnectTimeout();
          break;
        case 'decline':
          systemLine(this.peer, data.reason === 'no-answer' ? `${this.peer} didn’t answer` : `${this.peer} declined the call`, { callback: true, video: this.video });
          this.end(data.reason === 'no-answer' ? 'No answer' : `${this.peer} declined`);
          break;
        case 'busy':
          systemLine(this.peer, `${this.peer} was in another call`, { callback: true, video: this.video });
          this.end(`${this.peer} is in another call`);
          break;
        case 'cancel':
          if (this.state === 'incoming') systemLine(this.peer, `Missed call from ${this.peer}`, { missed: true, callback: true, video: this.video });
          this.end(this.state === 'incoming' ? '' : 'Call ended');
          break;
        case 'hangup':
          this.end(`${this.peer} hung up`);
          break;
        case 'sdp':
          await this.onSdp(data.description);
          break;
        case 'ice':
          await this.onIce(data.candidate);
          break;
        case 'cam':
          el.stage.classList.toggle('remote-cam-on', !!data.on);
          this.remoteCamFlag = !!data.on;
          break;
        case 'mic':
          this.remoteMicOn = !!data.on;
          this.renderFlags();
          break;
        case 'screen':
          this.remoteScreen = !!data.on;
          this.remoteScreenSound = !!data.on && !!data.sound;
          if (!data.on) this.clearRemoteScreen();
          if (data.separate) {
            // v1.3+: the screen arrives as its own video (has-screen); their camera stays in its tile
            el.stage.classList.remove('remote-screen');
          } else {
            // older versions send the screen in place of the camera
            el.stage.classList.toggle('remote-screen', !!data.on);
            if (data.on) el.stage.classList.add('remote-cam-on');
            else el.stage.classList.toggle('remote-cam-on', !!this.remoteCamFlag);
          }
          if (!data.on) $('#screenAudio').srcObject = null;
          this.renderFlags();
          break;
        case 'screen-audio-stop':
          $('#screenAudio').srcObject = null;
          this.remoteScreenSound = false;
          this.renderFlags();
          break;
        case 'stream-role':
          this.roles[data.streamId] = data.role;
          if (data.role === 'media') {
            this.remoteMediaId = data.streamId;
            this.remoteMediaTitle = data.title || 'a video';
          }
          break;
        case 'media-stop':
          if (this.remoteMediaId) this.clearMediaView();
          break;
        case 'media-ctl':
          if (!this.mediaUrl) break;
          this.mediaControl(data.action, Number(data.delta) || 0);
          if (data.action === 'toggle') toast(`${this.peer} ${el.media.paused ? 'resumed' : 'paused'} the video`, 2000);
          break;
        case 'media-state':
          this.remoteMediaPaused = !!data.paused;
          this.remoteMediaPos = { t: Number(data.t) || 0, d: Number(data.d) || 0, at: performance.now() };
          this.renderMediaBar();
          break;
      }
    },

    // ---- WebRTC ("perfect negotiation" pattern)
    createPC(canOffer) {
      const pc = new RTCPeerConnection({ iceServers: S.iceServers, bundlePolicy: 'max-bundle' });
      this.pc = pc;
      this.canOffer = canOffer;
      const camStream = new MediaStream();
      this.audioSender = pc.addTrack(this.audioTrack, camStream);
      this.videoSender = pc.addTrack(this.currentVideoTrack(), camStream);
      setMaxBitrate(this.videoSender, 1_500_000);
      setAudioParams(this.audioSender, quality().mic);

      pc.onnegotiationneeded = async () => {
        if (!this.canOffer) return;
        try {
          this.makingOffer = true;
          if (!(await setLocal(pc, 'offer'))) return;
          this.sig({ kind: 'sdp', description: pc.localDescription.toJSON() });
        } catch (e) {
          console.error('offer failed', e);
        } finally {
          this.makingOffer = false;
        }
      };
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) this.sig({ kind: 'ice', candidate: candidate.toJSON() });
      };
      pc.ontrack = (ev) => {
        const stream = ev.streams[0] || new MediaStream([ev.track]);
        const role = this.roles[stream.id] || (stream.id === this.remoteMediaId ? 'media' : 'cam');
        log('remote track', ev.track.kind, role);
        // Movies don't need low latency: a bigger buffer keeps playback smooth on shaky Wi-Fi.
        try {
          if (role === 'media') ev.receiver.jitterBufferTarget = 400;
          else if (role === 'screen-audio') ev.receiver.jitterBufferTarget = 150;
        } catch {}
        if (this.roles[stream.id] === 'screen-audio') {
          const a = $('#screenAudio');
          if (a.srcObject !== stream) a.srcObject = stream;
          a.play().catch(() => {});
        } else if (this.roles[stream.id] === 'screen') {
          if (ev.track.kind !== 'video') return;
          if (el.screen.srcObject !== stream) el.screen.srcObject = stream;
          el.screen.play().catch(() => {});
          el.stage.classList.add('has-screen');
          this.remoteScreen = true;
          this.renderFlags();
          this.renderControls();
        } else if (this.roles[stream.id] === 'media' || stream.id === this.remoteMediaId) {
          this.showRemoteMedia(stream);
        } else if (!this.remoteCamStream || this.remoteCamStream.id === stream.id) {
          const fresh = this.remoteCamStream !== stream;
          this.remoteCamStream = stream;
          if (el.remote.srcObject !== stream) el.remote.srcObject = stream;
          el.remote.play().catch(() => {});
          if (fresh && ev.track.kind === 'audio' && this.state === 'active') Levels.start();
        }
      };
      pc.onconnectionstatechange = () => this.onConnState();
      this.sendFlags();
      this.renderControls();
    },

    async onSdp(description) {
      const pc = this.pc;
      if (!pc) return;
      const collision = description.type === 'offer' && (this.makingOffer || pc.signalingState !== 'stable');
      this.ignoreOffer = !this.polite && collision;
      if (this.ignoreOffer) return;
      try {
        await pc.setRemoteDescription({ type: description.type, sdp: tuneOpus(description.sdp) });
        this.canOffer = true;
        for (const c of this.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        if (description.type === 'offer') {
          await setLocal(pc, 'answer');
          this.sig({ kind: 'sdp', description: pc.localDescription.toJSON() });
        }
      } catch (e) {
        console.error('sdp error', e);
      }
    },

    async onIce(candidate) {
      if (!this.pc) return;
      if (!this.pc.remoteDescription) return this.pendingIce.push(candidate);
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (e) {
        if (!this.ignoreOffer) console.warn('ice error', e);
      }
    },

    onConnState() {
      const st = this.pc?.connectionState;
      if (st === 'connected') {
        clearTimeout(this.timers.fail);
        clearTimeout(this.timers.connect);
        this.setStatus('');
        if (!this.everConnected) {
          this.everConnected = true;
          Idle.wake();
          this.state = 'active';
          this.startedAt = Date.now();
          this.timers.clock = setInterval(() => (el.timer.textContent = fmtDur(Date.now() - this.startedAt)), 1000);
          this.timers.stats = setInterval(() => this.pollStats(), 2000);
          el.timer.textContent = '0:00';
          this.sendFlags();
          Levels.start();
        }
      } else if (st === 'disconnected') {
        this.setStatus('Reconnecting…');
        clearTimeout(this.timers.restart);
        this.timers.restart = setTimeout(() => {
          if (this.pc?.connectionState === 'disconnected' && !this.polite) this.pc.restartIce();
        }, 2500);
      } else if (st === 'failed') {
        this.setStatus('Reconnecting…');
        if (!this.polite) this.pc.restartIce();
        clearTimeout(this.timers.fail);
        this.timers.fail = setTimeout(() => {
          if (this.pc && this.pc.connectionState !== 'connected') {
            this.sig({ kind: 'hangup' });
            this.end('Connection lost');
          }
        }, 15000);
      }
    },

    // ---- local media
    async getLocalMedia(wantVideo) {
      try {
        if (electron) await electron.requestMediaAccess();
      } catch {}
      const md = navigator.mediaDevices;
      let stream = null;
      let hasCam = false;
      try {
        stream = await md.getUserMedia({ audio: audioConstraints(), video: wantVideo ? videoConstraints() : false });
        hasCam = wantVideo && stream.getVideoTracks().length > 0;
      } catch (e) {
        console.warn('getUserMedia', e);
        if (wantVideo) {
          try {
            stream = await md.getUserMedia({ audio: audioConstraints() });
            toast('Camera unavailable — continuing with audio only.');
          } catch {}
        }
        if (!stream && wantVideo) {
          try {
            stream = await md.getUserMedia({ video: videoConstraints() });
            hasCam = true;
          } catch {}
        }
        if (!stream || !stream.getAudioTracks().length) {
          toast('Microphone unavailable — check your OS privacy settings.', 6000);
        }
      }
      if (this.state === 'idle') {
        stream?.getTracks().forEach((t) => t.stop());
        return false;
      }
      const rawMic = stream?.getAudioTracks()[0];
      this.audioTrack = rawMic ? await NoiseFX.process(rawMic) : silentAudioTrack();
      if (this.state === 'idle') {
        stopMic(this.audioTrack);
        stream?.getTracks().forEach((t) => t.stop());
        this.audioTrack = null;
        return false;
      }
      this.blackTrack = blackVideoTrack();
      MutedWatch.start(rawMic);
      this.camTrack = hasCam ? stream.getVideoTracks()[0] : null;
      this.camOn = hasCam;
      this.micOn = !this.audioTrack._parleyPlaceholder;
      this.refreshLocalPreview();
      this.renderControls();
      return true;
    },

    currentVideoTrack() {
      if (this.camOn && this.camTrack) return this.camTrack;
      return this.blackTrack;
    },

    refreshLocalPreview() {
      const t = this.currentVideoTrack();
      el.local.srcObject = t ? new MediaStream([t]) : null;
      el.stage.classList.toggle('local-cam-off', !this.camOn);
      el.stage.classList.toggle('sharing-screen', !!this.screenTrack);
    },

    async swapVideo() {
      this.refreshLocalPreview();
      if (this.videoSender) await this.videoSender.replaceTrack(this.currentVideoTrack()).catch(console.error);
    },

    toggleMic() {
      if (!this.audioTrack || this.audioTrack._parleyPlaceholder) return toast('No microphone available.');
      this.micOn = !this.micOn;
      this.audioTrack.enabled = this.micOn;
      this.renderControls();
      this.sendFlags();
    },

    // Swap in a new microphone (device change) or re-run noise removal (mode change), live.
    async setMic(raw) {
      const t = await NoiseFX.process(raw);
      t.enabled = this.micOn;
      if (this.audioSender) await this.audioSender.replaceTrack(t);
      const old = this.audioTrack;
      this.audioTrack = t;
      if (raw !== (old?._raw || old)) MutedWatch.start(raw);
      if (old && old !== t) {
        if (old._raw === raw) {
          old._cleanup?.(); // same mic, new filter: keep the raw mic running
          old.stop();
        } else if (old !== raw) stopMic(old);
      }
    },
    async rebuildMic() {
      if (!this.audioTrack || this.audioTrack._parleyPlaceholder) return;
      const raw = this.audioTrack._raw || this.audioTrack;
      if (raw.readyState === 'ended') return;
      await this.setMic(raw);
    },
    applyQuality() {
      if (!this.pc) return;
      const q = quality();
      if (this.audioSender) setAudioParams(this.audioSender, q.mic);
      if (this.screenAudio) setAudioParams(this.screenAudio.sender, q.music);
      for (const s of this.mediaSenders) if (s.track?.kind === 'audio') setAudioParams(s, q.music);
    },

    async toggleCam() {
      if (this.camOn) {
        this.camOn = false;
        this.camTrack?.stop();
        this.camTrack = null;
      } else {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() });
          this.camTrack = s.getVideoTracks()[0];
          this.camOn = true;
        } catch {
          return toast('Couldn’t start your camera. Check your OS privacy settings.');
        }
      }
      await this.swapVideo();
      this.renderControls();
      this.sendFlags();
    },

    async toggleScreen() {
      if (this.screenTrack) return this.stopScreen();
      if (this.screenStarting) return;
      this.screenStarting = true;
      $('#screenBtn').classList.add('busy');
      try {
        await this.startScreen();
      } finally {
        this.screenStarting = false;
        $('#screenBtn').classList.remove('busy');
        this.renderControls();
      }
    },

    async startScreen() {
      const md = navigator.mediaDevices;
      const sup = md.getSupportedConstraints ? md.getSupportedConstraints() : {};
      const audioC = {
        echoCancellation: false, // it's not a mic — don't process music/movie sound
        noiseSuppression: false,
        autoGainControl: false,
        ...(sup.restrictOwnAudio ? { restrictOwnAudio: true } : {}), // leave out Parley's own sound
      };
      const videoC = { frameRate: { ideal: 30 }, width: { max: 1920 }, height: { max: 1080 } };
      // getDisplayMedia can hang forever if the OS never answers. Give up after 15 s
      // (and stop the capture if it turns up later) so the button never looks dead.
      const capture = (constraints) =>
        new Promise((resolve, reject) => {
          let done = false;
          const timer = setTimeout(() => {
            done = true;
            const e = new Error('the screen capture never started (timed out)');
            e.name = 'TimeoutError';
            reject(e);
          }, 15000);
          md.getDisplayMedia(constraints).then(
            (st) => {
              clearTimeout(timer);
              if (done) return st.getTracks().forEach((t) => t.stop());
              done = true;
              resolve(st);
            },
            (e) => {
              clearTimeout(timer);
              if (!done) {
                done = true;
                reject(e);
              }
            }
          );
        });

      let stream;
      let wantedSound = false;
      try {
        if (electron) {
          const pick = await pickScreenSource();
          if (!pick) return;
          wantedSound = !!pick.audio;
          log('screen share: start', pick.id, pick.audio ? `sound: ${pick.audio}` : 'no sound');
          this.setStatus('Starting screen share…');
          // Try, in order: computer sound WITHOUT Parley's own sound (no echo) → all computer
          // sound with our settings → with defaults → picture only.
          const attempts = [];
          if (pick.audio === 'exclude') attempts.push(['exclude', audioC]);
          if (pick.audio) attempts.push(['plain', audioC], ['plain', true]);
          attempts.push([false, false]);
          let lastErr = null;
          for (const [mode, audio] of attempts) {
            try {
              await electron.selectScreenSource(pick.id, mode);
              stream = await capture({ video: videoC, audio });
              break;
            } catch (e) {
              lastErr = e;
              log('screen share attempt failed', mode || 'video-only', errText(e));
            }
          }
          if (!stream) throw lastErr || new Error('no stream');
        } else {
          wantedSound = true;
          this.setStatus('Starting screen share…');
          stream = await capture({ video: videoC, audio: audioC, systemAudio: 'include' });
        }
      } catch (e) {
        this.setStatus('');
        if (e && e.name === 'NotAllowedError' && !electron) return; // user pressed Cancel in the browser picker
        log('screen share failed', errText(e));
        if (electron?.platform === 'darwin') {
          toast('Screen sharing was blocked. Allow Parley in System Settings → Privacy & Security → Screen & System Audio Recording, then restart Parley.', 9000);
        } else {
          toast(`Screen sharing didn’t start (${errText(e)}). Settings → Open log file has details.`, 9000);
        }
        return;
      }
      this.setStatus('');
      if (this.state === 'idle' || !this.pc) return stream.getTracks().forEach((t) => t.stop());
      const track = stream.getVideoTracks()[0];
      if (!track) {
        stream.getTracks().forEach((t) => t.stop());
        return toast('Screen sharing gave no picture. Try a different screen or window.');
      }
      log('screen share running', track.label, track.getSettings ? track.getSettings() : {});
      track.contentHint = 'detail';
      track.addEventListener('ended', () => this.stopScreen());
      this.screenTrack = track;
      // The screen goes out as an extra video, so your friend still sees your camera beside it.
      const sStream = new MediaStream([track]);
      this.screenStream = sStream;
      this.sig({ kind: 'stream-role', streamId: sStream.id, role: 'screen' });
      this.screenSender = this.pc.addTrack(track, sStream);
      setMaxBitrate(this.screenSender, 2_500_000, 'maintain-resolution');
      if (this.videoSender) setMaxBitrate(this.videoSender, 700_000, 'balanced');
      this.refreshLocalPreview();
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) this.startScreenAudio(audioTrack);
      else if (wantedSound && electron) toast('Sharing your screen without computer sound (your system didn’t allow it).', 6000);
      this.renderControls();
      this.sig({ kind: 'screen', on: true, sound: !!audioTrack, separate: true });
    },

    // Computer sound that goes along with a screen share.
    startScreenAudio(raw) {
      const settings = raw.getSettings ? raw.getSettings() : {};
      // If the engine confirms it's leaving out Parley's own playback, send the sound untouched.
      // Otherwise turn on the echo guard: the shared sound dips whenever your friend talks,
      // so they don't hear their own voice coming back.
      // 'loopbackWithoutChrome' = the OS is leaving all of Parley's playback out of the capture.
      const excluded = settings.restrictOwnAudio === true || /^(loopbackWithoutChrome|restrictOwnAudioBrowserLoopback)/.test(settings.deviceId || '');
      log('screen sound track', { deviceId: settings.deviceId, restrictOwnAudio: settings.restrictOwnAudio, channels: settings.channelCount, label: raw.label });
      const send = excluded ? raw : this.makeEchoGuardTrack(raw);
      send.contentHint = 'music';
      const stream = new MediaStream([send]);
      this.sig({ kind: 'stream-role', streamId: stream.id, role: 'screen-audio' });
      const sender = this.pc.addTrack(send, stream);
      setAudioParams(sender, quality().music);
      log('screen sound on', excluded ? '(own audio excluded by system)' : '(echo guard)');
      this.screenAudio = { raw, send, stream, sender, guard: !excluded };
      raw.addEventListener('ended', () => this.stopScreenAudio());
      if (!excluded) toast('Sharing computer sound. Your system can’t leave Parley’s sound out, so the echo guard dips it while your friend talks.', 7000);
    },

    makeEchoGuardTrack(raw) {
      const ctx = Sound.get();
      const src = ctx.createMediaStreamSource(new MediaStream([raw]));
      const gain = ctx.createGain();
      const dst = ctx.createMediaStreamDestination();
      src.connect(gain).connect(dst);
      // Listen to the friend's voice (the call audio we're playing out loud).
      let analyser = null;
      let buf = null;
      const remoteAudio = this.remoteCamStream?.getAudioTracks()[0];
      if (remoteAudio) {
        const rs = ctx.createMediaStreamSource(new MediaStream([remoteAudio]));
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        rs.connect(analyser);
        buf = new Float32Array(analyser.fftSize);
      }
      let lastVoice = -1e9;
      const iv = setInterval(() => {
        if (!analyser) return;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (rms > 0.015) lastVoice = now;
        const talking = now - lastVoice < 450;
        // duck fast (30ms), recover slowly (250ms) so it doesn't pump
        gain.gain.setTargetAtTime(talking ? 0.03 : 1, ctx.currentTime, talking ? 0.03 : 0.25);
        this.screenAudio && (this.screenAudio.ducked = talking);
      }, 40);
      const out = dst.stream.getAudioTracks()[0];
      out._cleanup = () => {
        clearInterval(iv);
        try {
          src.disconnect();
          gain.disconnect();
          analyser?.disconnect();
        } catch {}
      };
      return out;
    },

    stopScreenAudio() {
      const sa = this.screenAudio;
      if (!sa) return;
      this.screenAudio = null;
      try {
        this.pc?.removeTrack(sa.sender);
      } catch {}
      sa.send._cleanup?.();
      sa.raw.stop();
      if (sa.send !== sa.raw) sa.send.stop();
      if (this.state !== 'idle') this.sig({ kind: 'screen-audio-stop' });
    },

    async stopScreen() {
      if (!this.screenTrack) return;
      const t = this.screenTrack;
      this.screenTrack = null;
      t.stop();
      this.stopScreenAudio();
      if (this.screenSender) {
        try {
          this.pc?.removeTrack(this.screenSender);
        } catch {}
        this.screenSender = null;
      }
      this.screenStream = null;
      this.refreshLocalPreview();
      if (this.videoSender) setMaxBitrate(this.videoSender, 1_500_000, 'balanced');
      this.renderControls();
      if (this.state !== 'idle') this.sig({ kind: 'screen', on: false, separate: true });
    },
    clearRemoteScreen() {
      el.screen.srcObject = null;
      el.stage.classList.remove('has-screen');
      this.renderControls();
    },

    // ---- watch together
    async startMedia(file) {
      if (!this.pc || this.state === 'idle') return toast('Start a call first.');
      if (this.remoteMediaId) return toast(`${this.peer} is already sharing a video.`);
      await this.stopMedia();
      const v = el.media;
      this.mediaUrl = URL.createObjectURL(file);
      v.srcObject = null;
      v.src = this.mediaUrl;
      v.muted = false;
      v.controls = false; // our own bar (play/pause, ±10 s, seek) works for both of you
      v.volume = Number($('#mediaVolume').value);
      try {
        await v.play();
      } catch (e) {
        toast('That file can’t be played. Try an .mp4 (H.264) or .webm video.');
        return this.stopMedia();
      }
      const stream = v.captureStream();
      await waitFor(() => stream.getVideoTracks().length && stream.getAudioTracks().length, 1500);
      if (!stream.getVideoTracks().length && !stream.getAudioTracks().length) {
        log('watch-together: captureStream gave no tracks');
        toast('Couldn’t read that video for sharing. Try converting it to .mp4 (H.264/AAC).', 7000);
        return this.stopMedia();
      }
      log('watch-together start', file.name, file.type, `${v.videoWidth}x${v.videoHeight}`, 'tracks', stream.getTracks().map((t) => t.kind).join(','));
      this.mediaStream = stream;
      this.sig({ kind: 'stream-role', streamId: stream.id, role: 'media', title: file.name });
      for (const t of stream.getTracks()) this.addMediaTrack(t);
      stream.addEventListener('addtrack', (e) => this.addMediaTrack(e.track));
      $('#mediaTitle').textContent = `You’re sharing: ${file.name}`;
      el.stage.classList.add('has-media', 'media-local');
      this.renderControls();
    },

    addMediaTrack(t) {
      if (!this.pc || !this.mediaStream) return;
      if (this.mediaSenders.some((s) => s.track === t)) return;
      if (t.kind === 'video') t.contentHint = 'motion';
      const s = this.pc.addTrack(t, this.mediaStream);
      this.mediaSenders.push(s);
      log('watch-together track added', t.kind);
      if (t.kind === 'video') setMaxBitrate(s, store.get('quality', 'high') === 'low' ? 2_000_000 : 6_000_000, 'maintain-framerate');
      else {
        t.contentHint = 'music';
        setAudioParams(s, quality().music);
      }
    },

    async stopMedia() {
      const wasSharing = !!this.mediaStream;
      for (const s of this.mediaSenders) {
        try {
          this.pc?.removeTrack(s);
        } catch {}
      }
      this.mediaSenders = [];
      this.mediaStream = null;
      if (this.mediaUrl) {
        el.media.pause();
        el.media.removeAttribute('src');
        el.media.load();
        URL.revokeObjectURL(this.mediaUrl);
        this.mediaUrl = null;
      }
      el.stage.classList.remove('media-local');
      if (!this.remoteMediaId) el.stage.classList.remove('has-media');
      if (wasSharing && this.state !== 'idle') this.sig({ kind: 'media-stop' });
      this.renderControls();
    },

    // Play / pause / skip work from both sides: the viewer's buttons ask the sharer's player.
    // delta = seconds to skip ('seek'), or the spot to jump to ('seekTo').
    mediaControl(action, delta = 0) {
      const v = el.media;
      if (this.mediaUrl) {
        if (action === 'toggle') (v.paused ? v.play() : Promise.resolve(v.pause())).catch(() => {});
        else if (action === 'seek' && isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration - 0.25, v.currentTime + delta));
        else if (action === 'seekTo' && isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration - 0.25, delta));
      } else if (this.remoteMediaId) {
        this.sig({ kind: 'media-ctl', action, delta });
      }
    },
    sendMediaState() {
      if (!this.mediaUrl) return;
      const v = el.media;
      this.sig({ kind: 'media-state', paused: v.paused, ended: v.ended, t: v.currentTime, d: isFinite(v.duration) ? v.duration : 0 });
      this.renderMediaBar();
    },
    // where the movie is, on both sides (the viewer works it out from the sharer's last update)
    mediaPos() {
      if (this.mediaUrl) {
        const v = el.media;
        return { t: v.currentTime || 0, d: isFinite(v.duration) ? v.duration : 0 };
      }
      const p = this.remoteMediaPos;
      if (!p) return { t: 0, d: 0 };
      const t = this.remoteMediaPaused ? p.t : p.t + (performance.now() - p.at) / 1000;
      return { t: p.d ? Math.min(t, p.d) : t, d: p.d };
    },
    renderMediaBar() {
      const paused = this.mediaUrl ? el.media.paused : !!this.remoteMediaPaused;
      const b = $('#mediaPlayBtn');
      if (b.dataset.icon !== (paused ? 'play' : 'pause')) setIcon(b, paused ? 'play' : 'pause');
      b.title = paused ? 'Play' : 'Pause';
      const { t, d } = this.mediaPos();
      const seek = $('#mediaSeek');
      if (!seek.matches(':active')) {
        seek.value = d ? Math.round((t / d) * 1000) : 0;
        $('#mediaPos').textContent = fmtDur(t * 1000);
      }
      seek.disabled = !d;
      $('#mediaDur').textContent = d ? fmtDur(d * 1000) : '–:––';
    },

    showRemoteMedia(stream) {
      const v = el.media;
      if (v.srcObject !== stream) {
        v.removeAttribute('src');
        v.srcObject = stream;
      }
      v.controls = false;
      v.muted = false;
      v.volume = Number($('#mediaVolume').value);
      v.play().catch(() => {});
      $('#mediaTitle').textContent = `${this.peer} is sharing: ${this.remoteMediaTitle || 'a video'}`;
      el.stage.classList.add('has-media');
      el.stage.classList.remove('media-local');
      this.renderControls();
    },

    clearMediaView() {
      this.remoteMediaId = null;
      if (!this.mediaUrl) {
        el.media.srcObject = null;
        el.stage.classList.remove('has-media');
      }
      this.renderControls();
    },

    // ---- UI
    showStage(status) {
      $('#convo').classList.add('in-call');
      callLayout(true);
      el.stage.classList.remove('hidden', 'has-media', 'media-local', 'remote-cam-on', 'remote-screen', 'sharing-screen', 'has-screen');
      const ra = $('#remoteAvatar');
      ra.innerHTML = '';
      const av = document.createElement('div');
      av.className = 'avatar';
      paintAvatar(av, this.peer);
      ra.append(av);
      el.timer.textContent = '';
      this.setStatus(status);
      this.renderControls();
      this.renderFlags();
      this.setBusy(true);
      electron?.setCallState(true);
      renderHeader();
    },
    setStatus(t) {
      el.status.textContent = t || '';
    },
    sendFlags() {
      if (!this.pc) return;
      this.sig({ kind: 'cam', on: this.camOn });
      this.sig({ kind: 'mic', on: this.micOn });
      if (this.screenTrack) this.sig({ kind: 'screen', on: true, sound: !!this.screenAudio });
    },
    renderFlags() {
      const f = $('#remoteFlags');
      f.innerHTML = '';
      if (this.remoteMicOn === false) f.insertAdjacentHTML('beforeend', `<span class="flag">${icon('micOff')} Muted</span>`);
      if (this.remoteScreen)
        f.insertAdjacentHTML('beforeend', `<span class="flag">${icon('screen')} Sharing screen${this.remoteScreenSound ? ' + sound' : ''}</span>`);
      if (this.netQ && this.netQ <= 2)
        f.insertAdjacentHTML('beforeend', `<span class="flag net" title="The connection is struggling — video may get blurry or freeze"><span class="bars q${this.netQ}"><i></i><i></i><i></i><i></i></span> ${this.netQ === 1 ? 'Very weak connection' : 'Weak connection'}</span>`);
    },
    // Connection quality from round-trip time and packet loss (like Teams' "poor network" flag).
    async pollStats() {
      const pc = this.pc;
      if (!pc || this.state !== 'active') return;
      let st;
      try {
        st = await pc.getStats();
      } catch {
        return;
      }
      let rtt = null;
      let lost = 0;
      let recv = 0;
      st.forEach((r) => {
        if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded' && r.currentRoundTripTime != null) rtt = r.currentRoundTripTime;
        if (r.type === 'inbound-rtp') {
          lost += Math.max(0, r.packetsLost || 0);
          recv += r.packetsReceived || 0;
        }
      });
      const prev = this.statPrev || { lost, recv };
      this.statPrev = { lost, recv };
      const dl = lost - prev.lost;
      const dr = recv - prev.recv;
      const loss = dl + dr > 0 ? dl / (dl + dr) : 0;
      let q = 4;
      if ((rtt != null && rtt > 0.35) || loss > 0.03) q = 3;
      if ((rtt != null && rtt > 0.6) || loss > 0.08) q = 2;
      if ((rtt != null && rtt > 1.2) || loss > 0.18) q = 1;
      // smooth it out so the flag doesn't flicker
      this.qHist = [...(this.qHist || []), q].slice(-3);
      const avg = Math.round(this.qHist.reduce((a, b) => a + b, 0) / this.qHist.length);
      if (avg !== this.netQ) {
        this.netQ = avg;
        this.renderFlags();
        if (avg <= 2) log('connection quality', avg, { rtt, loss: Math.round(loss * 1000) / 10 });
      }
    },
    renderControls() {
      const mic = $('#micBtn');
      setIcon(mic, this.micOn ? 'mic' : 'micOff');
      mic.classList.toggle('off', !this.micOn);
      mic.title = this.micOn ? 'Mute microphone' : 'Unmute microphone';
      const cam = $('#camBtn');
      setIcon(cam, this.camOn ? 'video' : 'videoOff');
      cam.classList.toggle('off', !this.camOn);
      cam.title = this.camOn ? 'Turn camera off' : 'Turn camera on';
      const scr = $('#screenBtn');
      scr.classList.toggle('on', !!this.screenTrack);
      scr.title = this.screenTrack ? `Stop sharing screen (${KEY_MOD}+Shift+E)` : `Share your screen (${KEY_MOD}+Shift+E)`;
      mic.title += ` (${KEY_MOD}+Shift+M${this.micOn ? '' : ', or hold Space to talk'})`;
      cam.title += ` (${KEY_MOD}+Shift+O)`;
      const live = !!this.pc;
      scr.disabled = !live;
      const w = $('#watchBtn');
      w.disabled = !live || !!this.remoteMediaId;
      w.classList.toggle('on', !!this.mediaStream);
      w.title = this.mediaStream ? 'Stop sharing video' : this.remoteMediaId ? `${this.peer} is sharing a video` : 'Watch a video together';
      const banner = $('#shareBanner');
      banner.classList.toggle('hidden', !this.screenTrack);
      $('#shareBannerText').textContent = this.screenAudio
        ? `You’re sharing your screen + sound${this.screenAudio.guard ? ' (echo guard on)' : ''}`
        : 'You’re sharing your screen';
      this.renderMediaBar();
      if (Mini.isOpen()) Mini.sync();
    },
    setBusy() {
      Presence.push();
    },

    // ---- teardown
    end(reason, ms) {
      if (this.state === 'idle') return;
      const peer = this.peer;
      const wasActive = this.everConnected;
      const dur = this.startedAt ? Date.now() - this.startedAt : 0;
      Sound.stop();
      for (const t of Object.values(this.timers)) {
        clearTimeout(t);
        clearInterval(t);
      }
      this.timers = {};
      exitBrowserPiP();
      Mini.close();
      Idle.reset();
      Levels.stop();
      MutedWatch.stop();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      try {
        this.pc?.close();
      } catch {}
      this.pc = null;
      stopMic(this.audioTrack);
      for (const t of [this.camTrack, this.screenTrack, this.blackTrack]) {
        try {
          t?._stopDraw?.();
          t?.stop();
        } catch {}
      }
      if (this.screenAudio) {
        this.screenAudio.send._cleanup?.();
        this.screenAudio.raw.stop();
        this.screenAudio.send.stop();
      }
      $('#screenAudio').srcObject = null;
      el.screen.srcObject = null;
      $('#mutedHint').classList.add('hidden');
      if (this.mediaUrl) URL.revokeObjectURL(this.mediaUrl);
      Object.assign(this, {
        screenAudio: null, remoteScreenSound: false,
        state: 'idle', peer: null, id: null, audioTrack: null, camTrack: null, blackTrack: null, screenTrack: null,
        audioSender: null, videoSender: null, makingOffer: false, ignoreOffer: false, canOffer: false, pendingIce: [],
        roles: {}, remoteCamStream: null, mediaStream: null, mediaSenders: [], mediaUrl: null, remoteMediaId: null,
        remoteMediaTitle: null, startedAt: 0, everConnected: false, remoteMicOn: true, remoteScreen: false, remoteCamFlag: false,
        remoteMediaPaused: false, screenStarting: false, screenSender: null, screenStream: null, remoteMediaPos: null,
        netQ: 0, qHist: [], statPrev: null, pttActive: false,
      });
      $('#shareBanner').classList.add('hidden');
      el.remote.srcObject = null;
      el.local.srcObject = null;
      el.media.pause();
      el.media.srcObject = null;
      el.media.removeAttribute('src');
      el.stage.classList.add('hidden');
      el.stage.classList.remove('has-screen', 'has-media', 'idle');
      $('#convo').classList.remove('in-call', 'chat-hidden');
      callLayout(false);
      $('#incoming').classList.add('hidden');
      electron?.setCallState(false);
      if (lastUpdate) renderUpdate(lastUpdate);
      this.setBusy(false);
      if (wasActive && peer) {
        Sound.end();
        systemLine(peer, `Call ended · ${fmtDur(dur)}`);
      }
      if (reason) toast(reason, ms);
      if (S.active) renderHeader();
    },
  };


  // ------------------------------------------------------------------ call audio levels
  // "Speaking" ring around your friend's picture when their camera is off.
  const Levels = {
    iv: null,
    an: null,
    src: null,
    start() {
      this.stop();
      const track = Call.remoteCamStream?.getAudioTracks()[0];
      if (!track) return;
      const ctx = Sound.get();
      this.src = ctx.createMediaStreamSource(new MediaStream([track]));
      this.an = ctx.createAnalyser();
      this.an.fftSize = 512;
      this.src.connect(this.an);
      const buf = new Float32Array(this.an.fftSize);
      let last = 0;
      const wrap = document.querySelector('.remote-wrap');
      this.iv = setInterval(() => {
        this.an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        if (rms > 0.02) last = performance.now();
        wrap.classList.toggle('speaking', performance.now() - last < 300 && Call.remoteMicOn !== false);
      }, 100);
    },
    stop() {
      clearInterval(this.iv);
      this.iv = null;
      try {
        this.src?.disconnect();
      } catch {}
      this.src = this.an = null;
      document.querySelector('.remote-wrap')?.classList.remove('speaking');
    },
  };

  // "You're muted" — if you talk while muted, say so (like Teams), with an Unmute button.
  const MutedWatch = {
    iv: null,
    track: null,
    src: null,
    hideTimer: null,
    start(raw) {
      this.stop();
      if (!raw || raw._parleyPlaceholder || raw.readyState === 'ended') return;
      try {
        this.track = raw.clone();
        this.track.enabled = true;
        const ctx = Sound.get();
        this.src = ctx.createMediaStreamSource(new MediaStream([this.track]));
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        this.src.connect(an);
        const buf = new Float32Array(an.fftSize);
        let loud = 0;
        this.iv = setInterval(() => {
          if (Call.micOn || Call.state !== 'active') {
            loud = 0;
            return this.hide();
          }
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          loud = rms > 0.04 ? loud + 1 : Math.max(0, loud - 1);
          if (loud >= 4) {
            $('#mutedHint').classList.remove('hidden');
            clearTimeout(this.hideTimer);
            this.hideTimer = setTimeout(() => this.hide(), 4000);
          }
        }, 150);
      } catch (e) {
        log('muted watch failed', errText(e));
      }
    },
    hide() {
      clearTimeout(this.hideTimer);
      $('#mutedHint').classList.add('hidden');
    },
    stop() {
      clearInterval(this.iv);
      this.iv = null;
      this.hide();
      try {
        this.src?.disconnect();
        this.track?.stop();
      } catch {}
      this.src = this.track = null;
    },
  };

  function setChatHidden(hidden) {
    $('#convo').classList.toggle('chat-hidden', hidden);
    if (!hidden && S.active) {
      if (S.unread[keyOf(S.active)]) {
        delete S.unread[keyOf(S.active)];
        store.set('unread', S.unread);
        updateUnreadBadge();
        renderContacts();
      }
      scrollToBottom();
      sendRead(S.active);
    }
    renderToggles();
  }

  // ------------------------------------------------------------------ mini window (desktop app)
  // A small always-on-top window with the other person's video (or the shared movie).
  // It's opened from here with window.open, so it can show the call's video streams directly.
  // Drag it anywhere, resize it from any corner, double-click it to go back.
  const MINI_CSS = `
    *{box-sizing:border-box}html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:"Segoe UI Variable Text","Segoe UI",-apple-system,system-ui,sans-serif;color:#fff;user-select:none}
    .root{position:fixed;inset:0;cursor:grab}.root.dragging{cursor:grabbing}
    video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}
    .root.contain #v{object-fit:contain}
    .av{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#1d2a38,#06090c)}
    .av>div{width:min(38vw,38vh,96px);height:min(38vw,38vh,96px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:min(14vw,14vh,34px);
      background:linear-gradient(135deg,hsl(var(--h) 62% 52%),hsl(calc(var(--h) + 35) 58% 38%));background-size:cover;background-position:center;transition:box-shadow .15s}
    .av>div.img{color:transparent}
    .av>div.speaking{box-shadow:0 0 0 3px #3ecf8e,0 0 0 10px rgba(62,207,142,.25)}
    #self{left:auto;top:auto;right:8px;bottom:8px;width:24%;max-width:150px;height:auto;aspect-ratio:16/9;border-radius:8px;transform:scaleX(-1);border:1px solid rgba(255,255,255,.18);box-shadow:0 4px 12px rgba(0,0,0,.5);transition:bottom .25s}
    .narrow #self{display:none}
    .top{position:absolute;left:0;right:0;top:0;padding:7px 8px 16px 10px;display:flex;gap:7px;align-items:center;font-size:12px;font-weight:600;
      background:linear-gradient(rgba(0,0,0,.65),transparent);transition:opacity .25s}
    .top .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .top .t{opacity:.75;font-variant-numeric:tabular-nums;font-weight:500}
    .top .sp{flex:1}
    .top button{width:26px;height:26px;border-radius:8px;border:0;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0;flex-shrink:0}
    .top button:hover{background:rgba(255,255,255,.28)}
    .top svg{width:14px;height:14px;display:block}
    .muted-flag{position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.6);border-radius:7px;padding:3px 6px;font-size:11px;display:none;transition:bottom .25s}
    .muted-flag.on{display:block}
    .ctl{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;align-items:center;gap:4px;padding:4px;border-radius:20px;background:rgba(10,14,19,.75);
      backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.08);transition:opacity .25s,transform .25s}
    .ctl button{width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
    .ctl button:hover{background:rgba(255,255,255,.28)}.ctl button.off{background:#eef2f6;color:#111}
    .ctl button.danger{background:#e5484d;width:40px;border-radius:14px;margin-left:12px}.ctl button.danger:hover{background:#cc3a3f}
    .ctl svg{width:14px;height:14px;display:block}.ctl button.danger svg{width:18px;height:18px}
    .idle .top,.idle .ctl{opacity:0;pointer-events:none}.idle .ctl{transform:translate(-50%,6px)}.idle{cursor:none}
    .grip{position:absolute;width:16px;height:16px;z-index:5}
    .grip.nw{left:0;top:0;cursor:nwse-resize}.grip.ne{right:0;top:0;cursor:nesw-resize}
    .grip.sw{left:0;bottom:0;cursor:nesw-resize}.grip.se{right:0;bottom:0;cursor:nwse-resize}
    .edge{position:absolute;z-index:4}.edge.n{left:16px;right:16px;top:0;height:5px;cursor:ns-resize}.edge.s{left:16px;right:16px;bottom:0;height:5px;cursor:ns-resize}
    .edge.w{top:16px;bottom:16px;left:0;width:5px;cursor:ew-resize}.edge.e{top:16px;bottom:16px;right:0;width:5px;cursor:ew-resize}`;

  const Mini = {
    w: null,
    els: null,
    timer: null,
    idleTimer: null,
    shown: { v: null, self: null },
    isOpen() {
      return !!(this.w && !this.w.closed);
    },
    open() {
      if (!electron || Call.state === 'idle') return false;
      if (this.isOpen()) return true;
      const w = window.open('about:blank', 'parley-mini', 'popup');
      if (!w) {
        log('mini window: window.open refused');
        return false;
      }
      this.w = w;
      const d = w.document;
      d.title = `Parley — ${Call.peer || ''}`;
      const st = d.createElement('style');
      st.textContent = MINI_CSS;
      d.head.append(st);
      d.body.innerHTML = `<div class="root">
          <div class="av"><div></div></div>
          <video id="v" autoplay playsinline muted></video>
          <video id="self" autoplay playsinline muted></video>
          <div class="top"><span class="n"></span><span class="t"></span><span class="sp"></span>
            <button data-a="expand" title="Back to the full window (double-click works too)">${icon('backToCall')}</button></div>
          <div class="muted-flag">${icon('micOff').replace('<svg', '<svg style="width:12px;height:12px;display:inline;vertical-align:-2px"')} muted</div>
          <div class="ctl">
            <button data-a="mic" title="Mute">${icon('mic')}</button>
            <button data-a="cam" title="Camera">${icon('video')}</button>
            <button data-a="hangup" class="danger" title="Hang up">${icon('hangup')}</button>
          </div>
          <div class="edge n" data-r="n"></div><div class="edge s" data-r="s"></div><div class="edge w" data-r="w"></div><div class="edge e" data-r="e"></div>
          <div class="grip nw" data-r="nw"></div><div class="grip ne" data-r="ne"></div><div class="grip sw" data-r="sw"></div><div class="grip se" data-r="se"></div>
        </div>`;
      const q = (s) => d.querySelector(s);
      this.els = { root: q('.root'), v: q('#v'), self: q('#self'), av: q('.av>div'), name: q('.n'), time: q('.t'), muted: q('.muted-flag'), mic: q('[data-a=mic]'), cam: q('[data-a=cam]') };
      this.shown = { v: null, self: null };
      d.body.addEventListener('click', (e) => {
        const a = e.target.closest('button')?.dataset.a;
        if (a === 'expand') this.expand();
        else if (a === 'mic') Call.toggleMic();
        else if (a === 'cam') Call.toggleCam();
        else if (a === 'hangup') Call.hangup();
      });
      this.bindPointer(w, d);
      this.sync();
      this.timer = setInterval(() => this.sync(), 400);
      w.addEventListener('beforeunload', () => this.cleanup());
      log('mini window opened');
      return true;
    },
    expand() {
      electron?.miniExpand();
    },
    close() {
      if (this.w && !this.w.closed) this.w.close();
      this.cleanup();
    },
    cleanup() {
      clearInterval(this.timer);
      clearTimeout(this.idleTimer);
      this.timer = null;
      this.w = null;
      this.els = null;
    },
    // Moving and resizing: pointer events here, bounds applied by the main process.
    bindPointer(w, d) {
      const root = this.els.root;
      let drag = null;
      const wake = () => {
        root.classList.remove('idle');
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.els && root.classList.add('idle'), 2500);
      };
      wake();
      root.addEventListener('pointermove', (e) => {
        wake();
        if (!drag || !drag.b) return;
        const dx = e.screenX - drag.x;
        const dy = e.screenY - drag.y;
        const b = { ...drag.b };
        const r = drag.r;
        if (!r) {
          b.x += dx;
          b.y += dy;
        } else {
          if (r.includes('e')) b.width += dx;
          if (r.includes('s')) b.height += dy;
          if (r.includes('w')) {
            b.width -= dx;
            b.x += dx;
          }
          if (r.includes('n')) {
            b.height -= dy;
            b.y += dy;
          }
          // don't let the far edge slide when we hit the minimum size
          if (b.width < 200) {
            if (r.includes('w')) b.x -= 200 - b.width;
            b.width = 200;
          }
          if (b.height < 120) {
            if (r.includes('n')) b.y -= 120 - b.height;
            b.height = 120;
          }
        }
        if (!drag.raf) {
          drag.raf = w.requestAnimationFrame(() => {
            if (drag) drag.raf = 0;
            electron.miniSetBounds(b);
          });
        }
      });
      root.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.ctl, button')) return;
        const r = e.target.dataset.r || '';
        drag = { x: e.screenX, y: e.screenY, r, b: null, raf: 0 };
        electron.miniGetBounds().then((b) => drag && (drag.b = b));
        root.setPointerCapture(e.pointerId);
        if (!r) root.classList.add('dragging');
      });
      const end = (e) => {
        drag = null;
        root.classList.remove('dragging');
        try {
          root.releasePointerCapture(e.pointerId);
        } catch {}
      };
      root.addEventListener('pointerup', end);
      root.addEventListener('pointercancel', end);
      root.addEventListener('mouseleave', () => !drag && root.classList.add('idle'));
      root.addEventListener('dblclick', (e) => !e.target.closest('.ctl, button') && this.expand());
      d.addEventListener('keydown', (e) => e.key === 'Escape' && this.expand());
    },
    // Keep the mini window showing whatever matters most right now.
    sync() {
      if (!this.isOpen()) return this.cleanup();
      const E = this.els;
      const stage = el.stage.classList;
      let stream = null;
      if (stage.contains('has-media')) stream = Call.mediaUrl ? Call.mediaStream : el.media.srcObject;
      else if (stage.contains('has-screen')) stream = el.screen.srcObject;
      else if (stage.contains('remote-cam-on')) stream = el.remote.srcObject;
      if (this.shown.v !== stream) {
        this.shown.v = stream;
        E.v.srcObject = stream || null;
        if (stream) E.v.play().catch(() => {});
      }
      E.v.style.display = stream ? '' : 'none';
      E.root.classList.toggle('contain', stage.contains('has-media') || stage.contains('has-screen') || stage.contains('remote-screen'));
      const selfStream = Call.camOn ? el.local.srcObject : null;
      if (this.shown.self !== selfStream) {
        this.shown.self = selfStream;
        E.self.srcObject = selfStream || null;
        if (selfStream) E.self.play().catch(() => {});
      }
      E.self.style.display = selfStream ? '' : 'none';
      E.root.classList.toggle('narrow', this.w.innerWidth < 300 || this.w.innerHeight < 160);
      E.av.classList.toggle('speaking', !!document.querySelector('.remote-wrap.speaking'));
      const peer = Call.peer || '';
      E.name.textContent = peer;
      E.time.textContent = el.timer.textContent || el.status.textContent || '';
      E.av.style.setProperty('--h', hue(peer));
      const img = Avatars.get(peer);
      E.av.classList.toggle('img', !!img);
      E.av.style.backgroundImage = img ? `url("${img}")` : '';
      E.av.textContent = initials(peer);
      E.muted.classList.toggle('on', Call.remoteMicOn === false);
      E.mic.innerHTML = icon(Call.micOn ? 'mic' : 'micOff');
      E.mic.classList.toggle('off', !Call.micOn);
      E.cam.innerHTML = icon(Call.camOn ? 'video' : 'videoOff');
      E.cam.classList.toggle('off', !Call.camOn);
    },
  };
  window.__parleyMini = { open: () => Mini.open(), close: () => Mini.close() };
  electron?.onMiniClosed?.(() => Mini.cleanup());

  // Browser version: fall back to the browser's own picture-in-picture.
  async function enterBrowserPiP() {
    if (!document.pictureInPictureEnabled) return false;
    const useMedia = el.stage.classList.contains('has-media') && el.media.readyState >= 2;
    const useScreen = el.stage.classList.contains('has-screen') && el.screen.readyState >= 2;
    const remoteHasVideo = el.stage.classList.contains('remote-cam-on') && el.remote.readyState >= 2;
    const v = useMedia ? el.media : useScreen ? el.screen : remoteHasVideo ? el.remote : null;
    if (!v) return false;
    try {
      if (document.pictureInPictureElement !== v) await v.requestPictureInPicture();
      return true;
    } catch (e) {
      console.warn('PiP refused', e);
      return false;
    }
  }
  function exitBrowserPiP() {
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
  }
  async function goMini() {
    if (electron) return electron.goMini();
    const ok = await enterBrowserPiP();
    if (!ok) toast('Nothing to show in a mini window yet — the other person’s camera is off.');
  }

  // ------------------------------------------------------------------ call UI: auto-hide + full screen
  const Idle = {
    timer: null,
    wake() {
      el.stage.classList.remove('idle');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.sleep(), 3000);
    },
    sleep() {
      if (!store.get('autoHideUi', true) || Call.state !== 'active') return;
      if (el.stage.matches(':hover') && document.querySelector('.controls:hover, .media-bar:hover, .share-banner:hover')) return this.wake();
      if (!$('#screenPicker').classList.contains('hidden')) return this.wake();
      el.stage.classList.add('idle');
    },
    reset() {
      clearTimeout(this.timer);
      el.stage.classList.remove('idle');
    },
  };
  function toggleFullscreen() {
    if (document.fullscreenElement) return document.exitFullscreen().catch(() => {});
    if (Call.state === 'idle') return;
    el.stage.requestFullscreen().catch((e) => log('fullscreen refused', errText(e)));
  }
  document.addEventListener('fullscreenchange', () => {
    const on = document.fullscreenElement === el.stage;
    const b = $('#fullBtn');
    setIcon(b, on ? 'fullscreenExit' : 'fullscreen');
    b.title = on ? 'Exit full screen (Esc)' : 'Full screen (double-click the video)';
  });

  // ------------------------------------------------------------------ screen picker (desktop app)
  function pickScreenSource() {
    return new Promise(async (resolve) => {
      const modal = $('#screenPicker');
      const grid = $('#sourceGrid');
      const note = $('#pickerNote');
      grid.innerHTML = '<p>Loading…</p>';
      note.classList.add('hidden');
      modal.classList.remove('hidden');
      const soundBox = $('#shareSound');
      soundBox.checked = store.get('shareSound', true);
      let loop = await electron.loopbackSupported().catch(() => ({ supported: false, exclude: false }));
      if (typeof loop === 'boolean') loop = { supported: loop, exclude: false };
      $('#shareSoundField').classList.toggle('hidden', !loop.supported);
      $('#shareSoundHint').textContent = loop.exclude
        ? '· your friend’s voice is left out automatically'
        : '· your system can’t leave Parley’s sound out, so the echo guard will dip it while your friend talks (headphones help)';
      const done = (id) => {
        modal.classList.add('hidden');
        $('#pickerCancel').onclick = null;
        store.set('shareSound', soundBox.checked);
        const audio = loop.supported && soundBox.checked ? (loop.exclude ? 'exclude' : 'plain') : false;
        resolve(id ? { id, audio } : null);
      };
      $('#pickerCancel').onclick = () => done(null);
      let res;
      try {
        res = await electron.getScreenSources();
      } catch (e) {
        grid.innerHTML = '';
        toast('Couldn’t list screens.');
        return done(null);
      }
      if (res.needsPermission) {
        note.innerHTML = '';
        note.append('macOS needs Screen Recording permission for Parley. If previews look empty, allow it and restart Parley.');
        const b = document.createElement('button');
        b.className = 'btn small';
        b.textContent = 'Open Settings';
        b.onclick = () => electron.openPrivacySettings('screen');
        note.append(b);
        note.classList.remove('hidden');
      }
      grid.innerHTML = '';
      const list = res.sources.sort((a, b) => b.isScreen - a.isScreen);
      for (const s of list) {
        const btn = document.createElement('button');
        btn.className = 'source';
        const img = document.createElement('img');
        img.src = s.thumbnail;
        img.alt = '';
        const label = document.createElement('span');
        label.textContent = s.isScreen ? `🖥 ${s.name}` : s.name;
        btn.append(img, label);
        btn.onclick = () => done(s.id);
        grid.append(btn);
      }
      if (!list.length) grid.innerHTML = '<p>No screens or windows found.</p>';
    });
  }

  // ------------------------------------------------------------------ updates (desktop app)
  function renderUpdate(st) {
    if (!st) return;
    const bar = $('#updateBar');
    const text = $('#updateText');
    const btn = $('#updateBtn');
    $('#versionText').textContent = `Parley ${st.current}` + (st.state === 'none' ? ' · up to date' : '');
    if (st.state === 'downloading') {
      bar.classList.remove('hidden');
      text.textContent = `Downloading Parley ${st.version}… ${st.progress || 0}%`;
      btn.classList.add('hidden');
    } else if (st.state === 'ready') {
      bar.classList.remove('hidden');
      btn.classList.remove('hidden');
      const busy = Call.state !== 'idle';
      text.textContent = busy ? `Parley ${st.version} is ready. Restart after your call.` : `Parley ${st.version} is ready.`;
      btn.disabled = busy;
      btn.textContent = 'Restart';
    } else if (st.state === 'error' && /Applications|replace itself/.test(st.error || '')) {
      bar.classList.remove('hidden');
      btn.classList.add('hidden');
      text.textContent = st.error;
    } else bar.classList.add('hidden');
  }
  let lastUpdate = null;
  electron?.onUpdateStatus?.((st) => {
    lastUpdate = st;
    renderUpdate(st);
  });

  // ------------------------------------------------------------------ settings
  let previewStream = null;
  async function openSettings() {
    $('#settings').classList.remove('hidden');
    $('#noiseSelect').value = NoiseFX.mode();
    $('#qualitySelect').value = store.get('quality', 'high');
    $('#ringVolume').value = Ring.volume();
    $('#hearSelf').checked = false;
    $('#autoHideUi').checked = store.get('autoHideUi', true);
    $('#readReceipts').checked = store.get('readReceipts', true);
    $('#linkPreviews').checked = store.get('linkPreviews', true);
    $('#msgSound').checked = store.get('msgSound', true);
    renderShortcuts();
    paintAvatar($('#settingsAvatar'), S.me);
    $('#avatarRemoveBtn').disabled = !store.get(myAvatarKey(), null)?.data;
    renderThemes();
    fillRingtones();
    fillBrowsers();
    if (electron?.getAppSettings) {
      const a = await electron.getAppSettings().catch(() => null);
      if (a) {
        $('#keepRunning').checked = a.keepRunning;
        $('#openAtLogin').checked = a.openAtLogin;
        $('#openAtLoginLabel').textContent = a.platform === 'darwin' ? 'Open Parley when I log in to my Mac' : 'Start Parley when Windows starts';
        $('#versionText').textContent = `Parley ${a.version}`;
        $('#appSection').classList.toggle('hidden', a.platform === 'linux' && !navigator.webdriver);
      }
      electron.updateStatus?.().then(renderUpdate).catch(() => {});
    }
    let devices = await navigator.mediaDevices.enumerateDevices();
    if (!devices.some((d) => d.label)) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        s.getTracks().forEach((t) => t.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch {}
    }
    const prefs = store.get('devices', {});
    const fill = (sel, kind, chosen) => {
      sel.innerHTML = '';
      const list = devices.filter((d) => d.kind === kind);
      for (const d of list) {
        const o = document.createElement('option');
        o.value = d.deviceId;
        o.textContent = d.label || `${kind} ${sel.length + 1}`;
        if (d.deviceId === chosen) o.selected = true;
        sel.append(o);
      }
      if (!list.length) sel.innerHTML = '<option value="">None found</option>';
    };
    fill($('#camSelect'), 'videoinput', prefs.cam);
    fill($('#micSelect'), 'audioinput', prefs.mic);
    const canSink = 'setSinkId' in HTMLMediaElement.prototype;
    $('#speakerField').classList.toggle('hidden', !canSink);
    if (canSink) fill($('#speakerSelect'), 'audiooutput', prefs.speaker);
    startPreview();
    startMicTest();
  }
  function renderThemes() {
    const g = $('#themeGrid');
    g.innerHTML = '';
    const cur = themeId();
    const entries = [['auto', { name: 'Match system', auto: true }], ...Object.entries(THEMES)];
    for (const [id, t] of entries) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme' + (id === cur ? ' active' : '');
      b.dataset.theme = id;
      const a = t.auto ? THEMES.midnight : t;
      const z = t.auto ? THEMES.light : t;
      b.innerHTML = `<div class="theme-prev"><i></i><i></i></div><span class="theme-name"></span>`;
      const prev = b.querySelector('.theme-prev');
      prev.style.background = t.auto ? `linear-gradient(90deg, ${a.bg} 50%, ${z.bg} 50%)` : t.bg;
      const [i1, i2] = prev.querySelectorAll('i');
      i1.style.background = t.auto ? a.them : t.them;
      i2.style.background = t.auto ? z.me : t.me;
      b.querySelector('.theme-name').textContent = t.name;
      b.onclick = () => {
        store.set('theme', id);
        applyTheme(id);
        renderThemes();
      };
      g.append(b);
    }
  }
  async function startPreview() {
    stopPreview();
    if (Call.state !== 'idle') {
      $('#previewVideo').srcObject = el.local.srcObject;
      return;
    }
    try {
      const id = $('#camSelect').value;
      previewStream = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true });
      $('#previewVideo').srcObject = previewStream;
    } catch {}
  }
  function stopPreview() {
    previewStream?.getTracks().forEach((t) => t.stop());
    previewStream = null;
    $('#previewVideo').srcObject = null;
  }

  // Level meter (after noise removal) + optional "hear yourself" loop.
  let micTest = null;
  async function startMicTest() {
    stopMicTest();
    const token = {};
    micTest = token;
    let track;
    let own = false;
    try {
      if (Call.state !== 'idle' && Call.audioTrack && !Call.audioTrack._parleyPlaceholder) {
        track = Call.audioTrack;
      } else {
        const id = $('#micSelect').value;
        const c = audioConstraints();
        if (id) c.deviceId = { exact: id };
        const s = await navigator.mediaDevices.getUserMedia({ audio: c });
        track = await NoiseFX.process(s.getAudioTracks()[0]);
        own = true;
      }
    } catch (e) {
      log('mic test failed', errText(e));
      return;
    }
    if (micTest !== token) return own && stopMic(track);
    const ctx = Sound.get();
    const src = ctx.createMediaStreamSource(new MediaStream([track]));
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const bar = $('#micMeter');
    let raf;
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      bar.style.width = Math.min(100, Math.round(Math.sqrt(rms) * 160)) + '%';
      raf = requestAnimationFrame(tick);
    };
    tick();
    Object.assign(token, {
      track,
      own,
      stop() {
        cancelAnimationFrame(raf);
        try {
          src.disconnect();
        } catch {}
        bar.style.width = '0';
        const a = $('#hearSelfAudio');
        a.pause();
        a.srcObject = null;
        if (own) stopMic(track);
      },
    });
    applyHearSelf();
  }
  function stopMicTest() {
    micTest?.stop?.();
    micTest = null;
  }
  function applyHearSelf() {
    const a = $('#hearSelfAudio');
    if ($('#hearSelf').checked && micTest?.track) {
      a.srcObject = new MediaStream([micTest.track]);
      const spk = $('#speakerSelect').value;
      if (spk && a.setSinkId) a.setSinkId(spk).catch(() => {});
      a.play().catch(() => {});
    } else {
      a.pause();
      a.srcObject = null;
    }
  }

  async function fillRingtones() {
    const sel = $('#ringSelect');
    sel.innerHTML = '';
    for (const [id, r] of Object.entries(RINGTONES)) sel.append(new Option(r.name, id));
    const custom = await FileStore.get('ringtone').catch(() => null);
    if (custom && custom.blob) sel.append(new Option(`Your sound: ${custom.name || 'custom'}`, 'custom'));
    sel.append(new Option('Choose a sound file…', '__file'));
    sel.value = Ring.choice() === 'custom' && !custom ? 'classic' : Ring.choice();
  }
  async function fillBrowsers() {
    if (!electron?.listBrowsers) return;
    const sel = $('#browserSelect');
    const chosen = store.get('linkBrowser', '');
    const list = await electron.listBrowsers().catch(() => []);
    sel.innerHTML = '';
    sel.append(new Option('System default browser', ''));
    for (const b of list) sel.append(new Option(b.name, b.exe));
    if (chosen && !list.some((b) => b.exe === chosen)) sel.append(new Option(`${chosen.split(/[\\/]/).pop()} (not found)`, chosen));
    sel.value = chosen;
  }

  async function saveSettings() {
    const before = store.get('devices', {});
    const prefs = { cam: $('#camSelect').value, mic: $('#micSelect').value, speaker: $('#speakerSelect').value };
    store.set('devices', prefs);
    stopPreview();
    stopMicTest();
    if (Sound.loop && Call.state !== 'incoming') Sound.stop();
    $('#ringPreviewBtn').textContent = '▶ Preview';
    $('#settings').classList.add('hidden');
    applySpeaker();
    if (Call.state === 'idle' || !Call.pc) return;
    // Swap devices live during a call
    if (prefs.mic && prefs.mic !== before.mic) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
        await Call.setMic(s.getAudioTracks()[0]);
      } catch {
        toast('Couldn’t switch microphone.');
      }
    }
    if (prefs.cam && prefs.cam !== before.cam && Call.camOn) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() });
        Call.camTrack?.stop();
        Call.camTrack = s.getVideoTracks()[0];
        await Call.swapVideo();
      } catch {
        toast('Couldn’t switch camera.');
      }
    }
  }
  function applySpeaker() {
    const id = store.get('devices', {}).speaker;
    if (!id || !('setSinkId' in HTMLMediaElement.prototype)) return;
    for (const v of [el.remote, el.media, $('#screenAudio'), $('#ringAudio')]) v.setSinkId(id).catch(() => {});
  }
  function setSidebarHidden(hidden) {
    $('#main').classList.toggle('sidebar-hidden', hidden);
    store.set('sidebarHidden', hidden);
    S.autoHidSidebar = false; // you chose; we won't bring it back on our own
    renderToggles();
  }
  // A call gets the room: the contacts list folds away while you're in one (unless you open it
  // again), and comes back when the call ends.
  function callLayout(inCall) {
    const main = $('#main');
    if (inCall && !main.classList.contains('sidebar-hidden') && innerWidth < 1500) {
      main.classList.add('sidebar-hidden');
      S.autoHidSidebar = true;
    } else if (!inCall && S.autoHidSidebar) {
      main.classList.remove('sidebar-hidden');
      S.autoHidSidebar = false;
    }
    renderToggles();
  }
  const SHORTCUTS = [
    [`${KEY_MOD}+B`, 'Show / hide contacts'],
    [`${KEY_MOD}+F`, 'Search this chat'],
    [`${KEY_MOD}+,`, 'Settings'],
    [`${KEY_MOD}+Shift+C`, 'Show / hide the chat during a call'],
    [`${KEY_MOD}+Shift+M`, 'Mute / unmute'],
    ['Hold Space', 'Talk while you’re muted (let go to mute again)'],
    [`${KEY_MOD}+Shift+O`, 'Camera on / off'],
    [`${KEY_MOD}+Shift+E`, 'Share your screen'],
    [`${KEY_MOD}+Shift+H`, 'Hang up'],
    [`${KEY_MOD}+Shift+A`, 'Answer a call (voice)'],
    [`${KEY_MOD}+Shift+S`, 'Answer a call (video)'],
    [`${KEY_MOD}+Shift+D`, 'Decline a call'],
    ['↑', 'Edit your last message (in an empty message box)'],
    ['Shift+Enter', 'New line in a message'],
    ['Esc', 'Cancel a reply or edit, close menus, leave full screen'],
  ];
  function renderShortcuts() {
    const box = $('#shortcutList');
    if (box.childElementCount) return;
    for (const [k, d] of SHORTCUTS) {
      const kb = document.createElement('kbd');
      kb.textContent = k;
      const sp = document.createElement('span');
      sp.textContent = d;
      box.append(kb, sp);
    }
  }
  const isTextField = (t) => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  function bindSettings() {
    $('#noiseSelect').addEventListener('change', async (e) => {
      store.set('noise', e.target.value);
      if (Call.state !== 'idle') {
        await Call.rebuildMic();
        toast(e.target.value === 'off' ? 'Background-noise removal off' : 'Background-noise removal updated');
      }
      startMicTest();
    });
    $('#micSelect').addEventListener('change', () => Call.state === 'idle' && startMicTest());
    $('#hearSelf').addEventListener('change', applyHearSelf);
    $('#qualitySelect').addEventListener('change', (e) => {
      store.set('quality', e.target.value);
      Call.applyQuality();
    });
    $('#autoHideUi').addEventListener('change', (e) => {
      store.set('autoHideUi', e.target.checked);
      if (!e.target.checked) Idle.reset();
    });
    $('#readReceipts').addEventListener('change', (e) => store.set('readReceipts', e.target.checked));
    $('#linkPreviews').addEventListener('change', (e) => {
      store.set('linkPreviews', e.target.checked);
      MsgView.invalidate();
      renderMessages(false);
    });
    $('#msgSound').addEventListener('change', (e) => store.set('msgSound', e.target.checked));
    $('#logoutBtn').addEventListener('click', () => {
      stopPreview();
      stopMicTest();
      $('#settings').classList.add('hidden');
      saveDraft();
      signOut(true);
    });
    $('#ringSelect').addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === '__file') {
        e.target.value = Ring.choice();
        $('#ringFile').value = '';
        return $('#ringFile').click();
      }
      store.set('ringtone', v);
      Ring.preview();
    });
    $('#ringFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) return toast('That file is too big for a ringtone (20 MB max).');
      try {
        await FileStore.put('ringtone', { blob: f, name: f.name.replace(/\.[^.]+$/, '') });
        store.set('ringtone', 'custom');
        await fillRingtones();
        Ring.preview();
      } catch (err) {
        log('ringtone save failed', errText(err));
        toast('Couldn’t save that sound.');
      }
    });
    $('#ringVolume').addEventListener('input', (e) => {
      store.set('ringVolume', Number(e.target.value));
      $('#ringAudio').volume = Number(e.target.value);
    });
    $('#ringVolume').addEventListener('change', () => !Sound.loop && $('#ringAudio').paused && Ring.preview());
    $('#ringPreviewBtn').addEventListener('click', () => Ring.preview());
    $('#browserSelect').addEventListener('change', (e) => {
      store.set('linkBrowser', e.target.value);
      electron?.setLinkBrowser(e.target.value);
    });
    $('#openLogBtn').addEventListener('click', () => electron?.openLog());
    $('#keepRunning').addEventListener('change', (e) => electron?.setAppSetting('keepRunning', e.target.checked));
    $('#openAtLogin').addEventListener('change', (e) => electron?.setAppSetting('openAtLogin', e.target.checked));
    $('#checkUpdatesBtn').addEventListener('click', async () => {
      const b = $('#checkUpdatesBtn');
      b.disabled = true;
      b.textContent = 'Checking…';
      const st = await electron.checkForUpdates().catch((e) => ({ state: 'error', error: errText(e) }));
      b.disabled = false;
      b.textContent = 'Check for updates';
      renderUpdate(st);
      if (st.state === 'unsupported' || st.enabled === false) toast('Updates work in the installed app (not when running from source).');
      else if (st.state === 'none') toast('You’re on the newest version.');
      else if (st.state === 'downloading') toast(`Downloading Parley ${st.version}…`);
      else if (st.state === 'ready') toast(`Parley ${st.version} is ready — press Restart.`);
      else if (st.state === 'error') toast(`Couldn’t check for updates: ${st.error || 'unknown error'}`, 6000);
    });
    $('#avatarChangeBtn').addEventListener('click', () => {
      $('#avatarFile').value = '';
      $('#avatarFile').click();
    });
    $('#avatarRemoveBtn').addEventListener('click', async () => {
      await setMyAvatar(null);
      paintAvatar($('#settingsAvatar'), S.me);
      $('#avatarRemoveBtn').disabled = true;
    });
    $('#avatarFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      await setMyAvatar(f);
      paintAvatar($('#settingsAvatar'), S.me);
      $('#avatarRemoveBtn').disabled = false;
    });
    if (!electron) {
      $('#linkSection').classList.add('hidden');
      $('#troubleSection').classList.add('hidden');
      $('#appSection').classList.add('hidden');
    } else {
      electron.setLinkBrowser?.(store.get('linkBrowser', ''));
    }
  }

  // ------------------------------------------------------------------ wire up UI
  function bind() {
    paintIcons();
    bindSettings();
    setSidebarHidden(!!store.get('sidebarHidden', false));
    document.querySelectorAll('.sidebar-toggle').forEach((b) =>
      b.addEventListener('click', () => setSidebarHidden(!$('#main').classList.contains('sidebar-hidden')))
    );
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && !e.shiftKey && !e.altKey && k === 'b') {
        e.preventDefault();
        setSidebarHidden(!$('#main').classList.contains('sidebar-hidden'));
      }
      if (mod && !e.shiftKey && !e.altKey && k === ',' && S.signedIn && $('#settings').classList.contains('hidden')) {
        e.preventDefault();
        openSettings();
      }
      if (mod && !e.shiftKey && !e.altKey && k === 'f' && S.active && !$('#main').classList.contains('hidden')) {
        e.preventDefault();
        if (Call.state !== 'idle' && $('#convo').classList.contains('chat-hidden')) setChatHidden(false);
        Find.open();
      }
      if (mod && e.shiftKey && !e.altKey) {
        const inCall = Call.state !== 'idle' && Call.state !== 'incoming';
        const act = {
          c: () => inCall && setChatHidden(!$('#convo').classList.contains('chat-hidden')),
          m: () => inCall && Call.toggleMic(),
          o: () => inCall && Call.toggleCam(),
          e: () => Call.pc && Call.toggleScreen(),
          h: () => inCall && Call.hangup(),
          a: () => Call.state === 'incoming' && Call.accept(false),
          s: () => Call.state === 'incoming' && Call.accept(true),
          d: () => Call.state === 'incoming' && Call.decline(),
        }[k];
        if (act) {
          e.preventDefault();
          act();
        }
      }
      // hold Space to talk while muted
      if (e.code === 'Space' && !e.repeat && !mod && Call.state === 'active' && !Call.micOn && !isTextField(e.target)) {
        e.preventDefault();
        // a focused button would also get "clicked" by the Space key — take focus off it first
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        Call.pttActive = true;
        Call.toggleMic();
      }
      if (Lightbox.isOpen() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) Lightbox.step(e.key === 'ArrowLeft' ? -1 : 1);
      if (e.key === 'Escape') {
        if (Menu.isOpen()) Menu.close();
        else if (!$('#statusMenu').classList.contains('hidden')) $('#statusMenu').classList.add('hidden');
        else if (Lightbox.isOpen()) Lightbox.close();
        else if (!$('#picker').classList.contains('hidden')) Picker.close();
        else if (Find.isOpen()) Find.close();
        else if (S.editing || S.replyTo) cancelCompose();
      }
    });
    $('#findBtn').addEventListener('click', () => (Find.isOpen() ? Find.close() : Find.open()));
    $('#findBtn').title = `Search this chat (${KEY_MOD}+F)`;
    $('#findClose').addEventListener('click', () => Find.close());
    $('#findPrev').addEventListener('click', () => Find.step(-1));
    $('#findNext').addEventListener('click', () => Find.step(1));
    let findT = null;
    $('#findInput').addEventListener('input', () => {
      clearTimeout(findT);
      findT = setTimeout(() => Find.run(), 120);
    });
    $('#findInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        Find.step(e.shiftKey ? 1 : -1);
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && Call.pttActive) {
        e.preventDefault();
        Call.pttActive = false;
        if (Call.micOn) Call.toggleMic();
      }
    });
    window.addEventListener('blur', () => {
      Menu.close();
      if (Call.pttActive) {
        Call.pttActive = false;
        if (Call.micOn) Call.toggleMic();
      }
    });
    $('#search').addEventListener('input', renderContacts);
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#emptySettingsBtn').addEventListener('click', openSettings);
    // status menu
    $('#statusBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const m = $('#statusMenu');
      if (!m.classList.contains('hidden')) return m.classList.add('hidden');
      Presence.render();
      const r = $('#statusBtn').getBoundingClientRect();
      m.style.left = Math.max(8, r.left) + 'px';
      m.style.top = r.bottom + 6 + 'px';
      m.classList.remove('hidden');
    });
    $('#statusMenu').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-status]');
      if (!b) return;
      Presence.set(b.dataset.status);
      $('#statusMenu').classList.add('hidden');
    });
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#statusMenu, #statusBtn')) $('#statusMenu').classList.add('hidden');
      if (!e.target.closest('#ctxMenu')) Menu.close();
    });
    window.addEventListener('resize', () => Menu.close());
    electron?.onOpenChat?.((peer) => S.signedIn && openConvo(peer));
    Presence.start();
    $('#myAvatarBtn').addEventListener('click', () => {
      $('#avatarFile').value = '';
      $('#avatarFile').click();
    });
    $('#camSelect').addEventListener('change', startPreview);
    $('#settingsDone').addEventListener('click', saveSettings);
    $('#updateBtn').addEventListener('click', () => electron?.installUpdate());

    // ---- chat
    $('#composer').addEventListener('submit', (e) => {
      e.preventDefault();
      sendChat();
    });
    $('#msgInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendChat();
      } else if (e.key === 'ArrowUp' && !e.target.value && !S.editing && !Tray.items().length) {
        const m = lastOwnText();
        if (m) {
          e.preventDefault();
          startEdit(m);
        }
      } else if (e.key === 'Escape' && (S.editing || S.replyTo)) {
        e.stopPropagation();
        cancelCompose();
      }
    });
    $('#composeCancel').addEventListener('click', () => {
      cancelCompose();
      $('#msgInput').focus();
    });
    $('#msgInput').addEventListener('input', () => {
      autoGrow();
      if (S.active && Date.now() - S.lastTypingSent > 2500) {
        S.lastTypingSent = Date.now();
        wsSend({ type: 'typing', to: S.active });
      }
    });
    $('#msgInput').addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) {
        e.preventDefault();
        Tray.add(files);
      }
    });
    const msgBox = $('#messages');
    let scrollT = null;
    msgBox.addEventListener('scroll', () => {
      Menu.close();
      msgBox.classList.add('scrolling');
      clearTimeout(scrollT);
      scrollT = setTimeout(() => msgBox.classList.remove('scrolling'), 160);
      if (S.autoScroll) {
        // our own scroll-to-bottom; if the list grew since, finish the job instead of unsticking
        S.autoScroll = false;
        if (S.stick && !atBottom()) scrollToBottom();
      } else {
        S.stick = atBottom();
        if (!S.stick) Anchor.capture();
      }
      if (S.stick) {
        $('#jumpBtn').classList.add('hidden');
        if (S.active) sendRead(S.active);
      }
    });
    // Anything that changes the list's height (photos loading, window resizing, the
    // composer growing) keeps you at the newest message if you were there.
    const ro = new ResizeObserver(() => (S.stick ? scrollToBottom() : Anchor.restore()));
    ro.observe(msgBox);
    ro.observe($('#msgList'));
    $('#jumpBtn').addEventListener('click', scrollToBottom);
    $('#emojiBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      Picker.toggle();
    });
    document.querySelectorAll('#picker .tab').forEach((t) => t.addEventListener('click', () => Picker.tab(t.dataset.tab)));
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#picker, #emojiBtn')) Picker.close();
    });
    $('#attachBtn').addEventListener('click', () => {
      $('#attachFile').value = '';
      $('#attachFile').click();
    });
    $('#attachFile').addEventListener('change', (e) => Tray.add([...e.target.files]));
    $('#stickerFile').addEventListener('change', (e) => e.target.files[0] && Picker.addCustom(e.target.files[0]));
    const panel = $('#chatPanel');
    let dragDepth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    panel.addEventListener('dragenter', (e) => {
      if (!hasFiles(e) || !S.active) return;
      dragDepth++;
      $('#dropZone').classList.remove('hidden');
    });
    panel.addEventListener('dragleave', () => {
      if (--dragDepth <= 0) {
        dragDepth = 0;
        $('#dropZone').classList.add('hidden');
      }
    });
    panel.addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
    panel.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      $('#dropZone').classList.add('hidden');
      Tray.add([...e.dataTransfer.files]);
    });
    // Drop a video on the call to watch it together.
    let stageDepth = 0;
    const hasVideo = (e) => [...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file' && /^video\//.test(i.type));
    el.stage.addEventListener('dragenter', (e) => {
      if (!hasVideo(e) || !Call.pc) return;
      stageDepth++;
      $('#stageDrop').classList.remove('hidden');
    });
    el.stage.addEventListener('dragleave', () => {
      if (--stageDepth <= 0) {
        stageDepth = 0;
        $('#stageDrop').classList.add('hidden');
      }
    });
    el.stage.addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
    el.stage.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      stageDepth = 0;
      $('#stageDrop').classList.add('hidden');
      const files = [...e.dataTransfer.files];
      const vid = Call.pc && files.find((f) => /^video\//.test(f.type) || /\.(mp4|webm|mkv|mov|m4v)$/i.test(f.name));
      if (vid) Call.startMedia(vid);
      const rest = files.filter((f) => f !== vid);
      if (rest.length) Tray.add(rest);
    });
    // dropping a file anywhere else shouldn't navigate the app away
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
    $('#lightboxClose').addEventListener('click', () => Lightbox.close());
    $('#lightboxSave').addEventListener('click', () => Lightbox.save('downloads'));
    $('#lightboxSaveAs').addEventListener('click', () => Lightbox.save('as'));
    $('#lightboxCopy').addEventListener('click', () => Lightbox.save('copy'));
    $('#lightboxPrev').addEventListener('click', () => Lightbox.step(-1));
    $('#lightboxNext').addEventListener('click', () => Lightbox.step(1));
    if (!electron) $('#lightboxSaveAs').classList.add('hidden');
    $('#lightbox').addEventListener('click', (e) => e.target.id === 'lightbox' && Lightbox.close());

    // ---- calls
    $('#audioCallBtn').addEventListener('click', () => S.active && Call.start(S.active, false));
    $('#videoCallBtn').addEventListener('click', () => S.active && Call.start(S.active, true));
    $('#acceptVideoBtn').addEventListener('click', () => Call.accept(true));
    $('#acceptAudioBtn').addEventListener('click', () => Call.accept(false));
    $('#declineBtn').addEventListener('click', () => Call.decline());

    $('#micBtn').addEventListener('click', () => Call.toggleMic());
    $('#camBtn').addEventListener('click', () => Call.toggleCam());
    $('#screenBtn').addEventListener('click', () => Call.toggleScreen());
    $('#watchBtn').addEventListener('click', () => {
      if (Call.mediaStream) return Call.stopMedia();
      $('#mediaFile').value = '';
      $('#mediaFile').click();
    });
    $('#mediaFile').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) Call.startMedia(f);
    });
    $('#mediaStopBtn').addEventListener('click', () => Call.stopMedia());
    $('#mediaPlayBtn').addEventListener('click', () => Call.mediaControl('toggle'));
    $('#mediaBackBtn').addEventListener('click', () => Call.mediaControl('seek', -10));
    $('#mediaFwdBtn').addEventListener('click', () => Call.mediaControl('seek', 10));
    for (const ev of ['play', 'pause', 'ended', 'seeked']) el.media.addEventListener(ev, () => Call.sendMediaState());
    $('#shareStopBtn').addEventListener('click', () => Call.stopScreen());
    $('#mediaVolume').addEventListener('input', (e) => (el.media.volume = Number(e.target.value)));
    const seek = $('#mediaSeek');
    seek.addEventListener('input', () => {
      const { d } = Call.mediaPos();
      $('#mediaPos').textContent = fmtDur((seek.value / 1000) * d * 1000);
    });
    seek.addEventListener('change', () => {
      const { d } = Call.mediaPos();
      if (d) Call.mediaControl('seekTo', (seek.value / 1000) * d);
    });
    el.media.addEventListener('loadedmetadata', () => Call.sendMediaState());
    let lastMediaSync = 0;
    setInterval(() => {
      if (!el.stage.classList.contains('has-media')) return;
      Call.renderMediaBar();
      // keep the viewer's clock in step every few seconds
      if (Call.mediaUrl && !el.media.paused && Date.now() - lastMediaSync > 4000) {
        lastMediaSync = Date.now();
        Call.sendMediaState();
      }
    }, 500);
    $('#chatPanelBtn').addEventListener('click', () => setChatHidden(!$('#convo').classList.contains('chat-hidden')));
    $('#mutedHintBtn').addEventListener('click', () => !Call.micOn && Call.toggleMic());
    // drag the chat's left edge to make it wider or narrower during a call (double-click resets)
    const rz = $('#chatResizer');
    const setChatW = (w) => (w ? $('#convo').style.setProperty('--chat-w', w + 'px') : $('#convo').style.removeProperty('--chat-w'));
    setChatW(store.get('chatWidth', 0));
    let rzd = null;
    rz.addEventListener('pointerdown', (e) => {
      rzd = { x: e.clientX, w: $('#chatPanel').offsetWidth };
      rz.setPointerCapture(e.pointerId);
      rz.classList.add('dragging');
    });
    rz.addEventListener('pointermove', (e) => {
      if (!rzd) return;
      const max = Math.max(280, Math.min(720, $('#convo').offsetWidth - 320));
      rzd.now = Math.round(Math.max(260, Math.min(max, rzd.w + (rzd.x - e.clientX))));
      setChatW(rzd.now);
    });
    const rzEnd = () => {
      if (!rzd) return;
      if (rzd.now) store.set('chatWidth', rzd.now);
      rzd = null;
      rz.classList.remove('dragging');
    };
    rz.addEventListener('pointerup', rzEnd);
    rz.addEventListener('pointercancel', rzEnd);
    rz.addEventListener('dblclick', () => {
      store.set('chatWidth', 0);
      setChatW(0);
    });
    // drag your own video to any corner
    const self = el.local;
    const corner = (c) => {
      self.classList.remove('c-tl', 'c-tr', 'c-bl');
      if (c && c !== 'br') self.classList.add('c-' + c);
    };
    corner(store.get('selfCorner', 'br'));
    let sd = null;
    self.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || el.stage.classList.contains('has-media') || el.stage.classList.contains('has-screen')) return;
      sd = { x: e.clientX, y: e.clientY, moved: false };
      self.setPointerCapture(e.pointerId);
    });
    self.addEventListener('pointermove', (e) => {
      if (!sd) return;
      const dx = e.clientX - sd.x;
      const dy = e.clientY - sd.y;
      if (!sd.moved && Math.hypot(dx, dy) < 6) return;
      sd.moved = true;
      self.classList.add('dragging');
      self.style.translate = `${dx}px ${dy}px`;
    });
    const sdEnd = () => {
      if (!sd) return;
      const moved = sd.moved;
      sd = null;
      self.classList.remove('dragging');
      if (!moved) return;
      const r = self.getBoundingClientRect();
      const st = el.stage.getBoundingClientRect();
      const c = (r.top + r.height / 2 - st.top < st.height / 2 ? 't' : 'b') + (r.left + r.width / 2 - st.left < st.width / 2 ? 'l' : 'r');
      self.style.translate = '';
      corner(c);
      store.set('selfCorner', c);
    };
    self.addEventListener('pointerup', sdEnd);
    self.addEventListener('pointercancel', sdEnd);
    $('#fullBtn').addEventListener('click', toggleFullscreen);
    $('#miniBtn').addEventListener('click', goMini);
    $('#hangupBtn').addEventListener('click', () => Call.hangup());

    // Double-click the video for full screen (the whole call, so your friend's camera stays visible).
    el.stage.addEventListener('dblclick', (e) => {
      if (e.target.closest('.controls, .media-bar, .share-banner, .muted-hint, .local')) return;
      toggleFullscreen();
    });
    for (const ev of ['pointermove', 'pointerdown', 'wheel']) el.stage.addEventListener(ev, () => Idle.wake(), { passive: true });
    document.addEventListener('keydown', () => Call.state !== 'idle' && Idle.wake());

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && S.active) {
        if (S.unread[keyOf(S.active)]) {
          delete S.unread[keyOf(S.active)];
          store.set('unread', S.unread);
          updateUnreadBadge();
          renderContacts();
        }
        sendRead(S.active);
      }
    });
    window.addEventListener('focus', () => S.active && sendRead(S.active));
    window.addEventListener('beforeunload', () => {
      saveDraft();
      if (Call.state !== 'idle') Call.hangup();
      Mini.close();
    });
    // Refresh "last seen" labels
    setInterval(() => S.signedIn && renderContacts(), 60000);
    applySpeaker();
  }

  // Exposed for automated tests only
  window.__parleyDebug = { S, Call, Mini, Files, Avatars, applyTheme, history, MsgView, Presence, Tray, Previews, openConvo, rememberContact };

  bind();
  initLogin();
})();
