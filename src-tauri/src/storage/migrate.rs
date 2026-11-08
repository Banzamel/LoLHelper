//! First start after the switch from Electron (up to 0.12.x): the Electron app kept its data in
//! %APPDATA%\LoL Helper (settings.json, history.json, profiles\<puuid>\…, data\ = a downloaded
//! database). It is copied once into the Tauri data folder; the old folder stays untouched, so
//! nothing is lost even if the copy is interrupted (it is simply retried next start).

use std::path::Path;

use crate::error::Result;
use crate::storage::files::{copy_missing, write_text};

const MARKER: &str = "migrated-from-electron.json";
const ELECTRON_FOLDER: &str = "LoL Helper";
/// What the Electron app wrote itself; the rest of its folder is Chromium's profile.
const ENTRIES: [&str; 4] = ["settings.json", "history.json", "profiles", "data"];

/// roaming: %APPDATA%; root: the Tauri data folder. Returns the number of files copied.
pub fn migrate_electron_data(roaming: &Path, root: &Path) -> Result<usize> {
    let marker = root.join(MARKER);
    let old = roaming.join(ELECTRON_FOLDER);
    let has_data = old.join("settings.json").exists() || old.join("profiles").exists();
    if marker.exists() || !has_data {
        return Ok(0);
    }
    let mut copied = 0;
    for entry in ENTRIES {
        copied += copy_missing(&old.join(entry), &root.join(entry))?;
    }
    let note = serde_json::json!({ "from": old.to_string_lossy(), "files": copied });
    write_text(&marker, &note.to_string())?;
    Ok(copied)
}
