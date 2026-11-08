// Global hotkeys (work while the game has focus). Accelerators use the Electron-era format
// saved in the settings ("CommandOrControl+Shift+H"), which the plugin understands as well.
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

// Registers the hotkeys (replacing all earlier ones); resolves with the ones that failed.
export async function registerHotkeys(keys: [string, () => void][]): Promise<string[]> {
  await unregisterAll().catch(() => {});
  const failed: string[] = [];
  for (const [key, fn] of keys) {
    if (!key) { failed.push(key); continue; }
    try {
      await register(key, (event) => { if (event.state === 'Pressed') fn(); });
    } catch {
      failed.push(key);
    }
  }
  return failed;
}
