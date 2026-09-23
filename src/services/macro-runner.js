/**
 * Multi-Action Macro Runner Service
 * Handles sequential, asynchronous execution of multi-step stream automation.
 * @module services/macro-runner
 */

const path = require('path');
const { readJsonAsync, writeJsonAtomic } = require('../utils/file-store');
const logger = require('../utils/logger');

const MODULE_NAME = 'macro-runner';

class MacroRunner {
  /**
   * @param {string} baseDir - Application data directory
   * @param {import('socket.io').Server} [io] - Socket.io server instance for client broadcasts
   * @param {import('./obs-controller')} [obsController] - Active OBS controller instance
   * @param {any} [counterHandler] - Counter handler reference
   */
  constructor(baseDir, io = null, obsController = null, counterHandler = null) {
    this.baseDir = baseDir;
    this.io = io;
    this.obsController = obsController;
    this.counterHandler = counterHandler;
    this.macroFile = path.join(baseDir, 'macros.json');
    this.macros = [];
  }

  /**
   * Load stored macros from disk
   * @returns {Promise<any[]>}
   */
  async init() {
    this.macros = await readJsonAsync(this.macroFile, []);
    return this.macros;
  }

  /**
   * Fetch all currently saved macros
   * @returns {Promise<any[]>}
   */
  async getMacros() {
    this.macros = await readJsonAsync(this.macroFile, []);
    return this.macros;
  }

