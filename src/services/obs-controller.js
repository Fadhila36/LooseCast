const { OBSWebSocket } = require('obs-websocket-js');
const path = require('path');
const { readJsonAsync, writeJsonAtomic } = require('../utils/file-store');

class OBSController {
  constructor(baseDir, io) {
    this.baseDir = baseDir;
    this.io = io;
    this.configFile = path.join(baseDir, 'obs_config.json');
    this.obs = new OBSWebSocket();
    this.isConnected = false;
    this.currentScene = null;
    this.scenes = [];
    this.reconnectTimer = null;
    this.config = {
      ip: '127.0.0.1',
      port: 4455,
      password: '',
      autoConnect: true,
    };
    this.isConnecting = false;
  }

  async init() {
    const saved = await readJsonAsync(this.configFile, null);
    if (saved && typeof saved === 'object') {
      this.config = { ...this.config, ...saved };
    }
    this._bindEvents();
    if (this.config.autoConnect) {
      this.connect().catch(() => {});
    }
  }

  _bindEvents() {
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.currentScene = data.sceneName;
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
      if (wasConnected && this.io) {
        this.io.emit('obs-status-changed', this.getStatus());
      }
      this._scheduleReconnect();
    });
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (!this.config.autoConnect) return;
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect().catch(() => {});
      }
    }, 5000);
    if (this.reconnectTimer && typeof this.reconnectTimer.unref === 'function') {
      this.reconnectTimer.unref();
    }
  }

  async saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await writeJsonAtomic(this.configFile, this.config);
    return this.config;
  }

  async connect(customConfig = null) {
    if (customConfig) {
      await this.saveConfig(customConfig);
    }
    if (this.isConnecting) return { success: false, message: 'Connection in progress' };

    this.isConnecting = true;
    try {
      if (this.isConnected) {
        await this.obs.disconnect().catch(() => {});
      }

      const url = `ws://${this.config.ip || '127.0.0.1'}:${this.config.port || 4455}`;
      await this.obs.connect(url, this.config.password || undefined, {
        rpcVersion: 1,
      });

      this.isConnected = true;
      await this.refreshScenes();

      if (this.io) {
        this.io.emit('obs-status-changed', this.getStatus());
      }

      return {
        success: true,
        status: this.getStatus(),
      };
    } catch (err) {
      this.isConnected = false;
      this.currentScene = null;
      this.scenes = [];
      if (this.io) {
        this.io.emit('obs-status-changed', this.getStatus());
      }
      this._scheduleReconnect();
      throw new Error(err.message || 'Failed to connect to OBS Studio');
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try {
      await this.obs.disconnect();
    } catch {}
    this.isConnected = false;
    this.currentScene = null;
    this.scenes = [];
    if (this.io) {
      this.io.emit('obs-status-changed', this.getStatus());
    }
    return { success: true };
  }

  async refreshScenes() {
    if (!this.isConnected) return [];
    try {
      const sceneList = await this.obs.call('GetSceneList');
      this.currentScene = sceneList.currentProgramSceneName;
      this.scenes = (sceneList.scenes || []).map((s) => s.sceneName).reverse();
      return this.scenes;
    } catch {
      return [];
    }
  }

  async setScene(sceneName) {
    if (!this.isConnected) {
      throw new Error('OBS is not connected');
    }
    if (!sceneName) {
      throw new Error('Scene name is required');
    }
    await this.obs.call('SetCurrentProgramScene', { sceneName });
    this.currentScene = sceneName;
    if (this.io) {
      this.io.emit('obs-scene-changed', {
        currentScene: this.currentScene,
        scenes: this.scenes,
      });
    }
    return { success: true, currentScene: this.currentScene };
  }

  /**
   * Mengambil daftar item/source dalam scene tertentu (atau active scene jika null)
   */
  async getSceneItems(sceneName = null) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const targetScene = sceneName || this.currentScene;
    if (!targetScene) throw new Error('No active scene');
    const res = await this.obs.call('GetSceneItemList', { sceneName: targetScene });
    const items = (res.sceneItems || []).map((item) => ({
      sceneItemId: item.sceneItemId,
      sourceName: item.sourceName,
      sceneItemEnabled: item.sceneItemEnabled,
      inputKind: item.inputKind || null,
      sceneItemIndex: item.sceneItemIndex,
    }));
    return { sceneName: targetScene, items };
  }

  /**
   * Mengatur visibilitas source di dalam scene
   */
  async setSceneItemEnabled(sceneName, sceneItemId, sceneItemEnabled) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const targetScene = sceneName || this.currentScene;
    const itemId = parseInt(sceneItemId, 10);
    const enabled = Boolean(sceneItemEnabled);
    await this.obs.call('SetSceneItemEnabled', {
      sceneName: targetScene,
      sceneItemId: itemId,
      sceneItemEnabled: enabled,
    });
    if (this.io) {
      this.io.emit('obs-item-state-changed', {
        sceneName: targetScene,
        sceneItemId: itemId,
        sceneItemEnabled: enabled,
      });
    }
    return { success: true, sceneName: targetScene, sceneItemId: itemId, sceneItemEnabled: enabled };
  }

  /**
   * Toggle visibilitas source di dalam scene
   */
  async toggleSceneItem(sceneName, sceneItemId) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const targetScene = sceneName || this.currentScene;
    const itemId = parseInt(sceneItemId, 10);
    const cur = await this.obs.call('GetSceneItemEnabled', {
      sceneName: targetScene,
      sceneItemId: itemId,
    });
    const newEnabled = !cur.sceneItemEnabled;
    return await this.setSceneItemEnabled(targetScene, itemId, newEnabled);
  }

  /**
   * Mengambil daftar input audio beserta status mute-nya
   */
  async getAudioInputs() {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const res = await this.obs.call('GetInputList');
    const inputs = res.inputs || [];
    const detailed = await Promise.all(
      inputs.map(async (inp) => {
        try {
          const muteInfo = await this.obs.call('GetInputMute', { inputName: inp.inputName });
          return {
            inputName: inp.inputName,
            inputKind: inp.inputKind,
            inputMuted: muteInfo.inputMuted,
          };
        } catch {
          return {
            inputName: inp.inputName,
            inputKind: inp.inputKind,
            inputMuted: false,
          };
        }
      })
    );
    return detailed;
  }

  /**
   * Set status mute untuk input audio
   */
  async setInputMute(inputName, inputMuted) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const muted = Boolean(inputMuted);
    await this.obs.call('SetInputMute', { inputName, inputMuted: muted });
    if (this.io) {
      this.io.emit('obs-input-mute-changed', { inputName, inputMuted: muted });
    }
    return { success: true, inputName, inputMuted: muted };
  }

  /**
   * Toggle mute untuk input audio
   */
  async toggleInputMute(inputName) {
    if (!this.isConnected) throw new Error('OBS is not connected');
    const res = await this.obs.call('ToggleInputMute', { inputName });
    if (this.io) {
      this.io.emit('obs-input-mute-changed', { inputName, inputMuted: res.inputMuted });
    }
    return { success: true, inputName, inputMuted: res.inputMuted };
  }

  getStatus() {
    return {
      connected: this.isConnected,
      currentScene: this.currentScene,
      scenes: this.scenes,
      config: {
        ip: this.config.ip,
        port: this.config.port,
        autoConnect: this.config.autoConnect,
        hasPassword: !!this.config.password,
      },
    };
  }
}

module.exports = OBSController;
