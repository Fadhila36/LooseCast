/**
 * Structured Logger Module
 * Provides unified, formatted log outputs across services and controllers.
 * @module utils/logger
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

/**
 * Format timestamp to ISO string
 * @returns {string}
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Logger utility
 */
const logger = {
  /**
   * Log an informational message.
   * @param {string} moduleName - Name of the calling module or component
   * @param {string} message - Informational message
   * @param {any} [meta] - Optional extra metadata
   */
  info(moduleName, message, meta) {
    const metaStr = meta !== undefined ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
    console.log(`[${getTimestamp()}] [${LOG_LEVELS.INFO}] [${moduleName}] ${message}${metaStr}`);
  },

  /**
   * Log a warning message.
   * @param {string} moduleName - Name of the calling module or component
   * @param {string} message - Warning message
   * @param {any} [meta] - Optional extra metadata
   */
  warn(moduleName, message, meta) {
    const metaStr = meta !== undefined ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
    console.warn(`[${getTimestamp()}] [${LOG_LEVELS.WARN}] [${moduleName}] ${message}${metaStr}`);
  },

  /**
   * Log an error message.
   * @param {string} moduleName - Name of the calling module or component
   * @param {string} message - Error description
   * @param {Error|any} [error] - Optional Error object or metadata
   */
  error(moduleName, message, error) {
    const errDetails = error instanceof Error ? ` | ${error.stack || error.message}` : (error ? ` | ${JSON.stringify(error)}` : '');
    console.error(`[${getTimestamp()}] [${LOG_LEVELS.ERROR}] [${moduleName}] ${message}${errDetails}`);
  },

  /**
   * Log a debug message (only active if DEBUG env is set).
   * @param {string} moduleName - Name of the calling module or component
   * @param {string} message - Debug details
   * @param {any} [meta] - Optional extra metadata
   */
  debug(moduleName, message, meta) {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      const metaStr = meta !== undefined ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
      console.debug(`[${getTimestamp()}] [${LOG_LEVELS.DEBUG}] [${moduleName}] ${message}${metaStr}`);
    }
  },
};

module.exports = logger;
