//! First start after the switch from Electron (up to 0.12.x): the Electron app kept its data in
//! %APPDATA%\LoL Helper (settings.json, history.json, profiles\<puuid>\…, data\ = a downloaded
//! database, plus Chromium's caches). What the app wrote is copied into the data folder, the copy
//! is checked file by file, and only then the old folder is deleted, so nothing stays in AppData.
//! An interrupted run leaves the old folder in place and is simply repeated next start.

use std::path::Path;

use crate::error::{Error, Result};
use crate::storage::files::{copy_missing, write_text};

const MARKER: &str = "migrated-from-electron.json";
const ELECTRON_FOLDER: &str = "LoL Helper";
/// What the Electron app wrote itself; the rest of its folder is Chromium's profile.
const ENTRIES: [&str; 4] = ["settings.json", "history.json", "profiles", "data"];

/// Every file under `from` exists under `to` (copy_missing keeps a file already there, e.g.
/// settings the new app saved before an interrupted migration finished).
fn same_files(from: &Path, to: &Path) -> bool {
    if from.is_dir() {
        return std::fs::read_dir(from).map(|entries| entries.filter_map(|e| e.ok()).all(|e| same_files(&e.path(), &to.join(e.file_name())))).unwrap_or(false);
    }
    !from.exists() || to.is_file()
}

/// roaming: the folder holding the Electron app's "LoL Helper" folder (%APPDATA%); root: the
/// data folder. Returns the number of files copied.
pub fn migrate_electron_data(roaming: &Path, root: &Path) -> Result<usize> {
    let old = roaming.join(ELECTRON_FOLDER);
    if !old.exists() {
        return Ok(0);
    }
    let mut copied = 0;
    if !root.join(MARKER).exists() {
        for entry in ENTRIES {
            copied += copy_missing(&old.join(entry), &root.join(entry))?;
        }
        let complete = ENTRIES.iter().all(|e| same_files(&old.join(e), &root.join(e)));
        if !complete {
            return Err(Error::Other(format!("copy of {} incomplete, kept", old.to_string_lossy())));
        }
        let note = serde_json::json!({ "from": old.to_string_lossy(), "files": copied });
        write_text(&root.join(MARKER), &note.to_string())?;
    }
    // Copied and checked (now or on an earlier start): the old folder goes, caches included.
    std::fs::remove_dir_all(&old)?;
    Ok(copied)
}
