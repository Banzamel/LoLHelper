// Champion briefs, ally tips and team compositions (engine/team.js): rules on small invented champions, plus
// coverage checks on the bundled database (run `npm run fetch-data` first) and the lang files.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const {
  championBrief, allyTips, teamComposition, teamNotes, ALLY_RULES, TRAITS, CLASS_ORDER, STYLES, PLANS, WARNINGS, MIXED,
} = require('../src/main/engine/team');
const { BRIEFS } = require('../src/main/engine/knowledge');

const LANGS = ['pl', 'en'].map((code) => require(`../src/renderer/lang/${code}.json`));

// A plain champion: middling ratings, no standout traits; `over` sets what a test is about.
function champion(id, { ratings = {}, traits = {}, ...over } = {}) {
  return {
    id, archetypes: [], attackType: 'MELEE', damageType: 'AD', resource: 'MANA', positions: ['TOP'],
    ratings: { damage: 2, toughness: 2, control: 2, mobility: 2, utility: 1, difficulty: 2, ...ratings },
    traits: { hardCC: 0, longRange: 0, heal: 0, percentHp: 0, trueDamage: 0, untargetable: 0, stealth: 0, execute: 0, ...traits },
    ...over,
  };
}

const dbOf = (...champions) => ({ byId: Object.fromEntries(champions.map((c) => [c.id, c])) });

const MARKSMAN = champion('Ash', { archetypes: ['MARKSMAN'], attackType: 'RANGED', positions: ['BOTTOM'], ratings: { damage: 3, toughness: 1 } });
const ENCHANTER = champion('Lulu', { archetypes: ['ENCHANTER', 'SUPPORT'], attackType: 'RANGED', positions: ['SUPPORT'] });
const CATCHER = champion('Thresh', { archetypes: ['CATCHER', 'SUPPORT', 'TANK'], attackType: 'RANGED', positions: ['SUPPORT'], ratings: { control: 3 } });
const CC_MAGE = champion('Lissandra', { archetypes: ['MAGE'], attackType: 'RANGED', positions: ['MIDDLE'], ratings: { mobility: 2 }, traits: { hardCC: 2 } });
const JUNGLER = champion('Vi', { archetypes: ['DIVER'], positions: ['JUNGLE'] });

test('a brief names the most specific class of the champion', () => {
  const brief = championBrief(CATCHER);

  assert.strictEqual(brief.key, 'brief.class.CATCHER');
});

test('a brief lists at most three standout traits, most telling first', () => {
  const c = champion('Many', { archetypes: ['ASSASSIN'], ratings: { mobility: 3, damage: 3, toughness: 1, difficulty: 3 }, traits: { hardCC: 2, stealth: 1 } });

  const brief = championBrief(c);

  assert.deepStrictEqual(brief.traits, ['brief.trait.cc', 'brief.trait.mobile', 'brief.trait.glassCannon']);
});

test('a ranged champion of a melee class gets the ranged trait', () => {
  const c = champion('Jayce', { archetypes: ['FIGHTER'], attackType: 'RANGED' });

  const brief = championBrief(c);

  assert.deepStrictEqual(brief.traits, ['brief.trait.ranged']);
});

test('a champion without archetypes still gets a brief', () => {
  const brief = championBrief(champion('Blank'));

  assert.deepStrictEqual(brief, { key: 'brief.class.OTHER', traits: [] });
});

test('a curated brief replaces the generated one', () => {
  const yuumi = champion('Yuumi', { archetypes: ['ENCHANTER'], ratings: { mobility: 3 } });

  const brief = championBrief(yuumi);

  assert.deepStrictEqual(brief, { key: BRIEFS.Yuumi, traits: [] });
});

test('an unknown champion has no brief', () => {
  assert.strictEqual(championBrief(undefined), null);
});

test('a marksman is told to stay close to an enchanter support', () => {
  const db = dbOf(MARKSMAN, ENCHANTER);

  const tips = allyTips(db, { championId: 'Ash', role: 'BOTTOM' }, [{ championId: 'Lulu', role: 'SUPPORT' }]);

  assert.deepStrictEqual(tips, [{ championId: 'Lulu', role: 'SUPPORT', tips: [{ key: 'tip.stayWithEnchanter', params: { champ: 'Lulu' } }] }]);
});

