const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const MediaService = require('../src/services/media.service');

describe('MediaService Unit Tests', () => {
  const testDir = path.join(__dirname, 'temp_media_test');
  const mediaDir = path.join(testDir, 'assets');
  const thumbDir = path.join(testDir, 'thumbs');
  const metaFile = path.join(testDir, 'meta.json');
  let mediaService;

  before(async () => {
    await fsPromises.mkdir(mediaDir, { recursive: true });
    await fsPromises.mkdir(thumbDir, { recursive: true });
    mediaService = new MediaService({
      mediaDir,
      thumbDir,
      metaFile,
    });
  });

  after(async () => {
    await fsPromises.rm(testDir, { recursive: true, force: true });
  });

  it('harus mengembalikan list kosong jika folder assets kosong', async () => {
    const list = await mediaService.listMedia();
    assert.deepEqual(list, []);
  });

  it('harus mendaftar media yang didukung dan mengabaikan file yang tidak didukung', async () => {
    // Buat file uji
    await fsPromises.writeFile(path.join(mediaDir, 'test_sound.mp3'), 'fake-audio');
    await fsPromises.writeFile(path.join(mediaDir, 'test_meme.png'), 'fake-image');
    await fsPromises.writeFile(path.join(mediaDir, 'test_video.mp4'), 'fake-video');
    await fsPromises.writeFile(path.join(mediaDir, 'ignored.txt'), 'text');
    await fsPromises.writeFile(path.join(mediaDir, 'ignored.exe'), 'bin');

    const list = await mediaService.listMedia();
    assert.equal(list.length, 3);

    const filenames = list.map((item) => item.filename);
    assert.ok(filenames.includes('test_sound.mp3'));
    assert.ok(filenames.includes('test_meme.png'));
    assert.ok(filenames.includes('test_video.mp4'));
  });

  it('harus menggabungkan metadata dengan daftar media', async () => {
    await mediaService.saveMeta({
      'test_meme.png': {
        displayName: 'Custom Meme Name',
        category: 'anime',
        gain: 1.5,
        favorite: true,
      },
    });

    const list = await mediaService.listMedia();
    const memeItem = list.find((item) => item.filename === 'test_meme.png');
    assert.ok(memeItem);
    assert.equal(memeItem.name, 'test_meme.png');
    assert.equal(memeItem.filename, 'test_meme.png');
    assert.equal(memeItem.settings.displayName, 'Custom Meme Name');
    assert.equal(memeItem.category, 'anime');
    assert.equal(memeItem.gain, 1.5);
    assert.equal(memeItem.favorite, true);
  });

  it('harus menghapus file media dan membersihkan metadatanya dengan aman', async () => {
    const result = await mediaService.deleteMedia('test_sound.mp3');
    assert.equal(result, true);
    assert.equal(fs.existsSync(path.join(mediaDir, 'test_sound.mp3')), false);
  });

  it('harus memancarkan event media-list-updated saat deleteMedia dan notifyMediaUploaded (BUG-DECK-01)', async () => {
    const emitted = [];
    const mockIo = {
      emit: (event, payload) => emitted.push({ event, payload }),
    };

    const serviceWithIo = new MediaService({
      mediaDir,
      thumbDir,
      metaFile,
      io: mockIo,
    });

    // Buat file dummy untuk ditest delete
    await fsPromises.writeFile(path.join(mediaDir, 'temp_delete.mp3'), 'audio-data');
    await serviceWithIo.deleteMedia('temp_delete.mp3');

    const deleteEmit = emitted.find((e) => e.event === 'media-list-updated' && e.payload.action === 'delete');
    assert.ok(deleteEmit, 'Event media-list-updated delete harus dipancarkan');
    assert.strictEqual(deleteEmit.payload.filename, 'temp_delete.mp3');

    // Test notifyMediaUploaded
    serviceWithIo.notifyMediaUploaded(['new_meme.png']);
    const uploadEmit = emitted.find((e) => e.event === 'media-list-updated' && e.payload.action === 'upload');
    assert.ok(uploadEmit, 'Event media-list-updated upload harus dipancarkan');
    assert.deepStrictEqual(uploadEmit.payload.files, ['new_meme.png']);
  });
});
