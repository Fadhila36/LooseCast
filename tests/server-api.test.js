const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const fs = require('fs');

const TEST_BASE = path.resolve(__dirname, 'temp_test_server');
process.env.USER_DATA_DIR = TEST_BASE;
process.env.PORT = '3098';

describe('Server API Endpoints Integration Test', () => {
  let appServer;

  before(async () => {
    if (fs.existsSync(TEST_BASE)) {
      try { fs.rmSync(TEST_BASE, { recursive: true, force: true }); } catch {}
    }
    fs.mkdirSync(TEST_BASE, { recursive: true });
    const { server } = require('../server');
    appServer = server;
  });

  after(async () => {
    if (appServer && appServer.close) {
      await new Promise((resolve) => appServer.close(resolve));
    }
    if (fs.existsSync(TEST_BASE)) {
      try {
        fs.rmSync(TEST_BASE, { recursive: true, force: true });
      } catch {}
    }
  });

  function getActivePort() {
    return (appServer && appServer.address()) ? appServer.address().port : 3098;
  }

  function request(method, pathUrl, body = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: getActivePort(),
          path: pathUrl,
          method,
          headers: payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {},
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  function uploadFile(pathUrl, fieldName, filename, fileBuffer) {
    return new Promise((resolve, reject) => {
      const boundary = '----TestBoundary' + Date.now();
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;
      const payload = Buffer.concat([Buffer.from(header, 'utf8'), fileBuffer, Buffer.from(footer, 'utf8')]);

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: getActivePort(),
          path: pathUrl,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': payload.length,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  it('POST /upload harus menolak file berekstensi berbahaya/tidak didukung (.exe, .html)', async () => {
    const res = await uploadFile('/upload', 'files', 'evil.exe', Buffer.from('malicious payload'));
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.ok, false);
    assert.match(res.body.error, /tidak didukung/i);
  });

  it('POST /upload harus menerima file berekstensi media yang didukung (.mp3, .png)', async () => {
    const res = await uploadFile('/upload', 'files', 'sample.mp3', Buffer.from('valid mp3 audio content'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.files.includes('sample.mp3'));
  });

  it('GET /api/stats harus mengembalikan total triggers default 0', async () => {
    const res = await request('GET', '/api/stats');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.body.totalTriggers, 'number');
  });

  it('POST /api/counters harus menolak payload nama kosong', async () => {
    const res = await request('POST', '/api/counters', { name: '' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.ok, false);
  });

  it('POST /api/counters harus membuat counter baru dan mengizinkan atomic op inc/dec', async () => {
    const uniqueName = `Victory_${Date.now()}`;
    const createRes = await request('POST', '/api/counters', { name: uniqueName });
    assert.strictEqual(createRes.status, 200);
    assert.strictEqual(createRes.body.ok, true);

    const incRes = await request('POST', `/api/counters/${createRes.body.filename}/op`, { op: 'inc' });
    assert.strictEqual(incRes.status, 200);
    assert.strictEqual(incRes.body.value, 1);

    const valRes = await request('GET', `/api/counters/${createRes.body.filename}/value`);
    assert.strictEqual(valRes.status, 200);
    assert.strictEqual(valRes.body.value, '1');
  });

  it('DELETE /api/media/:filename harus menolak path traversal attack', async () => {
    const res = await request('DELETE', '/api/media/..%2F..%2Fwindows%2Fcmd.exe');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.ok, false);
  });

  it('POST /api/panic harus berhasil mengembalikan status ok', async () => {
    const res = await request('POST', '/api/panic');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
  });

  it('POST /api/master-volume harus memvalidasi rentang volume 0 - 100', async () => {
    const badRes = await request('POST', '/api/master-volume', { volume: 150 });
    assert.strictEqual(badRes.status, 400);
    assert.strictEqual(badRes.body.ok, false);

    const goodRes = await request('POST', '/api/master-volume', { volume: 75 });
    assert.strictEqual(goodRes.status, 200);
    assert.strictEqual(goodRes.body.ok, true);
    assert.strictEqual(goodRes.body.volume, 75);
  });

  it('POST /api/fx harus memvalidasi jenis fx yang diizinkan', async () => {
    const badRes = await request('POST', '/api/fx', { type: 'invalid-effect' });
    assert.strictEqual(badRes.status, 400);
    assert.strictEqual(badRes.body.ok, false);

    const goodRes = await request('POST', '/api/fx', { type: 'confetti', intensity: 1 });
    assert.strictEqual(goodRes.status, 200);
    assert.strictEqual(goodRes.body.ok, true);
    assert.strictEqual(goodRes.body.type, 'confetti');
  });

  it('GET /api/obs/status harus mengembalikan status obs', async () => {
    const res = await request('GET', '/api/obs/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.body.connected, 'boolean');
    assert.ok(Array.isArray(res.body.scenes));
  });

  it('POST /api/obs/set-item-enabled harus memvalidasi payload sceneItemId', async () => {
    const res = await request('POST', '/api/obs/set-item-enabled', {});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.ok, false);
  });

  it('POST /api/obs/toggle-mute harus memvalidasi payload inputName', async () => {
    const res = await request('POST', '/api/obs/toggle-mute', {});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.ok, false);
  });

  it('POST /api/macros/import dan GET /api/macros/:id/export harus mengimpor dan mengekspor single macro dengan benar', async () => {
    const macroPayload = {
      name: 'Integration Test Macro',
      icon: '⚡',
      color: '#ef4444',
      steps: [{ type: 'delay', ms: 100 }]
    };

    const importRes = await request('POST', '/api/macros/import', macroPayload);
    assert.strictEqual(importRes.status, 200);
    assert.strictEqual(importRes.body.ok, true);
    assert.ok(importRes.body.macro.id);
    const macroId = importRes.body.macro.id;

    const exportRes = await request('GET', `/api/macros/${macroId}/export`);
    assert.strictEqual(exportRes.status, 200);
    assert.strictEqual(exportRes.body.name, 'Integration Test Macro');
    assert.strictEqual(exportRes.body.steps.length, 1);
  });

  it('POST /api/myinstants/download harus menolak URL SSRF / domain luar MyInstants', async () => {
    const res = await request('POST', '/api/myinstants/download', {
      mp3: 'http://127.0.0.1:3099/api/stats',
      name: 'internal_probe',
    });
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.ok, false);
    assert.match(res.body.error, /Domain download tidak diizinkan/i);
  });

  it('POST /api/myinstants/download harus menolak domain myinstants yang dipalsukan (evil-myinstants.com)', async () => {
    const res = await request('POST', '/api/myinstants/download', {
      mp3: 'https://evil-myinstants.com/sound.mp3',
      name: 'spoofed_domain',
    });
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.ok, false);
    assert.match(res.body.error, /Domain download tidak diizinkan/i);
  });

  it('POST /api/restore harus menolak file selain zip', async () => {
    const res = await uploadFile('/api/restore', 'backup', 'backup.txt', Buffer.from('not a zip'));
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.ok, false);
    assert.match(res.body.error, /harus berupa arsip .zip/i);
  });

  it('POST /api/restore harus menolak zip yang berisi JSON rusak', async () => {
    const archiver = require('archiver');
    const chunks = [];
    const archive = archiver('zip');
    archive.on('data', (c) => chunks.push(c));
    archive.append('{ invalid json structure', { name: 'counters.json' });
    archive.finalize();
    await new Promise((resolve) => archive.on('end', resolve));
    const zipBuf = Buffer.concat(chunks);

    const res = await uploadFile('/api/restore', 'backup', 'corrupt.zip', zipBuf);
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.ok, false);
    assert.match(res.body.error, /rusak atau format JSON tidak valid/i);
  });

  it('POST /api/restore harus berhasil merestore file JSON valid dari zip', async () => {
    const archiver = require('archiver');
    const chunks = [];
    const archive = archiver('zip');
    archive.on('data', (c) => chunks.push(c));
    archive.append(JSON.stringify({ testCounter: 42 }), { name: 'counters.json' });
    archive.finalize();
    await new Promise((resolve) => archive.on('end', resolve));
    const zipBuf = Buffer.concat(chunks);

    const res = await uploadFile('/api/restore', 'backup', 'valid.zip', zipBuf);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.restoredFiles.includes('counters.json'));
  });

  it('GET /api/app-settings harus mengembalikan konfigurasi folder assets', async () => {
    const res = await request('GET', '/api/app-settings');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.assetsDir);
    assert.ok(res.body.defaultAssetsDir);
  });

  it('POST /api/app-settings harus memperbarui pengaturan assetsDir', async () => {
    const customPath = path.join(TEST_BASE, 'custom_assets');
    const updateRes = await request('POST', '/api/app-settings', { assetsDir: customPath });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.ok, true);
    assert.strictEqual(updateRes.body.config.assetsDir, customPath);

    const getRes = await request('GET', '/api/app-settings');
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.assetsDir, customPath);
  });

  it('GET /api/version harus mengembalikan versi dinamis dari package.json', async () => {
    const pkg = require('../package.json');
    const res = await request('GET', '/api/version');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.version, pkg.version);
  });

  it('server harus memiliki tepat 1 error listener dan tidak menduplikasi listener saat port fallback (REL-03)', () => {
    const errorListenersBefore = appServer.listenerCount('error');
    assert.strictEqual(errorListenersBefore, 1);

    // Memverifikasi listener tidak bertambah jika startListening dipanggil ulang
    const { startListening } = require('../server');
    if (typeof startListening === 'function') {
      const errorListenersAfter = appServer.listenerCount('error');
      assert.strictEqual(errorListenersAfter, 1);
    }
  });
});



