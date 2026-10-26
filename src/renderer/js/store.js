// Global renderer state: database (merged with texts of the current language),
// settings, live client status and the current draft.
const listeners = new Set();

export const state = {
  settings: null,
  languages: ['pl', 'en'],
  version: '',
  db: null,
  lcu: { connected: false },
  phase: 'None',
  mode: null,
  draft: null,
  game: null,
  appUpdate: { state: 'idle' },
  manual: { myTeam: Array(5).fill(null), theirTeam: Array(5).fill(null), myRole: 'MIDDLE', opponent: null, enemyRoles: {} },
  buildTarget: { championId: null, enemyId: null, role: null },
};

// False only when the client is in a known, unsupported mode (ARAM, blind pick, custom…).
export function isSupported() { return !state.mode || state.mode.supported; }

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(what) { listeners.forEach((fn) => fn(what)); }

export function setDatabase(raw) {
  if (!raw) { state.db = null; return; }
  const { texts } = raw;
  const champions = raw.champions.map((c) => {
    const tx = texts.champions[c.id] || {};
    return {
      ...c, ...tx,
      passive: { ...(tx.passive || {}), icon: c.passiveIcon },
      spells: c.spells.map((s, i) => ({ ...s, ...((tx.spells || [])[i] || {}) })),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const items = raw.items.map((i) => ({ ...i, ...(texts.items[i.id] || { name: i.nameEn }) }));
  const runeTexts = texts.runes || {};
  const runeById = {};
  const trees = (raw.runes ? raw.runes.trees : []).map((tree) => {
    const merged = { ...tree, name: (runeTexts[tree.id] || {}).name || tree.nameEn };
    merged.slots = tree.slots.map((row) => row.map((r) => {
      const rune = { ...r, tree: tree.id, ...(runeTexts[r.id] || { name: r.nameEn }) };
      runeById[r.id] = rune;
      return rune;
    }));
    runeById[tree.id] = merged;
    return merged;
  });
  for (const s of raw.runes ? raw.runes.shards : []) runeById[s.id] = { ...s, shard: true };
  const summoners = (raw.summoners || []).map((s) => ({ ...s, ...((texts.summoners || {})[s.id] || { name: s.nameEn }) }));
  state.db = {
    meta: raw.meta, champions, items, trees, summoners,
    byId: Object.fromEntries(champions.map((c) => [c.id, c])),
    itemById: Object.fromEntries(items.map((i) => [i.id, i])),
    runeById,
    summonerById: Object.fromEntries(summoners.map((s) => [s.id, s])),
  };
}

export const champ = (id) => (state.db && id ? state.db.byId[id] : null);
export const item = (id) => (state.db && id ? state.db.itemById[id] : null);
export const rune = (id) => (state.db && id ? state.db.runeById[id] : null);
export const summoner = (id) => (state.db && id ? state.db.summonerById[id] : null);
export const asset = (rel) => `app://data/${rel}`;
