const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const OBSController = require('../src/services/obs-controller');

test('OBSController Unit Tests', async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ksk-obs-test-'));

  t.after(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('harus memiliki status default disconnected dengan config bawaan', async () => {
    const obs = new OBSController(tmpDir, null);
    await obs.init();
    const status = obs.getStatus();

    assert.equal(status.connected, false);
    assert.equal(status.currentScene, null);
    assert.deepEqual(status.scenes, []);
    assert.equal(status.config.ip, '127.0.0.1');
    assert.equal(status.config.port, 4455);
  });

  await t.test('harus menyimpan konfigurasi baru secara atomic', async () => {
    const obs = new OBSController(tmpDir, null);
    await obs.init();

    await obs.saveConfig({ ip: '192.168.1.14', port: 4455, password: 'secretpassword', autoConnect: false });
    const status = obs.getStatus();

    assert.equal(status.config.ip, '192.168.1.14');
    assert.equal(status.config.port, 4455);
    assert.equal(status.config.hasPassword, true);
    assert.equal(status.config.autoConnect, false);

    // Verifikasi persistensi file
    const obs2 = new OBSController(tmpDir, null);
    await obs2.init();
    assert.equal(obs2.config.ip, '192.168.1.14');
    assert.equal(obs2.config.password, 'secretpassword');
  });

  await t.test('harus melempar error saat setScene dipanggil ketika belum terhubung', async () => {
    const obs = new OBSController(tmpDir, null);
    await obs.init();

    await assert.rejects(async () => {
      await obs.setScene('Gameplay');
    }, { message: 'OBS is not connected' });
  });

  await t.test('harus melempar error saat getSceneItems dipanggil ketika belum terhubung', async () => {
    const obs = new OBSController(tmpDir, null);
    await obs.init();

    await assert.rejects(async () => {
      await obs.getSceneItems();
    }, { message: 'OBS is not connected' });
  });

  await t.test('harus melempar error saat setSceneItemEnabled dipanggil ketika belum terhubung', async () => {
    const obs = new OBSController(tmpDir, null);
    await obs.init();

    await assert.rejects(async () => {
      await obs.setSceneItemEnabled('Scene 1', 1, true);
    }, { message: 'OBS is not connected' });
  });

  await t.test('harus melempar error saat getAudioInputs dipanggil ketika belum terhubung', async () => {
    const obs = new OBSController(tmpDir, null);
    await obs.init();

    await assert.rejects(async () => {
      await obs.getAudioInputs();
    }, { message: 'OBS is not connected' });
  });

  await t.test('harus menangani disconnect dengan aman tanpa throw error', async () => {
    const obs = new OBSController(tmpDir, null);
    await obs.init();

    const result = await obs.disconnect();
    assert.equal(result.success, true);
    assert.equal(obs.isConnected, false);
  });
});
