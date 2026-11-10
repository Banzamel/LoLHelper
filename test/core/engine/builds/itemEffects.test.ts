// The value of item passives for a build class (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { effectScore } from '../../../../src/core/engine/builds/itemEffects.ts';

const db = loadDatabase();
const item = (name: string) => db.items.find((i) => i.nameEn === name && i.category === 'legendary')!;

test('effects count only for the classes that use them', () => {
  assert.deepStrictEqual(effectScore(item('Kraken Slayer'), 'marksman').kinds, ['onHitDamage']);
  assert.strictEqual(effectScore(item('Kraken Slayer'), 'mage-burst').score, 0);
  assert.ok(effectScore(item('Trinity Force'), 'bruiser').kinds.includes('spellblade'));
  assert.ok(effectScore(item("Liandry's Torment"), 'mage-battle').score > effectScore(item("Liandry's Torment"), 'mage-burst').score);
  assert.ok(effectScore(item("Rabadon's Deathcap"), 'mage-burst').kinds.includes('apMultiplier'));
  assert.strictEqual(effectScore(item('Infinity Edge'), 'marksman').score, 0);
});
