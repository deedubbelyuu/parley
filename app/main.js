// Parley — Electron main process.
// Owns the window, the floating mini-window behavior, screen-source listing,
// OS permissions, notifications, the log file and "open links in" browser choice.
// All calling/chat logic lives in renderer/app.js.

const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  systemPreferences,
  session,
  shell,
  Notification,
  screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');

let win = null;
let inCall = false;
let compact = false;
let normalBounds = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// ---------------------------------------------------------------- log file
// %APPDATA%\Parley\parley.log on Windows, ~/Library/Application Support/Parley/parley.log on Mac.
// Kept small: rotated to parley.old.log at 1 MB.
const LOG_FILE = path.join(app.getPath('userData'), 'parley.log');
function log(...parts) {
  const line = `${new Date().toISOString()} ${parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 1_000_000) {
      fs.renameSync(LOG_FILE, LOG_FILE.replace(/\.log$/, '.old.log'));
    }
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}
log('---- Parley', app.getVersion(), 'starting on', process.platform, process.getSystemVersion?.() || '', 'electron', process.versions.electron);

// ---------------------------------------------------------------- browsers for links
// "Open links in": detect installed browsers once, then launch the chosen one directly
// instead of the system default.
let linkBrowser = ''; // exe/app path chosen by the user; '' = system default
let browserCache = null;

const exists = (p) => {
  try {
    return !!p && fs.existsSync(p);
  } catch {
    return false;
  }
};

function regQuery(root) {
  return new Promise((resolve) => {
    execFile('reg', ['query', `${root}\\SOFTWARE\\Clients\\StartMenuInternet`, '/s'], { windowsHide: true, timeout: 5000 }, (err, out) =>
      resolve(err ? '' : String(out))
    );
  });
}

async function detectWindowsBrowsers() {
  const found = [];
  // 1) Every browser registered with Windows (what "Default apps" lists).
  for (const root of ['HKCU', 'HKLM']) {
    const out = await regQuery(root);
    let key = '';
    const names = {};
    for (const raw of out.split(/\r?\n/)) {
      const line = raw.trimEnd();
      if (/^HKEY_/i.test(line)) {
        key = line;
        continue;
      }
      const m = line.match(/^\s+\S.*?\s+REG_(?:EXPAND_)?SZ\s+(.*)$/);
      if (!m || !key) continue;
      // The key's unnamed value shows as "(Default)" — localized, but always in parentheses.
      if (!/^\s+\([^)]*\)\s+REG_/.test(line)) continue;
      const base = key.match(/StartMenuInternet\\([^\\]+)$/i);
      if (base) names[base[1].toLowerCase()] = m[1].trim();
      const cmd = key.match(/StartMenuInternet\\([^\\]+)\\shell\\open\\command$/i);
      if (cmd) {
        const exe = (m[1].match(/^"([^"]+)"/) || m[1].match(/^(.+?\.exe)\b/i) || [])[1];
        if (exe) found.push({ id: cmd[1].toLowerCase(), exe });
      }
    }
    for (const f of found) if (!f.name && names[f.id]) f.name = names[f.id];
  }
  // 2) Common install locations (in case the registry is incomplete).
  const env = process.env;
  const PF = env.ProgramFiles || 'C:\\Program Files';
  const PF86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const LAD = env.LOCALAPPDATA || '';
  const known = [
    ['Google Chrome', [`${PF}\\Google\\Chrome\\Application\\chrome.exe`, `${PF86}\\Google\\Chrome\\Application\\chrome.exe`, `${LAD}\\Google\\Chrome\\Application\\chrome.exe`]],
    ['Microsoft Edge', [`${PF86}\\Microsoft\\Edge\\Application\\msedge.exe`, `${PF}\\Microsoft\\Edge\\Application\\msedge.exe`]],
    ['Firefox', [`${PF}\\Mozilla Firefox\\firefox.exe`, `${PF86}\\Mozilla Firefox\\firefox.exe`]],
    ['Brave', [`${PF}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`, `${LAD}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`]],
    ['Opera', [`${LAD}\\Programs\\Opera\\opera.exe`, `${LAD}\\Programs\\Opera\\launcher.exe`]],
    ['Opera GX', [`${LAD}\\Programs\\Opera GX\\opera.exe`, `${LAD}\\Programs\\Opera GX\\launcher.exe`]],
    ['Vivaldi', [`${LAD}\\Vivaldi\\Application\\vivaldi.exe`, `${PF}\\Vivaldi\\Application\\vivaldi.exe`]],
    ['Arc', [`${LAD}\\Microsoft\\WindowsApps\\Arc.exe`]],
    ['Zen', [`${PF}\\Zen Browser\\zen.exe`]],
  ];
  for (const [name, paths] of known) {
    const exe = paths.find(exists);
    if (exe) found.push({ name, exe });
  }
  return found;
}

function detectMacBrowsers() {
  const names = [
    'Safari', 'Google Chrome', 'Firefox', 'Microsoft Edge', 'Brave Browser', 'Arc', 'Opera', 'Opera GX',
    'Vivaldi', 'Orion', 'Zen', 'Zen Browser', 'Chromium', 'DuckDuckGo', 'Google Chrome Canary', 'Firefox Developer Edition',
  ];
  const dirs = ['/Applications', path.join(app.getPath('home'), 'Applications')];
  const found = [];
  for (const n of names) {
    for (const d of dirs) {
      const p = path.join(d, `${n}.app`);
      if (exists(p)) {
        found.push({ name: n, exe: p });
        break;
      }
    }
  }
  return found;
}

function detectLinuxBrowsers() {
  const cands = [
    ['Google Chrome', '/usr/bin/google-chrome'], ['Chromium', '/usr/bin/chromium'], ['Chromium', '/usr/bin/chromium-browser'],
    ['Firefox', '/usr/bin/firefox'], ['Brave', '/usr/bin/brave-browser'], ['Microsoft Edge', '/usr/bin/microsoft-edge'], ['Vivaldi', '/usr/bin/vivaldi'],
  ];
  return cands.filter(([, p]) => exists(p)).map(([name, exe]) => ({ name, exe }));
}

async function listBrowsers() {
  if (browserCache) return browserCache;
  let list = [];
  try {
    if (process.platform === 'win32') list = await detectWindowsBrowsers();
    else if (process.platform === 'darwin') list = detectMacBrowsers();
    else list = detectLinuxBrowsers();
  } catch (e) {
    log('browser detection failed', String(e));
  }
  const seen = new Set();
  browserCache = list
    .filter((b) => exists(b.exe))
    .map((b) => ({ name: b.name || path.basename(b.exe).replace(/\.(exe|app)$/i, ''), exe: b.exe }))
    .filter((b) => {
      const k = b.exe.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return browserCache;
}

function openLink(url) {
  if (!/^https?:\/\//i.test(url)) return;
  if (linkBrowser && exists(linkBrowser)) {
    try {
      const child =
        process.platform === 'darwin'
          ? spawn('open', ['-a', linkBrowser, url], { detached: true, stdio: 'ignore' })
          : spawn(linkBrowser, [url], { detached: true, stdio: 'ignore', windowsHide: false });
      child.on('error', (e) => {
        log('link browser failed, using default', String(e));
        shell.openExternal(url);
      });
      child.unref();
      return;
    } catch (e) {
      log('link browser spawn threw', String(e));
    }
  }
  shell.openExternal(url);
}

// ---------------------------------------------------------------- window
function createWindow() {
  win = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 240,
    minHeight: 150,
    title: 'Parley',
    backgroundColor: '#0e141b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep video decoding + call audio alive while minimized / in the background.
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Skype-style: minimizing during a call leaves a small floating video of the other person.
  // First choice is the OS-level picture-in-picture window. If that's refused,
  // we shrink Parley itself into an always-on-top mini window instead.
  win.on('minimize', async () => {
    if (!inCall || compact) return;
    let ok = false;
    try {
      ok = await win.webContents.executeJavaScript(
        'window.__parleyEnterPiP ? window.__parleyEnterPiP() : false',
        true // treat as a user gesture so picture-in-picture is allowed
      );
    } catch {
      ok = false;
    }
    if (!ok) {
      win.restore();
      setCompact(true);
    }
  });

  const exitPiP = () =>
    win.webContents
      .executeJavaScript('window.__parleyExitPiP && window.__parleyExitPiP()', true)
      .catch(() => {});
  win.on('restore', exitPiP);
  win.on('show', exitPiP);

  win.webContents.setWindowOpenHandler(({ url }) => {
    openLink(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      openLink(url);
    }
  });
  win.webContents.on('render-process-gone', (_e, d) => log('renderer gone', d));

  win.on('closed', () => {
    win = null;
  });
}

function setCompact(on) {
  if (!win || on === compact) return;
  compact = on;
  if (on) {
    normalBounds = win.getBounds();
    const { workArea } = screen.getDisplayMatching(normalBounds);
    const w = 380;
    const h = 240;
    win.setAlwaysOnTop(true, 'floating');
    if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setBounds({ x: workArea.x + workArea.width - w - 24, y: workArea.y + workArea.height - h - 24, width: w, height: h });
  } else {
    win.setAlwaysOnTop(false);
    if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(false);
    if (normalBounds) win.setBounds(normalBounds);
    win.focus();
  }
  win.webContents.send('compact-changed', compact);
}

// ---------------------------------------------------------------- IPC from the renderer

ipcMain.on('call-state', (_e, active) => {
  inCall = !!active;
  if (!inCall && compact) setCompact(false);
});

ipcMain.on('set-compact', (_e, on) => setCompact(!!on));

ipcMain.on('log', (_e, parts) => log('[ui]', ...(Array.isArray(parts) ? parts : [parts])));
ipcMain.on('open-log', () => {
  log('log opened by user');
  shell.openPath(LOG_FILE);
});

ipcMain.handle('list-browsers', () => listBrowsers());
ipcMain.on('set-link-browser', (_e, exe) => {
  linkBrowser = typeof exe === 'string' ? exe : '';
});
ipcMain.on('open-link', (_e, url) => openLink(String(url || '')));

// Screen sources shown in Parley's own picker. We remember exactly what we listed so the
// display-media handler can grant that same source without listing screens a second time
// (on Windows a second getSources() call can return different ids → silent failure).
let listedSources = new Map();
ipcMain.handle('get-screen-sources', async () => {
  // On macOS the first getSources() call triggers the Screen Recording permission prompt.
  const opts = { types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 }, fetchWindowIcons: false };
  let sources = await desktopCapturer.getSources(opts);
  if (!sources.length) {
    // The capturer occasionally answers empty on its first call; one retry fixes it.
    await new Promise((r) => setTimeout(r, 400));
    sources = await desktopCapturer.getSources(opts);
  }
  listedSources = new Map(sources.map((s) => [s.id, { id: s.id, name: s.name }]));
  const needsPermission =
    process.platform === 'darwin' && systemPreferences.getMediaAccessStatus('screen') !== 'granted';
  log('screen sources listed', sources.length, needsPermission ? '(mac permission missing)' : '');
  return {
    needsPermission,
    sources: sources
      .filter((s) => s.name !== 'Parley')
      .map((s) => ({
        id: s.id,
        name: s.name,
        isScreen: s.id.startsWith('screen:'),
        thumbnail: s.thumbnail.toDataURL(),
      })),
  };
});

// The renderer shows its own picker, tells us which screen/window was chosen
// (and whether to include computer sound), then calls getDisplayMedia();
// setDisplayMediaRequestHandler hands over that source.
let chosen = { id: null, name: '', audio: false };
ipcMain.handle('select-screen-source', (_e, id, withAudio) => {
  const src = listedSources.get(id);
  chosen = { id, name: src ? src.name : 'Screen', audio: !!withAudio };
  log('screen source chosen', chosen);
  return true;
});

// System-audio ("loopback") capture is supported by Electron on Windows and macOS (14.2+).
const LOOPBACK_SUPPORTED = process.platform === 'win32' || process.platform === 'darwin';

function installDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    try {
      const pick = chosen;
      chosen = { id: null, name: '', audio: false };
      if (!pick.id) {
        log('display media: no source chosen, denying');
        return callback({});
      }
      const wantAudio = pick.audio && request.audioRequested && LOOPBACK_SUPPORTED;
      const video = { id: pick.id, name: pick.name };
      log('display media: granting', video, wantAudio ? 'with loopback sound' : 'without sound');
      // 'loopback' = everything your computer plays. The renderer also asks for
      // restrictOwnAudio so Parley's own sound (your friend's voice) is left out.
      callback(wantAudio ? { video, audio: 'loopback' } : { video });
    } catch (e) {
      log('display media error', String(e && e.stack ? e.stack : e));
      callback({});
    }
  });
}

ipcMain.handle('loopback-supported', () => LOOPBACK_SUPPORTED);

ipcMain.handle('request-media-access', async () => {
  if (process.platform !== 'darwin') return { camera: true, microphone: true };
  const camera = await systemPreferences.askForMediaAccess('camera').catch(() => false);
  const microphone = await systemPreferences.askForMediaAccess('microphone').catch(() => false);
  return { camera, microphone };
});

ipcMain.on('open-privacy-settings', (_e, which) => {
  if (process.platform === 'darwin') {
    const pane = { screen: 'Privacy_ScreenCapture', camera: 'Privacy_Camera', microphone: 'Privacy_Microphone' }[which] || 'Privacy';
    shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
  } else {
    const uri = { camera: 'ms-settings:privacy-webcam', microphone: 'ms-settings:privacy-microphone' }[which] || 'ms-settings:privacy';
    shell.openExternal(uri);
  }
});

ipcMain.on('notify', (_e, { title, body, silent }) => {
  if (!Notification.isSupported() || !win) return;
  if (win.isFocused() && !win.isMinimized()) return;
  const n = new Notification({ title, body, silent: !!silent });
  n.on('click', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
  n.show();
});

ipcMain.on('attention', () => {
  if (!win) return;
  if (process.platform === 'darwin') app.dock?.bounce('critical');
  else win.flashFrame(true);
});

ipcMain.on('focus-window', () => {
  if (!win) return;
  if (compact) setCompact(false);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  win.flashFrame(false);
});

// ---------------------------------------------------------------- app lifecycle

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  // Allow camera / mic / screen capture / notifications for our own page only.
  // 'display-capture' is the screen-share permission: without it getDisplayMedia() is refused
  // with NotAllowedError before our display-media handler ever runs (the v1.0.0 screen-share bug).
  const allowed = ['media', 'display-capture', 'notifications', 'fullscreen', 'clipboard-sanitized-write', 'speaker-selection'];
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    const ok = allowed.includes(permission);
    if (!ok) log('permission denied:', permission);
    cb(ok);
  });

  installDisplayMediaHandler();
  if (process.platform === 'win32') app.setAppUserModelId('com.daylen.parley');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (win) win.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (e) => log('main uncaught', String(e && e.stack ? e.stack : e)));
