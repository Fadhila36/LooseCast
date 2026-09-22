/**
 * Atomic File Store Utilities
 * Ensures thread/process-safe atomic writes to prevent data corruption during unexpected halts.
 * @module utils/file-store
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const logger = require('./logger');

const MODULE_NAME = 'file-store';

/**
 * Asynchronously read and parse a JSON file with safe fallback.
 * @template T
 * @param {string} filePath - Absolute path to the JSON file
 * @param {T} [defaultValue={}] - Fallback value if reading or parsing fails
 * @returns {Promise<T>} Parsed JSON content or defaultValue
 */
async function readJsonAsync(filePath, defaultValue = {}) {
  if (!filePath || typeof filePath !== 'string') {
    return defaultValue;
  }
  try {
    const raw = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.debug(MODULE_NAME, `Fallback to default value for ${path.basename(filePath)}: ${err.message}`);
    return defaultValue;
  }
}

/**
 * Windows-safe atomic rename with retry and fallback for brief file locks (EPERM/EBUSY).
 * @param {string} tempPath
 * @param {string} filePath
 */
async function safeAtomicRename(tempPath, filePath) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await fsPromises.rename(tempPath, filePath);
      return;
    } catch (err) {
      if ((err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES') && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1)));
        continue;
      }
      if (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES') {
        await fsPromises.copyFile(tempPath, filePath);
        try {
          await fsPromises.unlink(tempPath);
        } catch {}
        return;
      }
      throw err;
    }
  }
}

/**
 * Atomically write data to a JSON file.
 * Writes content to a unique temporary file first, then renames it to the target file.
 * @param {string} filePath - Absolute path to the destination JSON file
 * @param {any} data - JavaScript data structure to serialize
 * @returns {Promise<boolean>} True if write succeeded, false otherwise
 */
async function writeJsonAtomic(filePath, data) {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  const tempPath = `${filePath}.${Date.now()}_${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fsPromises.mkdir(dir, { recursive: true });
    }
    const jsonStr = JSON.stringify(data, null, 2);
    await fsPromises.writeFile(tempPath, jsonStr, 'utf8');
    await safeAtomicRename(tempPath, filePath);
    return true;
  } catch (err) {
    logger.error(MODULE_NAME, `writeJsonAtomic failed for ${filePath}`, err);
    try {
      await fsPromises.unlink(tempPath);
    } catch {}
    return false;
  }
}

/**
 * Asynchronously read raw text from a file with safe fallback.
 * @param {string} filePath - Absolute path to the text file
 * @param {string} [defaultValue=''] - Fallback string if reading fails
 * @returns {Promise<string>} Trimmed file content or defaultValue
 */
async function readTextAsync(filePath, defaultValue = '') {
  if (!filePath || typeof filePath !== 'string') {
    return defaultValue;
  }
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');
    return content.trim();
  } catch (err) {
    logger.debug(MODULE_NAME, `Fallback text for ${path.basename(filePath)}: ${err.message}`);
    return defaultValue;
  }
}

/**
 * Atomically write plain text to a file.
 * @param {string} filePath - Absolute path to the destination file
 * @param {string|number} text - Content to write
 * @returns {Promise<boolean>} True if write succeeded, false otherwise
 */
async function writeTextAtomic(filePath, text) {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  const tempPath = `${filePath}.${Date.now()}_${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fsPromises.mkdir(dir, { recursive: true });
    }
    await fsPromises.writeFile(tempPath, String(text ?? ''), 'utf8');
    await safeAtomicRename(tempPath, filePath);
    return true;
  } catch (err) {
    logger.error(MODULE_NAME, `writeTextAtomic failed for ${filePath}`, err);
    try {
      await fsPromises.unlink(tempPath);
    } catch {}
    return false;
  }
}

module.exports = {
  readJsonAsync,
  writeJsonAtomic,
  readTextAsync,
  writeTextAtomic,
};
