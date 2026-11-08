//! The two folders the app may touch: its data folder (settings, history, downloaded database)
//! and the database bundled with the installer (read only). Every path the frontend sends is
//! relative to one of them and may not leave it.

use std::path::{Component, Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::error::{Error, Result};

pub struct DataPaths {
    /// %APPDATA%\pl.banzamel.lolhelper (or LOLHELPER_USERDATA in development).
    pub root: PathBuf,
    /// <install dir>\data, the database snapshot shipped with the installer.
    pub bundled: PathBuf,
}

impl DataPaths {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let root = match std::env::var_os("LOLHELPER_USERDATA") {
            Some(dir) => PathBuf::from(dir),
            None => app.path().app_data_dir()?,
        };
        let bundled = app.path().resource_dir()?.join("data");
        std::fs::create_dir_all(&root)?;
        Ok(Self { root, bundled })
    }

    pub fn data(&self, rel: &str) -> Result<PathBuf> {
        join_relative(&self.root, rel)
    }

    pub fn bundled(&self, rel: &str) -> Result<PathBuf> {
        join_relative(&self.bundled, rel)
    }
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
