// The user's settings as observable state. Side effects of a change (window on top, League
// folder, language) are wired by the app (app/boot) through onChange.
import { Settings } from '../../core/settings/Settings.ts';
import type { SettingsData } from '../../core/settings/defaults.ts';
import { DEFAULTS } from '../../core/settings/defaults.ts';
import type { Storage } from '../../core/shared/storage.ts';
import { Store } from '../../shared/lib/Store.ts';

type Listener = (patch: Partial<SettingsData>, settings: SettingsData) => void;

export class SettingsService {
  readonly store = new Store<{ settings: SettingsData }>({ settings: DEFAULTS });
  private readonly settings: Settings;
  private readonly listeners: Listener[] = [];

  constructor(storage: Storage) {
    this.settings = new Settings(storage);
  }

  get value(): SettingsData { return this.store.get().settings; }

  async load() {
    await this.settings.load();
    this.publish();
  }

  // The account-specific settings of a profile folder.
  async useProfile(dir: string | null) {
    await this.settings.useProfile(dir);
    this.publish();
  }

  set(patch: Partial<SettingsData>): SettingsData {
    const next = this.settings.set(patch);
    this.publish();
    this.listeners.forEach((fn) => fn(patch, next));
    return next;
  }

  onChange(fn: Listener) { this.listeners.push(fn); }

  private publish() { this.store.set({ settings: this.settings.get() }); }
}
