const { app, BrowserWindow, Tray, Menu, shell, nativeImage, dialog, ipcMain, globalShortcut, session } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const os = require('os');
const fs = require('fs');
const { getLocalIPv4 } = require('../src/utils/network');

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false);
    }, 300);
    log('Second instance detected: brought existing window to foreground');
  }
});

// User data paths
const USER_DATA  = app.getPath('userData');
const ASSETS_DIR = path.join(USER_DATA, 'assets');
const THUMBS_DIR = path.join(USER_DATA, 'thumbs');
const TEXT_DIR   = path.join(USER_DATA, 'assets', 'text');
const LOG_FILE   = path.join(USER_DATA, 'app.log');
const CONFIG_FILE = path.join(USER_DATA, 'config.json');

[ASSETS_DIR, THUMBS_DIR, TEXT_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// App configuration
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}
function saveConfig(cfg) {
  const tmpFile = `${CONFIG_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(cfg, null, 2), 'utf8');
    fs.renameSync(tmpFile, CONFIG_FILE);
  } catch (e) {
    log(`[config] Gagal menyimpan config secara atomic: ${e.message}`);
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {}
  }
}

function getAssetsDir() {
  const cfg = loadConfig();
  return cfg.assetsDir || ASSETS_DIR;
}

function getTextDir() {
  return path.join(getAssetsDir(), 'text');
}

// File logging
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// Runtime state
let mainWindow = null;
let splashWindow = null;
let tray = null;
let serverProcess = null;
const PORT = 3000;
let shortcutsEnabled = false;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, '..', 'public', 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });
}

function dismissSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

function killServerProcess() {
  if (serverProcess) {
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        const { execSync } = require('child_process');
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
        } catch {}
      }
      serverProcess.kill('SIGKILL');
    } catch {}
    serverProcess = null;
  }
}

// Server bootstrap
let activeServerPort = PORT;

function startServer() {
  killServerProcess();
  const cfg = loadConfig();
  const assetsDir = cfg.assetsDir || ASSETS_DIR;

  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server.js')
    : path.join(__dirname, '..', 'server.js');

  log(`=== LooseCast starting ===`);
  log(`Version: ${app.getVersion()}`);
  log(`Platform: ${process.platform}`);
  log(`User data: ${USER_DATA}`);
  log(`Local IP: ${getLocalIPv4()}`);
  log(`Starting server: ${serverPath}`);

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      USER_DATA_DIR: USER_DATA,
      ASSETS_DIR_OVERRIDE: assetsDir,
      APP_VERSION: app.getVersion(),
      ELECTRON: '1',
    },
    silent: true,
  });

  serverProcess.stdout.on('data', d => log(`[server] ${d.toString().trim()}`));
  serverProcess.stderr.on('data', d => log(`[server:err] ${d.toString().trim()}`));
  serverProcess.on('message', (msg) => {
    if (msg && msg.type === 'server-started' && msg.port) {
      activeServerPort = msg.port;
      log(`[server] Active port synchronized: ${activeServerPort}`);
      rebuildTrayMenu();
    }
  });
  serverProcess.on('exit', code => log(`Server exited: ${code}`));
}

// Window lifecycle
function createWindow() {
  Menu.setApplicationMenu(null);
  const cfg = loadConfig();
  const winBounds = cfg.windowBounds || { width: 1200, height: 720 };
  mainWindow = new BrowserWindow({
    width: winBounds.width || 1200,
    height: winBounds.height || 720,
    x: winBounds.x,
    y: winBounds.y,
    minWidth: 800,
    minHeight: 560,
    title: 'LooseCast — Local System Casting Stream',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#09090d',

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  let saveBoundsTimer = null;
  const saveBounds = () => {
    clearTimeout(saveBoundsTimer);
    saveBoundsTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
        const b = mainWindow.getBounds();
        saveConfig({ ...loadConfig(), windowBounds: b });
      }
    }, 500);
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  const tryLoad = (attempts = 0) => {
    const http = require('http');
    const portToUse = activeServerPort || PORT;
    const req = http.get(`http://127.0.0.1:${portToUse}/`, (res) => {
      // Consume response data to free up memory
      res.resume();
      log(`Server ready on port ${portToUse} (attempt ${attempts})`);
      mainWindow.loadURL(`http://127.0.0.1:${portToUse}/`).then(() => {
        log('Page loaded successfully');
      }).catch(err => {
        log(`loadURL error: ${err.message}`);
      });
    });
    req.on('error', () => {
      if (attempts < 40) setTimeout(() => tryLoad(attempts + 1), 500);
      else dialog.showErrorBox('Error', 'Server gagal start.\nLog: ' + LOG_FILE);
    });
    req.setTimeout(1000, () => req.destroy());
  };
  setTimeout(() => tryLoad(), 1200);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://127.0.0.1') && !url.startsWith('http://localhost')) {
      e.preventDefault(); shell.openExternal(url);
    }
  });

  const showMainWindow = () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false);
      }, 300);
      log('Main window shown');
      dismissSplash();
    }
  };

  // Show window when page actually finishes loading, not just when frame is ready
  mainWindow.webContents.on('did-finish-load', () => {
    showMainWindow();
  });

  // Fallback: also show on ready-to-show but with a delay to allow loadURL
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      showMainWindow();
    }, 1500);
  });
  mainWindow.on('close', e => { if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); } });
  mainWindow.on('closed', () => { mainWindow = null; });

  // Debug: log any page load errors
  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    log(`did-fail-load: code=${code} desc=${desc} url=${url}`);
    // Retry loading after a short delay if it failed
    if (code !== -3) { // -3 = aborted (intentional), skip retry
      setTimeout(() => {
        log('Retrying loadURL after failure...');
        const portToUse = activeServerPort || PORT;
        mainWindow.loadURL(`http://127.0.0.1:${portToUse}/`).catch(err => {
          log(`Retry loadURL error: ${err.message}`);
        });
      }, 2000);
    }
  });

  mainWindow.webContents.on('console-message', (e, level, msg) => {
    if (level >= 2) log(`[renderer] ${msg}`);
  });
}

