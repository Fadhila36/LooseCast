/**
 * Backup Controller (Thin HTTP Transport Layer)
 * Validates HTTP backup/restore requests and streams responses via BackupService.
 * @module controllers/backup.controller
 */

const logger = require('../utils/logger');
const MODULE_NAME = 'backup-controller';

/**
 * Creates the Backup Controller instance.
 * @param {object} options
 * @param {import('../services/backup.service')} options.backupService
 */
function createBackupController({ backupService }) {
  /**
   * GET /api/backup
   */
  async function exportBackup(req, res) {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `streamkit-backup-${dateStr}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      await backupService.exportBackup(res);
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed exporting backup', err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: err.message });
      }
    }
  }

  /**
   * POST /api/restore
   */
  async function restoreBackup(req, res) {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ ok: false, error: 'File backup zip tidak ditemukan pada request' });
    }

    try {
      const result = await backupService.restoreBackup(req.file.path);
      res.json({ ok: true, restoredFiles: result.restoredFiles });
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed restoring backup', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  return {
    exportBackup,
    restoreBackup,
  };
}

module.exports = createBackupController;
