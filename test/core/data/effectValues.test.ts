// The full item effects: their texts, their numbers and the flags they settle.
import { test } from 'vitest';
import assert from 'node:assert';
import { effectTexts, effectValues, refineFlags } from '../../../src/core/data/effectValues.ts';
import { buildItems } from '../../../src/core/data/builder/items.ts';

const values = (name: string, text: string) => effectValues([{ name, text }]);

test('passives and actives become plain texts', () => {
  const effects = effectTexts({ passives: [{ name: 'Fray', effects: "Basic attacks deal {{as|45 '''bonus''' magic damage}} [[on-hit]]." }, { name: 'Empty', effects: '' }], active: [{ name: 'Time Stop', effects: 'Put yourself in [[stasis]].' }] });
  assert.deepStrictEqual(effects, [{ name: 'Fray', text: 'Basic attacks deal 45 bonus magic damage on-hit.' }, { name: 'Time Stop', text: 'Put yourself in stasis.', active: true }]);
  assert.deepStrictEqual(effectTexts(undefined), []);
});

test('damage of attacks: every attack, AP ratio, an empowered attack now and then', () => {
  assert.deepStrictEqual(values('Fray', 'Basic attacks deal 45 bonus magic damage on-hit.'), { onHit: 45 });
  assert.deepStrictEqual(values('Icathian Bite', 'Basic attacks deal 15 (+ 15% AP) bonus magic damage on-hit.'), { onHit: 30 });
  assert.deepStrictEqual(values('Bring It Down', 'At 2 stacks, the next basic attack consumes all stacks to deal 150–200 (melee) / 120–160 (ranged) bonus physical damage on-hit.'), { onHit: 52.5 });
  // Not the owner's attacks on champions.
  assert.deepStrictEqual(values('Echo', 'Dealing ability damage deals 75 (+ 5% AP) bonus magic damage.'), {});
  assert.deepStrictEqual(values('Sabotage', 'empowering your next basic attack against a turret to deal 300 bonus true damage.'), {});
});

test('spellblade, target health, increased damage, resistance reduction and multipliers', () => {
  assert.deepStrictEqual(values('Spellblade', 'your next basic attack within 10 seconds deals 200% base AD bonus physical damage on-hit'), { spellblade: 200 });
  assert.deepStrictEqual(values('Spellblade', 'your next basic attack deals 75% base AD (+ 40% AP) bonus magic damage on-hit'), { spellblade: 235 });
  assert.deepStrictEqual(values("Mist's Edge", "Basic attacks deal bonus physical damage on-hit equal to 9% (melee) / 6% (ranged) of the target's current health."), { targetHp: 7.5 });
  assert.deepStrictEqual(values('Torment', "causing them to take 1% of the target's maximum health magic damage every 0.5 seconds over 3 seconds"), { targetHp: 6 });
  assert.deepStrictEqual(values('Suffering', 'deal 2% increased damage, stacking up to 3 times for a total of 6%.'), { amp: 6 });
  // The percentage of the damage, not another one of the same sentence.
  assert.deepStrictEqual(values('Mana Made Real', 'you gain 15% (+ 0.5% per 100 bonus mana) increased ability damage; and your cooldowns progress 30% faster.'), { amp: 15 });
  assert.deepStrictEqual(values('Carve', 'Each stack inflicts 6% armor reduction, up to 30% at 5 stacks.'), { armorShred: 30 });
  assert.deepStrictEqual(values('Vile Decay', 'Each stack inflicts 7.5% magic resistance reduction, up to 30% at 4 stacks.'), { mrShred: 30 });
  assert.deepStrictEqual(values('Magical Opus', 'Increase your ability power by 30%.'), { apMult: 30 });
});

test('the full texts settle the flags Riot\'s short texts leave open', () => {
  const flags = (base: Record<string, boolean>, text: string) => Object.keys(refineFlags(base, [{ name: '', text }], effectValues([{ name: '', text }]))).sort();
  // Damage from the owner's own health is not damage by the target's health.
  assert.deepStrictEqual(flags({ maxHpDamage: true }, 'Basic attacks deal 100 bonus physical damage on-hit and slow.'), ['onHitDamage']);
  assert.deepStrictEqual(flags({ armorShred: true }, 'Each stack inflicts 7.5% magic resistance reduction, up to 30% at 4 stacks.'), ['mrShred']);
  assert.deepStrictEqual(flags({}, 'Dealing ability damage burns enemies.'), ['burn']);
  assert.deepStrictEqual(flags({}, 'If you would leave a champion below 5% of their maximum health, execute them.'), ['execute']);
});

test('an item keeps Riot\'s stats and gets its effects only when Meraki lists it', () => {
  const riot = { name: 'Test Blade', gold: { base: 3000, total: 3000, sell: 2100, purchasable: true }, maps: { 11: true }, tags: [],
    description: '<mainText><stats><attention>40</attention> Attack Damage</stats><br><passive>Carve</passive><br>reduces the target\'s Armor.</mainText>' };
  const meraki = { stats: { attackDamage: { flat: 99 } }, passives: [{ name: 'Carve', effects: 'Each stack inflicts 6% armor reduction, up to 30% at 5 stacks.' }], active: [] };
  const [withEffects] = buildItems({ 9001: riot }, { 9001: meraki });
  assert.strictEqual(withEffects.features.stats.ad, 40);
  assert.deepStrictEqual(withEffects.features.values, { armorShred: 30 });
  assert.strictEqual(withEffects.effects![0].name, 'Carve');
  const [plain] = buildItems({ 9001: riot });
  assert.ok(plain.features.flags.armorShred && !plain.features.values && !plain.effects);
});