// System tray
function createTray() {
  const iconPaths = [
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'resources', 'icon.png'),
    path.join(__dirname, '..', 'resources', 'icon.ico'),
  ];

  let icon = nativeImage.createEmpty();
  for (const p of iconPaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) { icon = img.resize({ width: 16, height: 16 }); break; }
      } catch(e) { log(`Icon load failed: ${e.message}`); }
    }
  }

  tray = new Tray(icon);
  tray.setToolTip('LooseCast — Local System Casting Stream');
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createWindow(); });
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray) return;
  const ip = getLocalIPv4();
  const currentPort = activeServerPort || PORT;
  const scLabel = shortcutsEnabled ? '⌨ Shortcut: ON  — Klik untuk matikan' : '⌨ Shortcut: OFF — Klik untuk aktifkan';
  const menu = Menu.buildFromTemplate([
    { label: 'LooseCast', enabled: false },
    { type: 'separator' },
    { label: '🏠 Buka Dashboard', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createWindow(); } },
    { label: '🎮 Buka Deck View', click: () => shell.openExternal(`http://${ip}:${currentPort}/deck.html`) },
    { type: 'separator' },
    { label: scLabel, click: () => toggleShortcutsFromTray() },
    { type: 'separator' },
    { label: `🌐 ${ip}:${currentPort}`, enabled: false },
    { type: 'separator' },
    { label: '🔄 Periksa Pembaruan...', click: () => checkForUpdates(true) },
    { label: '📋 Lihat Log', click: () => shell.openPath(LOG_FILE) },
    { label: '📂 Folder Data', click: () => shell.openPath(USER_DATA) },
    { label: '📝 Folder Counter', click: () => {
      const td = getTextDir();
      if (!fs.existsSync(td)) fs.mkdirSync(td, { recursive: true });
      shell.openPath(td);
    } },
    { type: 'separator' },
    { label: '❌ Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
}

function toggleShortcutsFromTray() {
  shortcutsEnabled = !shortcutsEnabled;
  rebuildTrayMenu();
  // Broadcast ke semua window (deck.html & index.html)
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('shortcut-state-changed', shortcutsEnabled);
  });
  log(`Shortcut toggled from tray: ${shortcutsEnabled}`);
}


// Global keyboard shortcuts
ipcMain.on('register-shortcuts', (event, shortcuts) => {
  // Hapus yang lama biar ga dobel/bentrok
  globalShortcut.unregisterAll();
  
  if (!shortcuts || !Array.isArray(shortcuts)) return;

  shortcuts.forEach(sc => {
    try {
      globalShortcut.register(sc.combo, () => {
        // Kalau tombol dipencet, suruh UI deck.html jalanin meme-nya
        if (mainWindow) {
          mainWindow.webContents.send('shortcut-triggered', sc.action);
        }
      });
    } catch (err) {
      log(`Gagal register shortcut: ${sc.combo}`);
    }
  });
});
// IPC handlers
// Renderer beritahu main saat user toggle shortcut
ipcMain.on('set-shortcut-enabled', (event, enabled) => {
  shortcutsEnabled = !!enabled;
  rebuildTrayMenu();
  // Broadcast ke window lain
  BrowserWindow.getAllWindows().forEach(win => {
    if (win.webContents !== event.sender) {
      win.webContents.send('shortcut-state-changed', shortcutsEnabled);
    }
  });
  log(`Shortcut set from renderer: ${shortcutsEnabled}`);
});

