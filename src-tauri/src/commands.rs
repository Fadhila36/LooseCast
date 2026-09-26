use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;
use sysinfo::System;
use tauri::{AppHandle, Manager, State};
use std::sync::Mutex;

#[derive(Serialize)]
pub struct SystemStats {
    pub total_memory_mb: u64,
    pub used_memory_mb: u64,
    pub free_memory_mb: u64,
    pub cpu_usage_percent: f32,
    pub cpu_cores: usize,
}

pub struct AppState {
    pub sys: Mutex<System>,
    pub server_proc: Mutex<Option<std::process::Child>>,
}

#[tauri::command]
pub fn get_user_data_path() -> String {
    if let Some(appdata) = std::env::var_os("APPDATA") {
        let p = PathBuf::from(appdata).join("LooseCast");
        if !p.exists() {
            let _ = std::fs::create_dir_all(&p);
        }
        return p.to_string_lossy().to_string();
    }
    std::env::current_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
pub fn open_folder(path: Option<String>) -> Result<(), String> {
    let target = match path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => {
            if let Some(appdata) = std::env::var_os("APPDATA") {
                PathBuf::from(appdata).join("LooseCast").join("assets")
            } else {
                PathBuf::from("assets")
            }
        }
    };

    if !target.exists() {
        let _ = std::fs::create_dir_all(&target);
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn ready_to_show(app: AppHandle) -> Result<(), String> {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
    if let Some(splash_win) = app.get_webview_window("splash") {
        let _ = splash_win.close();
    }
    Ok(())
}

#[tauri::command]
pub fn minimize_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        win.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_maximize_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_maximized().unwrap_or(false) {
            win.unmaximize().map_err(|e| e.to_string())?;
        } else {
            win.maximize().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn close_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_system_metrics(state: State<'_, AppState>) -> Result<SystemStats, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    sys.refresh_memory();
    sys.refresh_cpu_all();

    let total_memory = sys.total_memory() / (1024 * 1024);
    let used_memory = sys.used_memory() / (1024 * 1024);
    let free_memory = total_memory.saturating_sub(used_memory);
    let cpu_usage = sys.global_cpu_usage();
    let cpu_cores = sys.cpus().len();

    Ok(SystemStats {
        total_memory_mb: total_memory,
        used_memory_mb: used_memory,
        free_memory_mb: free_memory,
        cpu_usage_percent: cpu_usage,
        cpu_cores,
    })
}

#[tauri::command]
pub fn send_desktop_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enable: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    let autolaunch = app.autolaunch();
    if enable {
        autolaunch.enable().map_err(|e| e.to_string())?;
    } else {
        autolaunch.disable().map_err(|e| e.to_string())?;
    }
    autolaunch.is_enabled().map_err(|e| e.to_string())
}
