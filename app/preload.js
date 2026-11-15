// Safe bridge between the UI and the Electron main process.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => ipcRenderer.on(channel, (_e, ...args) => cb(...args));

contextBridge.exposeInMainWorld('parley', {
  isElectron: true,
  platform: process.platform,
  // screen sharing
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  selectScreenSource: (id, audio) => ipcRenderer.invoke('select-screen-source', id, audio || false),
  loopbackSupported: () => ipcRenderer.invoke('loopback-supported'),
  requestMediaAccess: () => ipcRenderer.invoke('request-media-access'),
  openPrivacySettings: (which) => ipcRenderer.send('open-privacy-settings', which),
  // calls + mini window
  setCallState: (active) => ipcRenderer.send('call-state', !!active),
  goMini: () => ipcRenderer.send('go-mini'),
  miniGetBounds: () => ipcRenderer.invoke('mini-get-bounds'),
  miniSetBounds: (b) => ipcRenderer.send('mini-set-bounds', b),
  miniExpand: () => ipcRenderer.send('mini-expand'),
  onMiniClosed: on('mini-closed'),
  incomingCall: () => ipcRenderer.send('incoming-call'),
  // window, tray, notifications
  notify: (title, body, silent) => ipcRenderer.send('notify', { title, body, silent }),
  attention: () => ipcRenderer.send('attention'),
  focusWindow: () => ipcRenderer.send('focus-window'),
  setUnread: (n) => ipcRenderer.send('unread-count', n),
  setTheme: (dark, bg) => ipcRenderer.send('set-theme', { dark: !!dark, bg }),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  setAppSetting: (key, value) => ipcRenderer.send('set-app-setting', key, value),
  onAppSettings: on('app-settings'),
  // updates
  configureUpdates: (url, code) => ipcRenderer.send('update-config', { url, code }),
  checkForUpdates: () => ipcRenderer.invoke('update-check'),
  updateStatus: () => ipcRenderer.invoke('update-status'),
  installUpdate: () => ipcRenderer.invoke('update-install'),
  onUpdateStatus: on('update-status'),
  // files
  saveDownload: (name, data) => ipcRenderer.invoke('save-download', name, data),
  openPath: (p) => ipcRenderer.send('open-path', p),
  showInFolder: (p) => ipcRenderer.send('show-in-folder', p),
  // misc
  log: (...parts) => ipcRenderer.send('log', parts),
  openLog: () => ipcRenderer.send('open-log'),
  listBrowsers: () => ipcRenderer.invoke('list-browsers'),
  setLinkBrowser: (exe) => ipcRenderer.send('set-link-browser', exe || ''),
  openLink: (url) => ipcRenderer.send('open-link', url),
});
