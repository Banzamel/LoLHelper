// Champion briefs and ally tips. A brief says in 1–2 lines what a champion does in a fight
// (its class plus a few standout traits), built from the archetypes, ratings and ability
// traits in the database, so it works for every champion — new ones included; curated briefs
// (knowledge.js) win where the rules fall short. Ally tips say how the player, from their
// role and champion, plays with each ally. A team composition names the team's style (engage,
// protect the carry, poke, pick, split push), how to play it and its gaps (no frontline, one
// damage type…). Texts are translation keys ({ key, params }).
const { BRIEFS } = require('./knowledge');

// Most specific class first: Meraki lists subclasses (CATCHER) next to broad ones (SUPPORT).
const CLASS_ORDER = ['ENCHANTER', 'CATCHER', 'WARDEN', 'VANGUARD', 'JUGGERNAUT', 'DIVER', 'SKIRMISHER', 'ASSASSIN', 'BURST',
  'BATTLEMAGE', 'ARTILLERY', 'MARKSMAN', 'SPECIALIST', 'TANK', 'FIGHTER', 'MAGE', 'SUPPORT'];
const MELEE_CLASSES = ['JUGGERNAUT', 'DIVER', 'SKIRMISHER', 'VANGUARD', 'WARDEN', 'TANK', 'FIGHTER'];
const RANGED_CLASSES = ['MARKSMAN', 'ARTILLERY', 'BURST', 'BATTLEMAGE', 'MAGE', 'ENCHANTER'];
const ENGAGE = ['VANGUARD', 'CATCHER'];
const FRONTLINE = ['TANK', 'VANGUARD', 'WARDEN', 'JUGGERNAUT'];
const SQUISHY_DAMAGE = ['MARKSMAN', 'ARTILLERY', 'BURST', 'MAGE'];
const DIVE = ['ASSASSIN', 'DIVER', 'SKIRMISHER'];
const SIDE_LANES = ['TOP', 'MIDDLE', 'BOTTOM'];
const GANKABLE = [...SIDE_LANES, 'SUPPORT'];
const MAX_TRAITS = 3;
const MAX_TIPS = 2;

const has = (c, archetypes) => !!c && c.archetypes.some((a) => archetypes.includes(a));
const hasCC = (c) => !!c && (c.traits.hardCC >= 2 || c.ratings.control >= 3);
const isFrontline = (c) => has(c, FRONTLINE) && c.ratings.toughness >= 3;
const isSquishyCarry = (c) => has(c, SQUISHY_DAMAGE) && c.ratings.toughness <= 1;

function classOf(c) {
  return CLASS_ORDER.find((a) => c.archetypes.includes(a)) || 'OTHER';
}

// Standout traits, most telling first; only the first MAX_TRAITS that apply are shown.
const TRAITS = [
  ['brief.trait.cc', (c) => hasCC(c)],
  ['brief.trait.mobile', (c) => c.ratings.mobility >= 3],
  ['brief.trait.tanky', (c) => c.ratings.toughness >= 3],
  ['brief.trait.glassCannon', (c) => c.ratings.damage >= 3 && c.ratings.toughness <= 1],
  // An unusual attack range for the class is worth saying (ranged top laner, melee mage).
  ['brief.trait.ranged', (c, cls) => c.attackType === 'RANGED' && MELEE_CLASSES.includes(cls)],
  ['brief.trait.melee', (c, cls) => c.attackType === 'MELEE' && RANGED_CLASSES.includes(cls)],
  ['brief.trait.longRange', (c) => c.traits.longRange >= 2],
  ['brief.trait.sustain', (c) => c.traits.heal >= 2],
  ['brief.trait.tankShred', (c) => c.traits.percentHp >= 1 || c.traits.trueDamage >= 2],
  ['brief.trait.untargetable', (c) => c.traits.untargetable >= 1],
  ['brief.trait.stealth', (c) => c.traits.stealth >= 1],
  ['brief.trait.execute', (c) => c.traits.execute >= 1],
  ['brief.trait.energy', (c) => c.resource === 'ENERGY'],
  ['brief.trait.manaless', (c) => c.resource !== 'MANA' && c.resource !== 'ENERGY'],
  ['brief.trait.hard', (c) => c.ratings.difficulty >= 3],
];

// { key, traits: [key] } for a champion, or null when the champion is unknown.
function championBrief(c) {
  if (!c) return null;
  if (BRIEFS[c.id]) return { key: BRIEFS[c.id], traits: [] };
  const cls = classOf(c);
  const traits = TRAITS.filter(([, applies]) => applies(c, cls)).map(([key]) => key).slice(0, MAX_TRAITS);
  return { key: `brief.class.${cls}`, traits };
}

