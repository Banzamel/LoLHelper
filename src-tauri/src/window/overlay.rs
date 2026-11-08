//! The in-game widget window: small, transparent, always on top, never in the taskbar. While
//! a match runs it lets every click through to the game and never takes focus; in move mode
//! it can be dragged. When to show it is decided by the frontend (OverlayService).

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

use crate::error::{Error, Result};
use crate::window::win32;

pub const LABEL: &str = "overlay";
const WIDTH: f64 = 340.0;
const HEIGHT: f64 = 250.0;

#[derive(Clone, Copy, Default)]
pub struct OverlayState {
    pub visible: bool,
    /// Move mode: the widget takes the mouse and can be dragged.
    pub interactive: bool,
}

#[derive(Default)]
pub struct Overlay {
    state: Mutex<OverlayState>,
}

#[derive(Clone, Serialize)]
struct Position {
    x: f64,
    y: f64,
}

impl Overlay {
    pub fn state(&self) -> OverlayState {
        self.state.lock().map(|s| *s).unwrap_or_default()
    }

    pub fn apply(&self, app: &AppHandle, visible: bool, interactive: bool) -> Result<()> {
        let window = window(app)?;
        if let Ok(mut state) = self.state.lock() {
            *state = OverlayState { visible, interactive };
        }
        window.set_ignore_cursor_events(!interactive)?;
        window.set_focusable(interactive)?;
        if visible {
            win32::show_without_focus(&window);
            win32::keep_on_top(&window);
        } else {
            window.hide()?;
        }
        Ok(())
    }
}

pub fn window(app: &AppHandle) -> Result<WebviewWindow> {
    app.get_webview_window(LABEL).ok_or_else(|| Error::Other("overlay window missing".into()))
}

/// Created hidden at start-up, at the right edge of the primary screen's work area; the
/// frontend moves it to the saved place.
pub fn create(app: &AppHandle, webview_data: &std::path::Path) -> Result<()> {
    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("overlay.html".into()))
        .title("LoL Helper — widget")
        .inner_size(WIDTH, HEIGHT)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .resizable(false)
        .minimizable(false)
        .maximizable(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .focused(false)
        .focusable(false)
        .visible(false)
        .data_directory(webview_data.to_path_buf())
        .build()?;
    if let Some(monitor) = window.primary_monitor()? {
        let scale = monitor.scale_factor();
        let area = monitor.work_area();
        let (x, y) = (area.position.x as f64 / scale, area.position.y as f64 / scale);
        let (w, h) = (area.size.width as f64 / scale, area.size.height as f64 / scale);
        window.set_position(LogicalPosition::new(x + w - WIDTH - 24.0, y + (h * 0.32).round()))?;
    }
    window.set_ignore_cursor_events(true)?;
    let events = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Moved(pos) = event {
            let scale = window_scale(&events);
            let logical = pos.to_logical::<f64>(scale);
            let _ = events.emit_to("main", "overlay://moved", Position { x: logical.x, y: logical.y });
        }
    });
    Ok(())
}

fn window_scale(app: &AppHandle) -> f64 {
    window(app).and_then(|w| Ok(w.scale_factor()?)).unwrap_or(1.0)
}

pub fn place(app: &AppHandle, x: f64, y: f64) -> Result<()> {
    window(app)?.set_position(LogicalPosition::new(x, y))?;
    Ok(())
}

pub fn resize(app: &AppHandle, height: f64) -> Result<()> {
    window(app)?.set_size(LogicalSize::new(WIDTH, height.clamp(60.0, 420.0).round()))?;
    Ok(())
}

pub fn reload(app: &AppHandle) -> Result<()> {
    window(app)?.eval("location.reload()")?;
    Ok(())
}