test('a jungler is told to gank the lane of an ally with crowd control', () => {
  const db = dbOf(JUNGLER, CC_MAGE);

  const [entry] = allyTips(db, { championId: 'Vi', role: 'JUNGLE' }, [{ championId: 'Lissandra', role: 'MIDDLE' }]);

  assert.strictEqual(entry.tips[0].key, 'tip.gankCc');
});

test('an ally gets at most two tips, in rule order', () => {
  // Matches three rules: follow the catch, wait for the engage, fight behind the frontline.
  const leona = champion('Leona', { archetypes: ['VANGUARD', 'CATCHER', 'TANK'], positions: ['SUPPORT'], ratings: { toughness: 3, control: 3 } });
  const db = dbOf(MARKSMAN, leona);

  const [entry] = allyTips(db, { championId: 'Ash', role: 'BOTTOM' }, [{ championId: 'Leona', role: 'SUPPORT' }]);

  assert.deepStrictEqual(entry.tips.map((x) => x.key), ['tip.followCatch', 'tip.waitForEngage']);
});

test('empty slots and unknown champions get no tips', () => {
  const db = dbOf(MARKSMAN);

  const tips = allyTips(db, { championId: 'Ash', role: 'BOTTOM' }, [{ championId: null, role: 'SUPPORT' }, { championId: 'Nobody', role: 'TOP' }]);

  assert.deepStrictEqual(tips, []);
});

test('role rules apply before the player has picked a champion', () => {
  const db = dbOf(CC_MAGE);

  const [entry] = allyTips(db, { championId: null, role: 'JUNGLE' }, [{ championId: 'Lissandra', role: 'MIDDLE' }]);

  assert.deepStrictEqual(entry.tips.map((x) => x.key), ['tip.gankCc']);
});

test('without a role or a champion the player gets no tips', () => {
  const db = dbOf(ENCHANTER);

  const tips = allyTips(db, { championId: null, role: null }, [{ championId: 'Lulu', role: 'SUPPORT' }]);

  assert.deepStrictEqual(tips, []);
});

test('without a known role the player plays the champion main position', () => {
  const db = dbOf(MARKSMAN, ENCHANTER);

  const [entry] = allyTips(db, { championId: 'Ash', role: null }, [{ championId: 'Lulu', role: null }]);

  assert.strictEqual(entry.tips[0].key, 'tip.stayWithEnchanter');
});

test('the player own champion is not listed as an ally', () => {
  const db = dbOf(MARKSMAN, ENCHANTER);

  const tips = allyTips(db, { championId: 'Ash', role: 'BOTTOM' }, [{ championId: 'Ash', role: 'BOTTOM' }]);

  assert.deepStrictEqual(tips, []);
});

test('team notes hold a brief for every known champion in the game', () => {
  const db = dbOf(MARKSMAN, ENCHANTER, CATCHER);

  const notes = teamNotes(db, { me: { championId: 'Ash', role: 'BOTTOM' }, allies: [{ championId: 'Lulu' }, { championId: null }], enemies: [{ championId: 'Thresh' }, { championId: 'Nobody' }] });

  assert.deepStrictEqual(Object.keys(notes.briefs).sort(), ['Ash', 'Lulu', 'Thresh']);
});

test('every champion in the database gets a brief', () => {
  const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));

  const missing = db.champions.filter((c) => !championBrief(c)).map((c) => c.id);

  assert.ok(db.champions.length > 0);
  assert.deepStrictEqual(missing, []);
});

test('curated briefs use valid Data Dragon ids', () => {
  const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));

  const unknown = Object.keys(BRIEFS).filter((id) => !db.byId[id]);

  assert.deepStrictEqual(unknown, []);
});

test('every brief and tip text exists in every language', () => {
  const keys = [...CLASS_ORDER, 'OTHER'].map((a) => `brief.class.${a}`)
    .concat(TRAITS.map(([key]) => key), ALLY_RULES.map(([key]) => key), Object.values(BRIEFS));

  const missing = LANGS.flatMap((dict) => keys.filter((k) => !dict[k]));

  assert.deepStrictEqual(missing, []);
});

