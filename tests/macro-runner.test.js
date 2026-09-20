const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const MacroRunner = require('../src/services/macro-runner');

const TEST_DIR = path.resolve(__dirname, 'temp_macro_test');

describe('MacroRunner Unit Tests', () => {
  let runner;
  let emittedEvents = [];
  const mockIo = {
    emit: (event, data) => emittedEvents.push({ event, data }),
  };

  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    runner = new MacroRunner(TEST_DIR, mockIo);
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
    }
  });

  it('harus membuat dan menyimpan macro baru dengan benar', async () => {
    const macro = await runner.saveMacro({
      name: 'Intro Stream',
      icon: '🎬',
      color: '#e11d48',
      steps: [
        { type: 'delay', ms: 100 },
        { type: 'play_media', filename: 'intro.mp4' },
        { type: 'trigger_fx', fx: 'confetti' },
      ],
    });

    assert.ok(macro.id);
    assert.strictEqual(macro.name, 'Intro Stream');
    assert.strictEqual(macro.steps.length, 3);

    const all = await runner.getMacros();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].name, 'Intro Stream');
  });

  it('harus mengeksekusi urutan langkah macro dan memancarkan socket event', async () => {
    emittedEvents = [];
    const mockObs = {
      isConnected: true,
      currentScene: 'Gameplay',
      setScene: async (sc) => ({ currentScene: sc }),
      setSceneItemEnabled: async (sc, id, en) => ({ sceneName: sc, sceneItemId: id, sceneItemEnabled: en }),
      toggleInputMute: async (inp) => ({ inputName: inp, inputMuted: true }),
    };
    const obsRunner = new MacroRunner(TEST_DIR, mockIo, mockObs);

    const testMacro = {
      id: 'macro_test_pro',
      name: 'Pro OBS Macro',
      steps: [
        { type: 'delay', ms: 50 },
        { type: 'obs_scene', sceneName: 'BRB' },
        { type: 'obs_source_visibility', sceneName: 'BRB', sceneItemId: 5, action: 'show' },
        { type: 'obs_audio_mute', inputName: 'Mic/Aux', action: 'toggle' },
        { type: 'play_media', filename: 'intro.mp4' },
        { type: 'trigger_fx', fx: 'confetti' },
        { type: 'panic_stop' },
      ],
    };

    const execResult = await obsRunner.executeMacro(testMacro);

    assert.strictEqual(execResult.success, true);
    assert.strictEqual(execResult.stepsExecuted, 7);

    const hasRunning = emittedEvents.some((e) => e.event === 'macro-running');
    const hasMedia = emittedEvents.some((e) => e.event === 'show-media');
    const hasFx = emittedEvents.some((e) => e.event === 'trigger-fx');
    const hasPanic = emittedEvents.some((e) => e.event === 'panic-stop');
    const hasCompleted = emittedEvents.some((e) => e.event === 'macro-completed');

    assert.ok(hasRunning, 'Event macro-running harus dipancarkan');
    assert.ok(hasMedia, 'Event show-media harus dipancarkan');
    assert.ok(hasFx, 'Event trigger-fx harus dipancarkan');
    assert.ok(hasPanic, 'Event panic-stop harus dipancarkan');
    assert.ok(hasCompleted, 'Event macro-completed harus dipancarkan');
  });

  it('harus menghapus macro dengan benar', async () => {
    const macro = (await runner.getMacros())[0];
    const res = await runner.deleteMacro(macro.id);
    assert.strictEqual(res.success, true);

    const afterDelete = await runner.getMacros();
    assert.strictEqual(afterDelete.length, 0);
  });
});
