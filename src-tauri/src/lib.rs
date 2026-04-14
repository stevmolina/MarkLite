mod commands;

use commands::{read_file, save_file, get_file_info, list_directory_files, save_image};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[derive(Clone, serde::Serialize)]
struct StartupFileOpenPayload {
    path: String,
    zen_mode: bool,
}

struct StartupPayloadState(Mutex<Option<StartupFileOpenPayload>>);

#[tauri::command]
fn take_startup_file_open_payload(
    startup_payload: State<'_, StartupPayloadState>,
) -> Option<StartupFileOpenPayload> {
    startup_payload.0.lock().unwrap().take()
}

fn resolve_cli_file_path(path: &str) -> Option<String> {
    if !(path.ends_with(".md") || path.ends_with(".markdown")) {
        return None;
    }

    let file_path = PathBuf::from(path);
    let resolved_path = if file_path.is_absolute() {
        file_path
    } else {
        let mut candidates = Vec::new();

        if let Ok(pwd) = std::env::var("PWD") {
            candidates.push(PathBuf::from(pwd).join(&file_path));
        }

        if let Ok(current_dir) = std::env::current_dir() {
            candidates.push(current_dir.join(&file_path));
        }

        candidates
            .into_iter()
            .find(|candidate| candidate.exists())
            .unwrap_or(file_path)
    };

    resolved_path
        .canonicalize()
        .ok()
        .or(Some(resolved_path))
        .map(|path| path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Get CLI arguments early
    let args: Vec<String> = std::env::args().collect();
    let startup_payload = args
        .get(1)
        .and_then(|file_path| resolve_cli_file_path(file_path))
        .map(|path| StartupFileOpenPayload {
            path,
            zen_mode: true,
        });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(StartupPayloadState(Mutex::new(startup_payload)))
        .invoke_handler(tauri::generate_handler![
            read_file,
            save_file,
            get_file_info,
            list_directory_files,
            save_image,
            take_startup_file_open_payload
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
