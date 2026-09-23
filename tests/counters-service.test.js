const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const CountersService = require('../src/services/counters.service');

const TEST_DIR = path.resolve(__dirname, 'temp_counters_service_test');
const META_FILE = path.join(TEST_DIR, 'counters.json');
const TEXT_DIR = path.join(TEST_DIR, 'text');

describe('CountersService Unit Tests', () => {
  let service;
  let emitted = [];
  const mockIo = {
    emit: (event, data) => emitted.push({ event, data }),
  };

  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
    }
    fs.mkdirSync(TEXT_DIR, { recursive: true });
    service = new CountersService({
      counterMetaFile: META_FILE,
      textDir: TEXT_DIR,
      io: mockIo,
    });
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
    }
  });

  it('harus menolak pembuatan counter tanpa nama', async () => {
    await assert.rejects(
      async () => service.createCounter({ name: '' }),
      { message: 'Nama counter wajib diisi' }
    );
  });

  it('harus membuat counter baru dan menginisialisasi file teks', async () => {
    const counter = await service.createCounter({ name: 'Win Streak', initialValue: 5 });
    assert.strictEqual(counter.name, 'Win Streak');
    assert.ok(counter.filename.includes('win_streak'));

    const val = await service.getCounterValue(counter.filename);
    assert.strictEqual(val, '5');
  });

  it('harus mendukung operasi atomik increment, decrement, dan reset', async () => {
    const counter = await service.createCounter({ name: 'Boss Deaths', initialValue: 0 });

    const incRes = await service.executeCounterOp(counter.filename, 'inc');
    assert.strictEqual(incRes.value, 1);

    const incRes2 = await service.executeCounterOp(counter.filename, 'inc');
    assert.strictEqual(incRes2.value, 2);

    const decRes = await service.executeCounterOp(counter.filename, 'dec');
    assert.strictEqual(decRes.value, 1);

    const resetRes = await service.executeCounterOp(counter.filename, 'reset');
    assert.strictEqual(resetRes.value, 0);
  });

  it('harus menghapus counter dan membersihkan file teks terkait', async () => {
    const counter = await service.createCounter({ name: 'Temp Counter' });
    const filePath = path.join(TEXT_DIR, counter.filename);
    assert.ok(fs.existsSync(filePath));

    await service.deleteCounter(counter.filename);
    assert.ok(!fs.existsSync(filePath));

    const all = await service.loadCounters();
    assert.ok(!all.some((c) => c.filename === counter.filename));
  });

  it('harus menangani 10 concurrent increment tanpa lost update (REL-01)', async () => {
    const counter = await service.createCounter({ name: 'Concurrent Test', initialValue: 0 });

    // Trigger 10 mutasi paralel secara bersamaan
    await Promise.all(
      Array.from({ length: 10 }, () => service.executeCounterOp(counter.filename, 'inc'))
    );

    const finalValStr = await service.getCounterValue(counter.filename);
    const finalVal = parseInt(finalValStr, 10);
    assert.strictEqual(finalVal, 10, `Expected counter value to be 10 after 10 concurrent increments, but got ${finalVal}`);
  });

  it('harus tetap melepas lock saat task melempar error sehingga operasi berikutnya tidak macet', async () => {
    const counter = await service.createCounter({ name: 'Error Lock Test', initialValue: 0 });

    // Force error di dalam lock
    await assert.rejects(async () => {
      await service._withLock(counter.filename, async () => {
        throw new Error('Simulated failure during mutation');
      });
    }, { message: 'Simulated failure during mutation' });

    // Operasi berikutnya harus langsung bisa jalan tanpa timeout/deadlock
    const res = await service.executeCounterOp(counter.filename, 'inc');
    assert.strictEqual(res.value, 1);
  });
});


