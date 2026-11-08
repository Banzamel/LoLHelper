//! Development switches read from the environment (see README → Development):
//! LOLHELPER_LIVE=1 polls the game without waiting for the client's game phase,
//! LOLHELPER_ROSTER=<file.json> supplies the match roster without a League client.

use serde::Serialize;

use crate::error::Result;

#[derive(Serialize)]
pub struct DevOptions {
    live: bool,
    /// The roster file's JSON text.
    roster: Option<String>,
}

#[tauri::command]
pub fn dev_options() -> Result<DevOptions> {
    let live = std::env::var_os("LOLHELPER_LIVE").is_some();
    let roster = match std::env::var_os("LOLHELPER_ROSTER") {
        Some(file) => Some(std::fs::read_to_string(file)?),
        None => None,
    };
    Ok(DevOptions { live, roster })
}