// ---- Team composition ---------------------------------------------------------------------

const PLAIN = champion('Plain');
const PLAIN_AP = champion('PlainAp', { damageType: 'AP' });
const TANK = champion('Ornn', { archetypes: ['VANGUARD', 'TANK'], ratings: { toughness: 3, control: 3 } });
const DIVER = champion('Jarvan', { archetypes: ['DIVER'] });
const ARTILLERY = champion('Xerath', { archetypes: ['ARTILLERY', 'MAGE'], attackType: 'RANGED', damageType: 'AP' });
const LONG_RANGE = champion('Ezreal', { archetypes: ['MAGE'], attackType: 'RANGED', traits: { longRange: 2 } });
const ASSASSIN = champion('Zed', { archetypes: ['ASSASSIN'] });
const DUELIST = champion('Fiora', { archetypes: ['ASSASSIN', 'SKIRMISHER'] });
const SPLITTER = champion('Tryndamere', { archetypes: ['SKIRMISHER'] });

const hasWarning = (comp, key) => comp.warnings.some((w) => w.key === key);

test('a team with two engagers is an engage team led by the first of them', () => {
  const comp = teamComposition([TANK, DIVER, PLAIN]);

  assert.strictEqual(comp.style, 'ENGAGE');
  assert.deepStrictEqual(comp.plan[1], { key: 'comp.plan.ENGAGE.2', params: { champ: 'Ornn' } });
});

test('a marksman with an enchanter is a protect team around the marksman', () => {
  const comp = teamComposition([ENCHANTER, MARKSMAN, PLAIN]);

  assert.strictEqual(comp.style, 'PROTECT');
  assert.deepStrictEqual(comp.plan[0].params, { champ: 'Ash' });
});

test('marksmen without anyone to protect them are not a protect team', () => {
  const second = champion('Jinx', { archetypes: ['MARKSMAN'], attackType: 'RANGED' });

  const comp = teamComposition([MARKSMAN, second, PLAIN]);

  assert.strictEqual(comp.style, MIXED);
});

test('a team with two long-range ranged champions is a poke team', () => {
  const comp = teamComposition([ARTILLERY, LONG_RANGE, PLAIN]);

  assert.strictEqual(comp.style, 'POKE');
});

test('a catcher with an assassin is a pick team', () => {
  const comp = teamComposition([CATCHER, ASSASSIN, PLAIN]);

  assert.strictEqual(comp.style, 'PICK');
});

test('skirmishers split push even when they are tagged as assassins', () => {
  const comp = teamComposition([DUELIST, SPLITTER, PLAIN]);

  assert.strictEqual(comp.style, 'SPLIT');
});

test('a tie between styles goes to the earlier style', () => {
  const comp = teamComposition([TANK, DIVER, CATCHER, ASSASSIN]);

  assert.strictEqual(comp.style, 'ENGAGE');
});

test('a team where no style has two members is mixed with a two-line plan', () => {
  const comp = teamComposition([TANK, ASSASSIN, PLAIN]);

  assert.strictEqual(comp.style, MIXED);
  assert.deepStrictEqual(comp.plan, [{ key: 'comp.plan.MIXED.1', params: {} }, { key: 'comp.plan.MIXED.2', params: {} }]);
});

test('a detected style has a three-line plan and an enemy line', () => {
  const comp = teamComposition([ARTILLERY, LONG_RANGE, PLAIN]);

  assert.strictEqual(comp.plan.length, 3);
  assert.deepStrictEqual(comp.enemyLine, { key: 'comp.enemy.POKE', params: { champ: 'Xerath' } });
});

test('fewer than three known champions give no composition', () => {
  assert.strictEqual(teamComposition([TANK, DIVER]), null);
});

test('a team without a tank warns about the missing frontline', () => {
  const comp = teamComposition([PLAIN, ASSASSIN, MARKSMAN]);

  assert.ok(hasWarning(comp, 'comp.warn.noFrontline'));
});

