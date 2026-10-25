// Item build recommendation. Items are scored from their parsed stats against the
// champion's class weights, then adjusted for the enemy laner and enemy team threats
// (damage type, healing, tanks, burst, crowd control, auto-attackers, shields).
const { recommendLoadout } = require('./loadout');
const { applyEnemyItems, nextPurchase } = require('./live');

const GOLD = { ad: 35, ap: 20, armor: 20, mr: 18, hp: 2.67, as: 25, crit: 40, haste: 26.7, lethality: 30, armorPen: 40,
  magicPen: 46, magicPenFlat: 31, lifesteal: 37.5, omnivamp: 40, mana: 1.4, manaRegen: 3, hpRegen: 3, hsp: 66, tenacity: 10, msPct: 39 };

const WEIGHTS = {
  marksman: { ad: 1, as: 1, crit: 1.2, lifesteal: 0.5, armorPen: 0.7, msPct: 0.3 },
  'mage-burst': { ap: 1.1, magicPen: 0.5, magicPenFlat: 1, haste: 0.8, mana: 0.6 },
  'mage-battle': { ap: 1, hp: 0.7, haste: 0.7, magicPen: 0.6, mana: 0.3, omnivamp: 0.3 },
  'mage-artillery': { ap: 1.1, haste: 1, mana: 0.7, magicPen: 0.5, magicPenFlat: 0.8 },
  'assassin-ad': { ad: 1.1, lethality: 1.2, haste: 0.8, msPct: 0.4, armorPen: 0.5 },
  bruiser: { ad: 1, hp: 0.9, haste: 0.8, armor: 0.35, mr: 0.3, omnivamp: 0.4, lifesteal: 0.2, as: 0.2, armorPen: 0.4 },
  'ap-bruiser': { ap: 1, hp: 0.8, haste: 0.6, armor: 0.3, mr: 0.3, omnivamp: 0.5, magicPen: 0.4, as: 0.2 },
  tank: { hp: 1, armor: 1, mr: 1, haste: 0.6 },
  enchanter: { hsp: 1.2, haste: 1, ap: 0.5, manaRegen: 1, mana: 0.3, hp: 0.2 },
  'support-tank': { hp: 0.9, armor: 0.8, mr: 0.8, haste: 0.8 },
};

// UI texts are translation keys: class.<cls>, stat.<stat>, build.<reason>, threat.<threat>.
const has = (c, list) => c.archetypes.some((a) => list.includes(a));

function classOf(c, role) {
  const ap = c.damageType === 'AP';
  if (has(c, ['MARKSMAN']) && !ap) return 'marksman';
  if (has(c, ['ENCHANTER'])) return 'enchanter';
  const tanky = has(c, ['VANGUARD', 'WARDEN']) || (has(c, ['TANK']) && c.ratings.damage <= 2);
  if (tanky) return role === 'SUPPORT' ? 'support-tank' : 'tank';
  if (has(c, ['CATCHER'])) return ap ? 'support-tank' : 'assassin-ad';
  if (has(c, ['ASSASSIN']) && !ap && (c.ratings.toughness <= 1 || !has(c, ['FIGHTER', 'DIVER', 'JUGGERNAUT']))) return 'assassin-ad';
  if (ap && has(c, ['FIGHTER', 'JUGGERNAUT', 'DIVER', 'SKIRMISHER']) && c.attackType === 'MELEE') return 'ap-bruiser';
  if (ap && has(c, ['BATTLEMAGE'])) return 'mage-battle';
  if (ap && has(c, ['ARTILLERY'])) return 'mage-artillery';
  if (ap) return 'mage-burst';
  if (has(c, ['MARKSMAN'])) return 'marksman';
  return 'bruiser';
}

function analyzeThreats(laner, enemies) {
  const list = [...(laner ? [laner, laner] : []), ...enemies.filter((e) => !laner || e.id !== laner.id)];
  const n = list.length || 1;
  const count = (fn) => list.filter(fn).length / n;
  return {
    ad: count((e) => e.damageType === 'AD'),
    ap: count((e) => e.damageType === 'AP'),
    healing: count((e) => e.traits.heal >= 2 || has(e, ['ENCHANTER'])),
    tanks: count((e) => e.ratings.toughness >= 3 || has(e, ['TANK', 'VANGUARD', 'WARDEN'])),
    burstAD: count((e) => e.damageType === 'AD' && has(e, ['ASSASSIN'])),
    burstAP: count((e) => e.damageType === 'AP' && has(e, ['BURST', 'ASSASSIN'])),
    cc: list.reduce((s, e) => s + e.traits.hardCC, 0) / n,
    autoAttack: count((e) => has(e, ['MARKSMAN', 'SKIRMISHER'])),
    shields: count((e) => e.traits.shield >= 2),
    empty: !list.length,
  };
}

