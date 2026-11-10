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

test('item effects are told apart by what the text says they do', () => {
  const flags = (description: string) => Object.keys(extractItemFeatures({ description }).flags).sort();
  assert.deepStrictEqual(flags("<passive>Mist's Edge</passive><br>Attacks deal <physicalDamage>a percentage</physicalDamage> of enemy's current Health as <physicalDamage>bonus physical damage</physicalDamage> <OnHit>On-Hit</OnHit>."),
    ['maxHpDamage', 'onHitDamage']);
  // Death's Dance cleanses its own stored damage: no crowd control removal.
  assert.deepStrictEqual(flags("<passive>Defy</passive><br>cleanse <passive>Ignore Pain's</passive> remaining damage and restore <healing>Health</healing> over 2 seconds."), ['healSelf']);
  // A text about the owner's own critical strikes is no protection from them.
  assert.deepStrictEqual(flags('<passive>Flurry</passive><br>Attacks reduce this cooldown by 1 second, increased to 2 seconds for Critical Strikes.'), []);
  assert.deepStrictEqual(flags('<passive>Resilience</passive><br>Receive 30% less damage from Critical Strikes.'), ['antiCrit']);
  // Reducing enemy shields is not a shield of one's own.
  assert.deepStrictEqual(flags('<passive>Shield Reaver</passive><br>Damaging an enemy champion reduces Shields they gain.'), ['antiShield']);
  assert.deepStrictEqual(flags('<passive>Lifeline</passive><br>grants a <shield>decaying Shield</shield>.'), ['lifeline', 'shieldSelf']);
  assert.deepStrictEqual(flags('<passive>Magical Opus</passive><br>Increases your total <scaleAP>Ability Power by 30%</scaleAP>.'), ['apMultiplier']);
  assert.deepStrictEqual(flags('<passive>Torment</passive><br>Damaging Abilities burn enemies for <magicDamage>2% max Health magic damage</magicDamage> per second.'), ['burn', 'maxHpDamage']);
});
