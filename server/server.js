// Parley server — presence, text chat relay, and WebRTC call signaling.
// Video/audio/screen never pass through here; they go peer-to-peer.
// Deploy to Railway: it reads PORT automatically.
//
// Environment variables (all optional):
//   ACCESS_CODE      Shared passcode friends must enter to sign in (strongly recommended)
//   TURN_URLS        Comma-separated TURN urls, e.g. "turn:global.relay.metered.ca:80,turns:global.relay.metered.ca:443?transport=tcp"
//   TURN_USERNAME    TURN username
//   TURN_CREDENTIAL  TURN password
//   PORT             Set by Railway

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = (process.env.ACCESS_CODE || '').trim();
const MAX_QUEUE = 200; // offline messages kept per user
const MAX_TEXT = 4000;

function buildIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const turnUrls = (process.env.TURN_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (turnUrls.length) {
    servers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    });
  }
  return servers;
}

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true, online: online.size }));
// The same UI the desktop app uses also works in Chrome/Edge as a fallback.
app.use(express.static(path.join(__dirname, '..', 'app', 'renderer')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });

/** key (lowercase name) -> { name, ws, status } */
const online = new Map();
/** key -> { name, lastSeen } — everyone seen since the server started */
const known = new Map();
/** key -> [messages] waiting for an offline user */
const queues = new Map();

const keyOf = (name) => String(name).trim().toLowerCase();

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function userList() {
  return [...known.entries()].map(([key, k]) => {
    const o = online.get(key);
    return {
      name: o ? o.name : k.name,
      online: !!o,
      status: o ? o.status : 'offline',
      lastSeen: k.lastSeen,
    };
  });
}

function broadcastPresence() {
  const msg = { type: 'presence', users: userList() };
  for (const u of online.values()) send(u.ws, msg);
}

function cleanName(raw) {
  const name = String(raw || '')
    .replace(/[<>\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 32);
  return name.length >= 2 ? name : null;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  let me = null; // key once signed in

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'hello') {
      if (ACCESS_CODE && String(msg.code || '').trim() !== ACCESS_CODE) {
        send(ws, { type: 'error', code: 'bad-access-code', message: 'Wrong access code.' });
        return ws.close(4001, 'bad access code');
      }
      const name = cleanName(msg.name);
      if (!name) {
        send(ws, { type: 'error', code: 'bad-name', message: 'Name must be 2–32 characters.' });
        return ws.close(4002, 'bad name');
      }
      const key = keyOf(name);
      const existing = online.get(key);
      if (existing && existing.ws !== ws) {
        send(existing.ws, { type: 'error', code: 'replaced', message: 'Signed in somewhere else.' });
        existing.ws.close(4003, 'replaced');
      }
      me = key;
      online.set(key, { name, ws, status: 'online' });
      known.set(key, { name, lastSeen: Date.now() });
      send(ws, { type: 'welcome', you: name, iceServers: buildIceServers(), users: userList() });
      const q = queues.get(key);
      if (q && q.length) {
        for (const m of q) {
          send(ws, m);
          // tell the original sender it finally arrived
          const sender = online.get(keyOf(m.from));
          if (sender) send(sender.ws, { type: 'chat-ack', id: m.id, ts: m.ts, delivered: true });
        }
        queues.delete(key);
      }
      broadcastPresence();
      return;
    }

    if (!me) return; // everything else requires sign-in
    const self = online.get(me);
    if (!self || self.ws !== ws) return;

    switch (msg.type) {
      case 'chat': {
        const toKey = keyOf(msg.to || '');
        const text = String(msg.text || '').slice(0, MAX_TEXT);
        if (!toKey || !text.trim() || !known.has(toKey)) return;
        const out = {
          type: 'chat',
          id: String(msg.id || Date.now()),
          from: self.name,
          to: known.get(toKey).name,
          text,
          ts: Date.now(),
        };
        const target = online.get(toKey);
        if (target) send(target.ws, out);
        else {
          const q = queues.get(toKey) || [];
          q.push(out);
          if (q.length > MAX_QUEUE) q.shift();
          queues.set(toKey, q);
        }
        send(ws, { type: 'chat-ack', id: out.id, ts: out.ts, delivered: !!target });
        break;
      }
      case 'typing': {
        const target = online.get(keyOf(msg.to || ''));
        if (target) send(target.ws, { type: 'typing', from: self.name });
        break;
      }
      case 'signal': {
        const target = online.get(keyOf(msg.to || ''));
        if (!target) {
          send(ws, { type: 'signal-error', to: msg.to, reason: 'offline', data: msg.data });
          break;
        }
        send(target.ws, { type: 'signal', from: self.name, data: msg.data });
        break;
      }
      case 'status': {
        if (msg.status === 'busy' || msg.status === 'online') {
          self.status = msg.status;
          broadcastPresence();
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (me && online.get(me)?.ws === ws) {
      online.delete(me);
      const k = known.get(me);
      if (k) k.lastSeen = Date.now();
      broadcastPresence();
    }
  });
});

// Drop dead connections (laptop lid closed, Wi-Fi dropped, etc.)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 25000);

server.listen(PORT, () => {
  console.log(`Parley server listening on :${PORT}`);
  if (!ACCESS_CODE) console.warn('WARNING: ACCESS_CODE not set — anyone with the URL can sign in.');
});
