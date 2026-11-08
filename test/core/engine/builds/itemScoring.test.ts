// Item values for a build class: stat gold value, core bonuses, situational reasons, stacking.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { baseScore, conflicts, coreBonus, lateItem, situational, WEIGHTS } from '../../../../src/core/engine/builds/itemScoring.ts';
import type { Threats } from '../../../../src/core/engine/types.ts';

const db = loadDatabase();
const item = (name: string) => db.items.find((i) => i.nameEn === name && i.category === 'legendary') || db.items.find((i) => i.nameEn === name)!;
const calm: Threats = { ad: 0.5, ap: 0.5, healing: 0, tanks: 0, burstAD: 0, burstAP: 0, cc: 0, autoAttack: 0, shields: 0, empty: false };

test('a marksman values crit items above tank items', () => {
  const jinx = db.byId.Jinx;
  assert.ok(baseScore(item('Infinity Edge'), WEIGHTS.marksman, jinx).score > baseScore(item("Warmog's Armor"), WEIGHTS.marksman, jinx).score);
});

test('proven core items get a bonus that shrinks down the list', () => {
  assert.ok(coreBonus(item('Infinity Edge'), 'marksman') > coreBonus(item('Kraken Slayer'), 'marksman'));
  assert.strictEqual(coreBonus(item('Infinity Edge'), 'tank'), 0);
});

test('anti-heal is situational against healers only', () => {
  const healing = { ...calm, healing: 0.6 };
  const grievous = db.items.find((i) => i.category === 'legendary' && i.features.flags.grievous)!;
  assert.ok(situational(grievous, 'bruiser', healing).some((r) => r.key === 'build.grievous'));
  assert.ok(!situational(grievous, 'bruiser', calm).some((r) => r.key === 'build.grievous'));
});

test('penetration goes late and items sharing a passive do not stack', () => {
  assert.strictEqual(lateItem(item('Void Staff')), 2);
  const grievous = db.items.filter((i) => i.category === 'legendary' && i.features.flags.grievous);
  assert.ok(grievous.length >= 2 && conflicts(grievous[0], [grievous[1]]));
});
