const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  readJsonAsync,
  writeJsonAtomic,
  readTextAsync,
  writeTextAtomic,
} = require('../src/utils/file-store');

const TEST_DIR = path.resolve(__dirname, 'temp_test_store');

describe('File Store Atomic Utilities', () => {
  before(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('readJsonAsync & writeJsonAtomic', () => {
    it('harus mengembalikan defaultValue jika file tidak ada', async () => {
      const filePath = path.join(TEST_DIR, 'non_existent.json');
      const data = await readJsonAsync(filePath, { fallback: true });
      assert.deepStrictEqual(data, { fallback: true });
    });

    it('harus menulis data secara atomic dan membacanya kembali dengan benar', async () => {
      const filePath = path.join(TEST_DIR, 'meta_test.json');
      const payload = { 'meme.mp4': { duration: 5, chroma: false } };

      const ok = await writeJsonAtomic(filePath, payload);
      assert.strictEqual(ok, true);

      const readData = await readJsonAsync(filePath);
      assert.deepStrictEqual(readData, payload);
    });

    it('harus menangani file JSON yang korup dengan aman dan mengembalikan defaultValue', async () => {
      const filePath = path.join(TEST_DIR, 'corrupt.json');
      fs.writeFileSync(filePath, '{ invalid json format ...', 'utf8');

      const data = await readJsonAsync(filePath, {});
      assert.deepStrictEqual(data, {});
    });
  });

  describe('readTextAsync & writeTextAtomic', () => {
    it('harus menulis dan membaca text secara atomic', async () => {
      const filePath = path.join(TEST_DIR, 'counter_test.txt');
      const ok = await writeTextAtomic(filePath, '42');
      assert.strictEqual(ok, true);

      const val = await readTextAsync(filePath, '0');
      assert.strictEqual(val, '42');
    });

    it('harus mengembalikan default text jika file tidak ada', async () => {
      const filePath = path.join(TEST_DIR, 'missing_text.txt');
      const val = await readTextAsync(filePath, '0');
      assert.strictEqual(val, '0');
    });
  });
});
