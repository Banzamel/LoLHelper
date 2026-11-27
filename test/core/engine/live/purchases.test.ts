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

test('boots already bought are not recommended again, upgraded ones included', () => {
  const id = (n) => db.items.find((i) => i.nameEn === n).id;
  const build = { full: [id('Black Cleaver')], boots: { id: id("Berserker's Greaves"), upgrade: null, reason: '' } };
  const have = (boots) => nextPurchase(db, build, [id('Black Cleaver'), id(boots)]);
  assert.strictEqual(nextPurchase(db, build, [id('Black Cleaver')]).id, build.boots.id);
  // Gunmetal Greaves is not tagged as boots by Riot.
  for (const boots of ['Plated Steelcaps', 'Armored Advance', 'Gunmetal Greaves']) assert.strictEqual(have(boots), null, boots);
});

test('boots are not recommended as a seventh item, nor after boots the shop does not sell', () => {
  const id = (n) => db.items.find((i) => i.nameEn === n).id;
  const legendaries = db.items.filter((i) => i.category === 'legendary').slice(0, 6).map((i) => i.id);
  const build = { full: legendaries.slice(0, 5), boots: { id: id("Sorcerer's Shoes"), upgrade: null, reason: '' } };
  // Six finished items and a trinket: no room for boots.
  assert.strictEqual(nextPurchase(db, build, [...legendaries, 3340]), null);
  // Five items: the boots are next.
  assert.strictEqual(nextPurchase(db, build, [...legendaries.slice(0, 5), 3340]).id, build.boots.id);
  // Six items with Boots among them: upgrading them uses that slot.
  assert.strictEqual(nextPurchase(db, build, [...legendaries.slice(0, 5), id('Boots')]).id, build.boots.id);
  // Symbiotic Soles and Forever Forward are boots though the database lacks them.
  for (const boots of [3010, 3176]) assert.strictEqual(nextPurchase(db, build, [...legendaries.slice(0, 5), boots]), null);
});