function baseScore(item, w, champ) {
  let score = 0;
  const contrib = [];
  for (const [stat, value] of Object.entries(item.features.stats)) {
    const part = (w[stat] || 0) * value * (GOLD[stat] || 0);
    if (part > 0) contrib.push([stat, part]);
    score += part;
  }
  if (champ.resource !== 'MANA' && item.features.stats.mana) score *= 0.35;
  contrib.sort((a, b) => b[1] - a[1]);
  return { score: score / 1000, top: [...new Set(contrib.slice(0, 3).map(([s]) => (s === 'magicPenFlat' ? 'magicPen' : s)))] };
}

function situational(item, cls, t) {
  const f = item.features.flags;
  const s = item.features.stats;
  const reasons = [];
  const add = (v, key) => reasons.push({ v, key });
  const squishy = !['tank', 'support-tank', 'bruiser', 'ap-bruiser'].includes(cls);
  const dealsDamage = !['enchanter', 'support-tank', 'tank'].includes(cls);
  if (f.grievous && t.healing >= 0.3) add(3 * t.healing + 1, 'build.grievous');
  if (dealsDamage && (s.armorPen || s.magicPen || f.maxHpDamage || f.armorShred) && t.tanks >= 0.35) add(2.5 * t.tanks, 'build.penVsTanks');
  if (s.armor && t.ad >= 0.6) add(2 * t.ad * (squishy ? 0.7 : 1), 'build.armor');
  if (s.mr && t.ap >= 0.5) add(2 * t.ap * (squishy ? 0.7 : 1), 'build.mr');
  if (f.stasis && (t.burstAD + t.burstAP) >= 0.25) add(2.5, 'build.stasis');
  if ((f.revive || f.lifeline) && t.burstAD + t.burstAP >= 0.25 && squishy) add(2, 'build.surviveBurst');
  if (f.spellshield && t.ap >= 0.5) add(1.5, 'build.spellshield');
  if ((f.cleanse || s.tenacity) && t.cc >= 1.6) add(2, 'build.cleanse');
  if ((f.antiAttackSpeed || f.blockAttacks || f.thorns || f.antiCrit) && t.autoAttack >= 0.4) add(2 * t.autoAttack + 0.5, 'build.antiAuto');
  if (f.antiShield && t.shields >= 0.3) add(2, 'build.antiShield');
  return reasons;
}

function lateItem(item) {
  const s = item.features.stats;
  if (s.magicPen || s.armorPen >= 30) return 2;
  if (Object.keys(s).length === 1 && (s.ap >= 120 || s.ad >= 60)) return 1;
  return 0;
}

function conflicts(item, chosen) {
  const p = new Set(item.features.passives.filter((x) => x !== 'ACTIVE'));
  return chosen.some((c) => c.features.passives.some((x) => p.has(x))
    || (c.features.flags.stasis && item.features.flags.stasis)
    || (c.features.flags.lifeline && item.features.flags.lifeline));
}

function pickStarters(db, cls, role, laner) {
  const byName = (n) => db.items.filter((i) => i.nameEn === n).sort((a, b) => a.id - b.id)[0];
  const potion = byName('Health Potion');
  let main;
  if (role === 'SUPPORT') main = db.items.find((i) => i.category === 'support' && i.nameEn === 'World Atlas') || db.items.find((i) => i.category === 'support');
  else if (role === 'JUNGLE') main = byName(cls === 'tank' ? 'Mosstomper Seedling' : (cls === 'assassin-ad' ? 'Gustwalker Hatchling' : 'Scorchclaw Pup'));
  else if (['mage-burst', 'mage-battle', 'mage-artillery', 'enchanter'].includes(cls)) main = byName("Doran's Ring");
  else if (cls === 'tank' || (cls === 'bruiser' && laner && laner.attackType === 'RANGED')) main = byName("Doran's Shield");
  else if (cls === 'ap-bruiser') main = byName("Doran's Ring");
  else main = byName("Doran's Blade");
  const potions = main && main.nameEn === "Doran's Ring" ? 2 : 1;
  return [main && { id: main.id, count: 1 }, potion && { id: potion.id, count: role === 'SUPPORT' ? 2 : potions }].filter(Boolean);
}

