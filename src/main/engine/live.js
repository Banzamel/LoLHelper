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
// weights (threatWeights): a fed enemy's damage items count for more.
function applyEnemyItems(db, t, enemyItems, weights = {}) {
  const entries = Object.entries(enemyItems || {}).map(([id, ids]) => Object.assign(ids.map((i) => db.itemById[i]).filter(Boolean), { w: weights[id] || 1 }));
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
    ad += a * list.w;
    ap += p * list.w;
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

// How dangerous each enemy is right now, from their score and the gold in their items:
// { championId: weight }, 1 = average, clamped to 0.4–3. Empty before the match has data.
const FED = 1.8;

function threatWeights(db, enemyStats, enemyItems) {
  const ids = Object.keys(enemyStats || {});
  if (!ids.length) return {};
  const gold = Object.fromEntries(ids.map((id) => [id, ((enemyItems || {})[id] || [])
    .reduce((s, i) => s + (db.itemById[i] ? db.itemById[i].gold.total : 0), 0)]));
  const avgGold = ids.reduce((s, id) => s + gold[id], 0) / ids.length;
  const out = {};
  for (const id of ids) {
    const { kills = 0, deaths = 0, assists = 0 } = enemyStats[id] || {};
    const score = kills + 0.4 * assists - 0.6 * deaths;
    const w = 1 + 0.08 * score + (avgGold > 500 ? 0.6 * ((gold[id] - avgGold) / avgGold) : 0);
    out[id] = Math.round(Math.min(3, Math.max(0.4, w)) * 100) / 100;
  }
  return out;
}

// Rune-granted Slightly Magical Boots count as plain Boots when planning purchases.
const ALIASES = { 2422: 1001 };
const isFinishedBoots = (it) => it && (it.category === 'boots' || it.category === 'boots-upgrade');

// Buy order: first item, boots, then the rest (owned items keep their place at the front).
function purchaseOrder(build) {
  const full = build.full.slice(0, 5);
  const boots = build.boots ? [build.boots.id] : [];
  return [...full.slice(0, 1), ...boots, ...full.slice(1)];
}

// The recipe tree of `id` against the inventory: owned parts are used up (each once) and
// cost nothing; `cost` is the gold still needed for the node.
function planItem(db, id, owned) {
  const inv = (owned || []).map((x) => ALIASES[x] || x);
  const take = (x) => { const i = inv.indexOf(x); if (i < 0) return false; inv.splice(i, 1); return true; };
  const walk = (x, top) => {
    if (!top && take(x)) return { id: x, owned: true, cost: 0, children: [] };
    const it = db.itemById[x];
    const children = (it.from || []).filter((c) => db.itemById[c]).map((c) => walk(c, false));
    const cost = (children.length ? it.gold.base : it.gold.total) + children.reduce((s, c) => s + c.cost, 0);
    return { id: x, owned: false, cost, children };
  };
  return walk(id, true);
}

// What to buy now towards `node`: the whole item when affordable, else the most expensive
// missing part that fits in `gold` (null when even the cheapest part is too expensive).
function buyNow(node, gold) {
  if (node.cost <= gold) return node;
  let best = null;
  const visit = (n) => n.children.forEach((c) => {
    if (c.owned) return;
    if (c.cost <= gold && (!best || c.cost > best.cost)) best = c;
    visit(c);
  });
  visit(node);
  return best;
}

// Next purchase: the first item of the buy order not owned yet, the part to buy for it now
// and its direct parts (owned or not).
function nextPurchase(db, build, owned, gold = null) {
  const have = new Set(owned || []);
  const bootsDone = (owned || []).some((id) => isFinishedBoots(db.itemById[id]));
  for (const id of purchaseOrder(build)) {
    if (have.has(id) || !db.itemById[id]) continue;
    if (build.boots && id === build.boots.id && bootsDone) continue;
    const plan = planItem(db, id, owned);
    const buy = gold === null ? null : buyNow(plan, gold);
    return {
      id,
      cost: plan.cost,
      buy: buy ? { id: buy.id, cost: buy.cost } : null,
      parts: plan.children.map((c) => ({ id: c.id, owned: c.owned, cost: c.cost })),
    };
  }
  return null;
}

module.exports = { applyEnemyItems, nextPurchase, purchaseOrder, planItem, threatWeights, FED };
