// User settings persisted as JSON in the Electron userData folder. Settings tied to a League
// account (champion pool, counter overrides, Flash key) live in that account's profile folder,
// so several players sharing one computer each keep their own; the rest is shared.
const fs = require('fs');
const path = require('path');
const { DEFAULT_LANGUAGE } = require('./i18n');

const PROFILE_KEYS = ['pool', 'counterOverrides', 'flashOnD'];

const DEFAULTS = {
  language: DEFAULT_LANGUAGE,
  leagueDir: '',
  pool: { TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], SUPPORT: [] },
  counterOverrides: {},
  alwaysOnTop: false,
  autoOpenDraft: true,
  autoOpenLive: true,
  flashOnD: true,
  // The account last seen in the client ({ puuid, gameName, tagLine }); its data is shown offline.
  lastProfile: null,
  overlay: {
    enabled: true,
    opacity: 0.92,
    bounds: null,
    toggleKey: 'CommandOrControl+Shift+H',
    moveKey: 'CommandOrControl+Shift+J',
  },
};

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.data = { ...DEFAULTS };
    this.profileFile = null;
    this.profile = {};
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { ...DEFAULTS, ...saved, overlay: { ...DEFAULTS.overlay, ...(saved.overlay || {}) } };
    } catch { /* first run */ }
  }

  // Switches the account-specific part to the profile folder `dir` (null: shared values only).
  // The first account ever seen inherits what was set before profiles existed.
  useProfile(dir) {
    this.profileFile = dir ? path.join(dir, 'settings.json') : null;
    this.profile = {};
    if (!dir) return;
    try {
      this.profile = pick(JSON.parse(fs.readFileSync(this.profileFile, 'utf8')), PROFILE_KEYS);
    } catch {
      this.profile = this.data.profilesMigrated ? pick(DEFAULTS, PROFILE_KEYS) : pick(this.data, PROFILE_KEYS);
      writeJson(this.profileFile, this.profile);
      if (!this.data.profilesMigrated) this.set({ profilesMigrated: true });
    }
  }

  get(key) {
    const all = { ...this.data, ...this.profile };
    return key ? all[key] : all;
  }

  set(patch) {
    const own = this.profileFile ? pick(patch, PROFILE_KEYS) : {};
    const shared = Object.fromEntries(Object.entries(patch).filter(([k]) => !(k in own)));
    if (Object.keys(own).length) {
      this.profile = { ...this.profile, ...own };
      writeJson(this.profileFile, this.profile);
    }
    if (Object.keys(shared).length) {
      this.data = { ...this.data, ...shared };
      writeJson(this.file, this.data);
    }
    return this.get();
  }
}

module.exports = { Settings, PROFILE_KEYS };
