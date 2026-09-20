const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const multer = require('multer');
const { execFile, execFileSync } = require('child_process');
const { sanitizeFilename, resolveSafePath } = require('./src/utils/path-security');
const {
  readJsonAsync,
  writeJsonAtomic,
  readTextAsync,
  writeTextAtomic,
} = require('./src/utils/file-store');
const { getLocalIPv4 } = require('./src/utils/network');
const OBSController = require('./src/services/obs-controller');
const MacroRunner = require('./src/services/macro-runner');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ── PATHS ────────────────────────────────────────────────
// Kalau jalan di Electron → pakai USER_DATA_DIR dari env (AppData user)
// Kalau jalan biasa (Docker/dev) → pakai folder __dirname seperti biasa
const IS_ELECTRON = !!process.env.ELECTRON;
const BASE_DIR    = IS_ELECTRON
  ? process.env.USER_DATA_DIR
  : __dirname;

const MEDIA_DIR  = process.env.ASSETS_DIR_OVERRIDE || process.env.MEDIA_DIR || path.join(BASE_DIR, 'assets');
const META_FILE  = path.join(BASE_DIR, 'meta.json');
const THUMB_DIR  = path.join(BASE_DIR, 'thumbs');
const TEXT_DIR   = path.join(MEDIA_DIR, 'text');
const COUNTER_META      = path.join(BASE_DIR, 'counters.json');
const DECK_SETTINGS_FILE = path.join(BASE_DIR, 'deck_settings.json');
const STATS_FILE        = path.join(BASE_DIR, 'stats.json');
const CONFIG_FILE       = path.join(BASE_DIR, 'config.json');

// Bikin folder kalau belum ada
[MEDIA_DIR, THUMB_DIR, TEXT_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

console.log(`[paths] base=${BASE_DIR}`);
console.log(`[paths] media=${MEDIA_DIR}`);
console.log(`[paths] mode=${IS_ELECTRON ? 'electron' : 'standalone'}`);

// ── MIDDLEWARE ───────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));

// Static files — public folder ada di __dirname (folder app, bukan AppData)
const IS_PACKAGED = IS_ELECTRON && process.resourcesPath && !process.resourcesPath.includes('node_modules');
const APP_PATH = IS_PACKAGED
  ? path.join(process.resourcesPath, 'app.asar')
  : __dirname;

app.use(express.static(path.join(APP_PATH, 'public')));
app.use('/lang', express.static(path.join(APP_PATH, 'lang')));
app.get('/ksk-ui.js', (req, res) =>
  res.sendFile(path.join(APP_PATH, 'ksk-ui.js'))
);

// Route shortcuts
app.get('/customdeck', (req, res) => res.sendFile(path.join(APP_PATH, 'public', 'customdeck.html')));

// Assets dari folder data user
app.use('/assets', express.static(MEDIA_DIR));

// ── META HELPERS ─────────────────────────────────────────
async function loadMeta() {
  return await readJsonAsync(META_FILE, {});
}
async function saveMeta(meta) {
  return await writeJsonAtomic(META_FILE, meta);
}

// ── STATS HELPERS ────────────────────────────────────────
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

app.get('/api/stats', async (req, res) => {
  const stats = await loadStatsData();
  res.json(stats);
});

// ── FFMPEG CHECK ─────────────────────────────────────────
let hasFfmpeg = false;
try {
  execFileSync('ffmpeg', ['-version'], { timeout: 3000 });
  hasFfmpeg = true;
  console.log('ffmpeg: available');
} catch {
  console.log('ffmpeg: not available — video thumbnails disabled');
}

// ── MULTER ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MEDIA_DIR),
  filename: (req, file, cb) => {
    const safe = sanitizeFilename(file.originalname) || `media_${Date.now()}`;
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ── MEDIA API ────────────────────────────────────────────
app.get('/api/media', async (req, res) => {
  try {
    const meta = await loadMeta();
    const exts = ['.jpg','.jpeg','.png','.gif','.webp','.mp4','.webm','.mov','.mp3','.wav','.ogg'];
    const dirEntries = await fsPromises.readdir(MEDIA_DIR);
    
    const validFiles = dirEntries.filter(f => !f.startsWith('_') && exts.includes(path.extname(f).toLowerCase()));
    const files = await Promise.all(validFiles.map(async f => {
      try {
        const stat = await fsPromises.stat(path.join(MEDIA_DIR, f));
        return { name: f, size: stat.size, mtime: stat.mtime, settings: meta[f] || null };
      } catch {
        return null;
      }
    }));

    res.json(files.filter(Boolean));
  } catch(e) {
    console.error('[api/media] Error:', e);
    res.json([]);
  }
});

app.post('/upload', upload.any(), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ ok: false, error: 'No files' });
  console.log('Uploaded:', req.files.map(f => f.filename));
  res.json({ ok: true, files: req.files.map(f => f.filename) });
});

