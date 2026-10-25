// User settings persisted as JSON in the Electron userData folder.
const fs = require('fs');
const path = require('path');
const { DEFAULT_LANGUAGE } = require('./i18n');

const DEFAULTS = {
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

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.data = { ...DEFAULTS };
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { ...DEFAULTS, ...saved, overlay: { ...DEFAULTS.overlay, ...(saved.overlay || {}) } };
    } catch { /* first run */ }
  }

  get(key) { return key ? this.data[key] : this.data; }

  set(patch) {
    this.data = { ...this.data, ...patch };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    return this.data;
  }
}

module.exports = { Settings };
