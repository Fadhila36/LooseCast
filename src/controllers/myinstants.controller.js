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
      const query = req.query.name || '';
      const sounds = await myInstantsService.searchSounds(query);
      res.json(sounds);
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed searching MyInstants', err);
      res.status(500).json({ ok: false, error: 'Gagal memuat daftar suara dari MyInstants' });
    }
  }

  /**
   * POST /api/myinstants/download
   */
  async function downloadSound(req, res) {
    try {
      const { mp3, name } = req.body;
      if (!mp3 || !name) {
        return res.status(400).json({ ok: false, error: 'URL dan Nama audio wajib diisi' });
      }

      const result = await myInstantsService.downloadSound({ mp3Url: mp3, name });
      res.json({ ok: true, filename: result.filename, name: result.name });
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
