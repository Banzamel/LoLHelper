//! LoL Helper's native side. The app logic and UI run in the webview (src/); Rust does what
//! the webview cannot: the League client connection with its self-signed certificate, the
//! in-game widget window, Windows calls, and file access limited to the app's data folders.

mod commands;
mod error;
mod lcu;
mod setup;
mod storage;
mod window;

use commands::{client, dev, downloads, files, widget};

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| Ok(setup::setup(app)?))
        .on_window_event(setup::on_window_event)
        .invoke_handler(tauri::generate_handler![
            client::lcu_start, client::lcu_status, client::lcu_request, client::live_game_data,
            files::data_folders, files::data_read_text, files::bundled_read_text, files::data_write_text, files::data_exists,
            files::data_rename, files::data_list, files::data_modified, files::data_remove_dir, files::data_replace_dir,
            downloads::download_files, widget::overlay_apply, widget::overlay_place, widget::overlay_resize, widget::overlay_reload,
            dev::dev_options,
        ])
        .build(tauri::generate_context!());
    match app {
        Ok(app) => app.run(|_, _| {}),
        Err(e) => eprintln!("LoL Helper failed to start: {e}"),
    }
}
