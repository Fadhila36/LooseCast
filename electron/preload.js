const { contextBridge, ipcRenderer } = require('electron');

const electronBridge = {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  openTextFolder: () => ipcRenderer.send('open-text-folder'),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  getVersion: () => ipcRenderer.invoke('get-version'),

  // ── GLOBAL SHORTCUT ──
  registerShortcuts: (shortcuts) => ipcRenderer.send('register-shortcuts', shortcuts),
  onShortcutTriggered: (callback) => ipcRenderer.on('shortcut-triggered', (event, action) => callback(action)),

  // ── SHORTCUT TOGGLE SYNC ──
  setShortcutEnabled: (enabled) => ipcRenderer.send('set-shortcut-enabled', enabled),
  onShortcutStateChanged: (cb) => ipcRenderer.on('shortcut-state-changed', (e, enabled) => cb(enabled)),

  // ── AUTO UPDATER ──
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
};

contextBridge.exposeInMainWorld('looseCastElectron', electronBridge);
contextBridge.exposeInMainWorld('streamKitElectron', electronBridge);
contextBridge.exposeInMainWorld('kskElectron', electronBridge);