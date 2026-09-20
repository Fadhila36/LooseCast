const path = require('path');
const { readJsonAsync, writeJsonAtomic } = require('../utils/file-store');

/**
 * Multi-Action Macro Runner Service
 * Handles sequential/delayed execution of multi-step stream automation.
 */
class MacroRunner {
  constructor(baseDir, io = null, obsController = null, counterHandler = null) {
    this.baseDir = baseDir;
    this.io = io;
    this.obsController = obsController;
    this.counterHandler = counterHandler;
    this.macroFile = path.join(baseDir, 'macros.json');
    this.macros = [];
  }

  async init() {
    this.macros = await readJsonAsync(this.macroFile, []);
    return this.macros;
  }

  async getMacros() {
    this.macros = await readJsonAsync(this.macroFile, []);
    return this.macros;
  }

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
    return macroObj;
  }

  async deleteMacro(id) {
    await this.getMacros();
    this.macros = this.macros.filter((m) => m.id !== id);
    await writeJsonAtomic(this.macroFile, this.macros);
    if (this.io) {
      this.io.emit('macros-updated', this.macros);
    }
    return { success: true, id };
  }

  /**
   * Execute a macro step-by-step
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

    for (let i = 0; i < (macro.steps || []).length; i++) {
      const step = macro.steps[i];
      try {
        const res = await this._executeStep(step);
        results.push({ step: i, type: step.type, success: true, result: res });
      } catch (err) {
        results.push({ step: i, type: step?.type, success: false, error: err.message });
      }
    }

    if (this.io) {
      this.io.emit('macro-completed', { id: macro.id, name: macro.name, results });
    }

    return {
      success: true,
      macroId: macro.id,
      name: macro.name,
      stepsExecuted: results.length,
      results,
    };
  }

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
        return { skipped: true, reason: 'OBS not connected or missing scene/sceneItemId' };
      }

      case 'obs_audio_mute': {
        if (this.obsController && this.obsController.isConnected) {
          const inputName = step.inputName || step.sourceName || step.value;
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
        return { skipped: true, reason: 'OBS not connected or missing inputName' };
      }

      case 'play_media': {
        if (this.io) {
          const filename = step.filename || step.value;
          const metaFile = path.join(this.baseDir, 'meta.json');
          const metaAll = await readJsonAsync(metaFile, {});
          const itemMeta = metaAll[filename] || {};
          const payload = {
            filename,
            duration: 5,
            ...itemMeta,
            ...(step.volume !== undefined ? { volume: step.volume } : {}),
            ...(step.duration !== undefined ? { duration: step.duration } : {}),
            ...(step.inAnim ? { animIn: step.inAnim } : {}),
            ...(step.outAnim ? { animOut: step.outAnim } : {}),
          };
          this.io.emit('show-media', payload);
          return { played: payload.filename };
        }
        return { skipped: true, reason: 'Socket.IO not attached' };
      }

      case 'trigger_fx': {
        if (this.io) {
          const fxType = step.fx || step.value || 'confetti';
          this.io.emit('trigger-fx', {
            type: fxType,
            fx: fxType,
            intensity: step.intensity || 1,
            duration: step.duration || 1200,
          });
          return { fx: fxType };
        }
        return { skipped: true, reason: 'Socket.IO not attached' };
      }

      case 'counter_op': {
        const filename = step.filename || step.value;
        const op = step.op || 'inc';
        if (this.counterHandler && filename) {
          return await this.counterHandler(filename, op);
        }
        return { skipped: true, reason: 'Counter handler not configured' };
      }

      case 'panic_stop': {
        if (this.io) {
          this.io.emit('panic-stop');
          return { stopped: true };
        }
        return { skipped: true };
      }

      default:
        return { unknownStep: step.type };
    }
  }
}

module.exports = MacroRunner;
