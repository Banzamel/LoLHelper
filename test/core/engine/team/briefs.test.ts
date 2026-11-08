// Champion briefs, ally tips and team compositions (engine/team): rules on small invented champions, plus
// coverage checks on the bundled database (run `npm run fetch-data` first) and the lang files.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { BRIEFS } from '../../../../src/core/engine/knowledge/tips.ts';
import { championBrief, TRAITS } from '../../../../src/core/engine/team/briefs.ts';
import { ALLY_RULES } from '../../../../src/core/engine/team/allyTips.ts';
import { CLASS_ORDER } from '../../../../src/core/engine/team/predicates.ts';
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

const dbOf = (...champions) => ({ byId: Object.fromEntries(champions.map((c) => [c.id, c])) });

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

test('a brief names the most specific class of the champion', () => {
  const brief = championBrief(CATCHER);

  assert.strictEqual(brief.key, 'brief.class.CATCHER');
});

test('a brief lists at most three standout traits, most telling first', () => {
  const c = champion('Many', { archetypes: ['ASSASSIN'], ratings: { mobility: 3, damage: 3, toughness: 1, difficulty: 3 }, traits: { hardCC: 2, stealth: 1 } });

  const brief = championBrief(c);

  assert.deepStrictEqual(brief.traits, ['brief.trait.cc', 'brief.trait.mobile', 'brief.trait.glassCannon']);
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

test('every champion in the database gets a brief', () => {
  const db = loadDatabase();

  const missing = db.champions.filter((c) => !championBrief(c)).map((c) => c.id);

  assert.ok(db.champions.length > 0);
  assert.deepStrictEqual(missing, []);
});

test('curated briefs use valid Data Dragon ids', () => {
  const db = loadDatabase();

  const unknown = Object.keys(BRIEFS).filter((id) => !db.byId[id]);

  assert.deepStrictEqual(unknown, []);
});

test('every brief and tip text exists in every language', () => {
  const keys = [...CLASS_ORDER, 'OTHER'].map((a) => `brief.class.${a}`)
    .concat(TRAITS.map(([key]) => key), ALLY_RULES.map(([key]) => key), Object.values(BRIEFS));

  const missing = LANGS.flatMap((dict) => keys.filter((k) => !dict[k]));

  assert.deepStrictEqual(missing, []);
});
