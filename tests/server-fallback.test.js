const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const { fork } = require('child_process');

describe('Server Port Fallback & Real EADDRINUSE Simulation (REL-03)', () => {
  it('harus mendeteksi EADDRINUSE pada port utama, beralih ke fallback port, dan tidak ada MaxListeners warning', async () => {
    const OCCUPIED_PORT = 3123;
    let stderrOutput = '';

    // 1. Buka dummy HTTP server di port 3123 untuk menduduki port utama secara penuh (dual-stack)
    const dummyServer = http.createServer((req, res) => res.end('occupied'));
    await new Promise((resolve) => dummyServer.listen(OCCUPIED_PORT, resolve));

    let child;
    try {
      // 2. Spawn server.js sebagai child process dengan PORT=3123
      const serverPath = path.resolve(__dirname, '../server.js');
      child = fork(serverPath, [], {
        env: {
          ...process.env,
          PORT: String(OCCUPIED_PORT),
          USER_DATA_DIR: path.resolve(__dirname, 'temp_test_fallback'),
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      });

      child.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      // 3. Tangkap IPC message server-started saat fallback sukses
      const startedEvent = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout menunggu fallback port. Stderr: ${stderrOutput}`));
        }, 12000);

        child.on('message', (msg) => {
          if (msg && msg.type === 'server-started') {
            clearTimeout(timeout);
            resolve(msg);
          }
        });

        child.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // 4. Verifikasi server beralih ke fallback port (3099 atau ephemeral port)
      assert.notStrictEqual(startedEvent.port, OCCUPIED_PORT, 'Server seharusnya tidak listen di port yang sudah terisi');
      assert.ok(startedEvent.port === 3099 || startedEvent.port > 1024, 'Server seharusnya fallback ke FALLBACK_SERVER_PORT (3099) atau port ephemeral valid');

      // 5. Buktikan tidak ada MaxListenersExceededWarning di stderr
      assert.doesNotMatch(stderrOutput, /MaxListenersExceededWarning/i, 'Tidak boleh ada warning MaxListenersExceededWarning');
    } finally {
      if (child) {
        child.kill();
        await new Promise((r) => {
          if (child.exitCode !== null) return r();
          child.on('exit', r);
          setTimeout(r, 1000);
        });
      }

      await new Promise((resolve) => dummyServer.close(resolve));
      const fs = require('fs');
      const tempDir = path.resolve(__dirname, 'temp_test_fallback');
      if (fs.existsSync(tempDir)) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
    }
  });
});
