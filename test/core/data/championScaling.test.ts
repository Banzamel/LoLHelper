// What a champion's abilities scale with, read from Meraki's ability data.
import { test } from 'vitest';
import assert from 'node:assert';
import { championScaling } from '../../../src/core/data/championScaling.ts';

const row = (attribute: string, ...mods: [number[], string][]) => ({ attribute, modifiers: mods.map(([values, unit]) => ({ values, units: values.map(() => unit) })) });
const ability = (description: string, ...leveling: unknown[]) => [{ effects: [{ description, leveling }] }];

test('damage ratios are taken at maximum rank, once per ability, and capped', () => {
  const s = championScaling({ abilities: {
    P: ability('Basic attacks on-hit deal bonus magic damage.', row('Bonus Magic Damage', [[10, 20], ''], [[30, 30], '% AP'])),
    Q: ability('Fires missiles.', row('Damage Per Missile', [[40, 100], ''], [[55, 55], '% bonus AD'], [[20, 20], '% AP']), row('Total Damage', [[90, 225], ''], [[124, 124], '% bonus AD'], [[45, 45], '% AP'])),
    W: ability('Heals herself.', row('Heal', [[50, 90], ''], [[80, 80], '% AP'])),
    E: ability('Gains bonus attack speed.'),
    R: ability('A storm of blades.', row('Total Physical Damage', [[300, 900], ''], [[600, 900], '% AD'])),
  } })!;
  // P 30 + Q 45 (the heal's ratio does not count); Q 124 + R capped at 150.
  assert.deepStrictEqual([s.ap, s.ad], [75, 274]);
  assert.deepStrictEqual([s.attack, s.onHit, s.attackSpeed, s.crit, s.critChance], [2, 1, 1, 0, 0]);
});

test('critical strikes in the kit are counted, crit chance scaling apart', () => {
  const s = championScaling({ abilities: { P: ability('His critical strike chance is doubled.'), Q: ability('Can critically strike.'), W: [], E: [], R: [] } })!;
  assert.deepStrictEqual([s.crit, s.critChance], [2, 1]);
  assert.strictEqual(championScaling(undefined), undefined);
  assert.strictEqual(championScaling({}), undefined);
});
