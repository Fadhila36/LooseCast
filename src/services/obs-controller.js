/**
 * OBS Studio WebSocket v5 Controller Service
 * Provides bidirectional communication, scene switching, audio mute toggling,
 * source visibility control, and exponential backoff auto-reconnect.
 * @module services/obs-controller
 */

const { OBSWebSocket } = require('obs-websocket-js');
const path = require('path');
const { readJsonAsync, writeJsonAtomic } = require('../utils/file-store');
const { DEFAULT_OBS_CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

const MODULE_NAME = 'obs-controller';

class OBSController {
  /**
   * @param {string} baseDir - Base application data directory
   * @param {import('socket.io').Server} [io] - Socket.io server instance for client broadcasts
   */
  constructor(baseDir, io = null) {
    this.baseDir = baseDir;
    this.io = io;
    this.configFile = path.join(baseDir, 'obs_config.json');
    this.obs = new OBSWebSocket();
    this.isConnected = false;
    this.currentScene = null;
    this.scenes = [];
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.config = { ...DEFAULT_OBS_CONFIG };
    this.isConnecting = false;
    this._reconnectScheduledForCycle = false;
  }

  /**
   * Initialize controller and attempt auto-connection if enabled
   * @returns {Promise<void>}
   */
  async init() {
    const saved = await readJsonAsync(this.configFile, null);
    if (saved && typeof saved === 'object') {
      this.config = { ...this.config, ...saved };
    }
    logger.info(MODULE_NAME, `Config loaded: host=${this.config.ip || '127.0.0.1'}, port=${this.config.port || 4455}, autoConnect=${Boolean(this.config.autoConnect)}, hasPassword=${Boolean(this.config.password)}`);
    this._bindEvents();
    if (this.config.autoConnect) {
      this.connect().catch((err) => {
        logger.debug(MODULE_NAME, `Initial auto-connect skipped: ${err.message}`);
      });
    }
  }

  /**
   * Bind WebSocket event listeners from obs-websocket
   * @private
   */
  _bindEvents() {
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.currentScene = data.sceneName;
      logger.info(MODULE_NAME, `Scene changed to: "${this.currentScene}"`);
      if (this.io) {
        this.io.emit('obs-scene-changed', {
          currentScene: this.currentScene,
          scenes: this.scenes,
        });
      }
    });

    this.obs.on('SceneListChanged', async () => {
      await this.refreshScenes();
      if (this.io) {
        this.io.emit('obs-scene-changed', {
          currentScene: this.currentScene,
          scenes: this.scenes,
        });
      }
    });

    this.obs.on('SceneItemEnableStateChanged', (data) => {
      if (this.io) {
        this.io.emit('obs-item-state-changed', {
          sceneName: data.sceneName,
          sceneItemId: data.sceneItemId,
          sceneItemEnabled: data.sceneItemEnabled,
        });
      }
    });

    this.obs.on('InputMuteStateChanged', (data) => {
      if (this.io) {
        this.io.emit('obs-input-mute-changed', {
          inputName: data.inputName,
          inputMuted: data.inputMuted,
        });
      }
    });

    this.obs.on('ConnectionClosed', () => {
      const wasConnected = this.isConnected;
      this.isConnected = false;
      this.currentScene = null;
      this.scenes = [];
      logger.warn(MODULE_NAME, 'OBS WebSocket connection closed');
      if (wasConnected && this.io) {
        this.io.emit('obs-status-changed', this.getStatus());
      }
      if (wasConnected) {
        this._scheduleReconnect();
      }
    });

    this.obs.on('ConnectionError', (err) => {
      this.isConnected = false;
      logger.warn(MODULE_NAME, `OBS WebSocket connection error: ${err.message} (code: ${err.code || 'N/A'})`);
    });

    this.obs.on('error', (err) => {
      logger.debug(MODULE_NAME, `Underlying WebSocket error: ${err.message}`);
    });
  }

  /**
   * Schedules reconnect with exponential backoff
   * @private
   */
  _scheduleReconnect() {
    if (this._reconnectScheduledForCycle) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (!this.config.autoConnect) return;

    this._reconnectScheduledForCycle = true;
    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
    const delay = Math.min(30000, Math.round(2000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 8))));
    logger.info(MODULE_NAME, `Scheduling OBS reconnection attempt #${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this._reconnectScheduledForCycle = false;
      if (!this.isConnected && !this.isConnecting) {
        this.connect().catch(() => {});
      }
    }, delay);

    if (this.reconnectTimer && typeof this.reconnectTimer.unref === 'function') {
      this.reconnectTimer.unref();
    }
  }

  /**
   * Save new OBS configuration to disk
   * @param {Partial<typeof DEFAULT_OBS_CONFIG> & { clearPassword?: boolean }} newConfig
   * @returns {Promise<typeof DEFAULT_OBS_CONFIG>}
   */
  async saveConfig(newConfig) {
    const configToSave = { ...this.config, ...newConfig };
    if (newConfig && newConfig.password === '' && !newConfig.clearPassword && this.config.password) {
      configToSave.password = this.config.password;
    } else if (newConfig && newConfig.clearPassword) {
      configToSave.password = '';
    }
    this.config = configToSave;
    await writeJsonAtomic(this.configFile, this.config);
    return this.config;
  }

  /**
   * Connect to OBS Studio WebSocket Server
   * @param {Partial<typeof DEFAULT_OBS_CONFIG>} [customConfig]
   * @returns {Promise<{ success: boolean, message?: string, currentScene?: string, scenes?: string[] }>}
   */
  async connect(customConfig = null) {
    if (customConfig) {
      await this.saveConfig(customConfig);
    }
    if (this.isConnecting) return { success: false, message: 'Connection in progress' };

    this.isConnecting = true;
    let targetIp = (this.config.ip || '127.0.0.1').trim();
    if (targetIp.toLowerCase() === 'localhost') targetIp = '127.0.0.1';
    const port = parseInt(this.config.port, 10) || 4455;
    const url = `ws://${targetIp}:${port}`;

    logger.info(MODULE_NAME, `Initiating connection to OBS Studio at ${url} (hasAuth: ${Boolean(this.config.password)})`);

    try {
      if (this.isConnected) {
        await this.obs.disconnect().catch(() => {});
      }

      await this.obs.connect(url, this.config.password || undefined, {
        rpcVersion: 1,
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this._reconnectScheduledForCycle = false;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      logger.info(MODULE_NAME, `Successfully connected and identified with OBS Studio WebSocket at ${url}`);

      const sceneList = await this.obs.call('GetSceneList');
      this.scenes = (sceneList.scenes || []).map((s) => s.sceneName).reverse();
      this.currentScene = sceneList.currentProgramSceneName || (this.scenes.length > 0 ? this.scenes[0] : null);

      logger.info(MODULE_NAME, `OBS scenes loaded (${this.scenes.length} scene(s) found). Active scene: "${this.currentScene}"`);

      if (this.io) {
        this.io.emit('obs-status-changed', this.getStatus());
      }

      return {
        success: true,
        currentScene: this.currentScene,
        scenes: this.scenes,
      };
    } catch (err) {
      this.isConnected = false;
      logger.warn(MODULE_NAME, `Failed connecting to OBS Studio at ${url}: ${err.message} (code: ${err.code || 'N/A'})`);
      if (this.io) {
        this.io.emit('obs-status-changed', this.getStatus());
      }
      this._scheduleReconnect();
      return { success: false, message: err.message };
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from OBS Studio
   * @returns {Promise<{ success: boolean }>}
   */
  async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      if (this.isConnected) {
        await this.obs.disconnect();
      }
    } catch {}
    this.isConnected = false;
    this.currentScene = null;
    this.scenes = [];
    if (this.io) {
      this.io.emit('obs-status-changed', this.getStatus());
    }
    return { success: true };
  }

  /**
   * Refreshes the cached scene list from OBS
   * @returns {Promise<string[]>}
   */
  async refreshScenes() {
    if (!this.isConnected) return [];
    try {
      const list = await this.obs.call('GetSceneList');
      this.scenes = (list.scenes || []).map((s) => s.sceneName).reverse();
      this.currentScene = list.currentProgramSceneName || (this.scenes.length > 0 ? this.scenes[0] : null);
      return this.scenes;
    } catch {
      return [];
    }
  }

  /**
   * Switch the current active program scene in OBS
   * @param {string} sceneName - Target scene name
   * @returns {Promise<{ success: boolean, currentScene: string }>}
   */
  async setScene(sceneName) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    await this.obs.call('SetCurrentProgramScene', { sceneName });
    this.currentScene = sceneName;
    return { success: true, currentScene: sceneName };
  }

  /**
   * Retrieve all scene items for a given scene
   * @param {string} [sceneName] - Scene name (defaults to current program scene)
   * @returns {Promise<any[]>}
   */
  async getSceneItems(sceneName = null) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const target = sceneName || this.currentScene;
    if (!target) return [];
    const res = await this.obs.call('GetSceneItemList', { sceneName: target });
    return res.sceneItems || [];
  }

  /**
   * Enable or disable a scene item source
   * @param {string} sceneName - Scene name
   * @param {number} sceneItemId - Scene item ID
   * @param {boolean} enabled - Visibility state
   * @returns {Promise<{ success: boolean, sceneItemEnabled: boolean }>}
   */
  async setSceneItemEnabled(sceneName, sceneItemId, enabled) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    await this.obs.call('SetSceneItemEnabled', {
      sceneName: sceneName || this.currentScene,
      sceneItemId: Number(sceneItemId),
      sceneItemEnabled: Boolean(enabled),
    });
    return { success: true, sceneItemEnabled: Boolean(enabled) };
  }

  /**
   * Toggle visibility of a scene item source
   * @param {string} sceneName - Scene name
   * @param {number} sceneItemId - Scene item ID
   * @returns {Promise<{ success: boolean, sceneItemEnabled: boolean }>}
   */
  async toggleSceneItem(sceneName, sceneItemId) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const targetScene = sceneName || this.currentScene;
    const items = await this.getSceneItems(targetScene);
    const item = items.find((x) => x.sceneItemId === Number(sceneItemId));
    const currentEnabled = item ? item.sceneItemEnabled : false;
    return await this.setSceneItemEnabled(targetScene, sceneItemId, !currentEnabled);
  }

  /**
   * Retrieve all audio inputs and their mute statuses
   * @returns {Promise<Array<{ inputName: string, inputMuted: boolean }>>}
   */
  async getAudioInputs() {
    if (!this.isConnected) throw new Error('OBS is not connected');
    try {
      const inputs = await this.obs.call('GetInputList');
      const results = [];
      for (const inp of inputs.inputs || []) {
        try {
          const muteStatus = await this.obs.call('GetInputMute', { inputName: inp.inputName });
          results.push({
            inputName: inp.inputName,
            inputKind: inp.inputKind,
            inputMuted: muteStatus.inputMuted,
          });
        } catch {}
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Set mute state of a specific audio input
   * @param {string} inputName - Name of audio input
   * @param {boolean} inputMuted - Desired mute state
   * @returns {Promise<{ success: boolean, inputName: string, inputMuted: boolean }>}
   */
  async setInputMute(inputName, inputMuted) {
    if (!this.isConnected) throw new Error('OBS tidak terhubung');
    await this.obs.call('SetInputMute', { inputName, inputMuted: Boolean(inputMuted) });
    return { success: true, inputName, inputMuted: Boolean(inputMuted) };
  }

  /**
   * Toggle mute state of a specific audio input
   * @param {string} inputName - Name of audio input
   * @returns {Promise<{ success: boolean, inputName: string, inputMuted: boolean }>}
   */
  async toggleInputMute(inputName) {
    if (!this.isConnected) throw new Error('OBS tidak terhubung');
    const res = await this.obs.call('ToggleInputMute', { inputName });
    return { success: true, inputName, inputMuted: res.inputMuted };
  }

  /**
   * Retrieve video canvas settings (base resolution and output resolution) from OBS Studio
   * @returns {Promise<{ baseWidth: number, baseHeight: number, outputWidth: number, outputHeight: number, fpsNumerator: number, fpsDenominator: number }>}
   */
  async getVideoSettings() {
    if (!this.isConnected) throw new Error('OBS tidak terhubung');
    try {
      const settings = await this.obs.call('GetVideoSettings');
      return {
        baseWidth: Number(settings.baseWidth),
        baseHeight: Number(settings.baseHeight),
        outputWidth: Number(settings.outputWidth),
        outputHeight: Number(settings.outputHeight),
        fpsNumerator: settings.fpsNumerator,
        fpsDenominator: settings.fpsDenominator,
      };
    } catch (err) {
      throw new Error(`Gagal membaca video settings dari OBS: ${err.message}`);
    }
  }

  /**
   * Retrieve current connection and scene status overview
   * @returns {{ connected: boolean, currentScene: string|null, scenes: string[], config: { ip: string, port: number, autoConnect: boolean, hasPassword: boolean } }}
   */
  getStatus() {
    return {
      connected: this.isConnected,
      currentScene: this.currentScene,
      scenes: this.scenes,
      config: {
        ip: this.config.ip || '127.0.0.1',
        port: parseInt(this.config.port, 10) || 4455,
        autoConnect: this.config.autoConnect !== false,
        hasPassword: Boolean(this.config.password),
      },
    };
  }
}

module.exports = OBSController;
