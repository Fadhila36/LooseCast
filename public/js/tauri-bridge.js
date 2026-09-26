/**
 * LooseCast Tauri Desktop Bridge & Window Manager
 * Provides native desktop capabilities, custom titlebar controls, and system metrics.
 */
(function () {
  const isTauri = Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__);

  async function invokeTauri(cmd, args = {}) {
    try {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        return await window.__TAURI__.core.invoke(cmd, args);
      }
      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        return await window.__TAURI_INTERNALS__.invoke(cmd, args);
      }
    } catch (e) {
      console.warn(`[TauriBridge] invoke ${cmd} error:`, e);
    }
    return null;
  }

  // Window Controls
  const tauriWindow = {
    minimize: () => invokeTauri('minimize_window'),
    toggleMaximize: () => invokeTauri('toggle_maximize_window'),
    close: () => invokeTauri('close_window'),
  };

  const tauriBridge = {
    isTauri: isTauri,
    window: tauriWindow,
    chooseFolder: async () => {
      try {
        if (window.__TAURI__ && window.__TAURI__.dialog) {
          return await window.__TAURI__.dialog.open({ directory: true });
        }
      } catch (e) {
        console.warn('[TauriBridge] chooseFolder fallback:', e);
      }
      return null;
    },
    getConfig: async () => {
      try {
        const res = await fetch('/api/deck-settings');
        return await res.json();
      } catch {
        return {};
      }
    },
    saveConfig: async (cfg) => {
      try {
        await fetch('/api/deck-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg),
        });
        return true;
      } catch {
        return false;
      }
    },
    openTextFolder: async () => {
      await invokeTauri('open_folder', { path: null });
    },
    openAssetsFolder: async () => {
      await invokeTauri('open_folder', { path: null });
    },
    getLocalIP: async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        return data.ip || '127.0.0.1';
      } catch {
        return '127.0.0.1';
      }
    },
    getVersion: async () => {
      try {
        const res = await fetch('/api/version');
        const data = await res.json();
        return data.version || '1.1.0';
      } catch {
        return '1.1.0';
      }
    },
    getSystemMetrics: async () => {
      return await invokeTauri('get_system_metrics');
    },
    sendNotification: async (title, body) => {
      return await invokeTauri('send_desktop_notification', { title, body });
    },
    isAutostartEnabled: async () => {
      return await invokeTauri('is_autostart_enabled');
    },
    setAutostart: async (enable) => {
      return await invokeTauri('set_autostart', { enable });
    },
    copyToClipboard: async (text) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) {
        console.warn('[TauriBridge] clipboard copy fallback:', e);
      }
      return false;
    },
    registerShortcuts: async (shortcuts) => {
      console.log('[TauriBridge] Registering shortcuts:', shortcuts);
    },
    onShortcutTriggered: (callback) => {},
    setShortcutEnabled: (enabled) => {
      console.log('[TauriBridge] Shortcut enabled state:', enabled);
    },
    onShortcutStateChanged: (cb) => {},
    checkForUpdates: async () => {
      return { updateAvailable: false };
    },
  };

  // Expose global bridge
  window.tauriDesktop = tauriBridge;
  window.looseCastElectron = window.looseCastElectron || tauriBridge;
  window.streamKitElectron = window.streamKitElectron || tauriBridge;
  window.kskElectron = window.kskElectron || tauriBridge;

  // Setup desktop features when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Prevent default web context menu unless on input/textarea
    document.addEventListener('contextmenu', (e) => {
      const tag = e.target.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target.isContentEditable) {
        e.preventDefault();
      }
    });

    // 2. Add Tauri desktop class to body for custom CSS enhancements
    if (isTauri) {
      document.body.classList.add('is-desktop-app');
    }

    // 3. Periodic memory/metrics updater for desktop status bar
    if (isTauri) {
      const updateMetrics = async () => {
        const stats = await invokeTauri('get_system_metrics');
        const memEl = document.getElementById('status-mem-usage');
        if (memEl && stats && stats.used_memory_mb) {
          memEl.textContent = `RAM: ${stats.used_memory_mb} MB`;
        }
      };
      updateMetrics();
      setInterval(updateMetrics, 5000);
    }
  });
})();
