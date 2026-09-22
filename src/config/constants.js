/**
 * Application Constants & Configuration Defaults
 * @module config/constants
 */

const SUPPORTED_MEDIA_EXTENSIONS = Object.freeze([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
  '.mov',
  '.mp3',
  '.wav',
  '.ogg',
]);

const DEFAULT_SERVER_PORT = 3000;
const FALLBACK_SERVER_PORT = 3099;
const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

const DEFAULT_DECK_SETTINGS = Object.freeze({
  cols: 4,
  rows: 4,
  hideAll: false,
  hideMobileUI: false,
  showShortcuts: false,
  tabs: [],
  favorites: [],
  counterColors: {},
  shortcuts: {},
  counterShortcuts: {},
  tabShortcuts: {},
});

const DEFAULT_OBS_CONFIG = Object.freeze({
  ip: '127.0.0.1',
  port: 4455,
  password: '',
  autoConnect: true,
});

module.exports = {
  SUPPORTED_MEDIA_EXTENSIONS,
  ALLOWED_MEDIA_EXTENSIONS: SUPPORTED_MEDIA_EXTENSIONS,
  DEFAULT_SERVER_PORT,
  FALLBACK_SERVER_PORT,
  MAX_UPLOAD_SIZE_BYTES,
  DEFAULT_DECK_SETTINGS,
  DEFAULT_OBS_CONFIG,
};
