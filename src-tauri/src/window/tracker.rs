//! A background thread for the visible widget. A borderless game can take the top of the
//! z-order back, so the widget re-asserts it every KEEP_ON_TOP. While clicks pass through, the
//! widget receives no mouse events at all, so the cursor position is sent to it instead and it
//! shows the item name under the cursor itself. In move mode the thread drags the widget: it
//! follows the cursor while the left button is held, which needs neither focus nor the system's
//! move loop, so it works over a running game.

use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::window::overlay::{self, Overlay};
use crate::window::win32;

const TICK: Duration = Duration::from_millis(50);
/// Move mode: fast enough for the widget to follow the cursor smoothly.
const MOVE_TICK: Duration = Duration::from_millis(8);
const KEEP_ON_TOP: Duration = Duration::from_millis(1500);

#[derive(Clone, Serialize)]
struct Cursor {
    inside: bool,
    x: f64,
    y: f64,
}

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        let mut tick = TICK;
        let mut on_top = Instant::now();
        let mut was_inside = false;
        let mut was_pressed = false;
        // Where the widget was grabbed, relative to its top-left corner.
        let mut grip: Option<(i32, i32)> = None;
        loop {
            std::thread::sleep(tick);
            let state = app.state::<Overlay>().state();
            tick = if state.visible && state.interactive { MOVE_TICK } else { TICK };
            let Ok(window) = overlay::window(&app) else { continue };
            if !state.visible {
                was_inside = false;
                grip = None;
                continue;
            }
            if on_top.elapsed() >= KEEP_ON_TOP {
                on_top = Instant::now();
                win32::keep_on_top(&window);
            }
            // Physical pixels per CSS pixel of the widget's page.
            let scale = window.scale_factor().unwrap_or(1.0) * state.scale;
            if state.interactive {
                let pressed = win32::left_button_down();
                grip = match grip {
                    Some(at) if pressed => {
                        win32::move_to_cursor(&window, at);
                        Some(at)
                    }
                    // A new press on the widget, above its own controls.
                    None if pressed && !was_pressed => win32::cursor_inside(&window).filter(|&(_, y)| (y as f64) < state.drag_height * scale),
                    _ => None,
                };
                was_pressed = pressed;
                continue;
            }
            grip = None;
            was_pressed = false;
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
