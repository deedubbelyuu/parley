// Parley — Electron main process.
// Owns the main window, the floating mini window, the tray (background running),
// screen-source listing + system-sound capture, OS permissions, notifications,
// auto-update, the log file and "open links in" browser choice.
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
  Tray,
  Menu,
  nativeImage,
  nativeTheme,
  net,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

let win = null;
let miniWin = null;
let tray = null;
let inCall = false;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const ASSETS = path.join(__dirname, 'assets');

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

// ---------------------------------------------------------------- app settings (main-process side)
// Things the main process needs before the UI loads (start hidden, keep running, mini window spot).
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const settings = {
  keepRunning: true, // closing the window keeps Parley in the tray / menu bar
  openAtLogin: false,
  trayHintShown: false,
  miniBounds: null,
};
try {
  Object.assign(settings, JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
} catch {}
let saveTimer = null;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (e) {
      log('settings save failed', String(e));
    }
  }, 300);
}

function applyLoginItem() {
  if (!IS_WIN && !IS_MAC) return;
  try {
    app.setLoginItemSettings({ openAtLogin: !!settings.openAtLogin, args: ['--hidden'] });
  } catch (e) {
    log('login item failed', String(e));
  }
}

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
    if (IS_WIN) list = await detectWindowsBrowsers();
    else if (IS_MAC) list = detectMacBrowsers();
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
      const child = IS_MAC
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

// ---------------------------------------------------------------- main window
const startHidden =
  process.argv.includes('--hidden') || (IS_MAC && (() => {
    try {
      return app.getLoginItemSettings().wasOpenedAtLogin;
    } catch {
      return false;
    }
  })());

