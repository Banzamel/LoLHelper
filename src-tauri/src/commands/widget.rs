//! In-game widget commands; the frontend decides when it shows (OverlayService).

use tauri::{AppHandle, State};

use crate::error::Result;
use crate::window::overlay::{self, Overlay};

#[tauri::command]
pub fn overlay_apply(app: AppHandle, overlay: State<'_, Overlay>, visible: bool, interactive: bool) -> Result<()> {
    overlay.apply(&app, visible, interactive)
}

#[tauri::command]
pub fn overlay_place(app: AppHandle, x: f64, y: f64) -> Result<()> {
    overlay::place(&app, x, y)
}

#[tauri::command]
pub fn overlay_resize(app: AppHandle, height: f64) -> Result<()> {
    overlay::resize(&app, height)
}

#[tauri::command]
pub fn overlay_reload(app: AppHandle) -> Result<()> {
    overlay::reload(&app)
}
