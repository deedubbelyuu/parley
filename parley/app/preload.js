// Safe bridge between the UI and the Electron main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('parley', {
  isElectron: true,
  platform: process.platform,
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  selectScreenSource: (id, withAudio) => ipcRenderer.invoke('select-screen-source', id, !!withAudio),
  loopbackSupported: () => ipcRenderer.invoke('loopback-supported'),
  requestMediaAccess: () => ipcRenderer.invoke('request-media-access'),
  openPrivacySettings: (which) => ipcRenderer.send('open-privacy-settings', which),
  setCallState: (active) => ipcRenderer.send('call-state', !!active),
  setCompact: (on) => ipcRenderer.send('set-compact', !!on),
  onCompactChanged: (cb) => ipcRenderer.on('compact-changed', (_e, on) => cb(on)),
  notify: (title, body, silent) => ipcRenderer.send('notify', { title, body, silent }),
  attention: () => ipcRenderer.send('attention'),
  focusWindow: () => ipcRenderer.send('focus-window'),
});
