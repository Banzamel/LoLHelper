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

test('in a match the enemies\' real stats, penetration and anti-heal decide', () => {
  const keys = (name: string, cls: Parameters<typeof situational>[1], t: Threats) => situational(item(name), cls, t).filter((r) => r.v > 0).map((r) => r.key);
  const armored = { ...calm, tanks: 0.6, defence: { armor: 150, mr: 50, hp: 2000 } };
  assert.deepStrictEqual(keys("Lord Dominik's Regards", 'marksman', armored), ['build.penVsArmor']);
  assert.deepStrictEqual(keys('Void Staff', 'mage-burst', armored), []);
  assert.deepStrictEqual(keys('Void Staff', 'mage-burst', { ...armored, defence: { armor: 60, mr: 100, hp: 2000 } }), ['build.penVsMr']);
  // Without live stats the tank share decides, as in champion select.
  assert.deepStrictEqual(keys('Void Staff', 'mage-burst', { ...calm, tanks: 0.6 }), ['build.penVsTanks']);
  const value = (name: string, t: Threats) => situational(item(name), 'bruiser', t).reduce((s, r) => s + r.v, 0);
  const ad = { ...calm, ad: 0.8 };
  assert.ok(value("Randuin's Omen", { ...ad, pen: { armor: 1, magic: 0 } }) < value("Randuin's Omen", ad));
  assert.ok(value('Bloodthirster', { ...calm, antiHeal: 0.6 }) < 0);
  const healing = { ...calm, healing: 0.6 };
  assert.ok(value('Thornmail', { ...healing, allyGrievous: true }) < value('Thornmail', healing));
});
