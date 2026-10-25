// Counter-pick scoring. A candidate's score against the enemy laner combines curated
// matchup knowledge, archetype matchups and ability traits (range, CC, mobility,
// %HP damage...), then team composition and the player's own champion pool.
// Reasons are returned as translation keys ({ delta, key, params }) for the UI.
const { COUNTERS, ARCH_BEATS } = require('./knowledge');

const LANE_ROLES = new Set(['TOP', 'MIDDLE']);
const TANKY = ['TANK', 'VANGUARD', 'WARDEN', 'JUGGERNAUT'];
const has = (c, archetypes) => c.archetypes.some((a) => archetypes.includes(a));
const sum = (reasons) => reasons.reduce((s, r) => s + r.delta, 0);

function counterList(id, overrides = {}) {
  return overrides[id] || COUNTERS[id] || [];
}

function archetypeEdge(me, enemy) {
  let edge = 0;
  for (const a of me.archetypes) for (const b of enemy.archetypes) {
    if ((ARCH_BEATS[a] || []).includes(b)) edge += 1;
    if ((ARCH_BEATS[b] || []).includes(a)) edge -= 1;
  }
  return Math.max(-2, Math.min(2, edge));
}

// Score how well `me` plays into `enemy` in a given role. Returns 0-100 plus reasons.
function matchup(me, enemy, role, overrides) {
  const reasons = [];
  const add = (delta, key, params) => { if (delta) reasons.push({ delta, key, params }); };

  const idx = counterList(enemy.id, overrides).indexOf(me.id);
  if (idx >= 0) add(Math.max(14, 24 - idx * 2), 'reason.knownCounter', { champ: enemy.id });
  if (counterList(me.id, overrides).includes(enemy.id)) add(-18, 'reason.counteredBy', { champ: enemy.id });

  const edge = archetypeEdge(me, enemy);
  if (edge > 0) add(edge * 4, 'reason.archetypeGood');
  if (edge < 0) add(edge * 4, 'reason.archetypeBad');

  const meRanged = me.attackType === 'RANGED';
  const enemyRanged = enemy.attackType === 'RANGED';
  if (LANE_ROLES.has(role) || !role) {
    if (meRanged && !enemyRanged) add(enemy.ratings.mobility <= 1 ? 9 : 5, 'reason.rangeAdvantage');
    if (!meRanged && enemyRanged && me.ratings.mobility <= 1) add(-5, 'reason.rangeDisadvantage');
  }

  if (enemy.ratings.mobility >= 3 && me.traits.hardCC >= 2) add(6, 'reason.ccVsMobile');
  if (enemy.ratings.mobility <= 1 && (me.traits.longRange >= 2 || me.archetypes.includes('ARTILLERY'))) add(5, 'reason.pokeImmobile');
  if ((enemy.ratings.toughness >= 3 || has(enemy, TANKY)) && (me.traits.percentHp || me.traits.trueDamage)) add(7, 'reason.percentVsTank');
  if (has(enemy, ['ASSASSIN', 'BURST'])) {
    if (me.ratings.toughness >= 3) add(4, 'reason.tankyVsBurst');
    if (me.traits.untargetable) add(3, 'reason.untargetable');
    if (me.ratings.toughness <= 1 && me.ratings.mobility <= 1) add(-5, 'reason.squishyVsAssassin');
  }
  if (enemy.archetypes.includes('JUGGERNAUT') && enemy.ratings.mobility <= 2 && (meRanged || me.ratings.mobility >= 3)) add(5, 'reason.kiteJuggernaut');
  if (enemy.traits.heal >= 2 && me.ratings.damage >= 3 && has(me, ['ASSASSIN', 'BURST'])) add(3, 'reason.burstVsHeal');
  if (role === 'SUPPORT' || role === 'BOTTOM') {
    if (has(enemy, ['ENCHANTER']) && has(me, ['CATCHER', 'VANGUARD'])) add(5, 'reason.engageVsEnchanter');
    if (has(enemy, ['CATCHER', 'VANGUARD']) && (me.traits.hardCC >= 2 || has(me, ['WARDEN']))) add(3, 'reason.counterEngage');
  }
  return { score: Math.max(0, Math.min(100, 50 + sum(reasons))), reasons };
}

