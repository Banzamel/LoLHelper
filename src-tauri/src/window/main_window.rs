//! The main window, created here rather than in tauri.conf.json so its WebView2 profile lives in
//! the app's data folder instead of %LOCALAPPDATA%. Frameless; shown by the frontend once the
//! first frame is rendered.

use std::path::Path;

use tauri::window::Color;
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

use crate::error::Result;

pub const LABEL: &str = "main";

pub fn create(app: &AppHandle, webview_data: &Path) -> Result<()> {
    WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html".into()))
        .title("LoL Helper")
        .inner_size(1360.0, 860.0)
        .min_inner_size(1100.0, 700.0)
        .decorations(false)
        .visible(false)
        .center()
        .background_color(Color(1, 10, 19, 255))
        .data_directory(webview_data.to_path_buf())
        .build()?;
    Ok(())
}
