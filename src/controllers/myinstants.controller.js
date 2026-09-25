/**
 * MyInstants Controller (Thin HTTP Transport Layer)
 * Validates HTTP requests, delegates search/download to MyInstantsService, and formats HTTP responses.
 * @module controllers/myinstants.controller
 */

const logger = require('../utils/logger');
const MODULE_NAME = 'myinstants-controller';

/**
 * Creates the MyInstants Controller instance.
 * @param {object} options
 * @param {import('../services/myinstants.service')} options.myInstantsService
 */
function createMyInstantsController({ myInstantsService }) {
  /**
   * GET /api/myinstants/search
   */
  async function searchSounds(req, res) {
    try {
      const query = req.query.q || req.query.name || '';
      const sounds = await myInstantsService.searchSounds(query);
      res.json({ ok: true, data: sounds });
    } catch (err) {
      logger.warn(MODULE_NAME, `Failed searching MyInstants: ${err.message}`);
      res.json({ ok: false, error: err.message || 'Gagal memuat daftar suara dari MyInstants', data: [] });
    }
  }

  /**
   * POST /api/myinstants/download
   */
  async function downloadSound(req, res) {
    try {
      const mp3 = req.body.mp3 || req.body.mp3Url;
      const name = req.body.name || req.body.title;
      if (!mp3 || !name) {
        return res.status(400).json({ ok: false, error: 'URL dan Nama audio wajib diisi' });
      }

      const result = await myInstantsService.downloadSound({ mp3Url: mp3, name });
      res.json({ ok: true, filename: result.filename, name: result.name, label: result.name });
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed downloading sound from MyInstants', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  return {
    searchSounds,
    downloadSound,
  };
}

module.exports = createMyInstantsController;
