// Parley server — presence, text chat relay, read receipts, profile pictures,
// file/photo hand-off, app updates, and WebRTC call signaling.
// Video/audio/screen never pass through here; they go peer-to-peer.
// Deploy to Railway: it reads PORT automatically.
//
// Environment variables (all optional except ACCESS_CODE, which you really want):
//   ACCESS_CODE      Shared passcode friends must enter to sign in
//   TURN_URLS        Comma-separated TURN urls, e.g. "turn:global.relay.metered.ca:80,turns:global.relay.metered.ca:443?transport=tcp"
//   TURN_USERNAME    TURN username
//   TURN_CREDENTIAL  TURN password
//   FILES_DIR        Where sent photos/files are kept (default: system temp folder; lost on redeploy
//                    unless you attach a Railway Volume and point this at it, e.g. /data/files)
//   MAX_FILE_MB      Largest file that can be sent (default 100)
//   FILE_TTL_DAYS    How long sent files stay downloadable (default 30)
//   GITHUB_REPO      Where app updates come from (default deedubbelyuu/parley)
//   GITHUB_TOKEN     Needed for updates once the repo is private (fine-grained token, Contents: read)
//   PORT             Set by Railway

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { Readable } = require('stream');
const express = require('express');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = (process.env.ACCESS_CODE || '').trim();
const MAX_QUEUE = 200; // offline messages kept per user
const MAX_TEXT = 4000;
const MAX_AVATAR = 120 * 1024; // data URL length
const MAX_FILE = Math.max(1, Number(process.env.MAX_FILE_MB) || 100) * 1024 * 1024;
const FILE_TTL = Math.max(1, Number(process.env.FILE_TTL_DAYS) || 30) * 864e5;
const FILES_DIR = process.env.FILES_DIR || path.join(os.tmpdir(), 'parley-files');
const GITHUB_REPO = process.env.GITHUB_REPO || 'deedubbelyuu/parley';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_API = (process.env.GITHUB_API || 'https://api.github.com').replace(/\/+$/, '');

fs.mkdirSync(FILES_DIR, { recursive: true });

function buildIceServers() {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
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

const codeOk = (c) => !ACCESS_CODE || String(c || '').trim() === ACCESS_CODE;

// ------------------------------------------------------------------ HTTP
const app = express();
app.disable('x-powered-by');

// The desktop app loads its UI from file://, so it calls us cross-origin.
app.use(['/files', '/updates'], (req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'x-parley-code, x-parley-name, x-file-name, x-file-type, content-type',
    'Access-Control-Expose-Headers': 'content-length, content-type, x-file-name',
    'Access-Control-Max-Age': '86400',
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  if (!codeOk(req.get('x-parley-code') || req.query.code)) return res.status(401).json({ error: 'bad access code' });
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, online: online.size }));

// ---- files & photos sent in chat
// Uploads are streamed to disk under a random id; the chat message only carries the id.
const files = new Map(); // id -> { name, type, size, from, created }
const metaPath = (id) => path.join(FILES_DIR, id + '.json');
const dataPath = (id) => path.join(FILES_DIR, id + '.bin');
const ID_RE = /^[a-f0-9]{32}$/;

// Pick up files that survived a restart (only if FILES_DIR is a persistent volume).
for (const f of fs.readdirSync(FILES_DIR)) {
  const m = f.match(/^([a-f0-9]{32})\.json$/);
  if (!m) continue;
  try {
    files.set(m[1], JSON.parse(fs.readFileSync(path.join(FILES_DIR, f), 'utf8')));
  } catch {}
}

function cleanFileName(raw) {
  let n = '';
  try {
    n = decodeURIComponent(String(raw || ''));
  } catch {
    n = String(raw || '');
  }
  n = n.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 180);
  return n || 'file';
}

