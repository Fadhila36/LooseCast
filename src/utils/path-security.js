const path = require('path');

/**
 * Membersihkan nama file dari karakter berbahaya dan mengembalikan nama file yang aman.
 * @param {string} originalName
 * @returns {string}
 */
function sanitizeFilename(originalName) {
  if (!originalName || typeof originalName !== 'string') return '';
  return originalName.replace(/[^a-zA-Z0-9._\-]/g, '_');
}

/**
 * Memvalidasi apakah nama file yang diminta tetap berada di dalam direktori dasar (Mencegah Path Traversal).
 * Menolak traversal seperti `../`, `..\\`, null bytes, atau karakter traversal ter-encode.
 * 
 * @param {string} baseDir Direktori root yang sah (misal MEDIA_DIR)
 * @param {string} userInputFilename Nama file input dari user/request
 * @returns {string|null} Path absolut yang valid atau null jika traversal terdeteksi
 */
function resolveSafePath(baseDir, userInputFilename) {
  if (!baseDir || !userInputFilename || typeof userInputFilename !== 'string') {
    return null;
  }

  // Cek null byte injection
  if (userInputFilename.includes('\0')) {
    return null;
  }

  // Decode URI jika URL encoded
  let decoded = userInputFilename;
  try {
    decoded = decodeURIComponent(userInputFilename);
  } catch {
    return null;
  }

  // Jika mengandung pola path traversal `..` atau separator path, tolak traversal
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return null;
  }

  const baseName = path.basename(decoded);
  if (!baseName || baseName === '.' || baseName === '..') {
    return null;
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, baseName);

  // Pastikan target berada di bawah resolvedBase
  if (resolvedTarget.startsWith(resolvedBase + path.sep)) {
    return resolvedTarget;
  }

  return null;
}

module.exports = {
  sanitizeFilename,
  resolveSafePath,
};
