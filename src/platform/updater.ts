// App updates from GitHub Releases (latest.json, signed): check, download with progress,
// install (the NSIS installer runs passively and the app restarts).
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';

export interface UpdateInfo { version: string }

export class UpdaterAdapter {
  private pending: Update | null = null;

  appVersion(): Promise<string> { return getVersion(); }

  // The newer version, or null when this one is the latest.
  async check(): Promise<UpdateInfo | null> {
    this.pending = await check();
    return this.pending ? { version: this.pending.version } : null;
  }

  async download(onProgress: (pct: number) => void): Promise<void> {
    if (!this.pending) throw new Error('No update to download');
    let total = 0;
    let received = 0;
    await this.pending.download((event) => {
      if (event.event === 'Started') total = event.data.contentLength || 0;
      if (event.event === 'Progress') received += event.data.chunkLength;
      if (total) onProgress(Math.round((received / total) * 100));
    });
  }

  async install(): Promise<void> {
    if (!this.pending) throw new Error('No update downloaded');
    await this.pending.install();
    await relaunch();
  }
}
