// Rune guide: curated tips for every keystone (how to use it, how to play against it) and the
// keystones of the enemies — the real ones from the running match, or in Draft and on the
// loading screen the keystone a champion of that class typically plays, predicted with the same
// presets the player's own rune page comes from (loadout.js). Texts are translation keys.
const { KEYSTONE_TIPS } = require('./knowledge');
const { classOf } = require('./builds');
const { typicalKeystone } = require('./loadout');

// The keystone rune (first row of a tree) with this id, or null.
function keystoneById(db, id) {
  for (const tree of db.runes.trees) {
    const found = tree.slots[0].find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}

// { id, use, watch } translation keys for a keystone with curated tips, else null
// (not a keystone, unknown id, or a keystone without tips).
function keystoneTip(db, id) {
  const keystone = keystoneById(db, id);
  if (!keystone || !KEYSTONE_TIPS.includes(keystone.key)) return null;
  return { id, use: `rune.use.${keystone.key}`, watch: `rune.watch.${keystone.key}` };
}

// The keystone id a champion typically plays in the role (its main position when unknown);
// null for an unknown champion or without rune data.
function predictKeystone(db, champion, role = null) {
  if (!champion) return null;
  const position = role || champion.positions[0];
  return typicalKeystone(db, classOf(champion, position), position);
}

// Each known enemy with its keystone: the real one when it is a keystone of the database,
// otherwise the predicted one ({ predicted: true }); watch is the "play against it" key or null.
function enemyKeystones(db, enemies) {
  return enemies.filter((e) => e && db.byId[e.championId]).map((e) => {
    const real = keystoneById(db, e.keystone) ? e.keystone : null;
    const keystone = real || predictKeystone(db, db.byId[e.championId], e.role || null);
    const tip = keystoneTip(db, keystone);
    return { championId: e.championId, role: e.role || null, keystone, predicted: !real, watch: tip ? tip.watch : null };
  });
}

// The tips for the keystones the caller shows and the enemies' keystones.
// Contract in plans/0004-rune-guide.md (knowledge repository).
function runeGuide(db, { keystones = [], enemies = [] } = {}) {
  const tips = {};
  for (const id of keystones) {
    const tip = keystoneTip(db, id);
    if (tip) tips[id] = tip;
  }
  return { tips, enemies: enemyKeystones(db, enemies) };
}

module.exports = { keystoneTip, predictKeystone, enemyKeystones, runeGuide };
