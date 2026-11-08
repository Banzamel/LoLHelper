//! File commands for the frontend's Storage and database loader. Paths are relative to the
//! app data folder (or, for `bundled_read_text`, the database shipped with the installer).

use serde::Serialize;
use tauri::State;

use crate::error::Result;
use crate::storage::files;
use crate::storage::paths::DataPaths;

#[derive(Serialize)]
pub struct Folders {
    root: String,
    bundled: String,
}

/// Absolute folders, for asset URLs of the database icons.
#[tauri::command]
pub fn data_folders(paths: State<'_, DataPaths>) -> Folders {
    Folders { root: paths.root.to_string_lossy().into_owned(), bundled: paths.bundled.to_string_lossy().into_owned() }
}

#[tauri::command]
pub fn data_read_text(paths: State<'_, DataPaths>, path: String) -> Result<Option<String>> {
    files::read_text(&paths.data(&path)?)
}

#[tauri::command]
pub fn bundled_read_text(paths: State<'_, DataPaths>, path: String) -> Result<Option<String>> {
    files::read_text(&paths.bundled(&path)?)
}

#[tauri::command]
pub fn data_write_text(paths: State<'_, DataPaths>, path: String, text: String) -> Result<()> {
    files::write_text(&paths.data(&path)?, &text)
}

#[tauri::command]
pub fn data_exists(paths: State<'_, DataPaths>, path: String) -> Result<bool> {
    Ok(paths.data(&path)?.exists())
}

#[tauri::command]
pub fn data_rename(paths: State<'_, DataPaths>, from: String, to: String) -> Result<()> {
    files::rename(&paths.data(&from)?, &paths.data(&to)?)
}

#[tauri::command]
pub fn data_list(paths: State<'_, DataPaths>, path: String) -> Result<Vec<String>> {
    files::list(&paths.data(&path)?)
}

#[tauri::command]
pub fn data_modified(paths: State<'_, DataPaths>, path: String) -> Result<Option<f64>> {
    Ok(files::modified_ms(&paths.data(&path)?))
}

#[tauri::command]
pub fn data_remove_dir(paths: State<'_, DataPaths>, path: String) -> Result<()> {
    files::remove_dir(&paths.data(&path)?)
}

#[tauri::command]
pub fn data_replace_dir(paths: State<'_, DataPaths>, from: String, to: String) -> Result<()> {
    files::replace_dir(&paths.data(&from)?, &paths.data(&to)?)
}
