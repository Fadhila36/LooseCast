/**
 * Counters Controller (Thin HTTP Transport Layer)
 * Validates HTTP requests, delegates domain operations to CountersService, and formats HTTP responses.
 * @module controllers/counters.controller
 */

const logger = require('../utils/logger');
const MODULE_NAME = 'counters-controller';

/**
 * Creates the Counters Controller instance.
 * @param {object} options
 * @param {import('../services/counters.service')} options.countersService
 */
function createCountersController({ countersService }) {
  /**
   * GET /api/counters
   */
  async function listCounters(req, res) {
    try {
      const counters = await countersService.loadCounters();
      res.json(counters);
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed listing counters', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * POST /api/counters
   */
  async function createCounter(req, res) {
    try {
      const { name, category, initialValue } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ ok: false, error: 'Nama counter wajib diisi' });
      }

      const newCounter = await countersService.createCounter({ name, category, initialValue });
      res.json({ ok: true, counter: newCounter });
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed creating counter', err);
      res.status(400).json({ ok: false, error: err.message });
    }
  }

  /**
   * DELETE /api/counters/:filename
   */
  async function deleteCounter(req, res) {
    try {
      const filename = req.params.filename;
      await countersService.deleteCounter(filename);
      res.json({ ok: true });
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed deleting counter', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * GET /api/counters/:filename/value
   */
  async function getCounterValueHandler(req, res) {
    try {
      const filename = req.params.filename;
      const value = await countersService.getCounterValue(filename);
      res.json({ value });
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed getting counter value', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * POST /api/counters/:filename/value
   */
  async function setCounterValueHandler(req, res) {
    try {
      const filename = req.params.filename;
      const { value } = req.body;
      const success = await countersService.setCounterValue(filename, value);
      res.json({ ok: success });
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed setting counter value', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  /**
   * POST /api/counters/:filename/op
   */
  async function executeCounterOpHandler(req, res) {
    try {
      const filename = req.params.filename;
      const { op, value } = req.body;
      const result = await countersService.executeCounterOp(filename, op, value);
      res.json(result);
    } catch (err) {
      logger.error(MODULE_NAME, 'Failed executing counter operation', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  return {
    listCounters,
    createCounter,
    deleteCounter,
    getCounterValueHandler,
    setCounterValueHandler,
    executeCounterOpHandler,
  };
}

module.exports = createCountersController;
