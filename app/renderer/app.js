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
    screen: P('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    film: P('<rect x="2" y="2" width="20" height="20" rx="2.2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>'),
    mini: P('<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor"/>'),
    expand: P('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
    hangup: P('<path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 4.2 2 2 0 0 1 5.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L9 9.8"/><path d="M23 1L1 23"/>'),
    send: P('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>'),
    volume: P('<path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    sidebar: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
    play: P('<path d="M7 4l13 8-13 8V4z" fill="currentColor"/>'),
    pause: P('<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'),
    back10: P('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">10</text>'),
    fwd10: P('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">10</text>'),
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
  function paintAvatar(el, name, status) {
    el.style.setProperty('--h', hue(name));
    el.textContent = initials(name);
    if (status) {
      const dot = document.createElement('span');
      dot.className = 'dot ' + (status === 'offline' ? '' : status);
      el.appendChild(dot);
    }
  }
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const fmtDay = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const y = new Date(Date.now() - 864e5);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
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
  let toastTimer;
  function toast(text, ms = 3500) {
    const t = $('#toast');
    t.textContent = text;
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

  function linkify(el, text) {
    const re = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      const a = document.createElement('a');
      a.href = m[1];
      a.textContent = m[1];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      el.appendChild(a);
      last = m.index + m[1].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }
  function notify(title, body) {
    if (electron) return electron.notify(title, body, true);
    if (!document.hidden) return;
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
  }

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
    users: new Map(), // key -> {name, online, status, lastSeen}
    active: null, // name of open conversation
    unread: store.get('unread', {}),
    outbox: [],
    lastTypingSent: 0,
    typingTimer: null,
  };

  // ------------------------------------------------------------------ history
  const histKey = (peer) => `hist:${keyOf(S.me)}:${keyOf(peer)}`;
  const histCache = new Map();
  function history(peer) {
    const k = histKey(peer);
    if (!histCache.has(k)) histCache.set(k, store.get(k, []));
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
    if (S.active && keyOf(S.active) === keyOf(peer)) renderMessages(true);
  }
  function systemLine(peer, text) {
    addToHistory(peer, { id: uid(), system: true, text, ts: Date.now() });
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
      handleServer(msg);
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
        $('#connBanner').classList.add('hidden');
        if (first) {
          store.set('login', {
            serverUrl: S.serverUrl,
            name: S.myName,
            code: S.code,
            auto: $('#autoLogin').checked,
          });
          showMain();
        }
        setUsers(msg.users);
        // resend anything typed while disconnected
        const pending = S.outbox.splice(0);
        for (const m of pending) wsSend({ type: 'chat', to: m.to, text: m.text, id: m.id });
        if (Call.state !== 'idle') wsSend({ type: 'status', status: 'busy' });
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
      case 'chat': {
        const peer = msg.from;
        addToHistory(peer, { id: msg.id, from: msg.from, text: msg.text, ts: msg.ts, dir: 'in' });
        clearTyping();
        const viewing = S.active && keyOf(S.active) === keyOf(peer) && !document.hidden;
        if (!viewing) {
          S.unread[keyOf(peer)] = (S.unread[keyOf(peer)] || 0) + 1;
          store.set('unread', S.unread);
          notify(peer, msg.text.slice(0, 140));
        }
        Sound.blip();
        renderContacts();
        break;
      }
      case 'chat-ack': {
        for (const k of [...histCache.keys()]) {
          const h = histCache.get(k);
          const m = h.find((x) => x.id === msg.id);
          if (m) {
            m.status = msg.delivered ? 'sent' : 'queued';
            m.ts = msg.ts;
            store.set(k, h);
            if (S.active) renderMessages(false);
            break;
          }
        }
        break;
      }
      case 'typing':
        if (S.active && keyOf(S.active) === keyOf(msg.from)) {
          $('#typing').textContent = `${msg.from} is typing…`;
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
  const clearTyping = () => ($('#typing').textContent = '');

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
    paintAvatar($('#myAvatar'), S.me);
    for (const n of store.get(`contacts:${keyOf(S.me)}`, [])) rememberContact(n);
    renderContacts();
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
    }
    renderContacts();
    if (S.active) renderHeader();
  }
  function statusText(u) {
    if (!u) return '';
    if (u.online) return u.status === 'busy' ? 'In a call' : 'Online';
    return fmtAgo(u.lastSeen);
  }
  function renderContacts() {
    const q = keyOf($('#search').value);
    const ul = $('#contacts');
    ul.innerHTML = '';
    const list = [...S.users.values()]
      .filter((u) => keyOf(u.name) !== keyOf(S.me) && (!q || keyOf(u.name).includes(q)))
      .sort((a, b) => b.online - a.online || (S.unread[keyOf(b.name)] || 0) - (S.unread[keyOf(a.name)] || 0) || a.name.localeCompare(b.name));
    for (const u of list) {
      const li = document.createElement('li');
      if (S.active && keyOf(S.active) === keyOf(u.name)) li.className = 'active';
      const av = document.createElement('div');
      av.className = 'avatar';
      paintAvatar(av, u.name, u.online ? u.status : 'offline');
      const tx = document.createElement('div');
      tx.className = 'c-text';
      const nm = document.createElement('div');
      nm.className = 'c-name';
      nm.textContent = u.name;
      const st = document.createElement('div');
      st.className = 'c-status';
      st.textContent = statusText(u);
      tx.append(nm, st);
      li.append(av, tx);
      const n = S.unread[keyOf(u.name)];
      if (n) {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = n > 99 ? '99+' : n;
        li.append(b);
      }
      li.addEventListener('click', () => openConvo(u.name));
      ul.append(li);
    }
  }

  // ------------------------------------------------------------------ conversation
  function openConvo(name) {
    S.active = name;
    store.set(`lastActive:${keyOf(S.me)}`, name);
    delete S.unread[keyOf(name)];
    store.set('unread', S.unread);
    $('#empty').classList.add('hidden');
    $('#convo').classList.remove('hidden');
    clearTyping();
    renderHeader();
    renderContacts();
    renderMessages(true);
    if (Call.state === 'idle') $('#msgInput').focus();
  }
  function renderHeader() {
    const u = S.users.get(keyOf(S.active)) || { name: S.active, online: false };
    $('#peerName').textContent = u.name;
    $('#peerStatus').textContent = statusText(u);
    const av = $('#peerAvatar');
    paintAvatar(av, u.name, u.online ? u.status : 'offline');
    const canCall = u.online && Call.state === 'idle';
    $('#audioCallBtn').disabled = !canCall;
    $('#videoCallBtn').disabled = !canCall;
  }
  function renderMessages(scroll) {
    const box = $('#messages');
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = '';
    let lastDay = '';
    for (const m of history(S.active)) {
      const day = fmtDay(m.ts);
      if (day !== lastDay) {
        const d = document.createElement('div');
        d.className = 'day';
        d.textContent = day;
        box.append(d);
        lastDay = day;
      }
      if (m.system) {
        const s = document.createElement('div');
        s.className = 'sys';
        s.textContent = `${m.text} · ${fmtTime(m.ts)}`;
        box.append(s);
        continue;
      }
      const wrap = document.createElement('div');
      wrap.className = 'msg ' + (m.dir === 'in' ? 'in' : 'out');
      const b = document.createElement('div');
      b.className = 'bubble';
      linkify(b, m.text);
      const meta = document.createElement('div');
      meta.className = 'meta';
      let st = '';
      if (m.dir !== 'in') {
        st = { sending: ' · Sending…', queued: ' · Will deliver when they’re online', sent: '' }[m.status] || '';
      }
      meta.textContent = fmtTime(m.ts) + st;
      wrap.append(b, meta);
      box.append(wrap);
    }
    if (scroll || nearBottom) box.scrollTop = box.scrollHeight;
  }
  function sendChat() {
    const input = $('#msgInput');
    const text = input.value.replace(/\s+$/, '');
    if (!text.trim() || !S.active) return;
    const m = { id: uid(), from: S.me, to: S.active, text, ts: Date.now(), dir: 'out', status: 'sending' };
    addToHistory(S.active, m);
    if (!wsSend({ type: 'chat', to: m.to, text: m.text, id: m.id })) S.outbox.push(m);
    input.value = '';
    autoGrow();
  }
  function autoGrow() {
    const t = $('#msgInput');
    t.style.height = 'auto';
    t.style.height = Math.min(140, t.scrollHeight) + 'px';
  }

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
      openConvo(peer);
      this.showStage(`Calling ${peer}…`);
      const ok = await this.getLocalMedia(video);
      if (!ok || this.state !== 'outgoing') return;
      this.sig({ kind: 'invite', video });
      Sound.ringback();
      this.timers.ring = setTimeout(() => {
        if (this.state === 'outgoing') {
          this.sig({ kind: 'cancel' });
          systemLine(peer, `${peer} didn’t answer`);
          this.end('No answer');
        }
      }, 45000);
    },

    // ---- incoming
    onInvite(from, data) {
      if (this.state !== 'idle') {
        wsSend({ type: 'signal', to: from, data: { kind: 'busy', callId: data.callId } });
        systemLine(from, `Missed call from ${from} (you were busy)`);
        return;
      }
      this.state = 'incoming';
      this.peer = from;
      this.id = data.callId;
      this.polite = true;
      paintAvatar($('#incomingAvatar'), from);
      $('#incomingName').textContent = from;
      $('#incomingKind').textContent = data.video ? 'is video calling you…' : 'is calling you…';
      $('#incoming').classList.remove('hidden');
      Sound.ring();
      electron?.attention();
      notify('Incoming call', `${from} is calling you`);
      this.setBusy(true);
      this.timers.ring = setTimeout(() => {
        if (this.state === 'incoming') {
          this.sig({ kind: 'decline', reason: 'no-answer' });
          systemLine(from, `Missed call from ${from}`);
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
          systemLine(this.peer, data.reason === 'no-answer' ? `${this.peer} didn’t answer` : `${this.peer} declined the call`);
          this.end(data.reason === 'no-answer' ? 'No answer' : `${this.peer} declined`);
          break;
        case 'busy':
          systemLine(this.peer, `${this.peer} was in another call`);
          this.end(`${this.peer} is in another call`);
          break;
        case 'cancel':
          if (this.state === 'incoming') systemLine(this.peer, `Missed call from ${this.peer}`);
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
          el.stage.classList.toggle('remote-screen', !!data.on);
          if (data.on) el.stage.classList.add('remote-cam-on');
          else el.stage.classList.toggle('remote-cam-on', !!this.remoteCamFlag);
          this.remoteScreen = !!data.on;
          this.remoteScreenSound = !!data.on && !!data.sound;
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
          await pc.setLocalDescription();
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
        } else if (this.roles[stream.id] === 'media' || stream.id === this.remoteMediaId) {
          this.showRemoteMedia(stream);
        } else if (!this.remoteCamStream || this.remoteCamStream.id === stream.id) {
          this.remoteCamStream = stream;
          if (el.remote.srcObject !== stream) el.remote.srcObject = stream;
          el.remote.play().catch(() => {});
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
          await pc.setLocalDescription();
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
          this.state = 'active';
          this.startedAt = Date.now();
          this.timers.clock = setInterval(() => (el.timer.textContent = fmtDur(Date.now() - this.startedAt)), 1000);
          el.timer.textContent = '0:00';
          this.sendFlags();
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
      this.camTrack = hasCam ? stream.getVideoTracks()[0] : null;
      this.camOn = hasCam;
      this.micOn = !this.audioTrack._parleyPlaceholder;
      this.refreshLocalPreview();
      this.renderControls();
      return true;
    },

    currentVideoTrack() {
      if (this.screenTrack) return this.screenTrack;
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
          wantedSound = pick.withAudio;
          log('screen share: start', pick.id, wantedSound ? 'with sound' : 'no sound');
          this.setStatus('Starting screen share…');
          // Try: sound with our settings → sound with defaults → picture only.
          const attempts = wantedSound ? [audioC, true, false] : [false];
          let lastErr = null;
          for (const audio of attempts) {
            try {
              await electron.selectScreenSource(pick.id, !!audio);
              stream = await capture({ video: videoC, audio });
              break;
            } catch (e) {
              lastErr = e;
              log('screen share attempt failed', audio === false ? 'video-only' : 'with sound', errText(e));
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
      await this.swapVideo();
      setMaxBitrate(this.videoSender, 2_500_000, 'maintain-resolution');
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) this.startScreenAudio(audioTrack);
      else if (wantedSound && electron) toast('Sharing your screen without computer sound (your system didn’t allow it).', 6000);
      this.renderControls();
      this.sig({ kind: 'screen', on: true, sound: !!audioTrack });
    },

    // Computer sound that goes along with a screen share.
    startScreenAudio(raw) {
      const settings = raw.getSettings ? raw.getSettings() : {};
      // If the engine confirms it's leaving out Parley's own playback, send the sound untouched.
      // Otherwise turn on the echo guard: the shared sound dips whenever your friend talks,
      // so they don't hear their own voice coming back.
      const excluded = settings.restrictOwnAudio === true;
      const send = excluded ? raw : this.makeEchoGuardTrack(raw);
      send.contentHint = 'music';
      const stream = new MediaStream([send]);
      this.sig({ kind: 'stream-role', streamId: stream.id, role: 'screen-audio' });
      const sender = this.pc.addTrack(send, stream);
      setAudioParams(sender, quality().music);
      log('screen sound on', excluded ? '(own audio excluded by system)' : '(echo guard)');
      this.screenAudio = { raw, send, stream, sender, guard: !excluded };
      raw.addEventListener('ended', () => this.stopScreenAudio());
      if (!excluded) toast('Sharing computer sound. Echo guard on: the sound dips while your friend talks.', 6000);
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
        gain.gain.setTargetAtTime(talking ? 0.1 : 1, ctx.currentTime, talking ? 0.03 : 0.25);
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
      await this.swapVideo();
      if (this.videoSender) setMaxBitrate(this.videoSender, 1_500_000, 'balanced');
      this.renderControls();
      this.sig({ kind: 'screen', on: false });
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
      v.controls = true;
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
    mediaControl(action, delta = 0) {
      const v = el.media;
      if (this.mediaUrl) {
        if (action === 'toggle') (v.paused ? v.play() : Promise.resolve(v.pause())).catch(() => {});
        else if (action === 'seek' && isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration - 0.25, v.currentTime + delta));
      } else if (this.remoteMediaId) {
        this.sig({ kind: 'media-ctl', action, delta });
      }
    },
    sendMediaState() {
      if (!this.mediaUrl) return;
      const v = el.media;
      this.sig({ kind: 'media-state', paused: v.paused, ended: v.ended, t: v.currentTime });
      this.renderMediaBar();
    },
    renderMediaBar() {
      const paused = this.mediaUrl ? el.media.paused : !!this.remoteMediaPaused;
      const b = $('#mediaPlayBtn');
      if (b.dataset.icon !== (paused ? 'play' : 'pause')) setIcon(b, paused ? 'play' : 'pause');
      b.title = paused ? 'Play' : 'Pause';
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
      el.stage.classList.remove('hidden', 'has-media', 'media-local', 'remote-cam-on', 'remote-screen', 'sharing-screen');
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
    },
    renderControls() {
      const mic = $('#micBtn');
      setIcon(mic, this.micOn ? 'mic' : 'micOff');
      mic.classList.toggle('off', !this.micOn);
      mic.title = this.micOn ? 'Mute microphone' : 'Unmute microphone';
      setIcon($('#miniMicBtn'), this.micOn ? 'mic' : 'micOff');
      $('#miniMicBtn').classList.toggle('off', !this.micOn);
      const cam = $('#camBtn');
      setIcon(cam, this.camOn ? 'video' : 'videoOff');
      cam.classList.toggle('off', !this.camOn);
      cam.title = this.camOn ? 'Turn camera off' : 'Turn camera on';
      const scr = $('#screenBtn');
      scr.classList.toggle('on', !!this.screenTrack);
      scr.title = this.screenTrack ? 'Stop sharing screen' : 'Share your screen';
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
    },
    setBusy(b) {
      wsSend({ type: 'status', status: b ? 'busy' : 'online' });
      $('#myStatus').textContent = b ? 'In a call' : 'Online';
      $('#myStatus').classList.toggle('busy', b);
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
      window.__parleyExitPiP();
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
      if (this.mediaUrl) URL.revokeObjectURL(this.mediaUrl);
      Object.assign(this, {
        screenAudio: null, remoteScreenSound: false,
        state: 'idle', peer: null, id: null, audioTrack: null, camTrack: null, blackTrack: null, screenTrack: null,
        audioSender: null, videoSender: null, makingOffer: false, ignoreOffer: false, canOffer: false, pendingIce: [],
        roles: {}, remoteCamStream: null, mediaStream: null, mediaSenders: [], mediaUrl: null, remoteMediaId: null,
        remoteMediaTitle: null, startedAt: 0, everConnected: false, remoteMicOn: true, remoteScreen: false, remoteCamFlag: false,
        remoteMediaPaused: false, screenStarting: false,
      });
      $('#shareBanner').classList.add('hidden');
      el.remote.srcObject = null;
      el.local.srcObject = null;
      el.media.pause();
      el.media.srcObject = null;
      el.media.removeAttribute('src');
      el.stage.classList.add('hidden');
      $('#convo').classList.remove('in-call', 'chat-hidden');
      $('#incoming').classList.add('hidden');
      document.body.classList.remove('compact');
      electron?.setCallState(false);
      this.setBusy(false);
      if (wasActive && peer) {
        Sound.end();
        systemLine(peer, `Call ended · ${fmtDur(dur)}`);
      }
      if (reason) toast(reason, ms);
      if (S.active) renderHeader();
    },
  };

  // ------------------------------------------------------------------ mini window / picture-in-picture
  window.__parleyEnterPiP = async () => {
    if (Call.state === 'idle') return false;
    if (!document.pictureInPictureEnabled) return false;
    const useMedia = el.stage.classList.contains('has-media') && el.media.readyState >= 2;
    const remoteHasVideo = el.stage.classList.contains('remote-cam-on') && el.remote.readyState >= 2;
    const v = useMedia ? el.media : remoteHasVideo ? el.remote : null;
    if (!v) return false; // audio-only: fall back to the compact window, which shows the avatar
    try {
      if (document.pictureInPictureElement === v) return true;
      await v.requestPictureInPicture();
      return true;
    } catch (e) {
      console.warn('PiP refused', e);
      return false;
    }
  };
  window.__parleyExitPiP = () => {
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    return true;
  };
  async function goMini() {
    if (electron) return electron.setCompact(true);
    const ok = await window.__parleyEnterPiP();
    if (!ok) toast('Nothing to show in a mini window yet — the other person’s camera is off.');
  }
  electron?.onCompactChanged((on) => document.body.classList.toggle('compact', on));

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
      const loopOk = await electron.loopbackSupported().catch(() => false);
      $('#shareSoundField').classList.toggle('hidden', !loopOk);
      const done = (id) => {
        modal.classList.add('hidden');
        $('#pickerCancel').onclick = null;
        store.set('shareSound', soundBox.checked);
        resolve(id ? { id, withAudio: loopOk && soundBox.checked } : null);
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

  // ------------------------------------------------------------------ settings
  let previewStream = null;
  async function openSettings() {
    $('#settings').classList.remove('hidden');
    $('#noiseSelect').value = NoiseFX.mode();
    $('#qualitySelect').value = store.get('quality', 'high');
    $('#ringVolume').value = Ring.volume();
    $('#hearSelf').checked = false;
    fillRingtones();
    fillBrowsers();
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
  }

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
    if (!electron) {
      $('#linkSection').classList.add('hidden');
      $('#troubleSection').classList.add('hidden');
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
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarHidden(!$('#main').classList.contains('sidebar-hidden'));
      }
    });
    $('#search').addEventListener('input', renderContacts);
    $('#logoutBtn').addEventListener('click', () => signOut(true));
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#camSelect').addEventListener('change', startPreview);
    $('#settingsDone').addEventListener('click', saveSettings);

    $('#composer').addEventListener('submit', (e) => {
      e.preventDefault();
      sendChat();
    });
    $('#msgInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendChat();
      }
    });
    $('#msgInput').addEventListener('input', () => {
      autoGrow();
      if (S.active && Date.now() - S.lastTypingSent > 2500) {
        S.lastTypingSent = Date.now();
        wsSend({ type: 'typing', to: S.active });
      }
    });

    $('#audioCallBtn').addEventListener('click', () => S.active && Call.start(S.active, false));
    $('#videoCallBtn').addEventListener('click', () => S.active && Call.start(S.active, true));
    $('#acceptVideoBtn').addEventListener('click', () => Call.accept(true));
    $('#acceptAudioBtn').addEventListener('click', () => Call.accept(false));
    $('#declineBtn').addEventListener('click', () => Call.decline());

    $('#micBtn').addEventListener('click', () => Call.toggleMic());
    $('#miniMicBtn').addEventListener('click', () => Call.toggleMic());
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
    $('#chatToggleBtn').addEventListener('click', () => $('#convo').classList.toggle('chat-hidden'));
    $('#miniBtn').addEventListener('click', goMini);
    $('#expandBtn').addEventListener('click', () => electron?.setCompact(false));
    $('#hangupBtn').addEventListener('click', () => Call.hangup());
    $('#miniHangupBtn').addEventListener('click', () => Call.hangup());

    // Double-click the mini window to go back to full size
    el.stage.addEventListener('dblclick', () => {
      if (document.body.classList.contains('compact')) electron?.setCompact(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && S.active && S.unread[keyOf(S.active)]) {
        delete S.unread[keyOf(S.active)];
        store.set('unread', S.unread);
        renderContacts();
      }
    });
    window.addEventListener('beforeunload', () => {
      if (Call.state !== 'idle') Call.hangup();
    });
    // Refresh "last seen" labels
    setInterval(() => S.signedIn && renderContacts(), 60000);
    applySpeaker();
  }

  // Exposed for automated tests only
  window.__parleyDebug = { S, Call };

  bind();
  initLogin();
})();
