// Parley server — presence, text chat relay (replies, reactions, edits, deletes),
// read receipts, profile pictures, file/photo hand-off, link previews, app updates,
// and WebRTC call signaling.
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
//   LINK_PREVIEWS    Set to 0 to turn off link previews (the server fetching pages people paste)
//   PORT             Set by Railway

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
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
app.use(['/files', '/updates', '/preview'], (req, res, next) => {
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

// ---- link previews
// The app asks us for a preview card (title, picture, site) for a link someone sent. We fetch
// the page here so the app never talks to random websites itself, and send the picture back
// inline as a data URL. Private/internal addresses are refused so this can't be used to poke
// at Railway's network.
const LINK_PREVIEWS = process.env.LINK_PREVIEWS !== '0';
const PREVIEW_ALLOW_PRIVATE = process.env.PREVIEW_ALLOW_PRIVATE === '1'; // tests only
const PREVIEW_UA = 'Mozilla/5.0 (compatible; ParleyBot/1.3; +link previews for a private chat app)';
const previewCache = new Map(); // url -> { at, data }

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = String(ip).toLowerCase();
  if (s.startsWith('::ffff:')) return privateIp(s.slice(7));
  return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb');
}
async function safeUrl(raw) {
  let u;
  try {
    u = new URL(String(raw));
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  if (PREVIEW_ALLOW_PRIVATE) return u;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^localhost$|\.local$|\.internal$/i.test(host)) return null;
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) return null;
  return u;
}
// GET with a size cap, a time limit and redirects checked one hop at a time.
async function fetchCapped(raw, { accept, max, timeout = 6000 }) {
  let cur = raw;
  for (let hop = 0; hop < 5; hop++) {
    const u = await safeUrl(cur);
    if (!u) throw new Error('blocked address');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(u, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': PREVIEW_UA, Accept: accept, 'Accept-Language': 'en-US,en;q=0.8' } });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        cur = new URL(r.headers.get('location'), u).href;
        r.body?.cancel().catch(() => {});
        continue;
      }
      if (!r.ok || !r.body) throw new Error(`answered ${r.status}`);
      const parts = [];
      let size = 0;
      const reader = r.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > max) {
          reader.cancel().catch(() => {});
          if (/^image\//.test(accept)) throw new Error('too big');
          break; // for pages, the head is all we need
        }
        parts.push(value);
      }
      return { url: u.href, type: String(r.headers.get('content-type') || ''), body: Buffer.concat(parts) };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('too many redirects');
}
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseMeta(html) {
  const meta = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attr = (n) => (tag.match(new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')) || [])
      .slice(2).find((x) => x != null);
    const key = (attr('property') || attr('name') || attr('itemprop') || '').toLowerCase();
    const val = attr('content');
    if (key && val != null && !(key in meta)) meta[key] = decodeEntities(val);
  }
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  return { meta, title: title ? decodeEntities(title) : '' };
}
function youTubeId(u) {
  const h = u.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/) || [])[1] || '';
  }
  return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : '';
}
async function imageData(url) {
  try {
    const r = await fetchCapped(url, { accept: 'image/*', max: 1_500_000, timeout: 6000 });
    const type = r.type.split(';')[0].trim().toLowerCase();
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type) || r.body.length < 100) return '';
    return `data:${type};base64,${r.body.toString('base64')}`;
  } catch {
    return '';
  }
}
async function buildPreview(raw) {
  const u = await safeUrl(raw);
  if (!u) return null;
  const yt = youTubeId(u);
  if (yt) {
    let title = '';
    let author = '';
    try {
      const r = await fetchCapped(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + yt)}`, { accept: 'application/json', max: 100_000 });
      const j = JSON.parse(r.body.toString('utf8'));
      title = String(j.title || '');
      author = String(j.author_name || '');
    } catch {}
    const image = (await imageData(`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`)) || (await imageData(`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`));
    if (!title && !image) return null;
    return { url: u.href, kind: 'video', site: 'YouTube', domain: 'youtube.com', title: title || 'YouTube video', author, description: author, image };
  }
  const page = await fetchCapped(u.href, { accept: 'text/html,application/xhtml+xml', max: 600_000 });
  const type = page.type.toLowerCase();
  if (/^image\/(jpeg|png|webp|gif)/.test(type)) {
    return { url: page.url, kind: 'image', site: u.hostname.replace(/^www\./, ''), title: decodeURIComponent(u.pathname.split('/').pop() || u.hostname), description: '', image: await imageData(page.url) };
  }
  if (!/html|xml/.test(type)) return null;
  const { meta, title } = parseMeta(page.body.toString('utf8'));
  const pick = (...k) => k.map((x) => meta[x]).find((v) => v && v.trim()) || '';
  const t = pick('og:title', 'twitter:title') || title;
  if (!t) return null;
  let img = pick('og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src', 'image');
  try {
    img = img ? new URL(img, page.url).href : '';
  } catch {
    img = '';
  }
  const ogType = pick('og:type');
  return {
    url: page.url,
    kind: /video/.test(ogType) ? 'video' : 'page',
    site: pick('og:site_name', 'application-name') || new URL(page.url).hostname.replace(/^www\./, ''),
    domain: new URL(page.url).hostname.replace(/^www\./, ''),
    title: t.slice(0, 200),
    description: pick('og:description', 'twitter:description', 'description').slice(0, 300),
    image: img ? await imageData(img) : '',
  };
}
app.get('/preview', async (req, res) => {
  if (!LINK_PREVIEWS) return res.status(404).json({ error: 'off' });
  const url = String(req.query.url || '').slice(0, 2000);
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'bad url' });
  const hit = previewCache.get(url);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return hit.data ? res.json(hit.data) : res.status(404).json({ error: 'no preview' });
  let data = null;
  try {
    data = await buildPreview(url);
  } catch (e) {
    data = null;
  }
  previewCache.set(url, { at: Date.now(), data });
  if (previewCache.size > 500) previewCache.delete(previewCache.keys().next().value);
  res.set('Cache-Control', 'private, max-age=3600');
  return data ? res.json(data) : res.status(404).json({ error: 'no preview' });
});

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
/** key -> [messages] waiting for an offline user (chats, reactions, edits, deletes) */
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

const STATUSES = new Set(['online', 'away', 'busy', 'dnd']);

// Hand a message to someone now, or keep it until they sign in.
function deliver(toKey, out) {
  const target = online.get(toKey);
  if (target) {
    send(target.ws, out);
    return true;
  }
  const q = queues.get(toKey) || [];
  q.push(out);
  if (q.length > MAX_QUEUE) q.shift();
  queues.set(toKey, q);
  return false;
}

function cleanReply(r) {
  if (!r || typeof r !== 'object') return undefined;
  const id = String(r.id || '').slice(0, 64);
  if (!id) return undefined;
  return { id, from: String(r.from || '').slice(0, 32), text: String(r.text || '').slice(0, 240) };
}

// Only pass along file info we actually have, with tidy fields.
function cleanFileRef(f) {
  if (!f || typeof f !== 'object' || !ID_RE.test(String(f.id || ''))) return null;
  const meta = files.get(f.id);
  if (!meta) return null;
  const int = (v, max) => (Number.isFinite(+v) && +v > 0 ? Math.min(max, Math.round(+v)) : undefined);
  const snap = cleanSnap(f.snap);
  return {
    id: f.id,
    name: meta.name,
    size: meta.size,
    type: meta.type,
    kind: f.kind === 'image' ? 'image' : 'file',
    w: int(f.w, 20000),
    h: int(f.h, 20000),
    sticker: !!f.sticker,
    ...(snap ? { snap } : {}),
  };
}
// Call snapshots: which snapshot a picture belongs to, whose it is, and screen or camera.
function cleanSnap(sn) {
  if (!sn || typeof sn !== 'object') return null;
  const id = String(sn.id || '').slice(0, 40);
  if (!/^[a-z0-9]{4,40}$/i.test(id)) return null;
  return { id, what: sn.what === 'screen' ? 'screen' : 'face', of: String(sn.of || '').slice(0, 40) };
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
          const sender = m.type === 'chat' && online.get(keyOf(m.from));
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
        const reply = cleanReply(msg.reply);
        const out = {
          type: 'chat',
          id: String(msg.id || Date.now()).slice(0, 64),
          from: self.name,
          to: known.get(toKey).name,
          text,
          ...(file ? { file } : {}),
          ...(sticker ? { sticker } : {}),
          ...(reply ? { reply } : {}),
          ts: Date.now(),
        };
        const delivered = deliver(toKey, out);
        send(ws, { type: 'chat-ack', id: out.id, ts: out.ts, delivered, to: out.to });
        break;
      }
      // Reactions, edits and deletes of an earlier message (by its id).
      case 'react':
      case 'edit':
      case 'delete': {
        const toKey = keyOf(msg.to || '');
        const id = String(msg.id || '').slice(0, 64);
        if (!toKey || !known.has(toKey) || !id) return;
        const out = { type: msg.type, from: self.name, id, ts: Date.now() };
        if (msg.type === 'react') {
          const emoji = String(msg.emoji || '');
          if (!emoji || emoji.length > 16) return;
          out.emoji = emoji;
          out.on = !!msg.on;
        } else if (msg.type === 'edit') {
          const text = String(msg.text || '').slice(0, MAX_TEXT);
          if (!text.trim()) return;
          out.text = text;
        }
        deliver(toKey, out);
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
        if (STATUSES.has(msg.status)) {
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
