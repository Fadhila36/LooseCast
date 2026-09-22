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
   * Perform HTTP GET and return text body
   * @private
   * @param {string} url
   * @param {number} [maxRedirects=3]
   * @returns {Promise<string>}
   */
  fetchHtml(url, maxRedirects = 3) {
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

      if (!isTrustedMyInstantsHost(parsedUrl.hostname) || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
        return reject(new Error(`Domain tidak diizinkan: ${parsedUrl.hostname}`));
      }

      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, url).toString();
            return this.fetchHtml(nextUrl, maxRedirects - 1).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`Gagal memuat halaman: HTTP ${res.statusCode}`));
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Koneksi timeout saat menghubungi MyInstants'));
      });
      req.on('error', reject);
    });
  }

  /**
   * Search trending or specific sounds on MyInstants
   * @param {string} [query='']
   * @returns {Promise<Array<{ name: string, mp3: string }>>}
   */
  async searchSounds(query = '') {
    const cleanQuery = String(query || '').trim();
    const url = cleanQuery
      ? `https://www.myinstants.com/en/search/?name=${encodeURIComponent(cleanQuery)}`
      : 'https://www.myinstants.com/en/index/us/';

    const html = await this.fetchHtml(url);
    const sounds = [];
    const regex = /play\('([^']+)'[^>]*class="instant-link[^"]*">([^<]+)<\/a>/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const mp3Rel = match[1];
      const soundName = match[2].trim();
      const mp3Url = mp3Rel.startsWith('http') ? mp3Rel : `https://www.myinstants.com${mp3Rel}`;

      sounds.push({
        name: soundName,
        mp3: mp3Url,
      });
    }

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

      fileStream.on('error', (err) => {
        fs.unlink(targetPath, () => {});
        reject(err);
      });

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
            fileStream.close();
            fs.unlink(targetPath, () => {});
            return reject(new Error(`Gagal mengunduh audio: HTTP ${response.statusCode}`));
          }
          response.pipe(fileStream);
          fileStream.on('finish', () => fileStream.close(resolve));
        }
      );

      req.on('timeout', () => {
        req.destroy();
        fileStream.close();
        fs.unlink(targetPath, () => {});
        reject(new Error('Koneksi unduhan audio timeout'));
      });

      req.on('error', (err) => {
        fileStream.close();
        fs.unlink(targetPath, () => {});
        reject(err);
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
