use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_i = MenuItem::with_id(app, "show_main", "Buka LooseCast", true, None::<&str>)?;
    let browser_i = MenuItem::with_id(app, "open_browser", "Buka di Browser", true, None::<&str>)?;
    let reload_i = MenuItem::with_id(app, "reload_studio", "Muat Ulang Studio", true, None::<&str>)?;
    let assets_i = MenuItem::with_id(app, "open_assets", "Buka Folder Assets", true, None::<&str>)?;
    let config_i = MenuItem::with_id(app, "open_config", "Buka Folder Config", true, None::<&str>)?;
    let logs_i = MenuItem::with_id(app, "open_logs", "Buka Log Aplikasi", true, None::<&str>)?;
    let updates_i = MenuItem::with_id(app, "check_updates", "Periksa Pembaruan...", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Keluar", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_i,
            &browser_i,
            &reload_i,
            &tauri::menu::PredefinedMenuItem::separator(app)?,
            &assets_i,
            &config_i,
            &logs_i,
            &tauri::menu::PredefinedMenuItem::separator(app)?,
            &updates_i,
            &tauri::menu::PredefinedMenuItem::separator(app)?,
            &quit_i,
        ],
    )?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("LooseCast - Stream Kit")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_main" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
            "open_browser" => {
                let _ = tauri_plugin_opener::open_url("http://localhost:3000", None::<&str>);
            }
            "reload_studio" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval("window.location.reload();");
                }
            }
            "open_assets" => {
                let _ = crate::commands::open_folder(None);
            }
            "open_config" => {
                if let Some(appdata) = std::env::var_os("APPDATA") {
                    let p = std::path::PathBuf::from(appdata).join("LooseCast");
                    let _ = crate::commands::open_folder(Some(p.to_string_lossy().to_string()));
                }
            }
            "open_logs" => {
                let log_candidates = [
                    std::env::var_os("APPDATA").map(|a| std::path::PathBuf::from(a).join("LooseCast").join("app.log")),
                    std::env::var_os("LOCALAPPDATA").map(|a| std::path::PathBuf::from(a).join("LooseCast").join("app.log")),
                    std::env::current_dir().ok().map(|d| d.join("app.log")),
                ];
                let mut opened = false;
                for cand in log_candidates.into_iter().flatten() {
                    if cand.exists() {
                        let _ = tauri_plugin_opener::open_path(&cand, None::<&str>);
                        opened = true;
                        break;
                    }
                }
                if !opened {
                    if let Some(appdata) = std::env::var_os("APPDATA") {
                        let p = std::path::PathBuf::from(appdata).join("LooseCast");
                        let _ = crate::commands::open_folder(Some(p.to_string_lossy().to_string()));
                    }
                }
            }
            "check_updates" => {
                let _ = tauri_plugin_opener::open_url("https://github.com/Fadhila36/LooseCast/releases/latest", None::<&str>);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        let _ = win.show();
                        let _ = win.unminimize();
                        let _ = win.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
