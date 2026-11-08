//! The one error type of the commands. It crosses the IPC boundary as its message, so the
//! frontend gets a readable string (shown in toasts like "Export failed: …").

use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Http(#[from] reqwest::Error),
    #[error("{0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Tauri(#[from] tauri::Error),
    /// A path outside the app's data folders, or not a plain relative path.
    #[error("path not allowed: {0}")]
    Path(String),
    /// The League client is not running or refused the request.
    #[error("{0}")]
    Lcu(String),
    #[error("{0}")]
    Other(String),
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
