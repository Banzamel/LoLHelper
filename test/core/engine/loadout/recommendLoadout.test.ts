// Runes, summoner spells, skill order and in-game adjustments (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../../helpers.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';

const db = loadDatabase();
const runeTree = Object.fromEntries(db.runes.trees.flatMap((t) => t.slots.flat().map((r) => [r.id, t.id])));
const spellKey = Object.fromEntries(db.summoners.map((s) => [s.id, s.key]));
const CASES = [['Jinx', 'Caitlyn', 'BOTTOM'], ['Darius', 'Teemo', 'TOP'], ['Syndra', 'Zed', 'MIDDLE'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Vi', 'LeeSin', 'JUNGLE'], ['Udyr', 'LeeSin', 'JUNGLE']];

test('rune pages are valid: keystone + 3 primary, 2 secondary from another tree, 3 shards', () => {
  for (const [c, e, role] of CASES) {
    const { runes } = recommendBuild(db, fixture({ championId: c, enemyId: e, enemyIds: [e], role }));
    const ids = runes.selectedPerkIds;
    assert.strictEqual(ids.length, 9, c);
    assert.notStrictEqual(runes.primaryStyleId, runes.subStyleId, c);
    assert.ok(ids.slice(0, 4).every((id) => runeTree[id] === runes.primaryStyleId), `${c} primary`);
    assert.ok(ids.slice(4, 6).every((id) => runeTree[id] === runes.subStyleId), `${c} secondary`);
    assert.strictEqual(new Set(ids.slice(0, 6)).size, 6, `${c} unique runes`);
    assert.ok(ids.slice(6).every((id) => db.runes.shards.some((s) => s.id === id)), `${c} shards`);
  }
});

test('summoner spells follow the role', () => {
  const spells = (c, e, role) => recommendBuild(db, fixture({ championId: c, enemyId: e, enemyIds: [e], role })).spells.ids.map((id) => spellKey[id]);
  assert.deepStrictEqual(spells('Vi', 'LeeSin', 'JUNGLE'), ['SummonerFlash', 'SummonerSmite']);
  assert.ok(spells('Jinx', 'Caitlyn', 'BOTTOM').includes('SummonerFlash'));
  assert.ok(spells('Darius', 'Teemo', 'TOP').includes('SummonerTeleport'));
});

test('skill order levels R at 6/11/16 and maxes the first ability first', () => {
  const { skills } = recommendBuild(db, { championId: 'Jinx', enemyId: 'Caitlyn', role: 'BOTTOM' });
  assert.deepStrictEqual(skills.max, ['Q', 'W', 'E']);
  assert.strictEqual(skills.levels.length, 18);
  assert.deepStrictEqual([6, 11, 16].map((l) => skills.levels[l - 1]), ['R', 'R', 'R']);
  assert.strictEqual(skills.levels.filter((k) => k === 'Q').length, 5);
  const udyr = recommendBuild(db, { championId: 'Udyr', enemyId: 'LeeSin', role: 'JUNGLE' }).skills;
  assert.strictEqual(udyr.levels, null);
});
