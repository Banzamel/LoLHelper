// League wiki markup (Meraki's item effects) as plain text.
import { test } from 'vitest';
import assert from 'node:assert';
import { wikiToPlain } from '../../../src/core/data/wikiText.ts';

test('styling, links and tips leave their visible text', () => {
  assert.strictEqual(wikiToPlain("Basic attacks deal {{as|'''bonus''' physical damage}} [[on-hit]] against {{tip|minions}} and [[Champion ability|abilities]]."),
    'Basic attacks deal bonus physical damage on-hit against minions and abilities.');
  assert.strictEqual(wikiToPlain('Lasts {{fd|1.5}} seconds<br>within {{tt|cr 600}} units.'), 'Lasts 1.5 seconds within 600 units.');
});

test('melee and ranged values and level ranges are written out', () => {
  assert.strictEqual(wikiToPlain("equal to {{as|{{rd|9%|6%}} of the target's '''current''' health}}"), "equal to 9% (melee) / 6% (ranged) of the target's current health");
  assert.strictEqual(wikiToPlain('{{rd|150 + (200-150)/10*(x-1) for 13|150*0.8 + (200*0.8-150*0.8)/10*(x-1) for 13|levels=1;9 to 20|pp=true}} damage'),
    '150–200 (melee) / 120–160 (ranged) damage');
  assert.strictEqual(wikiToPlain("increased by {{pp|0 to 75 by 5|0 to 100|key=%|color=health|type=target's '''missing''' health|key1=%}}"), "increased by 0–75% target's missing health");
  assert.strictEqual(wikiToPlain('a shield for {{rd|400 to 700 for 11|400*0.8 to 700*0.8 for 11}}'), 'a shield for 400–700 (melee) / 320–560 (ranged)');
});

test('formulas outside templates are computed and broken markup does not hang', () => {
  assert.strictEqual(wikiToPlain('up to 80 + (250-80)/17*(x-1) for 20, slowed by 25*0.5%'), 'up to 80–250, slowed by 12.5%');
  assert.strictEqual(wikiToPlain('{{as|open {{fd|2'), 'as|open fd|2');
  assert.strictEqual(wikiToPlain(''), '');
});
