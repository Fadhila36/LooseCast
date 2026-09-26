pub mod commands;
pub mod tray;

use std::net::{SocketAddr, TcpStream};
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use sysinfo::System;
use tauri::{Manager, WindowEvent};

fn check_server_ready(port: u16) -> bool {
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    TcpStream::connect_timeout(&addr, Duration::from_millis(60)).is_ok()
}

fn find_active_server_port() -> Option<u16> {
    for port in 3000..=3010 {
        if check_server_ready(port) {
            return Some(port);
        }
    }
    None
}

fn spawn_backend_server() -> Option<std::process::Child> {
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.to_path_buf()));
    let cwd = std::env::current_dir().ok();

    // 1. Locate node runtime binary (bundled sidecar binary or system node)
    let mut node_bin_candidates = Vec::new();
    if let Some(ref dir) = exe_dir {
        node_bin_candidates.push(dir.join("loosecast-server.exe"));
        node_bin_candidates.push(dir.join("loosecast-server-x86_64-pc-windows-msvc.exe"));
        node_bin_candidates.push(dir.join("bin").join("loosecast-server.exe"));
        node_bin_candidates.push(dir.join("bin").join("loosecast-server-x86_64-pc-windows-msvc.exe"));
        node_bin_candidates.push(dir.join("resources").join("loosecast-server.exe"));
        node_bin_candidates.push(dir.join("resources").join("loosecast-server-x86_64-pc-windows-msvc.exe"));
        node_bin_candidates.push(dir.join("resources").join("bin").join("loosecast-server-x86_64-pc-windows-msvc.exe"));
        node_bin_candidates.push(dir.join("_up_").join("loosecast-server.exe"));
        node_bin_candidates.push(dir.join("_up_").join("loosecast-server-x86_64-pc-windows-msvc.exe"));
    }
    if let Some(ref dir) = cwd {
        node_bin_candidates.push(dir.join("loosecast-server.exe"));
        node_bin_candidates.push(dir.join("src-tauri").join("bin").join("loosecast-server-x86_64-pc-windows-msvc.exe"));
        node_bin_candidates.push(dir.join("bin").join("loosecast-server-x86_64-pc-windows-msvc.exe"));
    }

    let mut node_bin = String::from("node");
    for candidate in &node_bin_candidates {
        if candidate.exists() {
            node_bin = candidate.to_string_lossy().to_string();
            break;
        }
    }

    // 2. Locate server.js
    let mut server_script_candidates = Vec::new();
    if let Some(ref dir) = exe_dir {
        server_script_candidates.push(dir.join("_up_").join("server.js"));
        server_script_candidates.push(dir.join("resources").join("_up_").join("server.js"));
        server_script_candidates.push(dir.join("resources").join("server.js"));
        server_script_candidates.push(dir.join("server.js"));
    }
    if let Some(ref dir) = cwd {
        server_script_candidates.push(dir.join("_up_").join("server.js"));
        server_script_candidates.push(dir.join("server.js"));
    }

    for script_path in &server_script_candidates {
        if script_path.exists() {
            let working_dir = script_path.parent().unwrap_or(script_path);
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                if let Ok(child) = Command::new(&node_bin)
                    .arg(script_path)
                    .current_dir(working_dir)
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
                {
                    return Some(child);
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                if let Ok(child) = Command::new(&node_bin)
                    .arg(script_path)
                    .current_dir(working_dir)
                    .spawn()
                {
                    return Some(child);
                }
            }
        }
    }

    None
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
            server_proc: Mutex::new(None),
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

            // Background server check and dynamic port resolution
            let app_bg = app_handle.clone();
            std::thread::spawn(move || {
                let start_time = std::time::Instant::now();
                let min_splash_duration = Duration::from_millis(450);

                // 1. Initial check if server already running
                let mut active_port = find_active_server_port();

                // 2. If no server running, attempt auto-spawn
                if active_port.is_none() {
                    if let Some(child) = spawn_backend_server() {
                        if let Some(state) = app_bg.try_state::<commands::AppState>() {
                            if let Ok(mut proc) = state.server_proc.lock() {
                                *proc = Some(child);
                            }
                        }
                    }
                }

                // 3. Fast polling across ports 3000..=3010 (up to 15 seconds)
                let mut attempts = 0;
                while attempts < 250 {
                    if let Some(port) = find_active_server_port() {
                        active_port = Some(port);
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(60));
                    attempts += 1;
                }

                let elapsed = start_time.elapsed();
                if elapsed < min_splash_duration {
                    std::thread::sleep(min_splash_duration - elapsed);
                }

                if let Some(port) = active_port {
                    if let Some(main_win) = app_bg.get_webview_window("main") {
                        let target_str = format!("http://localhost:{}", port);
                        if let Ok(target_url) = target_str.parse::<tauri::Url>() {
                            let _ = main_win.navigate(target_url);
                        }
                    }
                    std::thread::sleep(Duration::from_millis(150));
                }

                // Reveal main window and dismiss splash
                let _ = commands::ready_to_show(app_bg.clone());
            });

            Ok(())
        })
        .on_window_event(|app, event| {
            if let WindowEvent::Destroyed = event {
                if let Some(state) = app.try_state::<commands::AppState>() {
                    if let Ok(mut proc_lock) = state.server_proc.lock() {
                        if let Some(mut child) = proc_lock.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
