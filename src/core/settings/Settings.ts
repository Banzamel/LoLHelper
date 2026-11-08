// User settings persisted as JSON in the app data folder. Settings tied to a League account
// (champion pool, counter overrides, Flash key) live in that account's profile folder, so
// several players sharing one computer each keep their own; the rest is shared.
import { joinPath, queueWrite, readJson, type Storage } from '../shared/storage.ts';
import { DEFAULTS, PROFILE_KEYS, type ProfileSettings, type SettingsData } from './defaults.ts';

const pick = <T extends object>(obj: T, keys: readonly string[]): Partial<ProfileSettings> =>
  Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, (obj as Record<string, unknown>)[k]]));
const toJson = (data: unknown) => JSON.stringify(data, null, 2);

export class Settings {
  private readonly storage: Storage;
  private readonly file: string;
  private data: SettingsData = { ...DEFAULTS };
  private profileFile: string | null = null;
  private profile: Partial<ProfileSettings> = {};

  // dir: the folder of settings.json, relative to the storage root ('' for the root).
  constructor(storage: Storage, dir = '') {
    this.storage = storage;
    this.file = joinPath(dir, 'settings.json');
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
    const saved = await readJson<Partial<ProfileSettings> | null>(this.storage, this.profileFile, null);
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
  get<K extends keyof SettingsData>(key?: K): SettingsData | SettingsData[K] {
    const all: SettingsData = { ...this.data, ...this.profile };
    return key ? all[key] : all;
  }

  set(patch: Partial<SettingsData>): SettingsData {
    const own = this.profileFile ? pick(patch, PROFILE_KEYS) : {};
    const shared = Object.fromEntries(Object.entries(patch).filter(([k]) => !(k in own)));
    if (Object.keys(own).length && this.profileFile) {
      this.profile = { ...this.profile, ...own };
      void queueWrite(this.storage, this.profileFile, toJson(this.profile));
    }
    if (Object.keys(shared).length) {
      this.data = { ...this.data, ...shared };
      void queueWrite(this.storage, this.file, toJson(this.data));
    }
    return this.get();
  }
}
