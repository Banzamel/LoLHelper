// Text analysis of Data Dragon descriptions: champion traits, item stats and flags.
import { test } from 'vitest';
import assert from 'node:assert';
import { extractChampionTraits, extractItemFeatures, plain, sanitizeHtml } from '../../../src/core/data/parse.ts';

test('only known description tags survive sanitizing and placeholders are dropped', () => {
  assert.strictEqual(sanitizeHtml('<stats>5 AD</stats><script>x</script>{{ value }}<br/>'), '<stats>5 AD</stats>x<br>');
});

test('plain text keeps line breaks and marks placeholders', () => {
  assert.strictEqual(plain('Deals {{ dmg }} damage<br>to <b>enemies</b> '), 'Deals ? damage\nto enemies');
});

test('champion traits are counted from ability texts and ranges', () => {
  const traits = extractChampionTraits({
    spells: [
      { description: 'Stuns the target and dashes forward.', range: [1100] },
      { description: 'Heals for 50 health.', range: [600] },
      { description: 'Grants a shield.', range: [25000] },
      { description: 'Deals true damage.', range: [1200] },
    ],
    passive: { description: 'Slows enemies.' },
    stats: { attackrange: 550 },
  });
  assert.deepStrictEqual([traits.hardCC, traits.dash, traits.heal, traits.shield, traits.trueDamage, traits.slow, traits.longRange, traits.range],
    [1, 1, 1, 1, 1, 1, 2, 550]);
});

test('item stats and flags are read from the description', () => {
  const f = extractItemFeatures({
    description: '<mainText><stats>40 Attack Damage<br>20% Armor Penetration<br>5% Move Speed</stats><passive>Carve</passive> applies Grievous Wounds.</mainText>',
    tags: ['OnHit'],
  });
  assert.deepStrictEqual(f.stats, { ad: 40, armorPen: 20, msPct: 5 });
  assert.deepStrictEqual([f.flags.grievous, f.flags.onHit, f.passives], [true, true, ['Carve']]);
});