function showMain() {
  if (!win) return createWindow(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  win.flashFrame(false);
}

function createWindow(forceShow = false) {
  win = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 520,
    minHeight: 420,
    title: 'Parley',
    backgroundColor: '#0e141b',
    icon: path.join(ASSETS, 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep video decoding + call audio alive while minimized / in the background / in the tray.
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    if (forceShow || !startHidden) win.show();
    else log('started hidden (tray)');
  });

  // Skype-style: minimizing (or closing to the tray) during a call leaves a small
  // floating video of the other person on top of everything.
  win.on('minimize', () => inCall && openMini());
  win.on('hide', () => inCall && openMini());
  win.on('restore', closeMini);
  win.on('show', () => {
    if (!win.isMinimized()) closeMini();
  });

  win.on('close', (e) => {
    if (quitting || !settings.keepRunning) return;
    // Keep running in the background so calls and messages still come in.
    e.preventDefault();
    if (win.isFullScreen()) win.setFullScreen(false);
    win.hide();
    if (!settings.trayHintShown && Notification.isSupported()) {
      settings.trayHintShown = true;
      saveSettings();
      new Notification({
        title: 'Parley is still running',
        body: IS_MAC
          ? 'You’ll still get calls and messages. Quit from the Parley icon in the menu bar.'
          : 'You’ll still get calls and messages. Right-click the Parley icon by the clock to quit.',
        silent: true,
      }).show();
    }
  });

  win.webContents.setWindowOpenHandler(({ url, frameName }) => {
    if (frameName === 'parley-mini' && (url === 'about:blank' || url === '')) {
      return { action: 'allow', overrideBrowserWindowOptions: miniOptions() };
    }
    openLink(url);
    return { action: 'deny' };
  });
  win.webContents.on('did-create-window', (child, details) => {
    if (details.frameName === 'parley-mini') setupMini(child);
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

// ---------------------------------------------------------------- mini window
// A real little window (opened by the UI with window.open, so it shares the call's video
// streams). Unlike the OS picture-in-picture it stays above fullscreen videos, can be
// resized from its corners and remembers where you put it.
const MINI_MIN = { width: 200, height: 120 };

function miniOptions() {
  const { workArea } = screen.getPrimaryDisplay();
  let b = settings.miniBounds;
  const onScreen =
    b && screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return b.x + 40 < a.x + a.width && b.x + b.width - 40 > a.x && b.y + 20 < a.y + a.height && b.y + b.height - 20 > a.y;
    });
  if (!onScreen) {
    const w = 360;
    const h = 220;
    b = { x: workArea.x + workArea.width - w - 24, y: workArea.y + workArea.height - h - 24, width: w, height: h };
  }
  return {
    ...b,
    minWidth: MINI_MIN.width,
    minHeight: MINI_MIN.height,
    frame: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    show: false,
    title: 'Parley',
    backgroundColor: '#000000',
    ...(IS_MAC ? { type: 'panel' } : {}),
    webPreferences: { backgroundThrottling: false },
  };
}

let topTimer = null;
function setupMini(child) {
  miniWin = child;
  child.setAlwaysOnTop(true, 'screen-saver');
  if (IS_MAC) child.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  child.setMenu?.(null);
  const remember = () => {
    if (!child.isDestroyed()) {
      settings.miniBounds = child.getBounds();
      saveSettings();
    }
  };
  // 'move'/'resize' also fire for our own setBounds (corner dragging); saveSettings is debounced.
  child.on('move', remember);
  child.on('resize', remember);
  child.once('ready-to-show', () => child.showInactive());
  setTimeout(() => !child.isDestroyed() && !child.isVisible() && child.showInactive(), 300);
  // Windows: another app going fullscreen (a browser video, a game in borderless mode)
  // pushes itself to the top. Re-assert ours every second and a half.
  if (IS_WIN) {
    clearInterval(topTimer);
    topTimer = setInterval(() => {
      if (!miniWin || miniWin.isDestroyed()) return clearInterval(topTimer);
      miniWin.setAlwaysOnTop(true, 'screen-saver');
      miniWin.moveTop();
    }, 1500);
  }
  child.on('closed', () => {
    if (miniWin === child) miniWin = null;
    clearInterval(topTimer);
    win?.webContents.send('mini-closed');
  });
  log('mini window open', child.getBounds());
}

function openMini() {
  if (!win || !inCall || (miniWin && !miniWin.isDestroyed())) return;
  // userGesture = true so window.open is never treated as a blocked popup
  win.webContents.executeJavaScript('window.__parleyMini && window.__parleyMini.open()', true).catch(() => {});
}
function closeMini() {
  if (!win) return;
  win.webContents.executeJavaScript('window.__parleyMini && window.__parleyMini.close()', true).catch(() => {});
}

ipcMain.handle('mini-get-bounds', () => (miniWin && !miniWin.isDestroyed() ? miniWin.getBounds() : null));
ipcMain.on('mini-set-bounds', (_e, b) => {
  if (!miniWin || miniWin.isDestroyed() || !b) return;
  const n = (v) => Math.round(Number(v) || 0);
  const width = Math.max(MINI_MIN.width, n(b.width));
  const height = Math.max(MINI_MIN.height, n(b.height));
  miniWin.setBounds({ x: n(b.x), y: n(b.y), width, height });
});
ipcMain.on('mini-expand', () => showMain());

// ---------------------------------------------------------------- tray (background running)
function trayIcon(unread) {
  if (IS_MAC) {
    const img = nativeImage.createFromPath(path.join(ASSETS, unread ? 'trayUnreadTemplate.png' : 'trayTemplate.png'));
    img.setTemplateImage(true);
    return img;
  }
  return nativeImage.createFromPath(path.join(ASSETS, unread ? 'tray-unread.png' : 'tray.png'));
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Open Parley', click: showMain },
    { type: 'separator' },
    {
      label: IS_MAC ? 'Open at login' : 'Start with Windows',
      type: 'checkbox',
      checked: !!settings.openAtLogin,
      click: (item) => setAppSetting('openAtLogin', item.checked),
    },
    {
      label: 'Keep running when the window is closed',
      type: 'checkbox',
      checked: !!settings.keepRunning,
      click: (item) => setAppSetting('keepRunning', item.checked),
    },
    { type: 'separator' },
    {
      label: 'Quit Parley',
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  try {
    tray = new Tray(trayIcon(false));
    tray.setToolTip('Parley');
    tray.setContextMenu(buildTrayMenu());
    tray.on('click', () => (IS_MAC ? tray.popUpContextMenu() : showMain()));
    tray.on('double-click', showMain);
  } catch (e) {
    log('tray failed', String(e));
  }
}

function setAppSetting(key, value) {
  if (!(key in settings)) return;
  settings[key] = value;
  saveSettings();
  if (key === 'openAtLogin') applyLoginItem();
  tray?.setContextMenu(buildTrayMenu());
  win?.webContents.send('app-settings', publicSettings());
}
const publicSettings = () => ({ keepRunning: !!settings.keepRunning, openAtLogin: !!settings.openAtLogin, version: app.getVersion(), platform: process.platform });

ipcMain.handle('get-app-settings', () => publicSettings());
ipcMain.on('set-app-setting', (_e, key, value) => {
  if (key === 'keepRunning' || key === 'openAtLogin') setAppSetting(key, !!value);
});

ipcMain.on('unread-count', (_e, n) => {
  n = Math.max(0, Number(n) || 0);
  try {
    if (IS_MAC) app.dock?.setBadge(n ? String(n) : '');
    else app.setBadgeCount?.(n);
  } catch {}
  if (tray) {
    tray.setImage(trayIcon(n > 0));
    tray.setToolTip(n ? `Parley — ${n} unread` : 'Parley');
  }
});

ipcMain.on('set-theme', (_e, { dark, bg }) => {
  nativeTheme.themeSource = dark ? 'dark' : 'light';
  if (bg && win) win.setBackgroundColor(bg);
});

// ---------------------------------------------------------------- IPC from the renderer

ipcMain.on('call-state', (_e, active) => {
  inCall = !!active;
  if (!inCall) closeMini();
  else if (win && (!win.isVisible() || win.isMinimized())) openMini();
});

ipcMain.on('go-mini', () => {
  if (!win || !inCall) return;
  win.minimize(); // the minimize handler opens the mini window
});

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

// Files received in chat: saved straight into Downloads (no dialog), then Open / Show in folder.
function uniquePath(dir, name) {
  const clean = String(name || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180) || 'file';
  const ext = path.extname(clean);
  const base = clean.slice(0, clean.length - ext.length);
  let p = path.join(dir, clean);
  for (let i = 1; exists(p); i++) p = path.join(dir, `${base} (${i})${ext}`);
  return p;
}
ipcMain.handle('save-download', async (_e, name, data) => {
  const dir = app.getPath('downloads');
  fs.mkdirSync(dir, { recursive: true });
  const p = uniquePath(dir, name);
  await fs.promises.writeFile(p, Buffer.from(data));
  log('file saved', p);
  return p;
});
ipcMain.on('open-path', (_e, p) => {
  if (typeof p === 'string' && p.startsWith(app.getPath('downloads'))) shell.openPath(p);
});
ipcMain.on('show-in-folder', (_e, p) => {
  if (typeof p === 'string' && p.startsWith(app.getPath('downloads'))) shell.showItemInFolder(p);
});

// ---------------------------------------------------------------- screen sharing
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
  const needsPermission = IS_MAC && systemPreferences.getMediaAccessStatus('screen') !== 'granted';
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

// The renderer shows its own picker, tells us which screen/window was chosen and how to
// capture computer sound, then calls getDisplayMedia(); the handler hands over that source.
//   audio 'exclude' = everything the computer plays EXCEPT Parley (your friend's voice)
//   audio 'plain'   = everything the computer plays
let chosen = { id: null, name: '', audio: false };
ipcMain.handle('select-screen-source', (_e, id, audio) => {
  const src = listedSources.get(id);
  chosen = { id, name: src ? src.name : 'Screen', audio: audio === 'exclude' || audio === 'plain' ? audio : false };
  log('screen source chosen', chosen);
  return true;
});

// System sound ("loopback") capture: Windows 10/11 and macOS (Electron uses CoreAudio taps on 14.2+).
const LOOPBACK_SUPPORTED = IS_WIN || IS_MAC;

// "Everything except Parley" uses the OS's per-process capture:
//   Windows: WASAPI process loopback (works from Windows 10 22H2, build 19045)
//   macOS:   CoreAudio process tap (macOS 14.2+)
function ownAudioExclusionSupported() {
  try {
    if (IS_WIN) {
      const build = Number(os.release().split('.').pop());
      return build >= 19045;
    }
    if (IS_MAC) {
      const [maj, min] = String(process.getSystemVersion()).split('.').map(Number);
      return maj > 14 || (maj === 14 && min >= 2);
    }
  } catch {}
  return false;
}

function installDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    try {
      const pick = chosen;
      chosen = { id: null, name: '', audio: false };
      if (!pick.id) {
        log('display media: no source chosen, denying');
        return callback({});
      }
      const video = { id: pick.id, name: pick.name };
      const wantAudio = pick.audio && request.audioRequested && LOOPBACK_SUPPORTED;
      // 'loopbackWithoutChrome' isn't in Electron's docs but is accepted and maps to
      // Chromium's own-process-excluded loopback device.
      const audio = wantAudio ? (pick.audio === 'exclude' ? 'loopbackWithoutChrome' : 'loopback') : null;
      log('display media: granting', video, audio ? `with sound (${audio})` : 'without sound');
      callback(audio ? { video, audio } : { video });
    } catch (e) {
      log('display media error', String(e && e.stack ? e.stack : e));
      try {
        callback({});
      } catch {}
    }
  });
}

