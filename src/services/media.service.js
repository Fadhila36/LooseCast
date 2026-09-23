/**
 * Media Service
 * Handles media assets catalog scanning, metadata persistence, deletion, trigger broadcasts, and ffmpeg thumbnail generation.
 * Decoupled from HTTP transport.
 * @module services/media.service
 */

const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { execFile } = require('child_process');
const { sanitizeFilename, resolveSafePath } = require('../utils/path-security');
const { readJsonAsync, writeJsonAtomic } = require('../utils/file-store');
const { SUPPORTED_MEDIA_EXTENSIONS } = require('../config/constants');
const logger = require('../utils/logger');

const MODULE_NAME = 'media-service';

class MediaService {
  /**
   * @param {object} options
   * @param {string} options.mediaDir - Absolute path to assets directory
   * @param {string} options.metaFile - Absolute path to meta.json
   * @param {string} options.thumbDir - Absolute path to thumbs directory
   * @param {string|null} [options.ffmpegPath] - Path to ffmpeg binary
   * @param {import('socket.io').Server} [options.io] - Socket.IO instance
   * @param {Function} [options.incrementTrigger] - Stats trigger callback
   */
  constructor({ mediaDir, metaFile, thumbDir, ffmpegPath = null, io = null, incrementTrigger = null }) {
    this.mediaDir = mediaDir;
    this.metaFile = metaFile;
    this.thumbDir = thumbDir;
    this.ffmpegPath = ffmpegPath;
    this.io = io;
    this.incrementTrigger = incrementTrigger;
  }

  /**
   * Load metadata from disk
   * @returns {Promise<Record<string, any>>}
   */
  async loadMeta() {
    return await readJsonAsync(this.metaFile, {});
  }

  /**
   * Save metadata to disk
   * @param {Record<string, any>} meta
   * @returns {Promise<boolean>}
   */
  async saveMeta(meta) {
    return await writeJsonAtomic(this.metaFile, meta);
  }

  /**
   * List all media assets merged with their metadata
   * @returns {Promise<any[]>}
   */
  async listMedia() {
    if (!fs.existsSync(this.mediaDir)) {
      return [];
    }

    const files = await fsPromises.readdir(this.mediaDir);
    const meta = await this.loadMeta();

    return files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_MEDIA_EXTENSIONS.includes(ext);
      })
      .map((file) => {
        const fileMeta = meta[file] || null;
        return {
          ...(fileMeta || {}),
          name: file,
          filename: file,
          settings: fileMeta,
        };
      });
  }

  /**
   * Get settings for a specific media file
   * @param {string} filename
   * @returns {Promise<object>}
   */
  async getMediaSettings(filename) {
    const meta = await this.loadMeta();
    return meta[filename] || {};
  }

  /**
   * Update settings for a specific media file
   * @param {string} filename
   * @param {object} settings
   * @returns {Promise<object>}
   */
  async updateMediaSettings(filename, settings) {
    const meta = await this.loadMeta();
    meta[filename] = {
      ...(meta[filename] || {}),
      ...settings,
    };
    await this.saveMeta(meta);
    logger.debug(MODULE_NAME, `Updated settings for "${filename}"`);
    return meta[filename];
  }

  /**
   * Securely delete a media file along with cached thumbnail and meta entry
   * @param {string} filename
   * @returns {Promise<boolean>}
   */
  async deleteMedia(filename) {
    const targetPath = resolveSafePath(this.mediaDir, filename);
    if (!targetPath) {
      logger.warn(MODULE_NAME, `Path traversal blocked during delete: "${filename}"`);
      throw new Error('Invalid or unsafe filename');
    }

    try {
      await fsPromises.unlink(targetPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    // Cleanup cached thumbnail if exists
    const thumbName = `${sanitizeFilename(filename)}.jpg`;
    const thumbPath = resolveSafePath(this.thumbDir, thumbName);
    if (thumbPath) {
      try {
        await fsPromises.unlink(thumbPath);
      } catch {}
    }

    // Cleanup meta entry
    const meta = await this.loadMeta();
    delete meta[filename];
    await this.saveMeta(meta);

    logger.info(MODULE_NAME, `Deleted media "${filename}"`);

    if (this.io) {
      this.io.emit('media-list-updated', { action: 'delete', filename });
    }

    return true;
  }

  /**
   * Broadcast upload notification to all connected clients
   * @param {string[]} [files]
   */
  notifyMediaUploaded(files = []) {
    if (this.io) {
      this.io.emit('media-list-updated', { action: 'upload', files });
    }
  }

  /**
   * Trigger meme playback via Socket.IO
   * @param {object} data
   * @returns {Promise<boolean>}
   */
  async triggerMedia(data) {
    if (!data || !data.filename) {
      throw new Error('Filename is required');
    }

    if (this.io) {
      this.io.emit('show-media', data);
    }

    if (typeof this.incrementTrigger === 'function') {
      await this.incrementTrigger();
    }

    return true;
  }

  /**
   * Generate or resolve thumbnail for video file
   * @param {string} filename
   * @returns {Promise<string>} Path to thumbnail file
   */
  async getThumbnailPath(filename) {
    const videoPath = resolveSafePath(this.mediaDir, filename);
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error('Media not found');
    }

    const thumbName = `${sanitizeFilename(filename)}.jpg`;
    const thumbPath = path.join(this.thumbDir, thumbName);

    if (fs.existsSync(thumbPath)) {
      return thumbPath;
    }

    if (!this.ffmpegPath) {
      throw new Error('ffmpeg not available');
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-ss', '00:00:00.500',
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=320:-1',
        thumbPath,
      ];

      execFile(this.ffmpegPath, args, { timeout: 8000 }, (err) => {
        if (err) {
          logger.warn(MODULE_NAME, `Thumbnail generation failed for "${filename}": ${err.message}`);
          return reject(new Error('Thumbnail generation failed'));
        }
        resolve(thumbPath);
      });
    });
  }
}

module.exports = MediaService;
