use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_i = MenuItem::with_id(app, "show_main", "Buka LooseCast", true, None::<&str>)?;
    let assets_i = MenuItem::with_id(app, "open_assets", "Buka Folder Assets", true, None::<&str>)?;
    let config_i = MenuItem::with_id(app, "open_config", "Buka Folder Config", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Keluar", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_i,
            &assets_i,
            &config_i,
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
            "open_assets" => {
                let _ = crate::commands::open_folder(None);
            }
            "open_config" => {
                if let Some(appdata) = std::env::var_os("APPDATA") {
                    let p = std::path::PathBuf::from(appdata).join("LooseCast");
                    let _ = crate::commands::open_folder(Some(p.to_string_lossy().to_string()));
                }
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