ipcMain.on('open-text-folder', () => {
  const td = getTextDir();
  if (!fs.existsSync(td)) fs.mkdirSync(td, { recursive: true });
  shell.openPath(td);
});
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (e, cfg) => { saveConfig(cfg); return { ok: true }; });
ipcMain.handle('choose-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], title: 'Pilih Folder Assets' });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('get-local-ip', () => getLocalIPv4());
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('check-for-updates', () => {
  checkForUpdates(true);
  return { ok: true };
});

// Auto updater
const { autoUpdater } = require('electron-updater');

let isManualCheck = false;
let isDownloadingUpdate = false;

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (msg) => log(`[updater] ${msg}`),
    warn: (msg) => log(`[updater:warn] ${msg}`),
    error: (msg) => log(`[updater:err] ${msg}`),
  };

  autoUpdater.on('checking-for-update', () => {
    log('[updater] Memeriksa ketersediaan pembaruan...');
  });

  autoUpdater.on('update-available', async (info) => {
    log(`[updater] Pembaruan tersedia: v${info.version}`);

    let releaseDetails = '';
    if (info.releaseNotes) {
      if (typeof info.releaseNotes === 'string') {
        releaseDetails = `\n\nCatatan Rilis:\n${info.releaseNotes.replace(/<[^>]*>?/gm, '').trim()}`;
      } else if (Array.isArray(info.releaseNotes)) {
        const notes = info.releaseNotes.map(n => n.note).filter(Boolean).join('\n');
        if (notes) releaseDetails = `\n\nCatatan Rilis:\n${notes.replace(/<[^>]*>?/gm, '').trim()}`;
      }
    }

    if (!isManualCheck) {
      if (tray) tray.setToolTip(`LooseCast — Versi v${info.version} tersedia`);
      return;
    }

    const currentVersion = app.getVersion();
    const result = await dialog.showMessageBox(mainWindow || null, {
      type: 'info',
      buttons: ['Perbarui Sekarang', 'Nanti'],
      defaultId: 0,
      cancelId: 1,
      title: 'Pembaruan Tersedia',
      message: `Versi baru LooseCast (v${info.version}) telah tersedia!`,
      detail: `Versi saat ini: v${currentVersion}\nVersi terbaru: v${info.version}${releaseDetails}\n\nApakah Anda ingin mengunduh dan memasang pembaruan sekarang?`,
      noLink: true,
    });

    if (result.response === 0) {
      log('[updater] Pengguna menyetujui pembaruan. Memulai proses unduh...');
      isDownloadingUpdate = true;
      if (tray) tray.setToolTip('LooseCast — Mengunduh pembaruan...');
      try {
        await autoUpdater.downloadUpdate();
      } catch (err) {
        log(`[updater:err] Gagal mengunduh pembaruan: ${err.message}`);
        isDownloadingUpdate = false;
        if (tray) tray.setToolTip('LooseCast');
      }
    } else {
      log('[updater] Pengguna menolak/menunda pembaruan untuk sesi ini.');
    }
  });

  autoUpdater.on('update-not-available', () => {
    log(`[updater] Aplikasi sudah versi terbaru: v${app.getVersion()}`);
    if (isManualCheck) {
      dialog.showMessageBox(mainWindow || null, {
        type: 'info',
        buttons: ['OK'],
        title: 'Versi Terbaru',
        message: 'Aplikasi sudah menggunakan versi terbaru.',
        detail: `Anda saat ini menggunakan LooseCast v${app.getVersion()}.`,
      });
      isManualCheck = false;
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    log(`[updater] Unduh pembaruan: ${percent}% (${Math.round(progressObj.bytesPerSecond / 1024)} KB/s)`);
    if (tray) {
      tray.setToolTip(`LooseCast — Mengunduh update (${percent}%)`);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log(`[updater] Pembaruan v${info.version} berhasil diunduh.`);
    isDownloadingUpdate = false;
    if (tray) tray.setToolTip('LooseCast — Pembaruan siap dipasang');

    dialog.showMessageBox(mainWindow || null, {
      type: 'question',
      buttons: ['Pasang & Mulai Ulang Sekarang', 'Pasang Saat Aplikasi Ditutup'],
      defaultId: 1,
      cancelId: 1,
      title: 'Pembaruan Siap Dipasang',
      message: `Pembaruan LooseCast v${info.version} telah selesai diunduh!`,
      detail: 'Apakah Anda ingin me-restart LooseCast sekarang untuk menerapkan pembaruan, atau memasangnya nanti saat aplikasi ditutup?',
      noLink: true,
    }).then((result) => {
      if (result.response === 0) {
        log('[updater] Pengguna memilih pasang sekarang. Melakukan restart...');
        autoUpdater.quitAndInstall(false, true);
      } else {
        log('[updater] Pengguna memilih menunda pemasangan hingga aplikasi ditutup.');
      }
    }).catch((err) => {
      log(`[updater:err] Error menampilkan dialog update: ${err.message}`);
    });
  });

  autoUpdater.on('error', (err) => {
    log(`[updater:err] Error pada autoUpdater: ${err ? (err.message || err.toString()) : 'Unknown error'}`);
    if (isManualCheck) {
      dialog.showMessageBox(mainWindow || null, {
        type: 'error',
        buttons: ['OK'],
        title: 'Gagal Memeriksa Pembaruan',
        message: 'Tidak dapat memeriksa ketersediaan pembaruan.',
        detail: `Pastikan komputer terhubung ke jaringan internet.\n\nError: ${err ? err.message : 'Koneksi gagal'}`,
      });
      isManualCheck = false;
    }
  });
}

function checkForUpdates(manual = false) {
  isManualCheck = manual;
  if (isDownloadingUpdate) {
    if (manual) {
      dialog.showMessageBox(mainWindow || null, {
        type: 'info',
        buttons: ['OK'],
        title: 'Pembaruan Sedang Diunduh',
        message: 'Proses pengunduhan pembaruan sedang berlangsung.',
      });
    }
    return;
  }

  try {
    autoUpdater.checkForUpdates().catch((err) => {
      log(`[updater:err] checkForUpdates catch: ${err.message}`);
    });
  } catch (err) {
    log(`[updater:err] checkForUpdates invoke error: ${err.message}`);
  }
}

function getLocalCSPHosts() {
  const hosts = new Set(['127.0.0.1', 'localhost']);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        hosts.add(net.address);
      }
    }
  }
  return Array.from(hosts);
}