app.post('/files', (req, res) => {
  const who = known.get(keyOf(req.get('x-parley-name') || ''));
  if (!who) return res.status(403).json({ error: 'sign in first' });
  const declared = Number(req.get('content-length') || 0);
  if (declared > MAX_FILE) return res.status(413).json({ error: 'too big', max: MAX_FILE });
  const id = crypto.randomBytes(16).toString('hex');
  const tmp = dataPath(id) + '.part';
  const out = fs.createWriteStream(tmp);
  let size = 0;
  let failed = false;
  const fail = (code, msg) => {
    if (failed) return;
    failed = true;
    out.destroy();
    fs.rm(tmp, { force: true }, () => {});
    if (!res.headersSent) res.status(code).json({ error: msg, max: MAX_FILE });
    req.destroy();
  };
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_FILE) fail(413, 'too big');
  });
  req.on('aborted', () => fail(400, 'upload aborted'));
  out.on('error', () => fail(500, 'could not save'));
  req.pipe(out);
  out.on('finish', () => {
    if (failed) return;
    if (!size) return fail(400, 'empty file');
    fs.renameSync(tmp, dataPath(id));
    const meta = {
      name: cleanFileName(req.get('x-file-name')),
      type: String(req.get('x-file-type') || 'application/octet-stream').slice(0, 100),
      size,
      from: who.name,
      created: Date.now(),
    };
    files.set(id, meta);
    fs.writeFile(metaPath(id), JSON.stringify(meta), () => {});
    res.json({ id, size });
  });
});

app.get('/files/:id', (req, res) => {
  const id = req.params.id;
  const meta = ID_RE.test(id) && files.get(id);
  if (!meta || !fs.existsSync(dataPath(id))) return res.status(404).json({ error: 'expired' });
  res.set({
    'Content-Type': meta.type,
    'Content-Length': String(meta.size),
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
    'Cache-Control': 'private, max-age=31536000, immutable',
  });
  fs.createReadStream(dataPath(id)).pipe(res);
});

function sweepFiles() {
  const cutoff = Date.now() - FILE_TTL;
  for (const [id, meta] of files) {
    if (meta.created < cutoff) {
      files.delete(id);
      fs.rm(dataPath(id), { force: true }, () => {});
      fs.rm(metaPath(id), { force: true }, () => {});
    }
  }
  // stray half-uploads
  for (const f of fs.readdirSync(FILES_DIR)) {
    if (f.endsWith('.part')) {
      const p = path.join(FILES_DIR, f);
      try {
        if (Date.now() - fs.statSync(p).mtimeMs > 6 * 3600e3) fs.rmSync(p, { force: true });
      } catch {}
    }
  }
}
setInterval(sweepFiles, 3600e3).unref();

// ---- app updates
// The desktop app asks *this server* for updates, and we fetch them from the latest
// GitHub Release. That way updates keep working after the repo goes private
// (set GITHUB_TOKEN on Railway).
let releaseCache = { at: 0, data: null };
async function latestRelease() {
  if (releaseCache.data && Date.now() - releaseCache.at < 5 * 60e3) return releaseCache.data;
  const r = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'parley-server',
      ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`GitHub answered ${r.status}`);
  const j = await r.json();
  const data = {
    version: String(j.tag_name || '').replace(/^v/i, ''),
    published: j.published_at,
    notes: String(j.body || '').slice(0, 4000),
    assets: (j.assets || []).map((a) => ({ id: a.id, name: a.name, size: a.size, url: a.url })),
  };
  releaseCache = { at: Date.now(), data };
  return data;
}

