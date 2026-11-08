//! League client and game commands: the LCU connection, its REST API and the live game data.

use serde_json::Value;
use tauri::{AppHandle, State};

use crate::error::Result;
use crate::lcu::connection::{LcuConnection, Status};
use crate::lcu::live::LiveClient;

/// Starts looking for the client (once); league_dir is the folder set in Settings.
#[tauri::command]
pub fn lcu_start(app: AppHandle, lcu: State<'_, LcuConnection>, league_dir: String) -> Result<()> {
    lcu.start(app, league_dir)
}

#[tauri::command]
pub fn lcu_status(lcu: State<'_, LcuConnection>) -> Result<Status> {
    lcu.status()
}

#[tauri::command]
pub async fn lcu_request(lcu: State<'_, LcuConnection>, method: String, path: String, body: Option<Value>) -> Result<Value> {
    lcu.request(&method, &path, body).await
}

#[tauri::command]
pub async fn live_game_data(live: State<'_, LiveClient>) -> Result<Option<Value>> {
    Ok(live.game_data().await)
}
