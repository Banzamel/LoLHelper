// Team composition warnings (engine/team/composition): the gaps of a team.
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
