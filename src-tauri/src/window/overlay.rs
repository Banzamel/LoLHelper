//! The in-game widget window: small, transparent, always on top, never in the taskbar. It never
//! takes focus, so the game keeps the keyboard. While a match runs it lets every click through
//! to the game; in move mode it takes the mouse: the tracker thread drags it and its own
//! controls (the size slider) work. When to show it is decided by the frontend (OverlayService).

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

use crate::error::{Error, Result};
use crate::window::win32;

pub const LABEL: &str = "overlay";
const WIDTH: f64 = 340.0;
const HEIGHT: f64 = 250.0;
const SCALE: std::ops::RangeInclusive<f64> = 0.6..=1.4;

#[derive(Clone, Copy)]
pub struct OverlayState {
    pub visible: bool,
    /// Move mode: the widget takes the mouse and can be dragged.
    pub interactive: bool,
    /// The size chosen by the player: the page zoom, and the window grows with it.
    pub scale: f64,
    /// Unscaled height of the widget's content.
    height: f64,
    /// Unscaled height, from the top, of the part that drags the widget in move mode.
    pub drag_height: f64,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self { visible: false, interactive: false, scale: 1.0, height: HEIGHT, drag_height: HEIGHT }
    }
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

    fn update(&self, change: impl FnOnce(&mut OverlayState)) -> OverlayState {
        match self.state.lock() {
            Ok(mut state) => {
                change(&mut state);
                *state
            }
            Err(_) => OverlayState::default(),
        }
    }

    pub fn apply(&self, app: &AppHandle, visible: bool, interactive: bool) -> Result<()> {
        let window = window(app)?;
        self.update(|s| {
            s.visible = visible;
            s.interactive = interactive;
        });
        window.set_ignore_cursor_events(!interactive)?;
        if visible {
            win32::show_without_focus(&window);
            win32::keep_on_top(&window);
        } else {
            window.hide()?;
        }
        Ok(())
    }

    pub fn resize(&self, app: &AppHandle, height: f64, drag_height: f64) -> Result<()> {
        let state = self.update(|s| {
            s.height = height.clamp(60.0, 460.0);
            s.drag_height = drag_height.max(0.0);
        });
        fit(app, state)
    }

    pub fn set_scale(&self, app: &AppHandle, scale: f64) -> Result<()> {
        let state = self.update(|s| s.scale = scale.clamp(*SCALE.start(), *SCALE.end()));
        window(app)?.set_zoom(state.scale)?;
        fit(app, state)
    }
}

/// The window is exactly as big as the zoomed widget.
fn fit(app: &AppHandle, state: OverlayState) -> Result<()> {
    window(app)?.set_size(LogicalSize::new((WIDTH * state.scale).round(), (state.height * state.scale).round()))?;
    Ok(())
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

pub fn reload(app: &AppHandle) -> Result<()> {
    window(app)?.eval("location.reload()")?;
    Ok(())
}