  /**
   * Save or update a macro definition
   * @param {object} macroData - Macro configuration object
   * @returns {Promise<object>} Created/updated macro
   */
  async saveMacro(macroData) {
    if (!macroData || typeof macroData !== 'object') {
      throw new Error('Data macro tidak valid');
    }
    const name = String(macroData.name || '').trim();
    if (!name) throw new Error('Nama macro wajib diisi');

    const id = macroData.id || `macro_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const steps = Array.isArray(macroData.steps) ? macroData.steps : [];
    const icon = macroData.icon || '⚡';
    const color = macroData.color || '#38bdf8';
    const tab = macroData.tab || 'all';

    const macroObj = {
      id,
      name,
      icon,
      color,
      tab,
      steps,
      updatedAt: new Date().toISOString(),
    };

    await this.getMacros();
    const existingIdx = this.macros.findIndex((m) => m.id === id);
    if (existingIdx >= 0) {
      this.macros[existingIdx] = macroObj;
    } else {
      this.macros.push(macroObj);
    }

    await writeJsonAtomic(this.macroFile, this.macros);
    if (this.io) {
      this.io.emit('macros-updated', this.macros);
    }
    logger.info(MODULE_NAME, `Macro saved: "${name}" (${id})`);
    return macroObj;
  }

  /**
   * Delete a macro by ID
   * @param {string} id - Macro identifier
   * @returns {Promise<{ success: boolean, id: string }>}
   */
  async deleteMacro(id) {
    await this.getMacros();
    this.macros = this.macros.filter((m) => m.id !== id);
    await writeJsonAtomic(this.macroFile, this.macros);
    if (this.io) {
      this.io.emit('macros-updated', this.macros);
    }
    logger.info(MODULE_NAME, `Macro deleted: ${id}`);
    return { success: true, id };
  }

  /**
   * Execute a macro sequentially step-by-step
   * @param {string|object} idOrMacro - Macro ID or direct Macro object
   * @returns {Promise<{ success: boolean, macroId: string, name: string, stepsExecuted: number, results: any[] }>}
   */
  async executeMacro(idOrMacro) {
    let macro = null;
    if (typeof idOrMacro === 'string') {
      await this.getMacros();
      macro = this.macros.find((m) => m.id === idOrMacro);
      if (!macro) throw new Error(`Macro dengan ID '${idOrMacro}' tidak ditemukan`);
    } else if (idOrMacro && typeof idOrMacro === 'object') {
      macro = idOrMacro;
    }

    if (!macro) throw new Error('Macro tidak valid');

    const results = [];
    if (this.io) {
      this.io.emit('macro-running', { id: macro.id, name: macro.name });
    }

    logger.info(MODULE_NAME, `Executing macro: "${macro.name}" (${macro.id}) with ${(macro.steps || []).length} steps`);

    for (let i = 0; i < (macro.steps || []).length; i++) {
      const step = macro.steps[i];
      try {
        const res = await this._executeStep(step);
        const isSkipped = Boolean(res && (res.skipped === true || res.unknown === true));
        results.push({
          step: i,
          type: step.type,
          success: !isSkipped,
          result: res,
          error: isSkipped ? (res.reason || `Step type '${step.type}' tidak didukung atau dilewati`) : undefined,
        });
      } catch (err) {
        logger.warn(MODULE_NAME, `Step ${i} (${step?.type}) error: ${err.message}`);
        results.push({ step: i, type: step?.type, success: false, error: err.message });
      }
    }

    const hasErrors = results.some((r) => !r.success);

    if (this.io) {
      this.io.emit('macro-completed', { id: macro.id, name: macro.name, success: !hasErrors, results });
    }

    return {
      success: !hasErrors,
      macroId: macro.id,
      name: macro.name,
      stepsExecuted: results.length,
      results,
    };
  }

  /**
   * Execute a single step within a macro sequence
   * @private
   * @param {object} step - Macro step configuration
   * @returns {Promise<any>}
   */
  async _executeStep(step) {
    if (!step || !step.type) return;

    switch (step.type) {
      case 'delay': {
        const ms = Math.min(Math.max(parseInt(step.ms, 10) || 500, 50), 30000);
        await new Promise((resolve) => setTimeout(resolve, ms));
        return { delayMs: ms };
      }

      case 'obs_scene': {
        if (this.obsController && this.obsController.isConnected) {
          const sceneName = step.sceneName || step.value;
          if (sceneName) {
            return await this.obsController.setScene(sceneName);
          }
        }
        return { skipped: true, reason: 'OBS not connected or sceneName missing' };
      }

      case 'obs_source_toggle':
      case 'obs_source_visibility': {
        if (this.obsController && this.obsController.isConnected) {
          const sceneName = step.sceneName || this.obsController.currentScene;
          const itemId = step.sceneItemId !== undefined ? step.sceneItemId : step.itemId;
          if (sceneName && itemId !== undefined) {
            if (step.action === 'show' || step.enabled === true) {
              return await this.obsController.setSceneItemEnabled(sceneName, itemId, true);
            } else if (step.action === 'hide' || step.enabled === false) {
              return await this.obsController.setSceneItemEnabled(sceneName, itemId, false);
            } else {
              return await this.obsController.toggleSceneItem(sceneName, itemId);
            }
          }
        }
        return { skipped: true, reason: 'OBS not connected or source item missing' };
      }

      case 'obs_audio_mute': {
        if (this.obsController && this.obsController.isConnected) {
          const inputName = step.inputName || step.name;
          if (inputName) {
            if (step.action === 'mute' || step.muted === true) {
              return await this.obsController.setInputMute(inputName, true);
            } else if (step.action === 'unmute' || step.muted === false) {
              return await this.obsController.setInputMute(inputName, false);
            } else {
              return await this.obsController.toggleInputMute(inputName);
            }
          }
        }
        return { skipped: true, reason: 'OBS not connected or audio input missing' };
      }

      case 'play_media': {
        if (this.io && step.filename) {
          const meta = await readJsonAsync(path.join(this.baseDir, 'meta.json'), {});
          const itemSettings = meta[step.filename] || {};
          const payload = {
            filename: step.filename,
            ...itemSettings,
            queueMode: Boolean(step.queueMode),
          };
          this.io.emit('show-media', payload);
          return { emitted: 'show-media', filename: step.filename };
        }
        return { skipped: true, reason: 'Socket not available or filename missing' };
      }

      case 'trigger_fx': {
        if (this.io) {
          const fxType = step.fx || step.value || 'confetti';
          this.io.emit('trigger-fx', { fx: fxType, duration: step.duration || 3000 });
          return { emitted: 'trigger-fx', fx: fxType };
        }
        return { skipped: true, reason: 'Socket not available' };
      }

      case 'counter_op': {
        if (this.counterHandler && step.filename) {
          return await this.counterHandler(step.filename, step.op || 'inc', step.value);
        }
        return { skipped: true, reason: 'Counter handler unavailable' };
      }

      case 'panic_stop': {
        if (this.io) {
          this.io.emit('panic-stop');
          return { emitted: 'panic-stop' };
        }
        return { skipped: true };
      }

      default:
        return { unknown: true, type: step.type, reason: `Step type '${step.type}' tidak dikenal` };
    }
  }
}

module.exports = MacroRunner;
