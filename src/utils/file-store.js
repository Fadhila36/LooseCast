const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

/**
 * Membaca file JSON secara asinkron (non-blocking) dengan fallback default value.
 * @param {string} filePath
 * @param {any} defaultValue
 * @returns {Promise<any>}
 */
async function readJsonAsync(filePath, defaultValue = {}) {
  try {
    const raw = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Menulis data JSON ke file secara atomic (tulis ke .tmp terlebih dahulu lalu rename).
 * Mencegah kerusakan / korupsi data jika proses crash di tengah penulisan.
 * 
 * @param {string} filePath
 * @param {any} data
 * @returns {Promise<boolean>}
 */
async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.${Date.now()}_${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fsPromises.mkdir(dir, { recursive: true });
    }
    const jsonStr = JSON.stringify(data, null, 2);
    await fsPromises.writeFile(tempPath, jsonStr, 'utf8');
    await fsPromises.rename(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`[file-store] writeJsonAtomic failed for ${filePath}:`, err.message);
    try {
      await fsPromises.unlink(tempPath);
    } catch {}
    return false;
  }
}

/**
 * Membaca file teks secara asinkron.
 * @param {string} filePath
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
async function readTextAsync(filePath, defaultValue = '') {
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');
    return content.trim();
  } catch {
    return defaultValue;
  }
}

/**
 * Menulis teks ke file secara atomic.
 * @param {string} filePath
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function writeTextAtomic(filePath, text) {
  const tempPath = `${filePath}.${Date.now()}_${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fsPromises.mkdir(dir, { recursive: true });
    }
    await fsPromises.writeFile(tempPath, String(text ?? ''), 'utf8');
    await fsPromises.rename(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`[file-store] writeTextAtomic failed for ${filePath}:`, err.message);
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
