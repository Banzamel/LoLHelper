// Where the app runs: inside Tauri or in a plain browser (vite dev server for UI work, where
// the native side is missing), plus the development switches read by Rust.
import { isTauri } from '@tauri-apps/api/core';
import { commands, type DevOptions } from './commands.ts';

export const insideTauri = () => isTauri();

// A release build without the debug switches; development builds report `import.meta.env.DEV`.
export const isPackaged = () => !import.meta.env.DEV;

export async function devOptions(): Promise<DevOptions> {
  try { return await commands.devOptions(); } catch { return { live: false, roster: null }; }
}

export const liveGameData = () => commands.liveGameData();
