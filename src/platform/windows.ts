// Window actions: the frameless main window (its title bar adapter is windowFrame.ts), and the
// widget window (drawn by Rust: shown without focus, click-through outside move mode, dragged by Rust in it).
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { commands } from './commands.ts';

export const mainWindow = {
  show: () => getCurrentWindow().show(),
  setAlwaysOnTop: (on: boolean) => getCurrentWindow().setAlwaysOnTop(on),
};

export const widgetWindow = {
  apply: (visible: boolean, interactive: boolean) => commands.overlayApply(visible, interactive),
  place: (x: number, y: number) => commands.overlayPlace(x, y),
  // `dragHeight`: the part from the top that drags the widget in move mode (Rust follows the
  // cursor itself, so the game keeps focus); below it are the widget's own controls.
  resize: (height: number, dragHeight: number) => commands.overlayResize(height, dragHeight),
  scale: (scale: number) => commands.overlayScale(scale),
  reload: () => commands.overlayReload(),
};

// Only https links leave the app, in the default browser.
export function openExternal(url: string) {
  if (/^https:\/\//.test(url)) void openUrl(url);
}
