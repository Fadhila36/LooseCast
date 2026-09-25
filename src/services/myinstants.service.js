/**
 * MyInstants Service
 * Handles scraping/querying meme sounds from MyInstants and downloading them to the local media library.
 * Decoupled from HTTP transport.
 * @module services/myinstants.service
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { sanitizeFilename, resolveSafePath } = require('../utils/path-security');
const logger = require('../utils/logger');

const MODULE_NAME = 'myinstants-service';

/**
 * Strict domain & subdomain whitelist validator for MyInstants
 * @param {string} hostname
 * @returns {boolean}
 */
function isTrustedMyInstantsHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const host = hostname.toLowerCase();
  return host === 'myinstants.com' || host.endsWith('.myinstants.com');
}

/**
 * Strict domain validator for MyInstants API
 * @param {string} hostname
 * @returns {boolean}
 */
function isTrustedApiHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const host = hostname.toLowerCase();
  return host === 'myinstants-api.vercel.app';
}

class MyInstantsService {
  /**
   * @param {object} options
   * @param {string} options.mediaDir - Target media assets directory
   * @param {import('./media.service')} [options.mediaService] - Media service for metadata registration
   */
  constructor({ mediaDir, mediaService = null }) {
    this.mediaDir = mediaDir;
    this.mediaService = mediaService;
  }

  /**
   * Perform HTTP GET and return parsed JSON body
   * @private
   * @param {string} url
   * @param {number} [maxRedirects=3]
   * @returns {Promise<any>}
   */
  fetchJson(url, maxRedirects = 3) {
    if (maxRedirects < 0) {
      return Promise.reject(new Error('Terlalu banyak redirect dari server'));
    }

    return new Promise((resolve, reject) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch {
        return reject(new Error('Format URL tidak valid'));
      }

      if (!isTrustedApiHost(parsedUrl.hostname) || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
        return reject(new Error(`Domain API tidak diizinkan: ${parsedUrl.hostname}`));
      }

      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Tomatosuki-StreamKit/2.0',
            'Accept': 'application/json',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, url).toString();
            return this.fetchJson(nextUrl, maxRedirects - 1).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`Gagal memuat data MyInstants: HTTP ${res.statusCode}`));
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (err) {
              reject(new Error('Format respons JSON dari MyInstants API tidak valid'));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Koneksi timeout saat menghubungi MyInstants API'));
      });
      req.on('error', reject);
    });
  }

  /**
   * Search trending or specific sounds on MyInstants via REST API
   * @param {string} [query='']
   * @returns {Promise<Array<{ name: string, title: string, mp3: string }>>}
   */
  async searchSounds(query = '') {
    const cleanQuery = String(query || '').trim();
    const url = cleanQuery
      ? `https://myinstants-api.vercel.app/search?q=${encodeURIComponent(cleanQuery)}`
      : 'https://myinstants-api.vercel.app/trending?q=id';

    const result = await this.fetchJson(url);
    const rawList = Array.isArray(result?.data) ? result.data : [];

    const sounds = rawList.map((item) => {
      let mp3Url = item.mp3 || '';
      if (mp3Url.startsWith('//')) {
        mp3Url = `https:${mp3Url}`;
      } else if (mp3Url.startsWith('/')) {
        mp3Url = `https://www.myinstants.com${mp3Url}`;
      }
      const title = item.title || item.name || 'Untitled Sound';
      return {
        name: title,
        title: title,
        mp3: mp3Url,
      };
    });

    logger.debug(MODULE_NAME, `Found ${sounds.length} sounds on MyInstants for query: "${cleanQuery}"`);
    return sounds;
  }

  /**
   * Download audio file from MyInstants directly into local assets directory
   * @param {object} params
   * @param {string} params.mp3Url - Direct MP3 download URL
   * @param {string} params.name - Sound title
   * @returns {Promise<{ filename: string, name: string }>}
   */
  async downloadSound({ mp3Url, name }) {
    if (!mp3Url || !name) {
      throw new Error('URL dan Nama audio wajib diisi');
    }

    let parsedMp3;
    try {
      parsedMp3 = new URL(mp3Url);
    } catch {
      throw new Error('Format URL audio tidak valid');
    }

    if (!isTrustedMyInstantsHost(parsedMp3.hostname) || (parsedMp3.protocol !== 'http:' && parsedMp3.protocol !== 'https:')) {
      throw new Error(`Domain download tidak diizinkan: ${parsedMp3.hostname}`);
    }

    const safeBase = sanitizeFilename(name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim());
    const filename = `${safeBase || 'instant'}_${Date.now()}.mp3`;
    const targetPath = resolveSafePath(this.mediaDir, filename);

    if (!targetPath) {
      throw new Error('Target path tidak aman');
    }

    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(targetPath);
      const client = mp3Url.startsWith('https') ? https : http;
      let isCleanedUp = false;

      const cleanupAndReject = (err) => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        try { fileStream.destroy(); } catch {}
        fs.unlink(targetPath, () => {});
        reject(err);
      };

      fileStream.on('error', cleanupAndReject);

      const req = client.get(
        mp3Url,
        {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (response) => {
          if (response.statusCode !== 200) {
            return cleanupAndReject(new Error(`Gagal mengunduh audio: HTTP ${response.statusCode}`));
          }
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close(() => resolve());
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        cleanupAndReject(new Error('Koneksi unduhan audio timeout'));
      });

      req.on('error', (err) => {
        cleanupAndReject(err);
      });
    });

    if (this.mediaService) {
      await this.mediaService.updateMediaSettings(filename, { name, category: 'sound effect' });
    }

    logger.info(MODULE_NAME, `Downloaded MyInstants sound "${name}" as ${filename}`);
    return { filename, name };
  }
}

module.exports = MyInstantsService;
module.exports.isTrustedMyInstantsHost = isTrustedMyInstantsHost;
module.exports.isTrustedApiHost = isTrustedApiHost;
