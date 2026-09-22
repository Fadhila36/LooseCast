/**
 * Counters Service
 * Handles Streamer HUD counters (K/D, Win-Loss), persistent metadata, text file I/O, and atomic operations.
 * Decoupled from HTTP transport.
 * @module services/counters.service
 */

const fsPromises = require('fs').promises;
const { sanitizeFilename, resolveSafePath } = require('../utils/path-security');
const { readJsonAsync, writeJsonAtomic, readTextAsync, writeTextAtomic } = require('../utils/file-store');
const logger = require('../utils/logger');

const MODULE_NAME = 'counters-service';

class CountersService {
  /**
   * @param {object} options
   * @param {string} options.counterMetaFile - Path to counters.json
   * @param {string} options.textDir - Path to media/text/ directory for OBS text sources
   * @param {import('socket.io').Server} [options.io] - Socket.IO instance
   */
  constructor({ counterMetaFile, textDir, io = null }) {
    this.counterMetaFile = counterMetaFile;
    this.textDir = textDir;
    this.io = io;
  }

  /**
   * Load counters definitions from disk
   * @returns {Promise<any[]>}
   */
  async loadCounters() {
    return await readJsonAsync(this.counterMetaFile, []);
  }

  /**
   * Save counters definitions to disk
   * @param {any[]} counters
   * @returns {Promise<boolean>}
   */
  async saveCounters(counters) {
    return await writeJsonAtomic(this.counterMetaFile, counters);
  }

  /**
   * Read raw text value of a counter file
   * @param {string} filename
   * @returns {Promise<string>}
   */
  async getCounterValue(filename) {
    const targetPath = resolveSafePath(this.textDir, filename);
    if (!targetPath) return '0';
    return await readTextAsync(targetPath, '0');
  }

  /**
   * Write raw text value of a counter file and broadcast update
   * @param {string} filename
   * @param {string|number} value
   * @returns {Promise<boolean>}
   */
  async setCounterValue(filename, value) {
    const targetPath = resolveSafePath(this.textDir, filename);
    if (!targetPath) return false;
    const strVal = String(value ?? '0');
    const success = await writeTextAtomic(targetPath, strVal);
    if (success && this.io) {
      this.io.emit('counter-updated', { filename, value: strVal });
    }
    return success;
  }

  /**
   * Execute an atomic operation on a counter (+1, -1, reset, set)
   * @param {string} filename - Target counter text file
   * @param {'inc'|'dec'|'reset'|'set'} op - Operation type
   * @param {number|string} [val] - Value for 'set' operation
   * @returns {Promise<{ ok: boolean, filename: string, value: number }>}
   */
  async executeCounterOp(filename, op = 'inc', val = null) {
    const curValStr = await this.getCounterValue(filename);
    let cur = parseInt(curValStr, 10);
    if (isNaN(cur)) cur = 0;

    if (op === 'inc') cur += 1;
    else if (op === 'dec') cur = Math.max(0, cur - 1);
    else if (op === 'reset') cur = 0;
    else if (op === 'set' && val !== null) cur = parseInt(val, 10) || 0;

    await this.setCounterValue(filename, cur);
    return { ok: true, filename, value: cur };
  }

  /**
   * Create a new counter and initialize its file
   * @param {object} params
   * @param {string} params.name
   * @param {string} [params.category]
   * @param {number|string} [params.initialValue]
   * @returns {Promise<object>}
   */
  async createCounter({ name, category = 'custom', initialValue = 0 }) {
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      throw new Error('Nama counter wajib diisi');
    }

    const safeBase = sanitizeFilename(cleanName.toLowerCase().replace(/\s+/g, '_'));
    const filename = `${safeBase || 'counter'}_${Date.now()}.txt`;
    const counters = await this.loadCounters();

    const newCounter = {
      name: cleanName,
      filename,
      category: category || 'custom',
      createdAt: new Date().toISOString(),
    };

    counters.push(newCounter);
    await this.saveCounters(counters);
    await this.setCounterValue(filename, initialValue);

    logger.info(MODULE_NAME, `Created counter "${cleanName}" (${filename})`);
    return newCounter;
  }

  /**
   * Delete counter and remove its text file
   * @param {string} filename
   * @returns {Promise<boolean>}
   */
  async deleteCounter(filename) {
    const targetPath = resolveSafePath(this.textDir, filename);
    if (targetPath) {
      try {
        await fsPromises.unlink(targetPath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }

    const counters = await this.loadCounters();
    const filtered = counters.filter((c) => c.filename !== filename);
    await this.saveCounters(filtered);

    logger.info(MODULE_NAME, `Deleted counter "${filename}"`);
    return true;
  }
}

module.exports = CountersService;
