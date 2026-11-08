// Champion briefs, ally tips and team compositions (engine/team): rules on small invented champions, plus
// coverage checks on the bundled database (run `npm run fetch-data` first) and the lang files.
import { test } from 'vitest';
import type { Db } from '../../../../src/core/data/types.ts';
import { fixture } from '../../../helpers.ts';
import assert from 'node:assert';
import { allyTips } from '../../../../src/core/engine/team/allyTips.ts';
import { teamComposition } from '../../../../src/core/engine/team/composition.ts';
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

test('fewer than three known champions give no composition', () => {
  assert.strictEqual(teamComposition([TANK, DIVER]), null);
});
