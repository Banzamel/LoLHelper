// Rune page, summoner spells and skill order for a champion class and the enemy threats.
// Rune presets are written with English rune names and resolved against the current
// Data Dragon rune trees, so a renamed or removed rune falls back to the first one in its row.
// Reasons are translation keys (loadout.*).

const PRESETS = {
  marksman: { tree: 'Precision', keystone: 'Lethal Tempo', rows: ['Presence of Mind', 'Legend: Alacrity', 'Coup de Grace'], sub: 'Inspiration', subRunes: ['Magical Footwear', 'Biscuit Delivery'], shards: [5005, 5008, 5011] },
  'mage-burst': { tree: 'Domination', keystone: 'Electrocute', rows: ['Taste of Blood', 'Grisly Mementos', 'Ultimate Hunter'], sub: 'Sorcery', subRunes: ['Manaflow Band', 'Transcendence'], shards: [5008, 5008, 5011] },
  'mage-artillery': { tree: 'Sorcery', keystone: 'Arcane Comet', rows: ['Manaflow Band', 'Transcendence', 'Scorch'], sub: 'Inspiration', subRunes: ['Biscuit Delivery', 'Cosmic Insight'], shards: [5007, 5008, 5011] },
  'mage-battle': { tree: 'Precision', keystone: 'Conqueror', rows: ['Presence of Mind', 'Legend: Haste', 'Last Stand'], sub: 'Sorcery', subRunes: ['Manaflow Band', 'Transcendence'], shards: [5008, 5008, 5011] },
  'assassin-ad': { tree: 'Domination', keystone: 'Electrocute', rows: ['Sudden Impact', 'Grisly Mementos', 'Relentless Hunter'], sub: 'Precision', subRunes: ['Triumph', 'Last Stand'], shards: [5008, 5008, 5011] },
  bruiser: { tree: 'Precision', keystone: 'Conqueror', rows: ['Triumph', 'Legend: Alacrity', 'Last Stand'], sub: 'Resolve', subRunes: ['Bone Plating', 'Unflinching'], shards: [5005, 5008, 5011] },
  'ap-bruiser': { tree: 'Precision', keystone: 'Conqueror', rows: ['Triumph', 'Legend: Haste', 'Last Stand'], sub: 'Resolve', subRunes: ['Bone Plating', 'Unflinching'], shards: [5008, 5008, 5011] },
  tank: { tree: 'Resolve', keystone: 'Grasp of the Undying', rows: ['Demolish', 'Bone Plating', 'Overgrowth'], sub: 'Inspiration', subRunes: ['Magical Footwear', 'Biscuit Delivery'], shards: [5007, 5001, 5011] },
  enchanter: { tree: 'Sorcery', keystone: 'Summon Aery', rows: ['Manaflow Band', 'Transcendence', 'Scorch'], sub: 'Resolve', subRunes: ['Font of Life', 'Revitalize'], shards: [5007, 5008, 5011] },
  'support-tank': { tree: 'Resolve', keystone: 'Aftershock', rows: ['Font of Life', 'Bone Plating', 'Unflinching'], sub: 'Inspiration', subRunes: ['Biscuit Delivery', 'Cosmic Insight'], shards: [5007, 5010, 5011] },
};

// Well-known ability max orders; everything else uses the level-tip heuristic below.
const MAX_ORDER = {
  Jinx: 'QWE', Ezreal: 'QEW', Caitlyn: 'QWE', Kaisa: 'QEW', Vayne: 'QWE', Lucian: 'QEW', Ashe: 'WQE', MissFortune: 'QEW',
  Draven: 'QWE', KogMaw: 'WQE', Tristana: 'EQW', Jhin: 'QWE', Yasuo: 'QEW', Yone: 'QWE', Riven: 'QEW', Irelia: 'QEW',
  Darius: 'QEW', Garen: 'EQW', Ahri: 'QWE', Zed: 'QEW', Lux: 'EQW', Syndra: 'QWE', Annie: 'QWE', Lulu: 'EQW',
  Janna: 'EWQ', Soraka: 'WQE', Nami: 'WEQ', Sona: 'QWE', Yuumi: 'EQW',
};

function tune(preset, cls, role, laner, t) {
  const p = { ...preset, rows: [...preset.rows], subRunes: [...preset.subRunes], shards: [...preset.shards] };
  const reasons = [];
  const melee = ['bruiser', 'ap-bruiser', 'tank', 'assassin-ad'].includes(cls);
  if (role === 'JUNGLE' && cls === 'tank') Object.assign(p, { keystone: 'Aftershock', rows: ['Font of Life', 'Bone Plating', 'Unflinching'] });
  if (cls === 'marksman' && t.tanks >= 0.35) { p.rows[2] = 'Cut Down'; reasons.push('loadout.cutDown'); }
  if (cls === 'marksman' && laner && laner.attackType === 'MELEE' && laner.archetypes.some((a) => ['ASSASSIN', 'DIVER'].includes(a))) {
    p.keystone = 'Fleet Footwork'; reasons.push('loadout.fleet');
  }
  if (laner && laner.attackType === 'RANGED' && melee && ['TOP', 'MIDDLE'].includes(role)) {
    if (p.sub === 'Resolve') p.subRunes[0] = 'Second Wind';
    if (p.tree === 'Resolve') p.rows[1] = 'Second Wind';
    reasons.push('loadout.secondWind');
  }
  if (t.cc >= 2) { p.shards[2] = 5013; reasons.push('loadout.tenacity'); }
  return { p, reasons };
}

