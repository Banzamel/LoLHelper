//! Start-up: the data folder in the install folder (with the one-time move of the Electron app's
//! data out of %APPDATA%), managed state, the asset scope for database icons and both windows.
//! Closing the main window ends the app, widget included.

use tauri::{App, AppHandle, Manager, Window, WindowEvent};

use crate::error::Result;
use crate::lcu::connection::LcuConnection;
use crate::lcu::live::LiveClient;
use crate::storage::migrate::migrate_electron_data;
use crate::storage::paths::DataPaths;
use crate::window::overlay::{self, Overlay};
use crate::window::{fatal, main_window, tracker};

pub fn setup(app: &mut App) -> Result<()> {
    let handle = app.handle().clone();
    let paths = match DataPaths::new(&handle) {
        Ok(paths) => paths,
        Err(e) => {
            fatal::show(&format!(
                "LoL Helper keeps its data next to the program, but cannot write there:\n{e}\n\n\
                 Reinstall it into a folder you can write to, e.g. C:\\Riot Games\\LoL Helper."
            ));
            std::process::exit(1);
        }
    };
    migrate(&handle, &paths);
    // Database icons are shown straight from disk through the asset protocol.
    let scope = handle.asset_protocol_scope();
    scope.allow_directory(paths.root.join("data"), true)?;
    scope.allow_directory(&paths.bundled, true)?;
    let webview = paths.webview();
    app.manage(paths);
    app.manage(LcuConnection::new()?);
    app.manage(LiveClient::new()?);
    app.manage(Overlay::default());
    main_window::create(&handle, &webview)?;
    overlay::create(&handle, &webview)?;
    tracker::spawn(handle);
    Ok(())
}

// A development data folder gets no migration unless LOLHELPER_MIGRATE_FROM names a folder that
// holds a "LoL Helper" folder of the Electron app (to try the migration on a copy).
fn migrate(handle: &AppHandle, paths: &DataPaths) {
    let roaming = match (std::env::var_os("LOLHELPER_MIGRATE_FROM"), std::env::var_os("LOLHELPER_USERDATA")) {
        (Some(dir), _) => Some(std::path::PathBuf::from(dir)),
        (None, None) => handle.path().data_dir().ok(),
        (None, Some(_)) => None,
    };
    let Some(roaming) = roaming else { return };
    match migrate_electron_data(&roaming, &paths.root) {
        Ok(0) => {}
        Ok(n) => eprintln!("[migrate] copied {n} files from the Electron app"),
        Err(e) => eprintln!("[migrate] {e}"),
    }
}

pub fn on_window_event(window: &Window, event: &WindowEvent) {
    if window.label() == main_window::LABEL && matches!(event, WindowEvent::Destroyed) {
        window.app_handle().exit(0);
    }
}