// How the player (me) plays with an ally, in priority order: duo lane first, then the
// jungler's lanes, then teamfight roles. me.c / ally.c are champions, me.c may be null
// (not picked yet) and roles may be null; a rule that needs a missing value does not apply.
const ALLY_RULES = [
  ['tip.stayWithEnchanter', (me, ally) => me.role === 'BOTTOM' && has(ally.c, ['ENCHANTER'])],
  ['tip.followCatch', (me, ally) => me.role === 'BOTTOM' && has(ally.c, ['CATCHER'])],
  ['tip.peelForCarry', (me, ally) => me.role === 'SUPPORT' && has(me.c, ['ENCHANTER', 'WARDEN']) && (ally.role === 'BOTTOM' || has(ally.c, ['MARKSMAN']))],
  ['tip.engageForCarry', (me, ally) => has(me.c, ENGAGE) && isSquishyCarry(ally.c)],
  ['tip.waitForEngage', (me, ally) => (me.role === 'BOTTOM' || isSquishyCarry(me.c)) && has(ally.c, ['VANGUARD'])],
  ['tip.gankCc', (me, ally) => me.role === 'JUNGLE' && GANKABLE.includes(ally.role) && hasCC(ally.c)],
  ['tip.coverImmobile', (me, ally) => me.role === 'JUNGLE' && SIDE_LANES.includes(ally.role) && ally.c.ratings.mobility <= 1],
  ['tip.skirmishMid', (me, ally) => me.role === 'JUNGLE' && ally.role === 'MIDDLE' && has(ally.c, DIVE)],
  ['tip.playForGanks', (me, ally) => SIDE_LANES.includes(me.role) && ally.role === 'JUNGLE' && (hasCC(ally.c) || has(ally.c, ['DIVER', 'ASSASSIN', 'VANGUARD']))],
  ['tip.behindFrontline', (me, ally) => isSquishyCarry(me.c) && isFrontline(ally.c)],
  ['tip.setUpDive', (me, ally) => hasCC(me.c) && has(ally.c, ['ASSASSIN', 'DIVER'])],
  ['tip.pokeFirst', (me, ally) => !!me.c && me.c.attackType === 'MELEE' && (ally.c.traits.longRange >= 2 || has(ally.c, ['ARTILLERY']))],
  ['tip.fightNearEnchanter', (me, ally) => !!me.c && me.role !== 'BOTTOM' && has(ally.c, ['ENCHANTER'])],
];

function tipsFor(me, ally) {
  return ALLY_RULES.filter(([, applies]) => applies(me, ally)).slice(0, MAX_TIPS)
    .map(([key]) => ({ key, params: { champ: ally.c.id } }));
}

// A known role, else the champion's most played one.
const roleOf = (c, role) => role || (c && c.positions[0]) || null;

// [{ championId, role, tips }] for every ally with at least one tip; empty slots, unknown
// champions and the player's own champion are skipped.
function allyTips(db, me, allies) {
  const myChamp = db.byId[me.championId] || null;
  const mine = { c: myChamp, role: roleOf(myChamp, me.role) };
  return allies
    .filter((a) => db.byId[a.championId] && a.championId !== me.championId)
    .map((a) => {
      const ally = { c: db.byId[a.championId], role: roleOf(db.byId[a.championId], a.role) };
      return { championId: ally.c.id, role: ally.role, tips: tipsFor(mine, ally) };
    })
    .filter((a) => a.tips.length);
}

// ---- Team composition ---------------------------------------------------------------------

// Fewer known champions say nothing about the team's style; from three on even the gaps are
// worth knowing mid-draft ("still no frontline").
const MIN_KNOWN = 3;
const MIN_STYLE_MEMBERS = 2;
// Below this share of the team's damage ratings the other damage type is too little to make the
// enemies buy both resists (an AP enchanter next to four AD champions).
const MIN_DAMAGE_SHARE = 0.25;
const MAX_LOW_CC = 1;

const isEngager = (c) => has(c, ['VANGUARD', 'DIVER']) || (hasCC(c) && c.ratings.toughness >= 3);
const isProtector = (c) => has(c, ['ENCHANTER', 'WARDEN']);
// Long-range marksmen (Jayce, Varus) poke rather than carry long fights.
const isHyperCarry = (c) => has(c, ['MARKSMAN']) && !has(c, ['ARTILLERY']) && c.attackType === 'RANGED';
const isPoker = (c) => c.attackType === 'RANGED' && (has(c, ['ARTILLERY']) || c.traits.longRange >= 2);
// Meraki tags many duelists (Fiora, Jax) as ASSASSIN too; they split rather than pick.
const isPicker = (c) => has(c, ['CATCHER']) || (has(c, ['ASSASSIN']) && !has(c, ['SKIRMISHER'])) || c.traits.stealth >= 1;
const isSplitPusher = (c) => has(c, ['SKIRMISHER']);