function resolveRunes(db, p) {
  const trees = db.runes.trees;
  const tree = trees.find((x) => x.nameEn === p.tree) || trees[0];
  const sub = trees.find((x) => x.nameEn === p.sub && x.id !== tree.id) || trees.find((x) => x.id !== tree.id);
  const pick = (row, name) => (row.find((r) => r.nameEn === name) || row[0]).id;
  const perks = [pick(tree.slots[0], p.keystone), ...[1, 2, 3].map((i) => pick(tree.slots[i], p.rows[i - 1]))];
  const used = new Set();
  for (const name of p.subRunes) {
    const idx = sub.slots.findIndex((row, i) => i > 0 && !used.has(i) && row.some((r) => r.nameEn === name));
    if (idx > 0) { used.add(idx); perks.push(sub.slots[idx].find((r) => r.nameEn === name).id); }
  }
  for (let i = 1; perks.length < 6 && i < sub.slots.length; i++) if (!used.has(i)) { used.add(i); perks.push(sub.slots[i][0].id); }
  return { primaryStyleId: tree.id, subStyleId: sub.id, selectedPerkIds: [...perks, ...p.shards] };
}

function pickSpells(cls, role, laner, t) {
  const squishy = ['marksman', 'mage-burst', 'mage-artillery', 'mage-battle', 'enchanter'].includes(cls);
  const burst = t.burstAD + t.burstAP;
  let other;
  let reason;
  if (role === 'JUNGLE') { other = 'SummonerSmite'; reason = 'loadout.smite'; }
  else if (role === 'BOTTOM') {
    if (t.cc >= 2.2) { other = 'SummonerBoost'; reason = 'loadout.cleanse'; } else { other = 'SummonerHeal'; reason = 'loadout.heal'; }
  } else if (role === 'SUPPORT') {
    if (cls === 'enchanter' && burst >= 0.25) { other = 'SummonerExhaust'; reason = 'loadout.exhaust'; } else { other = 'SummonerDot'; reason = 'loadout.ignite'; }
  } else if (role === 'MIDDLE') {
    if (['assassin-ad', 'mage-burst'].includes(cls)) { other = 'SummonerDot'; reason = 'loadout.ignite'; }
    else if (squishy && laner && laner.archetypes.includes('ASSASSIN')) { other = 'SummonerBarrier'; reason = 'loadout.barrier'; }
    else { other = 'SummonerTeleport'; reason = 'loadout.teleport'; }
  } else { other = 'SummonerTeleport'; reason = 'loadout.teleport'; }
  return { spells: ['SummonerFlash', other], reason };
}

function abilityPriority(spell, cls) {
  const labels = (spell.labels || []).join(' ').toLowerCase();
  let score = (labels.match(/damage/g) || []).length * 2;
  if (['enchanter', 'support-tank'].includes(cls)) score += (labels.match(/heal|shield/g) || []).length * 2.5;
  if (/cooldown/.test(labels)) score += 0.5;
  return score;
}

function skillOrder(champ, cls) {
  const basics = champ.spells.slice(0, 3);
  const r = champ.spells[3];
  const fixed = MAX_ORDER[champ.id];
  const order = fixed ? fixed.split('') : basics.map((s, i) => ({ key: s.key, score: abilityPriority(s, cls) - i * 0.01 }))
    .sort((a, b) => b.score - a.score).map((x) => x.key);
  const standard = r && r.maxrank === 3 && basics.every((s) => s.maxrank === 5);
  if (!standard) return { max: order, levels: null, known: !!fixed };
  const ranks = { Q: 0, W: 0, E: 0, R: 0 };
  const levels = [];
  for (let lvl = 1; lvl <= 18; lvl++) {
    let key;
    if ([6, 11, 16].includes(lvl)) key = 'R';
    else if (lvl <= 3) key = order[lvl - 1];
    else key = order.find((k) => ranks[k] < 5 && ranks[k] < Math.ceil(lvl / 2)) || order.find((k) => ranks[k] < 5);
    ranks[key] += 1;
    levels.push(key);
  }
  return { max: order, levels, known: !!fixed };
}

function recommendLoadout(db, { champ, cls, role, laner, threats }) {
  const { p, reasons } = tune(PRESETS[cls], cls, role, laner, threats);
  const runes = db.runes.trees.length ? resolveRunes(db, p) : null;
  const spells = pickSpells(cls, role, laner, threats);
  const byKey = Object.fromEntries(db.summoners.map((s) => [s.key, s]));
  return {
    runes: runes && { ...runes, reasons },
    spells: { ids: spells.spells.map((k) => (byKey[k] ? byKey[k].id : null)).filter(Boolean), reason: spells.reason },
    skills: skillOrder(champ, cls),
  };
}

// Of the pages the client recommends, the one closest to the matchup-tuned page: same
// keystone first, then the same trees and the most shared runes.
function closestPage(pages, ours) {
  const score = (p) => (p.selectedPerkIds[0] === ours.selectedPerkIds[0] ? 10 : 0)
    + (p.primaryStyleId === ours.primaryStyleId ? 3 : 0) + (p.subStyleId === ours.subStyleId ? 2 : 0)
    + p.selectedPerkIds.filter((id) => ours.selectedPerkIds.includes(id)).length;
  return pages.reduce((best, p) => (!best || score(p) > score(best) ? p : best), null);
}

module.exports = { recommendLoadout, closestPage };
