// Item synergies: what an item is worth next to the items already chosen (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';
import { synergy, synergyScore } from '../../../../src/core/engine/builds/synergy.ts';

const db = loadDatabase();
const item = (name: string) => db.items.find((i) => i.nameEn === name && i.category === 'legendary')!;
const keys = (name: string, chosen: string[], cls: Parameters<typeof synergy>[2]) => synergy(item(name), chosen.map(item), cls).filter((r) => r.v > 0).map((r) => r.key);

test('crit damage pays off only with crit chance, and crit over 100% is wasted', () => {
  const ie = (chosen: string[]) => synergyScore(item('Infinity Edge'), chosen.map(item), 'marksman');
  assert.ok(ie([]) < 0);
  assert.ok(ie(['Yun Tal Wildarrows', 'Phantom Dancer']) > ie(['Phantom Dancer']));
  assert.deepStrictEqual(keys('Infinity Edge', ['Phantom Dancer', 'The Collector'], 'marksman'), ['build.synCrit']);
  const four = ['Phantom Dancer', 'The Collector', "Lord Dominik's Regards", "Runaan's Hurricane"];
  assert.ok(synergyScore(item('Rapid Firecannon'), four.map(item), 'marksman') < 0);
  // A class that does not use crit gets nothing from it.
  assert.strictEqual(synergyScore(item('Infinity Edge'), [item('Phantom Dancer')], 'bruiser'), 0);
});

test('attack speed and on-hit damage raise each other', () => {
  assert.deepStrictEqual(keys('Kraken Slayer', ['Phantom Dancer'], 'marksman'), ['build.synOnHit']);
  assert.deepStrictEqual(keys('Kraken Slayer', [], 'marksman'), []);
  assert.ok(synergyScore(item('Phantom Dancer'), [item('Kraken Slayer'), item("Wit's End")], 'marksman')
    > synergyScore(item('Phantom Dancer'), [item('Kraken Slayer')], 'marksman'));
});

test('percentage penetration and AP multipliers scale the damage already bought', () => {
  assert.ok(synergyScore(item('Void Staff'), [], 'mage-burst') < 0);
  assert.deepStrictEqual(keys('Void Staff', ['Shadowflame', "Luden's Echo"], 'mage-burst'), ['build.synPen']);
  assert.deepStrictEqual(keys("Rabadon's Deathcap", ['Shadowflame'], 'mage-burst'), ['build.synAp']);
  assert.deepStrictEqual(keys("Lord Dominik's Regards", ['Infinity Edge'], 'marksman'), ['build.synCrit', 'build.synPen']);
  assert.deepStrictEqual(keys("Youmuu's Ghostblade", ['Profane Hydra'], 'assassin-ad'), ['build.synLethality']);
});

test('a build is picked item by item around what is already owned', () => {
  const id = (name: string) => item(name).id;
  const base = { championId: 'Jinx', enemyId: 'Caitlyn', enemyIds: ['Caitlyn'], role: 'BOTTOM' as const };
  const b = recommendBuild(db, { ...base, ownedItems: [id('Kraken Slayer')], gold: 0 });
  assert.strictEqual(b.full[0], id('Kraken Slayer'));
  // Infinity Edge comes with a reason once there is crit to multiply.
  const ie = b.core.find((c) => c.id === id('Infinity Edge'));
  assert.ok(!ie || ie.reasons.some((r) => r.key === 'build.synCrit'));
  assert.ok(b.next && Array.isArray(b.next.reasons));
  const crit = b.full.reduce((s, i) => s + (db.itemById[i].features.stats.crit || 0), 0);
  assert.ok(crit <= 100, `crit ${crit}`);
});