function teamComposition(me, allies) {
  const reasons = [];
  if (!allies.length) return reasons;
  const ad = allies.filter((a) => a.damageType === 'AD').length;
  const ap = allies.length - ad;
  if (me.damageType === 'AP' && ad - ap >= 2) reasons.push({ delta: 5, key: 'reason.teamNeedsAP' });
  if (me.damageType === 'AD' && ap - ad >= 2) reasons.push({ delta: 5, key: 'reason.teamNeedsAD' });
  if (me.damageType === 'AD' && ad >= 3 && ap === 0) reasons.push({ delta: -4, key: 'reason.tooMuchAD' });
  const frontline = allies.some((a) => has(a, TANKY) && a.ratings.toughness >= 3);
  if (!frontline && allies.length >= 2 && has(me, TANKY) && me.ratings.toughness >= 3) reasons.push({ delta: 4, key: 'reason.needFrontline' });
  const cc = allies.reduce((s, a) => s + a.traits.hardCC, 0);
  if (cc <= allies.length && me.traits.hardCC >= 2) reasons.push({ delta: 3, key: 'reason.addsCC' });
  return reasons;
}

function enemyTeamFit(me, enemies, overrides) {
  const reasons = [];
  const wins = enemies.filter((e) => counterList(e.id, overrides).includes(me.id)).length;
  if (wins) reasons.push({ delta: 3 * wins, key: 'reason.goodVsOthers', params: { n: wins } });
  const mobile = enemies.filter((e) => e.ratings.mobility >= 3).length;
  if (mobile >= 3 && me.traits.hardCC >= 2) reasons.push({ delta: 3, key: 'reason.mobileEnemyTeam' });
  return reasons;
}

function poolBonus(me, role, pool, mastery) {
  const reasons = [];
  if (((pool && pool[role]) || []).includes(me.id)) reasons.push({ delta: 8, key: 'reason.inPool' });
  const pts = mastery && mastery[me.key];
  if (pts >= 20000) {
    reasons.push({ delta: Math.min(6, Math.round(Math.log10(pts / 10000) * 4) + 2), key: 'reason.mastery', params: { n: Math.round(pts / 1000) } });
  }
  return reasons;
}

// Blind pick safety when the enemy laner is unknown: fewer known counters = safer.
function blindScore(me, overrides) {
  const reasons = [];
  const countered = counterList(me.id, overrides).length;
  if (countered === 0) reasons.push({ delta: 4, key: 'reason.noHardCounters' });
  else if (countered >= 6) reasons.push({ delta: -4, key: 'reason.riskyBlind' });
  if (me.ratings.toughness >= 2 && me.ratings.mobility >= 2) reasons.push({ delta: 3, key: 'reason.safeBlind' });
  if (me.ratings.difficulty >= 3) reasons.push({ delta: -2, key: 'reason.hardMechanics' });
  return { score: 60 + sum(reasons), reasons };
}

function suggestCounters(db, opts) {
  const { role, enemyId, allyIds = [], enemyIds = [], excludeIds = [], pickableIds, pool, mastery, overrides = {}, limit = 15 } = opts;
  const enemy = enemyId ? db.byId[enemyId] : null;
  const allies = allyIds.map((id) => db.byId[id]).filter(Boolean);
  const others = enemyIds.filter((id) => id !== enemyId).map((id) => db.byId[id]).filter(Boolean);
  const exclude = new Set(excludeIds);
  const pickable = pickableIds && pickableIds.length ? new Set(pickableIds) : null;

  const results = [];
  for (const c of db.champions) {
    if (exclude.has(c.id) || (enemy && c.id === enemy.id)) continue;
    if (pickable && !pickable.has(c.key)) continue;
    if (role && !c.positions.includes(role)) continue;
    const base = enemy ? matchup(c, enemy, role, overrides) : blindScore(c, overrides);
    const extra = [...teamComposition(c, allies), ...enemyTeamFit(c, others, overrides), ...poolBonus(c, role, pool, mastery)];
    const score = Math.max(0, Math.min(100, base.score + sum(extra)));
    results.push({ id: c.id, score, reasons: [...base.reasons, ...extra].sort((a, b) => b.delta - a.delta) });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// For the champion detail page: who it beats and who beats it.
function championMatchups(db, id, overrides = {}) {
  const me = db.byId[id];
  if (!me) return { strong: [], weak: [] };
  const weak = counterList(id, overrides).filter((x) => db.byId[x]);
  const strong = Object.entries({ ...COUNTERS, ...overrides })
    .filter(([enemy, list]) => list.includes(id) && db.byId[enemy]).map(([enemy]) => enemy);
  const role = me.positions[0];
  const peers = db.champions.filter((c) => c.id !== id && c.positions.some((p) => me.positions.includes(p)));
  const scored = peers.map((e) => ({ id: e.id, score: matchup(me, e, role, overrides).score })).sort((a, b) => b.score - a.score);
  for (const s of scored) { if (strong.length >= 8) break; if (!strong.includes(s.id) && !weak.includes(s.id)) strong.push(s.id); }
  for (const s of scored.reverse()) { if (weak.length >= 8) break; if (!weak.includes(s.id) && !strong.includes(s.id)) weak.push(s.id); }
  return { strong: strong.slice(0, 8), weak: weak.slice(0, 8) };
}

module.exports = { suggestCounters, championMatchups, matchup };
