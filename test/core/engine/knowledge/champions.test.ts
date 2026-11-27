// The per-champion knowledge: every entry names a real champion, a valid max order and a keystone
// whose whole page exists in the current rune trees.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { CHAMPIONS, knownKeystone } from '../../../../src/core/engine/knowledge/champions.ts';
import { rolePreset } from '../../../../src/core/engine/loadout/presets.ts';
import { classOf } from '../../../../src/core/engine/builds/classOf.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';

const db = loadDatabase();
const runeNames = (tree: string) => db.runes.trees.find((t) => t.nameEn === tree)?.slots.flat().map((r) => r.nameEn) || [];

test('every entry is a champion with a valid max order', () => {
  for (const [id, k] of Object.entries(CHAMPIONS)) {
    assert.ok(db.byId[id], id);
    if (k.max) assert.deepStrictEqual([...k.max].sort().join(''), 'EQW', id);
  }
});

test('every champion in every role it is played gets a rune page that exists', () => {
  for (const c of db.champions) {
    for (const role of c.positions) {
      const p = rolePreset(classOf(c, role), role, c);
      const main = runeNames(p.tree);
      const sub = runeNames(p.sub);
      for (const name of [p.keystone, ...p.rows]) assert.ok(main.includes(name), `${c.id} ${role}: ${name} not in ${p.tree}`);
      for (const name of p.subRunes) assert.ok(sub.includes(name), `${c.id} ${role}: ${name} not in ${p.sub}`);
      const own = knownKeystone(c.id, role);
      if (own) assert.strictEqual(p.keystone, own, `${c.id} ${role}`);
    }
  }
});

test('builds follow the champion where its class would build it wrongly', () => {
  const names = (b: { full: number[] }) => b.full.map((id) => db.itemById[id].nameEn);
  const keystone = (b: { runes: { selectedPerkIds: number[] } | null }) => db.runes.trees.flatMap((t) => t.slots[0]).find((r) => r.id === b.runes?.selectedPerkIds[0])?.nameEn;
  const fizz = recommendBuild(db, { championId: 'Fizz', role: 'MIDDLE' });
  assert.strictEqual(fizz.cls, 'mage-burst');
  assert.strictEqual(keystone(fizz), 'Electrocute');
  const zyra = recommendBuild(db, { championId: 'Zyra', role: 'SUPPORT' });
  assert.ok(!names(zyra).some((n) => ['Sunfire Aegis', 'Warmog\'s Armor', 'Unending Despair'].includes(n)), names(zyra).join());
  assert.strictEqual(keystone(recommendBuild(db, { championId: 'Jhin', role: 'BOTTOM' })), 'Fleet Footwork');
  assert.deepStrictEqual(recommendBuild(db, { championId: 'Viktor', role: 'MIDDLE' }).skills.max, ['Q', 'E', 'W']);
});
