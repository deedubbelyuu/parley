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
  const Sound = {
    ctx: null,
    loop: null,
    get() {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    play(seq, gain = 0.12) {
      try {
        const ctx = this.get();
        const t0 = ctx.currentTime + 0.02;
        for (const [f, start, dur] of seq) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          g.gain.setValueAtTime(0, t0 + start);
          g.gain.linearRampToValueAtTime(gain, t0 + start + 0.02);
          g.gain.setValueAtTime(gain, t0 + start + dur - 0.04);
          g.gain.linearRampToValueAtTime(0, t0 + start + dur);
          o.connect(g).connect(ctx.destination);
          o.start(t0 + start);
          o.stop(t0 + start + dur + 0.05);
        }
      } catch {}
    },
    repeat(seq, every, gain) {
      this.stop();
      this.play(seq, gain);
      this.loop = setInterval(() => this.play(seq, gain), every);
    },
    stop() {
      clearInterval(this.loop);
      this.loop = null;
    },
    ring() {
      this.repeat([[784, 0, 0.16], [988, 0.18, 0.16], [1175, 0.36, 0.3], [784, 0.9, 0.16], [988, 1.08, 0.16], [1175, 1.26, 0.3]], 3200, 0.14);
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
    return { echoCancellation: 'all', noiseSuppression: true, autoGainControl: true, ...(p.mic ? { deviceId: { ideal: p.mic } } : {}) };
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
        await pc.setRemoteDescription(description);
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
      this.audioTrack = stream?.getAudioTracks()[0] || silentAudioTrack();
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
      let stream;
      let withAudio = false;
      const md = navigator.mediaDevices;
      const sup = md.getSupportedConstraints ? md.getSupportedConstraints() : {};
      const audioC = {
        echoCancellation: false, // it's not a mic — don't process music/movie sound
        noiseSuppression: false,
        autoGainControl: false,
        ...(sup.restrictOwnAudio ? { restrictOwnAudio: true } : {}), // leave out Parley's own sound
      };
      const videoC = { frameRate: { ideal: 30 }, width: { max: 1920 }, height: { max: 1080 } };
      try {
        if (electron) {
          const pick = await pickScreenSource();
          if (!pick) return;
          withAudio = pick.withAudio;
          await electron.selectScreenSource(pick.id, withAudio);
          try {
            stream = await md.getDisplayMedia({ video: videoC, audio: withAudio ? audioC : false });
          } catch (e) {
            if (!withAudio) throw e;
            // sound capture refused (old OS / permission) — share the picture without it
            console.warn('screen + sound failed, retrying without sound', e);
            await electron.selectScreenSource(pick.id, false);
            stream = await md.getDisplayMedia({ video: videoC, audio: false });
            toast('Couldn’t capture computer sound — sharing your screen without it.', 6000);
          }
        } else {
          stream = await md.getDisplayMedia({ video: videoC, audio: audioC, systemAudio: 'include' });
        }
      } catch (e) {
        console.warn(e);
        if (electron?.platform === 'darwin') {
          toast('Screen sharing was blocked. Allow Parley in System Settings → Privacy & Security → Screen & System Audio Recording, then restart Parley.', 8000);
        }
        return;
      }
      if (this.state === 'idle' || !this.pc) return stream.getTracks().forEach((t) => t.stop());
      const track = stream.getVideoTracks()[0];
      track.contentHint = 'detail';
      track.addEventListener('ended', () => this.stopScreen());
      this.screenTrack = track;
      await this.swapVideo();
      setMaxBitrate(this.videoSender, 2_500_000, 'maintain-resolution');
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) this.startScreenAudio(audioTrack);
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
      setMaxBitrate(sender, 128_000);
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
      if (t.kind === 'video') setMaxBitrate(s, 3_000_000, 'balanced');
      else {
        t.contentHint = 'music';
        setMaxBitrate(s, 128_000);
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
      for (const t of [this.audioTrack, this.camTrack, this.screenTrack, this.blackTrack]) {
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
      });
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
  async function saveSettings() {
    const before = store.get('devices', {});
    const prefs = { cam: $('#camSelect').value, mic: $('#micSelect').value, speaker: $('#speakerSelect').value };
    store.set('devices', prefs);
    stopPreview();
    $('#settings').classList.add('hidden');
    applySpeaker();
    if (Call.state === 'idle' || !Call.pc) return;
    // Swap devices live during a call
    if (prefs.mic && prefs.mic !== before.mic) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
        const t = s.getAudioTracks()[0];
        t.enabled = Call.micOn;
        await Call.audioSender.replaceTrack(t);
        Call.audioTrack?.stop();
        Call.audioTrack = t;
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
    for (const v of [el.remote, el.media, $('#screenAudio')]) v.setSinkId(id).catch(() => {});
  }

  // ------------------------------------------------------------------ wire up UI
  function bind() {
    paintIcons();
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
