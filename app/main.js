// Parley — Electron main process.
// Owns the window, the floating mini-window behavior, screen-source listing,
// OS permissions and notifications. All calling/chat logic lives in renderer/app.js.

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

let win = null;
let inCall = false;
let compact = false;
let normalBounds = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

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
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

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

// ---- IPC from the renderer ----

ipcMain.on('call-state', (_e, active) => {
  inCall = !!active;
  if (!inCall && compact) setCompact(false);
});

ipcMain.on('set-compact', (_e, on) => setCompact(!!on));

ipcMain.handle('get-screen-sources', async () => {
  // On macOS the first getSources() call triggers the Screen Recording permission prompt.
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  });
  const needsPermission =
    process.platform === 'darwin' && systemPreferences.getMediaAccessStatus('screen') !== 'granted';
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
let chosen = { id: null, audio: false };
ipcMain.handle('select-screen-source', (_e, id, withAudio) => {
  chosen = { id, audio: !!withAudio };
  return true;
});

// System-audio ("loopback") capture is supported by Electron on Windows and macOS.
const LOOPBACK_SUPPORTED = process.platform === 'win32' || process.platform === 'darwin';

function installDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const source = sources.find((s) => s.id === chosen.id);
      const wantAudio = chosen.audio && request.audioRequested && LOOPBACK_SUPPORTED;
      chosen = { id: null, audio: false };
      if (!source) return callback({});
      // 'loopback' = everything your computer plays. The renderer also asks for
      // restrictOwnAudio so Parley's own sound (your friend's voice) is left out.
      callback(wantAudio ? { video: source, audio: 'loopback' } : { video: source });
    } catch (e) {
      console.error('display media error', e);
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

// ---- App lifecycle ----

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  // Allow camera / mic / notifications for our own page only.
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    const allowed = ['media', 'notifications', 'fullscreen', 'clipboard-sanitized-write', 'speaker-selection'];
    cb(allowed.includes(permission));
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