function pickBoots(db, cls, t) {
  const byName = (n) => db.items.find((i) => i.nameEn === n && i.category === 'boots');
  let name;
  let reason;
  if (t.cc >= 2 || (t.ap >= 0.6 && cls !== 'marksman')) { name = "Mercury's Treads"; reason = 'build.bootsMercury'; }
  else if (t.ad >= 0.6 && (t.autoAttack >= 0.4 || t.burstAD >= 0.2)) { name = 'Plated Steelcaps'; reason = 'build.bootsSteelcaps'; }
  else if (cls === 'marksman') { name = "Berserker's Greaves"; reason = 'build.bootsBerserker'; }
  else if (['mage-burst', 'mage-battle', 'mage-artillery'].includes(cls)) { name = "Sorcerer's Shoes"; reason = 'build.bootsSorcerer'; }
  else if (cls === 'enchanter' || cls === 'assassin-ad') { name = 'Ionian Boots of Lucidity'; reason = 'build.bootsLucidity'; }
  else { name = t.ad >= t.ap ? 'Plated Steelcaps' : "Mercury's Treads"; reason = 'build.bootsDefault'; }
  const boots = byName(name) || db.items.find((i) => i.category === 'boots');
  return boots ? { id: boots.id, upgrade: boots.into[0] || null, reason } : null;
}

function recommendBuild(db, { championId, enemyId, enemyIds = [], role, enemyItems = null, ownedItems = null }) {
  const champ = db.byId[championId];
  if (!champ) throw new Error(`Unknown champion ${championId}`);
  const laner = enemyId ? db.byId[enemyId] : null;
  const enemies = enemyIds.map((id) => db.byId[id]).filter(Boolean);
  const cls = classOf(champ, role || champ.positions[0]);
  const w = WEIGHTS[cls];
  const t = applyEnemyItems(db, analyzeThreats(laner, enemies), enemyItems);
  const pool = db.items.filter((i) => i.category === 'legendary');
  const owned = new Set((ownedItems || []).filter((id) => db.itemById[id] && db.itemById[id].category === 'legendary'));

  const scored = pool.map((item) => {
    const base = baseScore(item, w, champ);
    const sit = situational(item, cls, t);
    return { item, base: base.score, top: base.top, sit, sitScore: sit.reduce((s, r) => s + r.v, 0) };
  });

  // Items already bought in game stay in the build (ranked first) and are never replaced.
  const core = scored.filter((s) => owned.has(s.item.id)).slice(0, 3);
  for (const s of [...scored].sort((a, b) => (b.base + b.sitScore * 0.15) - (a.base + a.sitScore * 0.15))) {
    if (core.length >= 3) break;
    if (!core.includes(s) && !conflicts(s.item, core.map((c) => c.item))) core.push(s);
  }
  // Buy order: owned items first, then % penetration and multiplier items last.
  core.sort((a, b) => (owned.has(b.item.id) - owned.has(a.item.id)) || (lateItem(a.item) - lateItem(b.item)));
  const taken = core.map((c) => c.item);
  for (const s of scored) if (owned.has(s.item.id) && !taken.includes(s.item)) taken.push(s.item);
  const situ = [];
  for (const s of [...scored].filter((x) => x.sitScore > 0 && x.base > 0.6).sort((a, b) => (b.sitScore + b.base * 0.4) - (a.sitScore + a.base * 0.4))) {
    if (situ.length >= 5) break;
    if (!taken.includes(s.item) && !conflicts(s.item, [...taken, ...situ.map((x) => x.item)])) situ.push(s);
  }
  const fill = [...scored].sort((a, b) => b.base - a.base)
    .filter((s) => !taken.includes(s.item) && !situ.includes(s));
  const full = [...taken];
  for (const s of [...situ, ...fill]) {
    if (full.length >= 5) break;
    if (!conflicts(s.item, full)) full.push(s.item);
  }

  const threats = [];
  if (!t.empty) {
    threats.push({ key: 'threat.damageSplit', params: { ad: Math.round(t.ad * 100), ap: Math.round(t.ap * 100) } });
    if (t.healing >= 0.3) threats.push({ key: 'threat.healing' });
    if (t.tanks >= 0.35) threats.push({ key: 'threat.tanks' });
    if (t.burstAD + t.burstAP >= 0.25) threats.push({ key: 'threat.burst' });
    if (t.cc >= 1.6) threats.push({ key: 'threat.cc' });
    if (t.autoAttack >= 0.4) threats.push({ key: 'threat.autoAttack' });
    if (t.live) threats.push({ key: 'threat.fromItems' });
  }

  const build = {
    championId, enemyId: enemyId || null, role: role || champ.positions[0], cls, threats,
    starters: pickStarters(db, cls, role, laner),
    boots: pickBoots(db, cls, t),
    core: core.map((c) => ({ id: c.item.id, stats: c.top, owned: owned.has(c.item.id), reasons: c.sit.map((r) => ({ key: r.key })) })),
    situational: situ.map((s) => ({ id: s.item.id, reasons: s.sit.map((r) => ({ key: r.key })) })),
    full: full.slice(0, 5).map((i) => i.id),
    ...recommendLoadout(db, { champ, cls, role: role || champ.positions[0], laner, threats: t }),
  };
  if (ownedItems) build.next = nextPurchase(db, build, ownedItems);
  return build;
}

module.exports = { recommendBuild, classOf };
