// Starting items and boots, and the enemy threat profile they depend on.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { pickBoots, pickStarters } from '../../../../src/core/engine/builds/starters.ts';
import { analyzeThreats, threatLines } from '../../../../src/core/engine/builds/threats.ts';

const db = loadDatabase();
const name = (id: number) => db.itemById[id].nameEn;

test('mages start with Doran\'s Ring and two potions, junglers with a pet', () => {
  assert.deepStrictEqual(pickStarters(db, 'mage-burst', 'MIDDLE', null).map((s) => [name(s.id), s.count]), [["Doran's Ring", 1], ['Health Potion', 2]]);
  assert.match(name(pickStarters(db, 'bruiser', 'JUNGLE', null)[0].id), /Pup|Hatchling|Seedling/);
});

test('an AP heavy team calls for Mercury\'s Treads', () => {
  const t = analyzeThreats(db.byId.Syndra, ['Lux', 'Brand', 'Zyra'].map((id) => db.byId[id]));
  assert.ok(t.ap > 0.6);
  assert.strictEqual(name(pickBoots(db, 'bruiser', t)!.id), "Mercury's Treads");
});

test('the lane opponent counts twice and a fed enemy is named', () => {
  const t = analyzeThreats(db.byId.Zed, [db.byId.Lux]);
  assert.ok(Math.abs(t.ad - 2 / 3) < 1e-9);
  const lines = threatLines(t, { Zed: 2.4 });
  assert.deepStrictEqual([lines[0].key, lines[lines.length - 1]], ['threat.damageSplit', { key: 'threat.fed', params: { enemy: 'Zed' } }]);
  assert.deepStrictEqual(threatLines(analyzeThreats(null, []), {}), []);
});
