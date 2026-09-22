/**
 * Tomatosuki Stream Kit AIO - Express & WebSocket Server
 * Orchestrates API routes, media handling, OBS integration, and realtime socket events.
 * @module server
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { execFileSync } = require('child_process');

const {
  DEFAULT_SERVER_PORT,
  FALLBACK_SERVER_PORT,
  MAX_UPLOAD_SIZE_BYTES,
  DEFAULT_DECK_SETTINGS,
} = require('./src/config/constants');
const { sanitizeFilename } = require('./src/utils/path-security');
const { readJsonAsync, writeJsonAtomic } = require('./src/utils/file-store');
const { getLocalIPv4 } = require('./src/utils/network');
const logger = require('./src/utils/logger');

// Services
const OBSController = require('./src/services/obs-controller');
const MacroRunner = require('./src/services/macro-runner');
const CountersService = require('./src/services/counters.service');
const MediaService = require('./src/services/media.service');
const BackupService = require('./src/services/backup.service');
const MyInstantsService = require('./src/services/myinstants.service');

// Controllers
const createMediaController = require('./src/controllers/media.controller');
const createCountersController = require('./src/controllers/counters.controller');
const createBackupController = require('./src/controllers/backup.controller');
const createMyInstantsController = require('./src/controllers/myinstants.controller');

const MODULE_NAME = 'server';

// Server initialization
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Environment & path resolution
const IS_ELECTRON = Boolean(process.env.ELECTRON);
const BASE_DIR = process.env.USER_DATA_DIR || __dirname;

const MEDIA_DIR = process.env.ASSETS_DIR_OVERRIDE || process.env.MEDIA_DIR || path.join(BASE_DIR, 'assets');
const META_FILE = path.join(BASE_DIR, 'meta.json');
const THUMB_DIR = path.join(BASE_DIR, 'thumbs');
const TEXT_DIR = path.join(MEDIA_DIR, 'text');
const COUNTER_META = path.join(BASE_DIR, 'counters.json');
const DECK_SETTINGS_FILE = path.join(BASE_DIR, 'deck_settings.json');
const STATS_FILE = path.join(BASE_DIR, 'stats.json');
const CONFIG_FILE = path.join(BASE_DIR, 'config.json');

// Ensure essential directories exist
[MEDIA_DIR, THUMB_DIR, TEXT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

logger.info(MODULE_NAME, `Base path: ${BASE_DIR} | Mode: ${IS_ELECTRON ? 'electron' : 'standalone'}`);

// Ffmpeg binary resolution
let ffmpegPath = null;
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    ffmpegPath = ffmpegStatic;
  }
} catch {}

if (!ffmpegPath) {
  try {
    execFileSync('ffmpeg', ['-version'], { timeout: 3000 });
    ffmpegPath = 'ffmpeg';
  } catch {}
}
logger.info(MODULE_NAME, `ffmpeg: ${ffmpegPath ? `available (${ffmpegPath})` : 'not available (video thumbnails disabled)'}`);

// Stats persistence helpers
async function loadStatsData() {
  return await readJsonAsync(STATS_FILE, { totalTriggers: 0 });
}

async function saveStatsData(data) {
  return await writeJsonAtomic(STATS_FILE, data);
}

async function incrementTrigger() {
  const stats = await loadStatsData();
  stats.totalTriggers = (stats.totalTriggers || 0) + 1;
  await saveStatsData(stats);
}

// Services instantiation
const obsController = new OBSController(BASE_DIR, io);
obsController.init().catch((err) => logger.warn(MODULE_NAME, `OBS init error: ${err.message}`));

const countersService = new CountersService({
  counterMetaFile: COUNTER_META,
  textDir: TEXT_DIR,
  io,
});

const mediaService = new MediaService({
  mediaDir: MEDIA_DIR,
  metaFile: META_FILE,
  thumbDir: THUMB_DIR,
  ffmpegPath,
  io,
  incrementTrigger,
});

const backupService = new BackupService({
  baseDir: BASE_DIR,
});

const myInstantsService = new MyInstantsService({
  mediaDir: MEDIA_DIR,
  mediaService,
});

const macroRunner = new MacroRunner(
  BASE_DIR,
  io,
  obsController,
  (filename, op, val) => countersService.executeCounterOp(filename, op, val)
);
macroRunner.init().catch((err) => logger.warn(MODULE_NAME, `MacroRunner init error: ${err.message}`));

// Controllers instantiation
const countersController = createCountersController({ countersService });
const mediaController = createMediaController({ mediaService });
const backupController = createBackupController({ backupService });
const myInstantsController = createMyInstantsController({ myInstantsService });

// Multer upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MEDIA_DIR),
  filename: (req, file, cb) => {
    const safe = sanitizeFilename(file.originalname) || `media_${Date.now()}`;
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } });

// Middlewares
app.use(express.json({ limit: '50mb' }));

// Static frontend routes
const APP_PATH = __dirname;
app.use(express.static(path.join(APP_PATH, 'public')));
app.use('/lang', express.static(path.join(APP_PATH, 'lang')));
app.use('/assets', express.static(MEDIA_DIR));

app.get('/stream-kit-ui.js', (req, res) => res.sendFile(path.join(APP_PATH, 'stream-kit-ui.js')));
app.get('/ksk-ui.js', (req, res) => res.sendFile(path.join(APP_PATH, 'stream-kit-ui.js')));
app.get('/customdeck', (req, res) => res.sendFile(path.join(APP_PATH, 'public', 'customdeck.html')));

// REST API routes

// Stats & Network info
app.get('/api/stats', async (req, res) => res.json(await loadStatsData()));
app.get('/api/local-ip', (req, res) => res.json({ ip: getLocalIPv4(), port: server.address()?.port || DEFAULT_SERVER_PORT }));

// Media endpoints
app.get('/api/media', mediaController.listMedia);
app.get('/api/media/:filename/settings', mediaController.getMediaSettings);
app.post('/api/media/:filename/settings', mediaController.updateMediaSettings);
app.delete('/api/media/:filename', mediaController.deleteMedia);
app.post('/upload', upload.array('files'), mediaController.handleUpload);
app.get('/api/thumb/:filename', mediaController.getThumbnail);
app.post('/trigger', mediaController.triggerMeme);
app.post('/hide', (req, res) => {
  io.emit('hide-media');
  res.json({ ok: true });
});

// Streamer HUD Counters endpoints
app.get('/api/counters', countersController.listCounters);
app.post('/api/counters', countersController.createCounter);
app.delete('/api/counters/:filename', countersController.deleteCounter);
app.get('/api/counters/:filename/value', countersController.getCounterValueHandler);
app.post('/api/counters/:filename/value', countersController.setCounterValueHandler);
app.post('/api/counters/:filename/op', countersController.executeCounterOpHandler);

// Deck settings endpoints
app.get('/api/deck-settings', async (req, res) => {
  const data = await readJsonAsync(DECK_SETTINGS_FILE, { ...DEFAULT_DECK_SETTINGS });
  res.json(data);
});
app.post('/api/deck-settings', async (req, res) => {
  try {
    const data = req.body;
    await writeJsonAtomic(DECK_SETTINGS_FILE, data);
    io.emit('deck-settings-updated', data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OBS Studio endpoints
app.get('/api/obs/status', (req, res) => res.json(obsController.getStatus()));
app.post('/api/obs/connect', async (req, res) => res.json(await obsController.connect(req.body)));
app.post('/api/obs/disconnect', async (req, res) => res.json(await obsController.disconnect()));
app.post('/api/obs/set-scene', async (req, res) => {
  try {
    const { sceneName } = req.body;
    if (!sceneName) return res.status(400).json({ ok: false, error: 'sceneName is required' });
    res.json(await obsController.setScene(sceneName));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post('/api/obs/toggle-item', async (req, res) => {
  try {
    const { sceneName, sceneItemId } = req.body;
    if (sceneItemId === undefined) return res.status(400).json({ ok: false, error: 'sceneItemId is required' });
    res.json(await obsController.toggleSceneItem(sceneName, sceneItemId));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post('/api/obs/set-item-enabled', async (req, res) => {
  try {
    const { sceneName, sceneItemId, enabled } = req.body;
    if (sceneItemId === undefined) return res.status(400).json({ ok: false, error: 'sceneItemId is required' });
    res.json(await obsController.setSceneItemEnabled(sceneName, sceneItemId, enabled));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get('/api/obs/current-items', async (req, res) => {
  try {
    const items = await obsController.getSceneItems();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get('/api/obs/inputs', async (req, res) => {
  try {
    const inputs = await obsController.getAudioInputs();
    res.json({ inputs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post('/api/obs/toggle-mute', async (req, res) => {
  try {
    const { inputName } = req.body;
    if (!inputName) return res.status(400).json({ ok: false, error: 'inputName is required' });
    res.json(await obsController.toggleInputMute(inputName));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Multi-Action Macros endpoints
app.get('/api/macros', async (req, res) => res.json(await macroRunner.getMacros()));
app.post('/api/macros', async (req, res) => {
  try {
    const macro = await macroRunner.saveMacro(req.body);
    res.json({ ok: true, macro });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});
app.delete('/api/macros/:id', async (req, res) => {
  try {
    await macroRunner.deleteMacro(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post('/api/macros/:id/trigger', async (req, res) => {
  try {
    const result = await macroRunner.executeMacro(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get('/api/macros/:id/export', async (req, res) => {
  try {
    const macros = await macroRunner.getMacros();
    const macro = macros.find((m) => m.id === req.params.id);
    if (!macro) return res.status(404).json({ ok: false, error: 'Macro not found' });
    const safeName = sanitizeFilename(macro.name) || 'macro';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
    res.json(macro);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post('/api/macros/import', async (req, res) => {
  try {
    const macroData = req.body;
    if (!macroData || !macroData.name) {
      return res.status(400).json({ ok: false, error: 'File macro JSON tidak valid' });
    }
    const macroObj = {
      ...macroData,
      id: `macro_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: macroData.name,
    };
    const saved = await macroRunner.saveMacro(macroObj);
    res.json({ ok: true, macro: saved });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Panic & Overlay Screen FX endpoints
app.post('/api/panic', (req, res) => {
  io.emit('panic-stop');
  logger.info(MODULE_NAME, 'Panic stop triggered');
  res.json({ ok: true });
});
app.post('/api/master-volume', (req, res) => {
  const { volume } = req.body;
  if (typeof volume !== 'number' || volume < 0 || volume > 100) {
    return res.status(400).json({ ok: false, error: 'Volume harus angka 0 - 100' });
  }
  io.emit('master-volume', { volume });
  res.json({ ok: true, volume });
});
app.post('/api/fx', (req, res) => {
  const { type, duration } = req.body;
  const ALLOWED_FX = ['confetti', 'shake', 'flash', 'glitch'];
  if (!ALLOWED_FX.includes(type)) {
    return res.status(400).json({ ok: false, error: `Tipe FX tidak valid. Pilih: ${ALLOWED_FX.join(', ')}` });
  }
  io.emit('trigger-fx', { fx: type, duration: duration || 3000 });
  res.json({ ok: true, type });
});

// Backup & Restore endpoints
app.get('/api/backup', backupController.exportBackup);
app.post('/api/restore', upload.single('backup'), backupController.restoreBackup);

// MyInstants integration endpoints
app.get('/api/myinstants/search', myInstantsController.searchSounds);
app.post('/api/myinstants/download', myInstantsController.downloadSound);

// App Config & Settings endpoints
app.get('/api/app-settings', async (req, res) => {
  const cfg = await readJsonAsync(CONFIG_FILE, {});
  res.json({
    assetsDir: cfg.assetsDir || MEDIA_DIR,
    defaultAssetsDir: path.join(BASE_DIR, 'assets'),
  });
});
app.post('/api/app-settings', async (req, res) => {
  try {
    const { assetsDir } = req.body;
    const cfg = await readJsonAsync(CONFIG_FILE, {});
    if (assetsDir) cfg.assetsDir = assetsDir;
    await writeJsonAtomic(CONFIG_FILE, cfg);
    res.json({ ok: true, config: cfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Realtime socket events
io.on('connection', (socket) => {
  logger.debug(MODULE_NAME, `Client connected: ${socket.id}`);
  socket.emit('obs-status-changed', obsController.getStatus());

  socket.on('trigger', async (data) => {
    if (!data || !data.filename) return;
    io.emit('show-media', data);
    await incrementTrigger();
  });

  socket.on('panic', () => io.emit('panic-stop'));
});

// Server bootstrap with dynamic port fallback
const REQUESTED_PORT = parseInt(process.env.PORT, 10) || DEFAULT_SERVER_PORT;

function startListening(portToTry) {
  server.listen(portToTry, () => {
    const activePort = server.address().port;
    logger.info(MODULE_NAME, `Tomatosuki Server running on port ${activePort} | media: ${MEDIA_DIR}`);

    // Notify Electron parent process via IPC if launched via child_process.fork()
    if (typeof process.send === 'function') {
      process.send({ type: 'server-started', port: activePort });
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(MODULE_NAME, `Port ${portToTry} in use, attempting fallback port ${FALLBACK_SERVER_PORT}...`);
      server.close();
      if (portToTry !== FALLBACK_SERVER_PORT) {
        startListening(FALLBACK_SERVER_PORT);
      } else {
        // Ephemeral dynamic port allocation
        startListening(0);
      }
    } else {
      logger.error(MODULE_NAME, 'Server error', err);
    }
  });
}

startListening(REQUESTED_PORT);

module.exports = { app, server, io, startListening };