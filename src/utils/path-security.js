/**
 * Path Security & Sanitization Utilities
 * Prevents Directory/Path Traversal vulnerabilities (CWE-22) when interacting with the host filesystem.
 * @module utils/path-security
 */

const path = require('path');

/**
 * Sanitizes a filename by removing illegal or dangerous filesystem characters.
 * @param {string} originalName - User-supplied or untrusted filename
 * @returns {string} Sanitized ASCII-safe filename
 */
function sanitizeFilename(originalName) {
  if (!originalName || typeof originalName !== 'string') {
    return '';
  }
  return originalName.replace(/[^a-zA-Z0-9._\-]/g, '_');
}

/**
 * Validates and resolves a requested file path against a trusted base directory.
 * Rejects traversal sequences (e.g., `../`, `..\\`), null bytes, and non-canonical paths.
 * 
 * @param {string} baseDir - Trusted base directory path (e.g. MEDIA_DIR)
 * @param {string} userInputFilename - User-supplied filename or relative path
 * @returns {string|null} Resolved absolute path within baseDir, or null if traversal attempt detected
 */
function resolveSafePath(baseDir, userInputFilename) {
  if (!baseDir || !userInputFilename || typeof userInputFilename !== 'string' || typeof baseDir !== 'string') {
    return null;
  }

  // Reject null-byte injection attempts
  if (userInputFilename.includes('\0')) {
    return null;
  }

  // Safely decode potential percent-encoded URI strings
  let decoded = userInputFilename;
  try {
    decoded = decodeURIComponent(userInputFilename);
  } catch {
    return null;
  }

  // Reject explicit path traversal patterns and directory separators
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return null;
  }

  const baseName = path.basename(decoded);
  if (!baseName || baseName === '.' || baseName === '..') {
    return null;
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, baseName);

  // Enforce that target path is strictly contained within resolvedBase
  if (resolvedTarget.startsWith(resolvedBase + path.sep)) {
    return resolvedTarget;
  }

  return null;
}

module.exports = {
  sanitizeFilename,
  resolveSafePath,
};
