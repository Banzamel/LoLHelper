// Window actions: the frameless main window's controls, and the widget window (drawn by
// Rust: shown without focus, click-through outside move mode).
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { commands } from './commands.ts';

export type WindowAction = 'minimize' | 'maximize' | 'close';

export const mainWindow = {
  show: () => getCurrentWindow().show(),
  action(action: WindowAction) {
    const win = getCurrentWindow();
    if (action === 'minimize') return win.minimize();
    if (action === 'maximize') return win.toggleMaximize();
    return win.close();
  },
  setAlwaysOnTop: (on: boolean) => getCurrentWindow().setAlwaysOnTop(on),
};

export const widgetWindow = {
  apply: (visible: boolean, interactive: boolean) => commands.overlayApply(visible, interactive),
  place: (x: number, y: number) => commands.overlayPlace(x, y),
  resize: (height: number) => commands.overlayResize(height),
  reload: () => commands.overlayReload(),
  // Called from the widget itself in move mode.
  startDragging: () => getCurrentWindow().startDragging(),
};

// Only https links leave the app, in the default browser.
export function openExternal(url: string) {
  if (/^https:\/\//.test(url)) void openUrl(url);
}
