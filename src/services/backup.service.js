/**
 * Backup Service
 * Handles data export to ZIP archives and safe extraction/restoration.
 * Decoupled from HTTP transport.
 * @module services/backup.service
 */

const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const archiver = require('archiver');
const unzipper = require('unzipper');
const logger = require('../utils/logger');

const MODULE_NAME = 'backup-service';

class BackupService {
  /**
   * @param {object} options
   * @param {string} options.baseDir - Application root / user data directory
   */
  constructor({ baseDir }) {
    this.baseDir = baseDir;
  }

  /**
   * Pipe zipped database files to a writable stream (e.g. HTTP response or file stream)
   * @param {import('stream').Writable} destinationStream
   * @returns {Promise<void>}
   */
  async exportBackup(destinationStream) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => {
        logger.error(MODULE_NAME, 'Archive export error', err);
        reject(err);
      });

      archive.on('end', () => {
        logger.info(MODULE_NAME, 'Backup archive exported successfully');
        resolve();
      });

      archive.pipe(destinationStream);

      const filesToBackup = [
        'meta.json',
        'counters.json',
        'macros.json',
        'deck_settings.json',
        'config.json',
        'stats.json',
        'obs_config.json',
      ];

      for (const f of filesToBackup) {
        const full = path.join(this.baseDir, f);
        if (fs.existsSync(full)) {
          archive.file(full, { name: f });
        }
      }

      archive.finalize();
    });
  }

  /**
   * Restore application database files from an uploaded zip file
   * @param {string} zipFilePath - Path to uploaded temporary zip file
   * @returns {Promise<{ restoredFiles: string[] }>}
   */
  async restoreBackup(zipFilePath) {
    if (!zipFilePath || !fs.existsSync(zipFilePath)) {
      throw new Error('File backup zip tidak ditemukan');
    }

    const tmpExtractDir = path.join(this.baseDir, '_restore_tmp');
    const restoredFiles = [];

    try {
      if (!fs.existsSync(tmpExtractDir)) {
        fs.mkdirSync(tmpExtractDir, { recursive: true });
      }

      // Extract ZIP to temporary folder
      const directory = await unzipper.Open.file(zipFilePath);
      await directory.extract({ path: tmpExtractDir });

      const allowedFiles = [
        'meta.json',
        'counters.json',
        'macros.json',
        'deck_settings.json',
        'config.json',
        'stats.json',
        'obs_config.json',
      ];

      const extractedItems = await fsPromises.readdir(tmpExtractDir);
      for (const item of extractedItems) {
        if (allowedFiles.includes(item)) {
          const src = path.join(tmpExtractDir, item);
          const dest = path.join(this.baseDir, item);
          await fsPromises.copyFile(src, dest);
          restoredFiles.push(item);
        }
      }

      logger.info(MODULE_NAME, `Restored ${restoredFiles.length} file(s) from backup`);
      return { restoredFiles };
    } finally {
      // Safe cleanup of temporary resources
      try {
        if (fs.existsSync(zipFilePath)) {
          await fsPromises.unlink(zipFilePath);
        }
      } catch {}

      try {
        if (fs.existsSync(tmpExtractDir)) {
          await fsPromises.rm(tmpExtractDir, { recursive: true, force: true });
        }
      } catch {}
    }
  }
}

module.exports = BackupService;
