//! Start-up: data folders (with the one-time copy of the Electron app's data), managed state,
//! the asset scope for database icons and the widget window. Closing the main window ends
//! the app, widget included.

use tauri::{App, Manager, Window, WindowEvent};

use crate::error::Result;
use crate::lcu::connection::LcuConnection;
use crate::lcu::live::LiveClient;
use crate::storage::migrate::migrate_electron_data;
use crate::storage::paths::DataPaths;
use crate::window::overlay::{self, Overlay};
use crate::window::tracker;

pub fn setup(app: &mut App) -> Result<()> {
    let handle = app.handle().clone();
    let paths = DataPaths::new(&handle)?;
    // A development data folder gets no migration unless LOLHELPER_MIGRATE_FROM names a folder
    // that holds a "LoL Helper" folder of the Electron app (to try the migration on a copy).
    let roaming = match (std::env::var_os("LOLHELPER_MIGRATE_FROM"), std::env::var_os("LOLHELPER_USERDATA")) {
        (Some(dir), _) => Some(std::path::PathBuf::from(dir)),
        (None, None) => Some(handle.path().data_dir()?),
        (None, Some(_)) => None,
    };
    if let Some(roaming) = roaming {
        match migrate_electron_data(&roaming, &paths.root) {
            Ok(0) => {}
            Ok(n) => eprintln!("[migrate] copied {n} files from the Electron app"),
            Err(e) => eprintln!("[migrate] {e}"),
        }
    }
    // Database icons are shown straight from disk through the asset protocol.
    let scope = handle.asset_protocol_scope();
    scope.allow_directory(paths.root.join("data"), true)?;
    scope.allow_directory(&paths.bundled, true)?;
    app.manage(paths);
    app.manage(LcuConnection::new()?);
    app.manage(LiveClient::new()?);
    app.manage(Overlay::default());
    overlay::create(&handle)?;
    tracker::spawn(handle);
    Ok(())
}

pub fn on_window_event(window: &Window, event: &WindowEvent) {
    if window.label() == "main" && matches!(event, WindowEvent::Destroyed) {
        window.app_handle().exit(0);
    }
}
