const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { sanitizeFilename, resolveSafePath } = require('../src/utils/path-security');

describe('Path Security Utilities', () => {
  describe('sanitizeFilename', () => {
    it('harus membersihkan karakter berbahaya dari nama file', () => {
      const input = 'my <evil> "file" : / \\ | ? * .mp3';
      const clean = sanitizeFilename(input);
      assert.strictEqual(clean, 'my__evil___file______________.mp3');
    });

    it('harus menjaga nama file yang valid', () => {
      const input = 'sound_effect-123.wav';
      const clean = sanitizeFilename(input);
      assert.strictEqual(clean, 'sound_effect-123.wav');
    });
  });

  describe('resolveSafePath', () => {
    const baseDir = path.resolve(__dirname, 'mock_media');

    it('harus mengembalikan path absolut jika file berada di dalam baseDir', () => {
      const result = resolveSafePath(baseDir, 'meme.mp4');
      assert.strictEqual(result, path.join(baseDir, 'meme.mp4'));
    });

    it('harus mengembalikan null untuk upaya path traversal ../', () => {
      const result = resolveSafePath(baseDir, '../../windows/system32/cmd.exe');
      assert.strictEqual(result, null);
    });

    it('harus mengembalikan null untuk upaya encoding path traversal', () => {
      const result = resolveSafePath(baseDir, '..%2F..%2Fsecret.json');
      assert.strictEqual(result, null);
    });

    it('harus mengembalikan null untuk traversal dengan sub-folder langsung', () => {
      const result = resolveSafePath(baseDir, 'subfolder/secret.json');
      assert.strictEqual(result, null);
    });
  });
});