test('a tanky vanguard removes the frontline warning', () => {
  const comp = teamComposition([TANK, ASSASSIN, MARKSMAN]);

  assert.ok(!hasWarning(comp, 'comp.warn.noFrontline'));
});

test('an AD team with a low-damage AP enchanter warns about physical damage', () => {
  const lulu = champion('Lulu', { archetypes: ['ENCHANTER'], damageType: 'AP', ratings: { damage: 1 } });

  const comp = teamComposition([PLAIN, ASSASSIN, MARKSMAN, lulu]);

  assert.ok(hasWarning(comp, 'comp.warn.physicalOnly'));
});

test('an all AP team warns about magic damage', () => {
  const comp = teamComposition([ARTILLERY, PLAIN_AP, champion('Annie', { damageType: 'AP' })]);

  assert.ok(hasWarning(comp, 'comp.warn.magicOnly'));
});

test('a team with both damage types gets no damage warning', () => {
  const comp = teamComposition([ARTILLERY, PLAIN, ASSASSIN]);

  assert.ok(!hasWarning(comp, 'comp.warn.physicalOnly') && !hasWarning(comp, 'comp.warn.magicOnly'));
});

test('a team without engagers or catchers warns about the missing engage', () => {
  const comp = teamComposition([PLAIN, ASSASSIN, MARKSMAN]);

  assert.ok(hasWarning(comp, 'comp.warn.noEngage'));
});

test('a catcher counts as engage', () => {
  const comp = teamComposition([PLAIN, ASSASSIN, CATCHER]);

  assert.ok(!hasWarning(comp, 'comp.warn.noEngage'));
});

test('a team with one crowd control champion warns about low crowd control', () => {
  const comp = teamComposition([CC_MAGE, PLAIN, MARKSMAN]);

  assert.ok(hasWarning(comp, 'comp.warn.lowCC'));
});

test('two crowd control champions remove the low crowd control warning', () => {
  const comp = teamComposition([CC_MAGE, CATCHER, MARKSMAN]);

  assert.ok(!hasWarning(comp, 'comp.warn.lowCC'));
});

test('the player champion counts toward the ally team composition', () => {
  const db = dbOf(TANK, DIVER, PLAIN);

  const notes = teamNotes(db, { me: { championId: 'Ornn' }, allies: [{ championId: 'Jarvan' }, { championId: 'Plain' }] });

  assert.strictEqual(notes.composition.allies.style, 'ENGAGE');
});

test('empty slots, unknown and repeated champions do not count toward a composition', () => {
  const db = dbOf(TANK, DIVER);

  const notes = teamNotes(db, { me: { championId: 'Ornn' }, allies: [{ championId: 'Jarvan' }, { championId: null }, { championId: 'Nobody' }, { championId: 'Ornn' }] });

  assert.strictEqual(notes.composition.allies, null);
});

test('team notes hold the enemy team composition', () => {
  const db = dbOf(ARTILLERY, LONG_RANGE, PLAIN);

  const notes = teamNotes(db, { enemies: [{ championId: 'Xerath' }, { championId: 'Ezreal' }, { championId: 'Plain' }] });

  assert.strictEqual(notes.composition.enemies.style, 'POKE');
});

test('every champion in the database fits a composition', () => {
  const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));
  const styles = [...STYLES.map(([style]) => style), MIXED];

  const unknown = db.champions.map((c, i) => teamComposition([c, ...db.champions.slice(i + 1, i + 3)]))
    .filter((comp) => comp && !styles.includes(comp.style));

  assert.deepStrictEqual(unknown, []);
});

test('every team plan text exists in every language', () => {
  const styles = Object.keys(PLANS);
  const keys = ['comp.title', 'comp.hint', 'comp.warnings', 'comp.enemyLabel']
    .concat(styles.map((s) => `comp.style.${s}`), styles.map((s) => `comp.enemy.${s}`), Object.values(PLANS).flat(), WARNINGS.map(([key]) => key));

  const missing = LANGS.flatMap((dict) => keys.filter((k) => !dict[k]));

  assert.deepStrictEqual(missing, []);
});