ipcMain.handle('loopback-supported', () => ({ supported: LOOPBACK_SUPPORTED, exclude: LOOPBACK_SUPPORTED && ownAudioExclusionSupported() }));

ipcMain.handle('request-media-access', async () => {
  if (!IS_MAC) return { camera: true, microphone: true };
  const camera = await systemPreferences.askForMediaAccess('camera').catch(() => false);
  const microphone = await systemPreferences.askForMediaAccess('microphone').catch(() => false);
  return { camera, microphone };
});

ipcMain.on('open-privacy-settings', (_e, which) => {
  if (IS_MAC) {
    const pane = { screen: 'Privacy_ScreenCapture', camera: 'Privacy_Camera', microphone: 'Privacy_Microphone' }[which] || 'Privacy';
    shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
  } else {
    const uri = { camera: 'ms-settings:privacy-webcam', microphone: 'ms-settings:privacy-microphone' }[which] || 'ms-settings:privacy';
    shell.openExternal(uri);
  }
});

// ---------------------------------------------------------------- notifications & attention
ipcMain.on('notify', (_e, { title, body, silent }) => {
  if (!Notification.isSupported() || !win) return;
  if (win.isVisible() && win.isFocused() && !win.isMinimized()) return;
  const n = new Notification({ title, body, silent: !!silent, icon: path.join(ASSETS, 'icon.png') });
  n.on('click', showMain);
  n.show();
});