// A carry is protected only when someone protects it: both must be there. The team plays
// around one carry, so a second marksman does not make it more of a protect team.
function protectMembers(team) {
  const carry = team.find(isHyperCarry);
  const protectors = team.filter(isProtector);
  return carry && protectors.length ? [carry, ...protectors] : [];
}

// Style -> the champions that play it, in tie-break order (first wins a tie).
const STYLES = [
  ['ENGAGE', (team) => team.filter(isEngager)],
  ['PROTECT', protectMembers],
  ['POKE', (team) => team.filter(isPoker)],
  ['PICK', (team) => team.filter(isPicker)],
  ['SPLIT', (team) => team.filter(isSplitPusher)],
];
const MIXED = 'MIXED';

const PLANS = {
  ENGAGE: ['comp.plan.ENGAGE.1', 'comp.plan.ENGAGE.2', 'comp.plan.ENGAGE.3'],
  PROTECT: ['comp.plan.PROTECT.1', 'comp.plan.PROTECT.2', 'comp.plan.PROTECT.3'],
  POKE: ['comp.plan.POKE.1', 'comp.plan.POKE.2', 'comp.plan.POKE.3'],
  PICK: ['comp.plan.PICK.1', 'comp.plan.PICK.2', 'comp.plan.PICK.3'],
  SPLIT: ['comp.plan.SPLIT.1', 'comp.plan.SPLIT.2', 'comp.plan.SPLIT.3'],
  [MIXED]: ['comp.plan.MIXED.1', 'comp.plan.MIXED.2'],
};

function damageShare(team, type) {
  const total = team.reduce((s, c) => s + c.ratings.damage, 0);
  const part = team.filter((c) => c.damageType === type).reduce((s, c) => s + c.ratings.damage, 0);
  return total ? part / total : 0;
}

// The gaps of a team, all that apply, in this order.
const WARNINGS = [
  ['comp.warn.noFrontline', (team) => !team.some(isFrontline)],
  ['comp.warn.physicalOnly', (team) => damageShare(team, 'AP') < MIN_DAMAGE_SHARE],
  ['comp.warn.magicOnly', (team) => damageShare(team, 'AD') < MIN_DAMAGE_SHARE],
  ['comp.warn.noEngage', (team) => !team.some((c) => isEngager(c) || has(c, ['CATCHER']))],
  ['comp.warn.lowCC', (team) => team.filter(hasCC).length <= MAX_LOW_CC],
];

// The style with most members (at least MIN_STYLE_MEMBERS), else MIXED.
function styleOf(team) {
  const best = STYLES.map(([style, membersOf]) => ({ style, members: membersOf(team) }))
    .reduce((top, s) => (s.members.length > top.members.length ? s : top));
  return best.members.length >= MIN_STYLE_MEMBERS ? best : { style: MIXED, members: [] };
}

// { style, plan, warnings, enemyLine } for the known champions of one team, or null when fewer
// than MIN_KNOWN are known. The plan and enemy line name the style's first member as {champ}.
function teamComposition(team) {
  if (team.length < MIN_KNOWN) return null;
  const { style, members } = styleOf(team);
  const params = members.length ? { champ: members[0].id } : {};
  return {
    style,
    plan: PLANS[style].map((key) => ({ key, params })),
    warnings: WARNINGS.filter(([, applies]) => applies(team)).map(([key]) => ({ key })),
    enemyLine: { key: `comp.enemy.${style}`, params },
  };
}

const knownChampions = (db, picks) => [...new Set(picks.map((p) => p.championId))].map((id) => db.byId[id]).filter(Boolean);

// Briefs for every champion in the game, the ally tips and both teams' compositions, for the
// Draft view and the loading screen. me = { championId, role }, allies (without the player)
// and enemies = [{ championId, role }].
function teamNotes(db, { me = {}, allies = [], enemies = [] } = {}) {
  const ids = [me.championId, ...allies.map((a) => a.championId), ...enemies.map((e) => e.championId)].filter((id) => db.byId[id]);
  const briefs = Object.fromEntries(ids.map((id) => [id, championBrief(db.byId[id])]));
  const composition = {
    allies: teamComposition(knownChampions(db, [me, ...allies])),
    enemies: teamComposition(knownChampions(db, enemies)),
  };
  return { briefs, allyTips: allyTips(db, me, allies), composition };
}

module.exports = {
  championBrief, allyTips, teamComposition, teamNotes, ALLY_RULES, TRAITS, CLASS_ORDER, STYLES, PLANS, WARNINGS, MIXED, MIN_KNOWN,
};
