//! File operations inside the data folders. Writes go to a temporary file first and are then
//! renamed over the target, so a crash never leaves a half-written settings or history file.

use std::path::Path;
use std::time::UNIX_EPOCH;

use crate::error::Result;

pub fn read_text(path: &Path) -> Result<Option<String>> {
    match std::fs::read_to_string(path) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn write_text(path: &Path, text: &str) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("tmp-write");
    std::fs::write(&tmp, text)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

pub fn write_bytes(path: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, bytes)?;
    Ok(())
}

pub fn rename(from: &Path, to: &Path) -> Result<()> {
    if let Some(parent) = to.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::rename(from, to)?;
    Ok(())
}

pub fn list(dir: &Path) -> Result<Vec<String>> {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(e.into()),
    };
    Ok(entries.filter_map(|e| e.ok()).map(|e| e.file_name().to_string_lossy().into_owned()).collect())
}

/// Modification time in ms since the epoch, None when the file does not exist.
pub fn modified_ms(path: &Path) -> Option<f64> {
    let time = std::fs::metadata(path).and_then(|m| m.modified()).ok()?;
    time.duration_since(UNIX_EPOCH).ok().map(|d| d.as_millis() as f64)
}

/// Replaces folder `to` with folder `from` (a freshly built database).
pub fn replace_dir(from: &Path, to: &Path) -> Result<()> {
    if to.exists() {
        std::fs::remove_dir_all(to)?;
    }
    std::fs::rename(from, to)?;
    Ok(())
}

pub fn remove_dir(path: &Path) -> Result<()> {
    match std::fs::remove_dir_all(path) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.into()),
        _ => Ok(()),
    }
}

/// Copies a folder tree, keeping files that already exist at the target.
pub fn copy_missing(from: &Path, to: &Path) -> Result<usize> {
    let mut copied = 0;
    if from.is_dir() {
        std::fs::create_dir_all(to)?;
        for entry in std::fs::read_dir(from)?.filter_map(|e| e.ok()) {
            copied += copy_missing(&entry.path(), &to.join(entry.file_name()))?;
        }
    } else if from.is_file() && !to.exists() {
        if let Some(parent) = to.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::copy(from, to)?;
        copied += 1;
    }
    Ok(copied)
}
