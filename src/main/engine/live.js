// In-game adjustments: what the enemies actually bought changes the threat picture
// (damage split by gold spent, defensive stacking, healing items), and the player's own
// inventory decides the next item to buy.

const DMG_AD = ['ad', 'lethality', 'armorPen', 'crit', 'as'];
const DMG_AP = ['ap', 'magicPen', 'magicPenFlat'];
const DEF = ['armor', 'mr', 'hp'];
const STAT_GOLD = { ad: 35, lethality: 30, armorPen: 40, crit: 40, as: 25, ap: 20, magicPen: 46, magicPenFlat: 31, armor: 20, mr: 18, hp: 2.67 };

function goldIn(stats, keys) {
  return keys.reduce((s, k) => s + (stats[k] || 0) * STAT_GOLD[k], 0);
}

// enemyItems: { championId: [itemId, ...] } -> adjusted copy of the threat profile `t`.
function applyEnemyItems(db, t, enemyItems) {
  const entries = Object.entries(enemyItems || {}).map(([id, ids]) => ids.map((i) => db.itemById[i]).filter(Boolean));
  const spent = entries.reduce((s, list) => s + list.reduce((g, it) => g + it.gold.total, 0), 0);
  if (!entries.length || spent < 1500) return t;
  let ad = 0;
  let ap = 0;
  let tanky = 0;
  let healers = 0;
  for (const list of entries) {
    const sum = (keys) => list.reduce((s, it) => s + goldIn(it.features.stats, keys), 0);
    const a = sum(DMG_AD);
    const p = sum(DMG_AP);
    const d = sum(DEF);
    ad += a;
    ap += p;
    if (d > 2000 && d > (a + p)) tanky += 1;
    if (list.some((it) => it.features.stats.lifesteal || it.features.stats.omnivamp || it.features.stats.hsp)) healers += 1;
  }
  const n = entries.length;
  const out = { ...t };
  if (ad + ap > 0) {
    out.ad = 0.5 * t.ad + 0.5 * (ad / (ad + ap));
    out.ap = 0.5 * t.ap + 0.5 * (ap / (ad + ap));
  }
  out.tanks = Math.max(t.tanks, tanky / n);
  out.healing = Math.max(t.healing, healers / n);
  out.live = true;
  return out;
}

// First item of the recommended order that the player does not own yet.
function nextPurchase(db, build, owned) {
  const have = new Set(owned || []);
  const order = [...(build.boots ? [build.boots.id] : []), ...build.full];
  const bootsOwned = (owned || []).some((id) => db.itemById[id] && db.itemById[id].tags.includes('Boots'));
  for (const id of order) {
    if (have.has(id)) continue;
    if (build.boots && id === build.boots.id && bootsOwned) continue;
    return id;
  }
  return null;
}

module.exports = { applyEnemyItems, nextPurchase };
