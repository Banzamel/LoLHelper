// The enemies' real stats and item effects in a running match (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';
import { enemyDefence, enemyEffects, statAt } from '../../../../src/core/engine/live/enemyProfile.ts';

const db = loadDatabase();
const id = (name: string) => db.items.find((i) => i.nameEn === name)!.id;
const ids = (...names: string[]) => names.map(id);
const enemyIds = ['Caitlyn', 'Malphite', 'Sejuani', 'Lux', 'Leona'];
const enemyLevels = Object.fromEntries(enemyIds.map((e) => [e, 13]));
const armorStack = { Malphite: ids('Thornmail', 'Sunfire Aegis', "Randuin's Omen"), Sejuani: ids('Heartsteel', "Dead Man's Plate"), Leona: ids('Frozen Heart'), Caitlyn: ids('Infinity Edge'), Lux: ids("Luden's Echo") };
const mrStack = { Malphite: ids('Force of Nature', 'Kaenic Rookern'), Sejuani: ids('Spirit Visage', 'Abyssal Mask'), Leona: ids('Locket of the Iron Solari'), Caitlyn: ids('Infinity Edge'), Lux: ids("Luden's Echo") };
const reasons = (b: ReturnType<typeof recommendBuild>) => [...b.core, ...b.situational].flatMap((x) => x.reasons.map((r) => r.key));

test('a stat grows with the level and nothing is known without levels', () => {
  assert.strictEqual(statAt(40, 5, 1), 40);
  assert.ok(Math.abs(statAt(40, 5, 18) - 125) < 0.01);
  assert.strictEqual(enemyDefence(db, { enemyItems: armorStack }), undefined);
});

test('enemy defence comes from champion, level and items, the lane opponent counted twice', () => {
  const malphite = db.byId.Malphite.stats;
  const alone = enemyDefence(db, { enemyLevels: { Malphite: 13 }, enemyItems: { Malphite: ids('Thornmail') } })!;
  assert.strictEqual(alone.armor, Math.round(statAt(malphite.armor, malphite.armorperlevel, 13) + db.itemById[id('Thornmail')].features.stats.armor));
  const plain = enemyDefence(db, { enemyLevels, enemyItems: armorStack })!;
  const vsTank = enemyDefence(db, { enemyLevels, enemyItems: armorStack, enemyId: 'Malphite' })!;
  assert.ok(vsTank.armor > plain.armor && plain.armor > enemyDefence(db, { enemyLevels, enemyItems: mrStack })!.armor);
});

test('enemy item passives are read: anti-heal, shields, penetration', () => {
  const e = enemyEffects(db, { A: ids('Thornmail'), B: ids("Sterak's Gage", "Lord Dominik's Regards"), C: ids('Void Staff'), D: ids('Bloodthirster') }, { B: 2 });
  assert.strictEqual(e.antiHeal, 0.25);
  assert.strictEqual(e.shields, 0.5);
  assert.strictEqual(e.healers, 0.25);
  assert.deepStrictEqual(e.pen, { armor: 0.4, magic: 0.2 });
  assert.deepStrictEqual(enemyEffects(db, null).pen, { armor: 0, magic: 0 });
});

test('penetration follows what the enemies actually stack', () => {
  const jinx = { championId: 'Jinx', enemyId: 'Caitlyn', enemyIds, role: 'BOTTOM' as const, enemyLevels, enemyStats: {} };
  const vsArmor = recommendBuild(db, { ...jinx, enemyItems: armorStack });
  assert.ok(reasons(vsArmor).includes('build.penVsArmor'));
  assert.ok(vsArmor.threats.some((x) => x.key === 'threat.defence'));
  // Magic resist stacking is no reason for armour penetration.
  assert.ok(!reasons(recommendBuild(db, { ...jinx, enemyItems: mrStack })).includes('build.penVsArmor'));
  const syndra = { championId: 'Syndra', enemyId: 'Lux', enemyIds, role: 'MIDDLE' as const, enemyLevels, enemyStats: {} };
  assert.ok(reasons(recommendBuild(db, { ...syndra, enemyItems: mrStack })).includes('build.penVsMr'));
  assert.ok(!reasons(recommendBuild(db, { ...syndra, enemyItems: armorStack })).includes('build.penVsMr'));
});