ipcMain.on('attention', () => {
  if (!win) return;
  if (IS_MAC) app.dock?.bounce('critical');
  else win.flashFrame(true);
});

// Incoming call while Parley is in the tray or minimized: pop the window up, Skype-style.
ipcMain.on('incoming-call', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
  if (IS_MAC) app.focus({ steal: true });
});

ipcMain.on('focus-window', showMain);

// ---------------------------------------------------------------- auto-update
// The app asks your Parley server for updates; the server fetches them from the latest
// GitHub Release (and keeps working after the repo goes private, with GITHUB_TOKEN set).
//   Windows: electron-updater downloads the new installer in the background and installs it silently.
//   Mac:     we download the new .zip, then swap the app in place on restart. (Squirrel.Mac,
//            the usual updater, refuses apps without a paid Apple signature.)
const Updater = {
  server: '',
  code: '',
  state: 'idle', // idle | checking | downloading | ready | none | error | unsupported
  version: '',
  progress: 0,
  error: '',
  timer: null,
  macApp: null,
  started: false,

  enabled() {
    return (app.isPackaged || process.env.PARLEY_UPDATE_TEST === '1') && (IS_WIN || IS_MAC);
  },
  emit() {
    win?.webContents.send('update-status', this.status());
  },
  status() {
    return { state: this.state, version: this.version, progress: this.progress, error: this.error, current: app.getVersion(), enabled: this.enabled() };
  },
  set(state, extra = {}) {
    Object.assign(this, { state, ...extra });
    this.emit();
  },
  headers() {
    return this.code ? { 'x-parley-code': this.code } : {};
  },

  configure(url, code) {
    this.server = String(url || '').replace(/\/+$/, '');
    this.code = String(code || '');
    if (!this.enabled() || !this.server) return;
    if (!this.started) {
      this.started = true;
      setTimeout(() => this.check(false), 20_000);
      this.timer = setInterval(() => this.check(false), 3 * 3600e3);
    }
  },

  async check(manual) {
    if (!this.enabled()) return this.set('unsupported');
    if (!this.server || ['checking', 'downloading', 'ready'].includes(this.state)) return this.status();
    this.set('checking', { error: '' });
    try {
      if (IS_WIN) await this.checkWindows();
      else await this.checkMac();
    } catch (e) {
      log('update check failed', String(e && e.message ? e.message : e));
      this.set(manual ? 'error' : 'idle', { error: String(e && e.message ? e.message : e) });
    }
    return this.status();
  },

  // ---- Windows (electron-updater, generic feed on our server)
  au: null,
  winUpdater() {
    if (this.au) return this.au;
    const { autoUpdater } = require('electron-updater');
    autoUpdater.logger = { info: (m) => log('[updater]', String(m)), warn: (m) => log('[updater warn]', String(m)), error: (m) => log('[updater error]', String(m)), debug() {} };
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (i) => this.set('downloading', { version: i.version, progress: 0 }));
    autoUpdater.on('update-not-available', () => this.set('none'));
    autoUpdater.on('download-progress', (p) => this.set('downloading', { progress: Math.round(p.percent || 0) }));
    autoUpdater.on('update-downloaded', (i) => this.set('ready', { version: i.version, progress: 100 }));
    autoUpdater.on('error', (e) => {
      log('[updater error]', String(e && e.message ? e.message : e));
      this.set('error', { error: String(e && e.message ? e.message : e) });
    });
    this.au = autoUpdater;
    return autoUpdater;
  },
  async checkWindows() {
    const au = this.winUpdater();
    au.setFeedURL({ provider: 'generic', url: `${this.server}/updates` });
    au.requestHeaders = this.headers();
    await au.checkForUpdates();
  },

  // ---- Mac (download zip, swap on restart)
  async checkMac() {
    const r = await net.fetch(`${this.server}/updates/latest.json`, { headers: this.headers() });
    if (!r.ok) throw new Error(`server answered ${r.status}`);
    const rel = await r.json();
    if (!newerVersion(rel.version, app.getVersion())) return this.set('none', { version: rel.version });
    const asset = (rel.assets || []).find((a) => /\.zip$/i.test(a.name) && /mac|darwin|universal/i.test(a.name));
    if (!asset) throw new Error('the release has no Mac .zip');
    this.set('downloading', { version: rel.version, progress: 0 });
    const dir = path.join(app.getPath('temp'), 'parley-update');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const zip = path.join(dir, 'update.zip');
    const dl = await net.fetch(`${this.server}/updates/${encodeURIComponent(asset.name)}`, { headers: this.headers() });
    if (!dl.ok || !dl.body) throw new Error(`download failed (${dl.status})`);
    let got = 0;
    const counter = new (require('stream').Transform)({
      transform: (chunk, _enc, cb) => {
        got += chunk.length;
        const pct = Math.round((got / (asset.size || 1)) * 100);
        if (pct !== this.progress) {
          this.progress = pct;
          this.emit();
        }
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(dl.body), counter, fs.createWriteStream(zip));
    if (asset.size && fs.statSync(zip).size !== asset.size) throw new Error('download was incomplete');
    const out = path.join(dir, 'app');
    await new Promise((res, rej) => execFile('ditto', ['-x', '-k', zip, out], (e) => (e ? rej(e) : res())));
    const found = fs.readdirSync(out).find((f) => f.endsWith('.app'));
    if (!found) throw new Error('no app inside the update');
    this.macApp = path.join(out, found);
    log('mac update ready', rel.version, this.macApp);
    this.set('ready', { version: rel.version, progress: 100 });
  },

  install() {
    if (this.state !== 'ready') return false;
    log('installing update', this.version);
    if (IS_WIN) {
      quitting = true;
      setImmediate(() => this.au.quitAndInstall(true, true));
      return true;
    }
    if (IS_MAC) {
      const bundle = path.resolve(process.execPath, '..', '..', '..'); // …/Parley.app
      if (!bundle.endsWith('.app') || /AppTranslocation|^\/Volumes\//.test(bundle)) {
        this.set('error', { error: 'Move Parley into your Applications folder to get automatic updates.' });
        return false;
      }
      try {
        fs.accessSync(path.dirname(bundle), fs.constants.W_OK);
      } catch {
        this.set('error', { error: `Parley can’t replace itself in ${path.dirname(bundle)}.` });
        return false;
      }
      const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
      const script = path.join(path.dirname(this.macApp), '..', 'install.sh');
      fs.writeFileSync(
        script,
        [
          '#!/bin/sh',
          `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done`,
          `rm -rf ${q(bundle + '.old')}`,
          `if mv ${q(bundle)} ${q(bundle + '.old')}; then`,
          `  if ditto ${q(this.macApp)} ${q(bundle)}; then rm -rf ${q(bundle + '.old')}; else rm -rf ${q(bundle)}; mv ${q(bundle + '.old')} ${q(bundle)}; fi`,
          'fi',
          `xattr -cr ${q(bundle)} 2>/dev/null`,
          `open ${q(bundle)}`,
          '',
        ].join('\n'),
        { mode: 0o755 }
      );
      spawn('/bin/sh', [script], { detached: true, stdio: 'ignore' }).unref();
      quitting = true;
      app.quit();
      return true;
    }
    return false;
  },
};

function newerVersion(a, b) {
  const pa = String(a || '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b || '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

ipcMain.on('update-config', (_e, { url, code }) => Updater.configure(url, code));
ipcMain.handle('update-check', () => Updater.check(true));
ipcMain.handle('update-status', () => Updater.status());
ipcMain.handle('update-install', () => Updater.install());

// ---------------------------------------------------------------- app lifecycle

app.on('second-instance', showMain);
app.on('before-quit', () => {
  quitting = true;
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
  if (IS_WIN) app.setAppUserModelId('com.daylen.parley');
  applyLoginItem();
  createWindow();
  createTray();

  app.on('activate', showMain);
});

app.on('window-all-closed', () => {
  if (!IS_MAC) app.quit();
});

process.on('uncaughtException', (e) => log('main uncaught', String(e && e.stack ? e.stack : e)));
