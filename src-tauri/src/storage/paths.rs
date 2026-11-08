//! The two folders the app may touch: its data folder (settings, history, downloaded database,
//! the WebView2 profile) and the database bundled with the installer (read only). Both live in
//! the install folder — nothing goes to %APPDATA% or %LOCALAPPDATA%. Every path the frontend
//! sends is relative to one of them and may not leave it.

use std::path::{Component, Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::error::{Error, Result};

pub struct DataPaths {
    /// <install dir>\data (or LOLHELPER_USERDATA in development).
    pub root: PathBuf,
    /// <install dir>\database, the database snapshot shipped with the installer.
    pub bundled: PathBuf,
}

impl DataPaths {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let root = match std::env::var_os("LOLHELPER_USERDATA") {
            Some(dir) => PathBuf::from(dir),
            None => install_dir()?.join("data"),
        };
        let bundled = app.path().resource_dir()?.join("database");
        ensure_writable(&root)?;
        Ok(Self { root, bundled })
    }

    pub fn data(&self, rel: &str) -> Result<PathBuf> {
        join_relative(&self.root, rel)
    }

    pub fn bundled(&self, rel: &str) -> Result<PathBuf> {
        join_relative(&self.bundled, rel)
    }

    /// The WebView2 profile (cache, local storage) of both windows.
    pub fn webview(&self) -> PathBuf {
        self.root.join("webview")
    }
}

fn install_dir() -> Result<PathBuf> {
    let exe = std::env::current_exe()?;
    exe.parent().map(Path::to_path_buf).ok_or_else(|| Error::Path(exe.to_string_lossy().into_owned()))
}

/// The folder exists and a file can be written there; the error names the folder.
fn ensure_writable(dir: &Path) -> Result<()> {
    let probe = dir.join(".write-test");
    let result = std::fs::create_dir_all(dir).and_then(|_| std::fs::write(&probe, b"ok")).and_then(|_| std::fs::remove_file(&probe));
    result.map_err(|e| Error::Other(format!("{}: {e}", dir.to_string_lossy())))
}

/// `base` joined with `rel` when `rel` holds only plain names ("profiles/abc/settings.json");
/// "..", absolute paths and drive prefixes are refused.
pub fn join_relative(base: &Path, rel: &str) -> Result<PathBuf> {
    let rel_path = Path::new(rel);
    let plain = rel_path.components().all(|c| matches!(c, Component::Normal(_) | Component::CurDir));
    if !plain {
        return Err(Error::Path(rel.to_string()));
    }
    Ok(base.join(rel_path))
}
