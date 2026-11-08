// Engine tests on the bundled database (run `npm run fetch-data` first).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../../helpers.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';

const db = loadDatabase();

// Runes, summoner spells, skill order and in-game adjustments (needs `npm run fetch-data`).

const runeTree = Object.fromEntries(db.runes.trees.flatMap((t) => t.slots.flat().map((r) => [r.id, t.id])));
const spellKey = Object.fromEntries(db.summoners.map((s) => [s.id, s.key]));
const CASES = [['Jinx', 'Caitlyn', 'BOTTOM'], ['Darius', 'Teemo', 'TOP'], ['Syndra', 'Zed', 'MIDDLE'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Vi', 'LeeSin', 'JUNGLE'], ['Udyr', 'LeeSin', 'JUNGLE']];

// Practice Tool and custom games: no assigned roles and possibly no enemies at all; the Draft,
// loading screen and match features still answer (needs `npm run fetch-data`).

const keyOf = (id) => Number(db.byId[id].key);

// Champion select of the Practice Tool: the player alone, no assigned position, no enemies.
const practiceSelect = { localPlayerCellId: 0, myTeam: [{ cellId: 0, championId: keyOf('Ahri'), assignedPosition: '' }], theirTeam: [], actions: [] };

test('builds have starters, boots, core and six-slot full build', () => {
  for (const [c, e, role] of [['Jinx', 'Caitlyn', 'BOTTOM'], ['Malphite', 'Darius', 'TOP'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Syndra', 'Ahri', 'MIDDLE'], ['Vi', 'LeeSin', 'JUNGLE']]) {
    const b = recommendBuild(db, fixture({ championId: c, enemyId: e, enemyIds: [e], role }));
    assert.ok(b.starters.length >= 1, `${c} starters`);
    assert.ok(b.boots && db.itemById[b.boots.id], `${c} boots`);
    assert.strictEqual(b.core.length, 3, `${c} core`);
    assert.strictEqual(new Set(b.full).size, b.full.length, `${c} unique items`);
    assert.strictEqual(b.full.length, 5, `${c} full build`);
  }
});

test('anti-heal is suggested against healers', () => {
  const b = recommendBuild(db, { championId: 'Darius', enemyId: 'Aatrox', enemyIds: ['Aatrox', 'Soraka', 'Vladimir', 'Warwick', 'Yuumi'], role: 'TOP' });
  const ids = [...b.core, ...b.situational].map((x) => x.id);
  assert.ok(ids.some((id) => db.itemById[id].features.flags.grievous));
});

test('in game: owned items stay, next purchase is not owned, enemy items shift threats', () => {
  const base = { championId: 'Jinx', enemyId: 'Caitlyn', enemyIds: ['Caitlyn', 'Malphite', 'Zed', 'Lux', 'LeeSin'], role: 'BOTTOM' as const };
  const plain = recommendBuild(db, base);
  const owned = [3032, 3006];
  const live = recommendBuild(db, { ...base, ownedItems: owned, enemyItems: { Lux: [6655, 3089, 3157], Zed: [3089], Malphite: [3157] } });
  assert.ok(live.full.includes(3032));
  assert.ok(live.next && !owned.includes(live.next.id));
  assert.ok(live.threats.some((x) => x.key === 'threat.fromItems'));
  const ap = (b) => b.threats.find((x) => x.key === 'threat.damageSplit').params.ap;
  assert.ok(ap(live) > ap(plain));
});

test('fighters tagged TANK build as bruisers (Xin Zhao: Scorchclaw, Conqueror, one anti-heal item)', () => {
  const b = recommendBuild(db, { championId: 'XinZhao', enemyId: 'Warwick', role: 'JUNGLE', enemyIds: ['Sion', 'Warwick', 'Akali', 'Kalista', 'Teemo'] });
  const name = (id) => db.itemById[id].nameEn;
  assert.strictEqual(b.cls, 'bruiser');
  assert.strictEqual(name(b.starters[0].id), 'Scorchclaw Pup');
  assert.strictEqual(b.runes.selectedPerkIds[0], 8010);
  assert.ok(b.full.filter((id) => db.itemById[id].features.flags.grievous).length <= 1);
  assert.strictEqual(recommendBuild(db, { championId: 'Zac', role: 'JUNGLE' }).cls, 'tank');
});

test('a build without enemies is still complete', () => {
  const build = recommendBuild(db, { championId: 'Ahri', enemyId: null, enemyIds: [], role: 'MIDDLE', enemyItems: {}, enemyStats: {}, ownedItems: [], gold: 500 });

  assert.ok(build.core.length > 0 && build.starters.length > 0, 'core and starters');
});
