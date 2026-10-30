// Champion briefs and ally tips. A brief says in 1–2 lines what a champion does in a fight
// (its class plus a few standout traits), built from the archetypes, ratings and ability
// traits in the database, so it works for every champion — new ones included; curated briefs
// (knowledge.js) win where the rules fall short. Ally tips say how the player, from their
// role and champion, plays with each ally. Texts are translation keys ({ key, params }).
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

// Briefs for every champion in the game plus the ally tips, for the Draft view and the
// loading screen. me = { championId, role }, allies (without the player) and enemies = [{ championId, role }].
function teamNotes(db, { me = {}, allies = [], enemies = [] } = {}) {
  const ids = [me.championId, ...allies.map((a) => a.championId), ...enemies.map((e) => e.championId)].filter((id) => db.byId[id]);
  const briefs = Object.fromEntries(ids.map((id) => [id, championBrief(db.byId[id])]));
  return { briefs, allyTips: allyTips(db, me, allies) };
}

module.exports = { championBrief, allyTips, teamNotes, ALLY_RULES, TRAITS, CLASS_ORDER };
