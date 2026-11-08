// Runes, summoner spells, skill order and in-game adjustments (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';
import { planItem, nextPurchase } from '../../../../src/core/engine/live/purchases.ts';

const db = loadDatabase();
const runeTree = Object.fromEntries(db.runes.trees.flatMap((t) => t.slots.flat().map((r) => [r.id, t.id])));
const spellKey = Object.fromEntries(db.summoners.map((s) => [s.id, s.key]));
const CASES = [['Jinx', 'Caitlyn', 'BOTTOM'], ['Darius', 'Teemo', 'TOP'], ['Syndra', 'Zed', 'MIDDLE'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Vi', 'LeeSin', 'JUNGLE'], ['Udyr', 'LeeSin', 'JUNGLE']];

test('buy order puts boots second; the part to buy now fits the gold and uses owned parts', () => {
  const id = (n) => db.items.find((i) => i.nameEn === n).id;
  const build = recommendBuild(db, { championId: 'XinZhao', role: 'JUNGLE' });
  assert.strictEqual(build.order[1], build.boots.id);
  // Black Cleaver with Phage owned: Kindlegem + Pickaxe + combine cost remain.
  const plan = planItem(db, id('Black Cleaver'), [id('Phage')]);
  assert.strictEqual(plan.cost, 3000 - 1100);
  const fake = { full: [id('Black Cleaver')], boots: null };
  const next = nextPurchase(db, fake, [id('Phage')], 886);
  assert.strictEqual(next.id, id('Black Cleaver'));
  assert.strictEqual(db.itemById[next.buy.id].nameEn, 'Pickaxe');
  assert.deepStrictEqual(next.parts.map((p) => p.owned), [true, false, false]);
  // Rune boots count as Boots: Steelcaps then costs 900.
  assert.strictEqual(planItem(db, id('Plated Steelcaps'), [2422]).cost, 900);
});
