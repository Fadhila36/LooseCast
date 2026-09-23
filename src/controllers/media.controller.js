/**
 * Media Controller (Thin HTTP Transport Layer)
 * Validates HTTP requests, delegates media operations to MediaService, and formats HTTP responses.
 * @module controllers/media.controller
 */

const logger = require('../utils/logger');
const MODULE_NAME = 'media-controller';

/**
 * Creates the Media Controller instance.
 * @param {object} options
 * @param {import('../services/media.service')} options.mediaService
 */
function createMediaController({ mediaService }) {
  /**
   * GET /api/media
   */
  async function listMedia(req, res) {
    try {
      const media = await mediaService.listMedia();
      res.json(media);
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed listing media', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * GET /api/media/:filename/settings
   */
  async function getMediaSettings(req, res) {
    try {
      const filename = req.params.filename;
      const settings = await mediaService.getMediaSettings(filename);
      res.json(settings);
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed getting media settings', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * POST /api/media/:filename/settings
   */
  async function updateMediaSettings(req, res) {
    try {
      const filename = req.params.filename;
      const updated = await mediaService.updateMediaSettings(filename, req.body || {});
      res.json(updated);
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed updating media settings', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * DELETE /api/media/:filename
   */
  async function deleteMedia(req, res) {
    try {
      const filename = req.params.filename;
      await mediaService.deleteMedia(filename);
      res.json({ ok: true });
    } catch (err) {
      const status = err.message.includes('unsafe') || err.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  }

  /**
   * POST /upload
   */
  function handleUpload(req, res) {
    const uploaded = (req.files || []).map((f) => f.filename);
    logger.info(MODULE_NAME, `Uploaded ${uploaded.length} file(s)`);
    if (typeof mediaService.notifyMediaUploaded === 'function') {
      mediaService.notifyMediaUploaded(uploaded);
    }
    res.json({ ok: true, files: uploaded });
  }

  /**
   * GET /api/thumb/:filename
   */
  async function getThumbnail(req, res) {
    try {
      const filename = req.params.filename;
      const thumbPath = await mediaService.getThumbnailPath(filename);
      res.sendFile(thumbPath);
    } catch (err) {
      if (err.message === 'Media not found') {
        return res.status(404).send('Media not found');
      }
      if (err.message === 'ffmpeg not available') {
        return res.status(404).send('ffmpeg not available');
      }
      res.status(500).send(err.message);
    }
  }

  /**
   * POST /trigger
   */
  async function triggerMeme(req, res) {
    try {
      await mediaService.triggerMedia(req.body);
      res.json({ ok: true });
    } catch (err) {
      const status = err.message.includes('required') ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  }

  return {
    listMedia,
    getMediaSettings,
    updateMediaSettings,
    deleteMedia,
    handleUpload,
    getThumbnail,
    triggerMeme,
  };
}

module.exports = createMediaController;
