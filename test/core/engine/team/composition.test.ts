// Champion briefs, ally tips and team compositions (engine/team): rules on small invented champions, plus
// coverage checks on the bundled database (run `npm run fetch-data` first) and the lang files.
import { test } from 'vitest';
import type { Db } from '../../../../src/core/data/types.ts';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../../helpers.ts';
import { teamNotes } from '../../../../src/core/engine/team/teamNotes.ts';
import { championBrief } from '../../../../src/core/engine/team/briefs.ts';
import { teamComposition, STYLES, PLANS, WARNINGS, MIXED } from '../../../../src/core/engine/team/composition.ts';
import en from '../../../../src/lang/en.json';
import pl from '../../../../src/lang/pl.json';

const LANGS: Record<string, string>[] = [pl, en];

// A plain champion: middling ratings, no standout traits; `over` sets what a test is about.
function champion(id, { ratings = {}, traits = {}, ...over } : any = {}) {
  return {
    id, archetypes: [], attackType: 'MELEE', damageType: 'AD', resource: 'MANA', positions: ['TOP'],
    ratings: { damage: 2, toughness: 2, control: 2, mobility: 2, utility: 1, difficulty: 2, ...ratings },
    traits: { hardCC: 0, longRange: 0, heal: 0, percentHp: 0, trueDamage: 0, untargetable: 0, stealth: 0, execute: 0, ...traits },
    ...over,
  };
}

const dbOf = (...champions) => fixture<Db>({ byId: Object.fromEntries(champions.map((c) => [c.id, c])) });

const MARKSMAN = champion('Ash', { archetypes: ['MARKSMAN'], attackType: 'RANGED', positions: ['BOTTOM'], ratings: { damage: 3, toughness: 1 } });
const ENCHANTER = champion('Lulu', { archetypes: ['ENCHANTER', 'SUPPORT'], attackType: 'RANGED', positions: ['SUPPORT'] });
const CATCHER = champion('Thresh', { archetypes: ['CATCHER', 'SUPPORT', 'TANK'], attackType: 'RANGED', positions: ['SUPPORT'], ratings: { control: 3 } });
const CC_MAGE = champion('Lissandra', { archetypes: ['MAGE'], attackType: 'RANGED', positions: ['MIDDLE'], ratings: { mobility: 2 }, traits: { hardCC: 2 } });
const JUNGLER = champion('Vi', { archetypes: ['DIVER'], positions: ['JUNGLE'] });

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

test('a ranged champion of a melee class gets the ranged trait', () => {
  const c = champion('Jayce', { archetypes: ['FIGHTER'], attackType: 'RANGED' });

  const brief = championBrief(c);

  assert.deepStrictEqual(brief.traits, ['brief.trait.ranged']);
});

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

test('every champion in the database fits a composition', () => {
  const db = loadDatabase();
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
