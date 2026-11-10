//! Windows calls Tauri has no API for: showing a window without activating it (the game keeps
//! focus), re-asserting the top of the z-order over a borderless game, reading the cursor for
//! item tooltips while the widget lets clicks through, and dragging the widget in move mode.

use tauri::WebviewWindow;

#[cfg(windows)]
mod imp {
    use tauri::WebviewWindow;
    use windows_sys::Win32::Foundation::{HWND, POINT, RECT};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetCursorPos, GetWindowRect, SetWindowPos, ShowWindow, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SW_SHOWNOACTIVATE,
    };

    fn hwnd(window: &WebviewWindow) -> Option<HWND> {
        window.hwnd().ok().map(|h| h.0 as HWND)
    }

    pub fn show_without_focus(window: &WebviewWindow) {
        if let Some(h) = hwnd(window) {
            // SAFETY: a valid top-level window handle owned by this process.
            unsafe { ShowWindow(h, SW_SHOWNOACTIVATE) };
        }
    }

    pub fn keep_on_top(window: &WebviewWindow) {
        if let Some(h) = hwnd(window) {
            // SAFETY: as above; the flags keep position, size and focus unchanged.
            unsafe { SetWindowPos(h, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) };
        }
    }

    /// The cursor relative to the window's top-left corner in physical pixels, when inside it.
    pub fn cursor_inside(window: &WebviewWindow) -> Option<(i32, i32)> {
        let h = hwnd(window)?;
        let mut point = POINT { x: 0, y: 0 };
        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        // SAFETY: both out-pointers point to live stack values.
        let ok = unsafe { GetCursorPos(&mut point) != 0 && GetWindowRect(h, &mut rect) != 0 };
        let inside = ok && point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom;
        inside.then_some((point.x - rect.left, point.y - rect.top))
    }

    pub fn left_button_down() -> bool {
        // SAFETY: no pointers; the high bit is set while the button is held.
        unsafe { GetAsyncKeyState(VK_LBUTTON as i32) < 0 }
    }

    /// Moves the window so that `grip` (a point relative to its top-left corner) stays under
    /// the cursor; size and focus are kept.
    pub fn move_to_cursor(window: &WebviewWindow, grip: (i32, i32)) {
        let Some(h) = hwnd(window) else { return };
        let mut point = POINT { x: 0, y: 0 };
        // SAFETY: the out-pointer points to a live stack value; the handle is this process's window.
        unsafe {
            if GetCursorPos(&mut point) != 0 {
                SetWindowPos(h, HWND_TOPMOST, point.x - grip.0, point.y - grip.1, 0, 0, SWP_NOSIZE | SWP_NOACTIVATE);
            }
        }
    }
}

#[cfg(not(windows))]
mod imp {
    use tauri::WebviewWindow;
    pub fn show_without_focus(window: &WebviewWindow) { let _ = window.show(); }
    pub fn keep_on_top(_: &WebviewWindow) {}
    pub fn cursor_inside(_: &WebviewWindow) -> Option<(i32, i32)> { None }
    pub fn left_button_down() -> bool { false }
    pub fn move_to_cursor(_: &WebviewWindow, _: (i32, i32)) {}
}

pub fn show_without_focus(window: &WebviewWindow) { imp::show_without_focus(window) }
pub fn keep_on_top(window: &WebviewWindow) { imp::keep_on_top(window) }
pub fn cursor_inside(window: &WebviewWindow) -> Option<(i32, i32)> { imp::cursor_inside(window) }
pub fn left_button_down() -> bool { imp::left_button_down() }
pub fn move_to_cursor(window: &WebviewWindow, grip: (i32, i32)) { imp::move_to_cursor(window, grip) }