app.get('/updates/latest.json', async (_req, res) => {
  try {
    const rel = await latestRelease();
    res.set('Cache-Control', 'no-store');
    res.json({ version: rel.version, published: rel.published, notes: rel.notes, assets: rel.assets.map(({ name, size }) => ({ name, size })) });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// Any file of the latest release: latest.yml, latest-mac.yml, installers, blockmaps.
app.get('/updates/:file', async (req, res) => {
  try {
    const rel = await latestRelease();
    // GitHub turns spaces into dots in asset names; accept either spelling.
    const want = req.params.file;
    const asset = rel.assets.find((a) => a.name === want || a.name === want.replace(/ /g, '.'));
    if (!asset) return res.status(404).json({ error: 'not in latest release' });
    const r = await fetch(asset.url, {
      headers: {
        Accept: 'application/octet-stream',
        'User-Agent': 'parley-server',
        ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
      },
      redirect: 'follow',
    });
    if (!r.ok || !r.body) return res.status(502).json({ error: `GitHub answered ${r.status}` });
    res.set({
      'Content-Type': /\.ya?ml$/.test(asset.name) ? 'text/yaml' : 'application/octet-stream',
      'Content-Length': String(asset.size),
      'Cache-Control': /\.ya?ml$/.test(asset.name) ? 'no-store' : 'public, max-age=3600',
    });
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) {
    if (!res.headersSent) res.status(502).json({ error: String(e.message || e) });
  }
});

// The same UI the desktop app uses also works in Chrome/Edge as a fallback.
app.use(express.static(path.join(__dirname, '..', 'app', 'renderer')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 512 * 1024 });

// ------------------------------------------------------------------ chat + presence
/** key (lowercase name) -> { name, ws, status } */
const online = new Map();
/** key -> { name, lastSeen, avatar, avatarRev } — everyone seen since the server started */
const known = new Map();
/** key -> [messages] waiting for an offline user */
const queues = new Map();
/** key -> Map(fromKey -> ts): read receipts waiting for an offline sender */
const readQueues = new Map();

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
      avatarRev: k.avatarRev || '',
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

// Only pass along file info we actually have, with tidy fields.
function cleanFileRef(f) {
  if (!f || typeof f !== 'object' || !ID_RE.test(String(f.id || ''))) return null;
  const meta = files.get(f.id);
  if (!meta) return null;
  const int = (v, max) => (Number.isFinite(+v) && +v > 0 ? Math.min(max, Math.round(+v)) : undefined);
  return {
    id: f.id,
    name: meta.name,
    size: meta.size,
    type: meta.type,
    kind: f.kind === 'image' ? 'image' : 'file',
    w: int(f.w, 20000),
    h: int(f.h, 20000),
    sticker: !!f.sticker,
  };
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
      if (!codeOk(msg.code)) {
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
      const k = known.get(key) || {};
      known.set(key, { ...k, name, lastSeen: Date.now() });
      send(ws, {
        type: 'welcome',
        you: name,
        iceServers: buildIceServers(),
        users: userList(),
        avatarRev: known.get(key).avatarRev || '',
        limits: { maxFileMB: Math.round(MAX_FILE / 1048576) },
      });
      const q = queues.get(key);
      if (q && q.length) {
        for (const m of q) {
          send(ws, m);
          // tell the original sender it finally arrived
          const sender = online.get(keyOf(m.from));
          if (sender) send(sender.ws, { type: 'chat-ack', id: m.id, ts: m.ts, delivered: true, to: name });
        }
        queues.delete(key);
      }
      const rq = readQueues.get(key);
      if (rq) {
        for (const [fromKey, ts] of rq) send(ws, { type: 'read', from: known.get(fromKey)?.name || fromKey, ts });
        readQueues.delete(key);
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
        if (!toKey || !known.has(toKey)) return;
        const text = String(msg.text || '').slice(0, MAX_TEXT);
        const file = cleanFileRef(msg.file);
        const sticker = typeof msg.sticker === 'string' && /^[a-z0-9-]{1,40}$/.test(msg.sticker) ? msg.sticker : undefined;
        if (!text.trim() && !file && !sticker) return;
        const out = {
          type: 'chat',
          id: String(msg.id || Date.now()).slice(0, 64),
          from: self.name,
          to: known.get(toKey).name,
          text,
          ...(file ? { file } : {}),
          ...(sticker ? { sticker } : {}),
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
        send(ws, { type: 'chat-ack', id: out.id, ts: out.ts, delivered: !!target, to: out.to });
        break;
      }
      case 'read': {
        // "I've seen everything you sent me up to ts"
        const toKey = keyOf(msg.to || '');
        const ts = Number(msg.ts);
        if (!toKey || !known.has(toKey) || !Number.isFinite(ts)) return;
        const target = online.get(toKey);
        if (target) send(target.ws, { type: 'read', from: self.name, ts });
        else {
          const rq = readQueues.get(toKey) || new Map();
          rq.set(me, Math.max(ts, rq.get(me) || 0));
          readQueues.set(toKey, rq);
        }
        break;
      }
      case 'profile': {
        const k = known.get(me);
        const a = msg.avatar;
        if (a === null || a === '') {
          k.avatar = '';
          k.avatarRev = '';
        } else if (typeof a === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a) && a.length <= MAX_AVATAR) {
          k.avatar = a;
          k.avatarRev = crypto.createHash('sha1').update(a).digest('hex').slice(0, 12);
        } else return;
        send(ws, { type: 'profile-ok', avatarRev: k.avatarRev });
        broadcastPresence();
        break;
      }
      case 'get-avatar': {
        const k = known.get(keyOf(msg.name || ''));
        if (k) send(ws, { type: 'avatar', name: k.name, rev: k.avatarRev || '', data: k.avatar || '' });
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
  console.log(`Parley server listening on :${PORT} (files in ${FILES_DIR}, max ${Math.round(MAX_FILE / 1048576)} MB)`);
  if (!ACCESS_CODE) console.warn('WARNING: ACCESS_CODE not set — anyone with the URL can sign in.');
});
