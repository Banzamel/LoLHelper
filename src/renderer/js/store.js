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
  draft: null,
  manual: { myTeam: Array(5).fill(null), theirTeam: Array(5).fill(null), myRole: 'MIDDLE', opponent: null, enemyRoles: {} },
  buildTarget: { championId: null, enemyId: null, role: null },
};

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
  state.db = {
    meta: raw.meta, champions, items,
    byId: Object.fromEntries(champions.map((c) => [c.id, c])),
    itemById: Object.fromEntries(items.map((i) => [i.id, i])),
  };
}

export const champ = (id) => (state.db && id ? state.db.byId[id] : null);
export const item = (id) => (state.db && id ? state.db.itemById[id] : null);
export const asset = (rel) => `app://data/${rel}`;