app.post('/api/media/:filename/settings', async (req, res) => {
  const safeFilename = sanitizeFilename(decodeURIComponent(req.params.filename));
  if (!safeFilename) return res.status(400).json({ ok: false, error: 'Invalid filename' });
  
  const meta = await loadMeta();
  meta[safeFilename] = req.body;
  const ok = await saveMeta(meta);
  res.json({ ok });
});

app.delete('/api/media/:filename', async (req, res) => {
  try {
    const fp = resolveSafePath(MEDIA_DIR, req.params.filename);
    if (!fp) return res.status(400).json({ ok: false, error: 'Invalid or unsafe path' });

    if (fs.existsSync(fp)) await fsPromises.unlink(fp);

    const safeBaseName = path.basename(fp);
    const tp = resolveSafePath(THUMB_DIR, safeBaseName + '.jpg');
    if (tp && fs.existsSync(tp)) await fsPromises.unlink(tp);

    const meta = await loadMeta();
    delete meta[safeBaseName];
    await saveMeta(meta);

    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── THUMBNAIL ────────────────────────────────────────────
app.get('/api/thumb/:filename', async (req, res) => {
  const videoPath = resolveSafePath(MEDIA_DIR, req.params.filename);
  if (!videoPath) return res.status(400).end();

  const safeBaseName = path.basename(videoPath);
  const thumbPath = path.join(THUMB_DIR, safeBaseName + '.jpg');

  if (!fs.existsSync(videoPath)) return res.status(404).end();
  if (fs.existsSync(thumbPath)) return res.sendFile(thumbPath);
  if (!hasFfmpeg) return res.status(503).end();

  execFile('ffmpeg', [
    '-i', videoPath, '-ss', '00:00:01', '-vframes', '1',
    '-vf', 'scale=320:-2', '-pix_fmt', 'yuvj420p', '-q:v', '5', '-y', thumbPath
  ], { timeout: 15000 }, (err) => {
    if (err || !fs.existsSync(thumbPath)) return res.status(500).end();
    res.sendFile(thumbPath);
  });
});

// ── TRIGGER & STREAM DECK PRO CONTROLS ─────────────────
app.post('/trigger', (req, res) => {
  incrementTrigger().catch(console.error);
  io.emit('show-media', req.body);
  res.json({ ok: true });
});
app.get('/trigger/:filename', async (req, res) => {
  incrementTrigger().catch(console.error);
  const filename = decodeURIComponent(req.params.filename);
  const meta = await loadMeta();
  io.emit('show-media', { filename, ...(meta[filename] || {}) });
  res.json({ ok: true });
});
app.post('/hide', (req, res) => { io.emit('hide-media'); res.json({ ok: true }); });
app.get('/hide',  (req, res) => { io.emit('hide-media'); res.json({ ok: true }); });

// ── STREAMING PRO EXTENSIONS (Panic, Master Volume, FX, Quick Sampler) ──
app.post('/api/panic', (req, res) => {
  io.emit('panic-stop');
  res.json({ ok: true, message: 'All media stopped' });
});
app.get('/api/panic', (req, res) => {
  io.emit('panic-stop');
  res.json({ ok: true, message: 'All media stopped' });
});

// Master Volume Sync (supports 0-100 scale or 0.0-1.0 scale)
app.post('/api/master-volume', (req, res) => {
  const rawVol = req.body?.volume;
  if (rawVol === undefined || rawVol === null || isNaN(Number(rawVol))) {
    return res.status(400).json({ ok: false, error: 'Volume is required' });
  }
  const vol = Number(rawVol);
  if (vol < 0 || vol > 100) {
    return res.status(400).json({ ok: false, error: 'Volume must be between 0 and 100' });
  }
  io.emit('master-volume', { volume: vol });
  res.json({ ok: true, volume: vol });
});

// Visual FX Trigger (shake, confetti, flash, glitch)
const ALLOWED_FX = ['confetti', 'shake', 'flash', 'glitch'];
app.post('/api/fx', (req, res) => {
  const type = String(req.body?.type || req.body?.fx || '').toLowerCase();
  if (!ALLOWED_FX.includes(type)) {
    return res.status(400).json({ ok: false, error: `Invalid fx type. Allowed: ${ALLOWED_FX.join(', ')}` });
  }
  const intensity = Number(req.body?.intensity) || 1;
  const duration = Number(req.body?.duration) || 1200;
  io.emit('trigger-fx', { type, fx: type, intensity, duration });
  res.json({ ok: true, type, intensity, duration });
});

// Quick Voice / Mic Sampler
app.post('/api/record-sample', upload.single('sample'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No audio sample uploaded' });
    const originalExt = path.extname(req.file.originalname) || '.webm';
    const label = sanitizeFilename(req.body?.label) || `Sample_${Date.now()}`;
    const newFilename = `${label}${originalExt}`;
    const targetPath = resolveSafePath(MEDIA_DIR, newFilename);
    
    if (!targetPath) return res.status(400).json({ ok: false, error: 'Invalid filename' });

    if (req.file.path !== targetPath) {
      await fsPromises.rename(req.file.path, targetPath);
    }

    const meta = await loadMeta();
    meta[newFilename] = {
      label: label.replace(/_/g, ' '),
      tab: req.body?.tab || 'soundboard',
      volume: 100,
      isSoundboard: true,
      inAnim: 'pop',
      outAnim: 'pop',
      pos: 'cc',
      created: new Date().toISOString()
    };
    await saveMeta(meta);
    io.emit('media-updated');

    res.json({ ok: true, filename: newFilename, label: meta[newFilename].label, meta: meta[newFilename] });
  } catch (err) {
    console.error('[record-sample] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── MYINSTANTS API INTEGRATION ────────────────────────────
app.get('/api/myinstants/search', async (req, res) => {
  const query = (req.query?.q || '').trim();
  const endpoint = query
    ? `https://myinstants-api.vercel.app/search?q=${encodeURIComponent(query)}`
    : 'https://myinstants-api.vercel.app/trending?q=id';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    // Fallback jika trending 'id' gagal
    if (!response.ok && !query) {
      response = await fetch('https://myinstants-api.vercel.app/trending?q=us', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: `Upstream status ${response.status}` });
    }

    const data = await response.json();
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    res.json({ ok: true, data: list });
  } catch (err) {
    console.error('[myinstants] Search error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/myinstants/download', async (req, res) => {
  try {
    const mp3Url = req.body?.mp3Url || req.body?.url;
    const title = req.body?.title || req.body?.name || 'sound';

    if (!mp3Url || !String(mp3Url).startsWith('http')) {
      return res.status(400).json({ ok: false, error: 'URL MP3 tidak valid' });
    }

    const rawTitle = String(title || 'sound').trim().replace(/[<>:"/\\|?*]/g, '');
    const cleanTitle = rawTitle.replace(/\s+/g, '_') || `myinstants_${Date.now()}`;
    let filename = cleanTitle.toLowerCase().endsWith('.mp3') ? cleanTitle : `${cleanTitle}.mp3`;
    let targetPath = resolveSafePath(MEDIA_DIR, filename);

    // Auto duplicate renaming if file exists
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      const base = cleanTitle.replace(/\.mp3$/i, '');
      filename = `${base}_${counter}.mp3`;
      targetPath = resolveSafePath(MEDIA_DIR, filename);
      counter++;
    }

    if (!targetPath) {
      return res.status(400).json({ ok: false, error: 'Nama file tidak aman' });
    }

    // Download with curl binary to bypass Cloudflare TLS fingerprint blocks
    const downloadWithCurl = () => new Promise((resolve, reject) => {
      execFile('curl', [
        '-s', '-L',
        '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        '-H', 'Referer: https://www.myinstants.com/',
        '-H', 'Accept: audio/mpeg, audio/*, */*',
        mp3Url,
        '-o', targetPath
      ], { timeout: 20000 }, (error) => {
        if (error) return reject(error);
        resolve();
      });
    });

    try {
      await downloadWithCurl();
    } catch (curlErr) {
      const nodeRes = await fetch(mp3Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.myinstants.com/'
        }
      });
      if (!nodeRes.ok) throw new Error(`HTTP ${nodeRes.status} from sound host`);
      const buffer = Buffer.from(await nodeRes.arrayBuffer());
      await fsPromises.writeFile(targetPath, buffer);
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(500).json({ ok: false, error: 'Gagal membuat file audio di disk' });
    }
    const stat = await fsPromises.stat(targetPath);
    if (stat.size < 500) {
      await fsPromises.unlink(targetPath).catch(() => {});
      return res.status(403).json({ ok: false, error: 'Download terblokir Cloudflare atau file kosong' });
    }

    const isCompanion = !!req.body?.isCompanionOnly;
    const meta = await loadMeta();
    const displayLabel = rawTitle.replace(/_/g, ' ');
    meta[filename] = {
      label: displayLabel,
      displayName: displayLabel,
      tab: isCompanion ? 'companion' : 'soundboard',
      volume: 80,
      isSoundboard: !isCompanion,
      isCompanionOnly: isCompanion,
      companionFor: req.body?.companionFor || null,
      source: 'myinstants',
      created: new Date().toISOString()
    };
    await saveMeta(meta);
    io.emit('media-updated');

    res.json({
      ok: true,
      filename,
      label: displayLabel,
      url: '/assets/' + encodeURIComponent(filename),
      size: stat.size,
      meta: meta[filename]
    });
  } catch (err) {
    console.error('[myinstants] Download error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── COUNTER API ──────────────────────────────────────────
async function loadCounterMeta() {
  return await readJsonAsync(COUNTER_META, []);
}
async function saveCounterMeta(list) {
  return await writeJsonAtomic(COUNTER_META, list);
}

app.get('/api/counters', async (req, res) => {
  res.json(await loadCounterMeta());
});

app.post('/api/counters', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ ok: false, error: 'Nama wajib diisi' });
  const cleanName = String(name).trim().replace(/[<>"'`]/g, '');
  const baseFilename = cleanName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!baseFilename) return res.status(400).json({ ok: false, error: 'Nama tidak valid' });

  const filename = baseFilename + '.txt';
  const filepath = resolveSafePath(TEXT_DIR, filename);
  if (!filepath) return res.status(400).json({ ok: false, error: 'Nama file tidak aman' });

  const list = await loadCounterMeta();
  if (list.find(c => c.filename === filename)) return res.status(409).json({ ok: false, error: 'Counter sudah ada' });
  
  try {
    await writeTextAtomic(filepath, '0');
    list.push({ name: cleanName, filename, created: new Date().toISOString() });
    await saveCounterMeta(list);
    res.json({ ok: true, filename, name: cleanName });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/counters/:filename/value', async (req, res) => {
  const filepath = resolveSafePath(TEXT_DIR, req.params.filename);
  if (!filepath || !fs.existsSync(filepath)) return res.status(404).json({ ok: false });
  try {
    const val = await readTextAsync(filepath, '0');
    res.json({ ok: true, value: val });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/counters/:filename/value', async (req, res) => {
  const filepath = resolveSafePath(TEXT_DIR, req.params.filename);
  if (!filepath || !fs.existsSync(filepath)) return res.status(404).json({ ok: false });
  const { value } = req.body || {};
  try {
    await writeTextAtomic(filepath, String(value ?? '0'));
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Mutex queue sederhana untuk mengamankan operasi atomic counter
const counterLocks = new Map();

app.post('/api/counters/:filename/op', async (req, res) => {
  const filepath = resolveSafePath(TEXT_DIR, req.params.filename);
  if (!filepath || !fs.existsSync(filepath)) return res.status(404).json({ ok: false });
  const { op } = req.body || {};
  const filename = path.basename(filepath);

  const prevLock = counterLocks.get(filename) || Promise.resolve();
  const currentOp = prevLock.then(async () => {
    try {
      const rawText = await readTextAsync(filepath, '0');
      let cur = parseInt(rawText, 10) || 0;
      if (op === 'inc') cur += 1;
      else if (op === 'dec') cur = Math.max(0, cur - 1);
      else if (op === 'reset') cur = 0;
      else return res.status(400).json({ ok: false, error: 'invalid op' });

      await writeTextAtomic(filepath, String(cur));
      io.emit('counter-updated', { filename, value: cur });
      res.json({ ok: true, value: cur });
    } catch(e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  counterLocks.set(filename, currentOp);
  await currentOp;
});

app.delete('/api/counters/:filename', async (req, res) => {
  const filepath = resolveSafePath(TEXT_DIR, req.params.filename);
  if (!filepath) return res.status(400).json({ ok: false, error: 'Invalid path' });
  const filename = path.basename(filepath);

  try {
    if (fs.existsSync(filepath)) await fsPromises.unlink(filepath);
    const list = await loadCounterMeta();
    await saveCounterMeta(list.filter(c => c.filename !== filename));
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── DECK SETTINGS ────────────────────────────────────────
async function loadDeckSettings() {
  return await readJsonAsync(DECK_SETTINGS_FILE, {});
}
async function saveDeckSettings(data) {
  return await writeJsonAtomic(DECK_SETTINGS_FILE, data);
}

app.get('/api/deck-settings', async (req, res) => {
  res.json(await loadDeckSettings());
});
app.post('/api/deck-settings', async (req, res) => {
  const ok = await saveDeckSettings(req.body);
  if (ok) io.emit('deck-settings-updated', req.body);
  res.json({ ok });
});

// ── OBS WEBSOCKET CONTROLLER ─────────────────────────────
const obsController = new OBSController(BASE_DIR, io);
obsController.init().catch(err => console.warn('[OBS] Init warning:', err.message));

app.get('/api/obs/status', (req, res) => {
  res.json(obsController.getStatus());
});

app.get('/api/obs/scenes', async (req, res) => {
  try {
    const scenes = await obsController.refreshScenes();
    res.json({ ok: true, currentScene: obsController.currentScene, scenes });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/obs/set-scene', async (req, res) => {
  const { sceneName } = req.body || {};
  if (!sceneName || typeof sceneName !== 'string') {
    return res.status(400).json({ ok: false, error: 'sceneName is required' });
  }
  try {
    const result = await obsController.setScene(sceneName);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/obs/connect', async (req, res) => {
  const { ip, port, password, autoConnect } = req.body || {};
  try {
    const result = await obsController.connect({ ip, port: parseInt(port, 10) || 4455, password, autoConnect });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/obs/disconnect', async (req, res) => {
  try {
    const result = await obsController.disconnect();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// OBS Sources (Scene Items)
app.get('/api/obs/scenes/:sceneName/items', async (req, res) => {
  try {
    const sceneName = decodeURIComponent(req.params.sceneName);
    const data = await obsController.getSceneItems(sceneName);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/obs/current-items', async (req, res) => {
  try {
    const data = await obsController.getSceneItems();
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/obs/set-item-enabled', async (req, res) => {
  const { sceneName, sceneItemId, sceneItemEnabled } = req.body || {};
  if (sceneItemId === undefined) {
    return res.status(400).json({ ok: false, error: 'sceneItemId is required' });
  }
  try {
    const result = await obsController.setSceneItemEnabled(sceneName, sceneItemId, sceneItemEnabled);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/obs/toggle-item', async (req, res) => {
  const { sceneName, sceneItemId } = req.body || {};
  if (sceneItemId === undefined) {
    return res.status(400).json({ ok: false, error: 'sceneItemId is required' });
  }
  try {
    const result = await obsController.toggleSceneItem(sceneName, sceneItemId);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// OBS Audio Inputs
app.get('/api/obs/inputs', async (req, res) => {
  try {
    const inputs = await obsController.getAudioInputs();
    res.json({ ok: true, inputs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/obs/toggle-mute', async (req, res) => {
  const { inputName } = req.body || {};
  if (!inputName) return res.status(400).json({ ok: false, error: 'inputName is required' });
  try {
    const result = await obsController.toggleInputMute(inputName);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/obs/set-mute', async (req, res) => {
  const { inputName, inputMuted } = req.body || {};
  if (!inputName || inputMuted === undefined) {
    return res.status(400).json({ ok: false, error: 'inputName and inputMuted are required' });
  }
  try {
    const result = await obsController.setInputMute(inputName, inputMuted);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── MULTI-ACTION MACRO RUNNER ────────────────────────────
async function handleCounterOp(filename, op) {
  const filepath = resolveSafePath(TEXT_DIR, filename);
  if (!filepath || !fs.existsSync(filepath)) return { ok: false, error: 'Counter not found' };
  const safeFilename = path.basename(filepath);
  const rawText = await readTextAsync(filepath, '0');
  let cur = parseInt(rawText, 10) || 0;
  if (op === 'inc') cur += 1;
  else if (op === 'dec') cur = Math.max(0, cur - 1);
  else if (op === 'reset') cur = 0;
  await writeTextAtomic(filepath, String(cur));
  io.emit('counter-updated', { filename: safeFilename, value: cur });
  return { ok: true, value: cur };
}

const macroRunner = new MacroRunner(BASE_DIR, io, obsController, handleCounterOp);
macroRunner.init().catch(err => console.warn('[Macro] Init warning:', err.message));

app.get('/api/macros', async (req, res) => {
  res.json(await macroRunner.getMacros());
});

app.post('/api/macros', async (req, res) => {
  try {
    const macro = await macroRunner.saveMacro(req.body);
    res.json({ ok: true, macro });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.delete('/api/macros/:id', async (req, res) => {
  try {
    const result = await macroRunner.deleteMacro(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/macros/:id/trigger', async (req, res) => {
  try {
    const result = await macroRunner.executeMacro(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── LOCAL IP (untuk QR / phone connect) ─────────────────
app.get('/api/local-ip', (req, res) => {
  const ip = getLocalIPv4();
  res.json({ ip, port: activePort });
});

// ── CONFIG API ──────────────────────────────────────────
async function loadAppConfig() {
  return await readJsonAsync(CONFIG_FILE, {});
}
app.get('/api/config', async (req, res) => {
  res.json(await loadAppConfig());
});

app.post('/api/choose-folder', async (req, res) => {
  if (!IS_ELECTRON) return res.json({ ok: false, error: 'Only available in Electron' });
  res.json({ ok: false, error: 'Use Electron Settings dialog' });
});

// ── BACKUP & RESTORE ────────────────────────────────────
const archiver = (() => { try { return require('archiver'); } catch { return null; } })();
const unzipper = (() => { try { return require('unzipper'); } catch { return null; } })();

app.get('/api/backup', (req, res) => {
  if (!archiver) return res.status(500).json({ ok: false, error: 'archiver not installed' });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = 'Tomatosuki-Backup-' + timestamp + '.zip';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.on('error', err => { console.error('Backup error:', err); res.status(500).end(); });
  archive.pipe(res);

  // Config files
  const configFiles = ['meta.json', 'counters.json', 'deck_settings.json', 'config.json'];
  for (const f of configFiles) {
    const fp = path.join(BASE_DIR, f);
    if (fs.existsSync(fp)) archive.file(fp, { name: 'config/' + f });
  }

  // Assets folder
  if (fs.existsSync(MEDIA_DIR)) {
    archive.directory(MEDIA_DIR, 'assets');
  }

  // Thumbs folder
  if (fs.existsSync(THUMB_DIR)) {
    archive.directory(THUMB_DIR, 'thumbs');
  }

  archive.finalize();
});

const restoreUpload = multer({ dest: path.join(BASE_DIR, '_restore_tmp'), limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
app.post('/api/restore', restoreUpload.single('backup'), async (req, res) => {
  if (!unzipper) return res.status(500).json({ ok: false, error: 'unzipper not installed' });
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });

  const zipPath = req.file.path;
  try {
    const zip = await unzipper.Open.file(zipPath);
    let restoredFiles = 0;
    let restoredConfigs = 0;

    for (const entry of zip.files) {
      if (entry.type === 'Directory') continue;
      const rel = entry.path.replace(/\\/g, '/');

      if (rel.startsWith('config/')) {
        const fname = path.basename(rel);
        const allowed = ['meta.json', 'counters.json', 'deck_settings.json', 'config.json'];
        if (allowed.includes(fname)) {
          const dest = path.join(BASE_DIR, fname);
          const content = await entry.buffer();
          await fsPromises.writeFile(dest, content);
          restoredConfigs++;
        }
      } else if (rel.startsWith('assets/')) {
        const subPath = rel.slice('assets/'.length);
        if (!subPath) continue;
        const dest = resolveSafePath(MEDIA_DIR, subPath);
        if (!dest) continue; // Zip Slip protection: skip invalid/traversal paths
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) await fsPromises.mkdir(dir, { recursive: true });
        const content = await entry.buffer();
        await fsPromises.writeFile(dest, content);
        restoredFiles++;
      } else if (rel.startsWith('thumbs/')) {
        const subPath = rel.slice('thumbs/'.length);
        if (!subPath) continue;
        const dest = resolveSafePath(THUMB_DIR, subPath);
        if (!dest) continue; // Zip Slip protection: skip invalid/traversal paths
        const content = await entry.buffer();
        await fsPromises.writeFile(dest, content);
      }
    }

    try { await fsPromises.unlink(zipPath); } catch {}
    try { await fsPromises.rm(path.join(BASE_DIR, '_restore_tmp'), { recursive: true, force: true }); } catch {}

    res.json({ ok: true, restoredFiles, restoredConfigs });
  } catch(e) {
    try { await fsPromises.unlink(zipPath); } catch {}
    console.error('Restore error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── FAVICON SILENCER ─────────────────────────────────────
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ── SOCKET ───────────────────────────────────────────────
io.on('connection', s => {
  console.log('Client connected:', s.id);

  s.on('panic-stop', () => io.emit('panic-stop'));
  s.on('master-volume', data => io.emit('master-volume', data));
  s.on('trigger-fx', data => io.emit('trigger-fx', data));
});

// ── START WITH DYNAMIC PORT FALLBACK ─────────────────────
let activePort = parseInt(process.env.PORT, 10) || 3000;

function startListen(port) {
  server.listen(port, '0.0.0.0')
    .on('listening', () => {
      activePort = port;
      console.log(`Tomatosuki Server | port:${activePort} | media:${MEDIA_DIR} | ffmpeg:${hasFfmpeg}`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE' && port < 3050 && !process.env.PORT) {
        console.warn(`[server] Port ${port} in use, trying port ${port + 1}...`);
        startListen(port + 1);
      } else {
        console.error('[server] Listen error:', err);
      }
    });
}

startListen(activePort);

module.exports = { app, server, obsController, macroRunner };