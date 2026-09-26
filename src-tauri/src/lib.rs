pub mod commands;
pub mod tray;

use std::net::{SocketAddr, TcpStream};
use std::sync::Mutex;
use std::time::Duration;
use sysinfo::System;
use tauri::{Manager, WindowEvent};

fn check_server_ready(port: u16) -> bool {
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED
                        | tauri_plugin_window_state::StateFlags::FULLSCREEN,
                )
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(commands::AppState {
            sys: Mutex::new(System::new_all()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_user_data_path,
            commands::open_folder,
            commands::ready_to_show,
            commands::get_system_metrics,
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::send_desktop_notification,
            commands::is_autostart_enabled,
            commands::set_autostart
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Enforce splash screen first: keep main window hidden
            if let Some(main_win) = app.get_webview_window("main") {
                let _ = main_win.hide();
            }
            if let Some(splash_win) = app.get_webview_window("splash") {
                let _ = splash_win.show();
                let _ = splash_win.set_focus();
            }

            // Setup tray icon
            if let Err(e) = tray::setup_tray(&app_handle) {
                eprintln!("[Tauri] Gagal inisialisasi system tray: {}", e);
            }

            // Window close event (minimize to tray)
            if let Some(main_win) = app.get_webview_window("main") {
                let main_clone = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_clone.hide();
                    }
                });
            }

            // Background server check thread with smooth minimum duration for splash animation
            let app_bg = app_handle.clone();
            std::thread::spawn(move || {
                let start_time = std::time::Instant::now();
                let min_splash_duration = Duration::from_millis(2000);
                let mut attempts = 0;
                while attempts < 100 {
                    if check_server_ready(3000) {
                        let elapsed = start_time.elapsed();
                        if elapsed < min_splash_duration {
                            std::thread::sleep(min_splash_duration - elapsed);
                        }
                        let _ = commands::ready_to_show(app_bg.clone());
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(200));
                    attempts += 1;
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
