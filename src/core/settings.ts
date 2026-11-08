// User settings persisted as JSON in the app data folder. Settings tied to a League account
// (champion pool, counter overrides, Flash key) live in that account's profile folder, so
// several players sharing one computer each keep their own; the rest is shared.
import { DEFAULT_LANGUAGE } from './i18n.ts';
import { joinPath, queueWrite, readJson, type Storage } from './storage.ts';

export const PROFILE_KEYS = ['pool', 'counterOverrides', 'flashOnD'] as const;

export interface OverlaySettings {
  enabled: boolean;
  opacity: number;
  bounds: { x: number; y: number } | null;
  toggleKey: string;
  moveKey: string;
}

export interface SettingsData {
  language: string;
  leagueDir: string;
  pool: Record<string, string[]>;
  counterOverrides: Record<string, string[]>;
  alwaysOnTop: boolean;
  autoOpenDraft: boolean;
  autoOpenLive: boolean;
  flashOnD: boolean;
  overlay: OverlaySettings;
  profilesMigrated?: boolean;
  [extra: string]: any;
}

export const DEFAULTS: SettingsData = {
  language: DEFAULT_LANGUAGE,
  leagueDir: '',
  pool: { TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], SUPPORT: [] },
  counterOverrides: {},
  alwaysOnTop: false,
  autoOpenDraft: true,
  autoOpenLive: true,
  flashOnD: true,
  overlay: {
    enabled: true,
    opacity: 0.92,
    bounds: null,
    toggleKey: 'CommandOrControl+Shift+H',
    moveKey: 'CommandOrControl+Shift+J',
  },
};

const pick = (obj: Record<string, any>, keys: readonly string[]) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
const toJson = (data: unknown) => JSON.stringify(data, null, 2);

export class Settings {
  storage: Storage;
  file: string;
  data: SettingsData;
  profileFile: string | null;
  profile: Record<string, any>;

  // dir: the folder of settings.json, relative to the storage root ('' for the root).
  constructor(storage: Storage, dir = '') {
    this.storage = storage;
    this.file = joinPath(dir, 'settings.json');
    this.data = { ...DEFAULTS };
    this.profileFile = null;
    this.profile = {};
  }

  async load(): Promise<this> {
    const saved = await readJson<Partial<SettingsData> | null>(this.storage, this.file, null);
    if (saved) this.data = { ...DEFAULTS, ...saved, overlay: { ...DEFAULTS.overlay, ...(saved.overlay || {}) } };
    return this;
  }

  // Switches the account-specific part to the profile folder `dir` (null: shared values only).
  // The first account ever seen inherits what was set before profiles existed.
  async useProfile(dir: string | null): Promise<void> {
    this.profileFile = dir ? joinPath(dir, 'settings.json') : null;
    this.profile = {};
    if (!this.profileFile) return;
    const saved = await readJson<Record<string, any> | null>(this.storage, this.profileFile, null);
    if (saved) {
      this.profile = pick(saved, PROFILE_KEYS);
      return;
    }
    this.profile = this.data.profilesMigrated ? pick(DEFAULTS, PROFILE_KEYS) : pick(this.data, PROFILE_KEYS);
    await queueWrite(this.storage, this.profileFile, toJson(this.profile));
    if (!this.data.profilesMigrated) this.set({ profilesMigrated: true });
  }

  get(): SettingsData;
  get<K extends keyof SettingsData>(key: K): SettingsData[K];
  get(key?: string): any {
    const all = { ...this.data, ...this.profile };
    return key ? all[key] : all;
  }

  set(patch: Partial<SettingsData>): SettingsData {
    const own = this.profileFile ? pick(patch, PROFILE_KEYS) : {};
    const shared = Object.fromEntries(Object.entries(patch).filter(([k]) => !(k in own)));
    if (Object.keys(own).length && this.profileFile) {
      this.profile = { ...this.profile, ...own };
      queueWrite(this.storage, this.profileFile, toJson(this.profile));
    }
    if (Object.keys(shared).length) {
      this.data = { ...this.data, ...shared };
      queueWrite(this.storage, this.file, toJson(this.data));
    }
    return this.get();
  }
}
