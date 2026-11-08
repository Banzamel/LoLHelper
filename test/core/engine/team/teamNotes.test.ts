// Practice Tool and custom games: no assigned roles and possibly no enemies at all; the Draft,
// loading screen and match features still answer (needs `npm run fetch-data`).
import { test } from 'vitest';
import type { Db } from '../../../../src/core/data/types.ts';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../../helpers.ts';
import { teamNotes } from '../../../../src/core/engine/team/teamNotes.ts';
import { allyTips } from '../../../../src/core/engine/team/allyTips.ts';
import en from '../../../../src/lang/en.json';
import pl from '../../../../src/lang/pl.json';

const db = loadDatabase();
const keyOf = (id) => Number(db.byId[id].key);

// Champion select of the Practice Tool: the player alone, no assigned position, no enemies.
const practiceSelect = { localPlayerCellId: 0, myTeam: [{ cellId: 0, championId: keyOf('Ahri'), assignedPosition: '' }], theirTeam: [], actions: [] };

// Champion briefs, ally tips and team compositions (engine/team): rules on small invented champions, plus
// coverage checks on the bundled database (run `npm run fetch-data` first) and the lang files.

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

test('team notes for a player alone hold the brief and no composition', () => {
  const notes = teamNotes(db, { me: { championId: 'Ahri', role: 'MIDDLE' }, allies: [], enemies: [] });

  assert.deepStrictEqual([Object.keys(notes.briefs), notes.composition.enemies, notes.allyTips.length], [['Ahri'], null, 0]);
});

test('team notes hold a brief for every known champion in the game', () => {
  const db = dbOf(MARKSMAN, ENCHANTER, CATCHER);

  const notes = teamNotes(db, { me: { championId: 'Ash', role: 'BOTTOM' }, allies: [{ championId: 'Lulu' }, { championId: null }], enemies: [{ championId: 'Thresh' }, { championId: 'Nobody' }] });

  assert.deepStrictEqual(Object.keys(notes.briefs).sort(), ['Ash', 'Lulu', 'Thresh']);
});

test('team notes hold the enemy team composition', () => {
  const db = dbOf(ARTILLERY, LONG_RANGE, PLAIN);

  const notes = teamNotes(db, { enemies: [{ championId: 'Xerath' }, { championId: 'Ezreal' }, { championId: 'Plain' }] });

  assert.strictEqual(notes.composition.enemies.style, 'POKE');
});