app.whenReady().then(() => {
  log(`=== LooseCast Electron Runtime Initialized ===`);
  log(`App Path: ${app.getAppPath()}`);
  log(`Packaged: ${app.isPackaged}`);
  log(`User Data Path: ${USER_DATA}`);
  log(`Log File: ${LOG_FILE}`);

  if (session && session.defaultSession) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      if (!responseHeaders['access-control-allow-origin'] && !responseHeaders['Access-Control-Allow-Origin']) {
        responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      }
      responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS'];
      responseHeaders['Access-Control-Allow-Headers'] = ['*'];

      const localHosts = getLocalCSPHosts();
      const localHttp = localHosts.map(h => `http://${h}:*`).join(' ');
      const localWs = localHosts.map(h => `ws://${h}:*`).join(' ');
      const externalApiHosts = "https://api.myinstants.com https://www.myinstants.com https://api.github.com https://github.com https://objects.githubusercontent.com";

      responseHeaders['Content-Security-Policy'] = [
        `default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ${localHttp} ${externalApiHosts}; ` +
        `connect-src 'self' data: blob: ${localHttp} ${localWs} ${externalApiHosts}; ` +
        `img-src 'self' data: blob: ${localHttp} https://www.myinstants.com https://avatars.githubusercontent.com; ` +
        `media-src 'self' data: blob: ${localHttp} https://www.myinstants.com; ` +
        `font-src 'self' https://fonts.gstatic.com data:; ` +
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;`
      ];
      callback({ responseHeaders });
    });
  }

  createSplashWindow();
  startServer();
  createWindow();
  createTray();
  setupAutoUpdater();

  // Periksa pembaruan pertama kali saat aplikasi dibuka (jika terhubung internet)
  setTimeout(() => {
    checkForUpdates(false);
  }, 3000);
});

app.on('window-all-closed', e => e.preventDefault());
app.on('before-quit', () => { killServerProcess(); logStream.end(); });
app.on('will-quit', () => { 
  killServerProcess();
  globalShortcut.unregisterAll(); 
});