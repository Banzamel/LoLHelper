//! A background thread for the visible widget. A borderless game can take the top of the
//! z-order back, so the widget re-asserts it every KEEP_ON_TOP. While clicks pass through, the
//! widget receives no mouse events at all, so the cursor position is sent to it instead and it
//! shows the item name under the cursor itself.

use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::window::overlay::{self, Overlay};
use crate::window::win32;

const TICK: Duration = Duration::from_millis(50);
const KEEP_ON_TOP_TICKS: u32 = 30;

#[derive(Clone, Serialize)]
struct Cursor {
    inside: bool,
    x: f64,
    y: f64,
}

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        let mut ticks = 0u32;
        let mut was_inside = false;
        loop {
            std::thread::sleep(TICK);
            ticks = ticks.wrapping_add(1);
            let state = app.state::<Overlay>().state();
            let Ok(window) = overlay::window(&app) else { continue };
            if !state.visible {
                was_inside = false;
                continue;
            }
            if ticks % KEEP_ON_TOP_TICKS == 0 {
                win32::keep_on_top(&window);
            }
            if state.interactive {
                continue;
            }
            let scale = window.scale_factor().unwrap_or(1.0);
            match win32::cursor_inside(&window) {
                Some((x, y)) => {
                    was_inside = true;
                    let cursor = Cursor { inside: true, x: x as f64 / scale, y: y as f64 / scale };
                    let _ = app.emit_to(overlay::LABEL, "overlay://cursor", cursor);
                }
                None if was_inside => {
                    was_inside = false;
                    let _ = app.emit_to(overlay::LABEL, "overlay://cursor", Cursor { inside: false, x: 0.0, y: 0.0 });
                }
                None => {}
            }
        }
    });
}
