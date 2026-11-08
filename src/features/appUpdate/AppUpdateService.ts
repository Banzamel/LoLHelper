// App self-update from GitHub Releases: checked a few seconds after start, downloaded when the
// player asks, installed (passive NSIS run) and restarted on request. Off in development runs.
import { errorMessage, type UpdaterAdapter } from '../../platform/index.ts';
import { Store } from '../../shared/lib/Store.ts';

export type UpdatePhase = 'dev' | 'idle' | 'checking' | 'available' | 'latest' | 'downloading' | 'downloaded' | 'error';
export interface UpdateState { state: UpdatePhase; version?: string; pct?: number; error?: string }

const FIRST_CHECK_MS = 5000;

export class AppUpdateService {
  readonly store: Store<UpdateState>;

  constructor(private readonly updater: UpdaterAdapter, private readonly packaged: boolean) {
    this.store = new Store<UpdateState>({ state: packaged ? 'idle' : 'dev' });
  }

  start() {
    if (this.packaged) setTimeout(() => { void this.check(); }, FIRST_CHECK_MS);
  }

  async check() {
    if (!this.packaged) return;
    this.store.set({ state: 'checking' });
    try {
      const update = await this.updater.check();
      this.store.set(update ? { state: 'available', version: update.version } : { state: 'latest' });
    } catch (e) {
      this.store.set({ state: 'error', error: errorMessage(e) });
    }
  }

  async download() {
    try {
      this.store.set({ state: 'downloading', pct: 0 });
      await this.updater.download((pct) => this.store.set({ state: 'downloading', pct }));
      this.store.set({ state: 'downloaded' });
    } catch (e) {
      this.store.set({ state: 'error', error: errorMessage(e) });
    }
  }

  async install() {
    try { await this.updater.install(); } catch (e) { this.store.set({ state: 'error', error: errorMessage(e) }); }
  }
}
