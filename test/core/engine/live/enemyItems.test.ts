// Runes, summoner spells, skill order and in-game adjustments (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';
import { threatWeights } from '../../../../src/core/engine/live/enemyItems.ts';

const db = loadDatabase();
const runeTree = Object.fromEntries(db.runes.trees.flatMap((t) => t.slots.flat().map((r) => [r.id, t.id])));
const spellKey = Object.fromEntries(db.summoners.map((s) => [s.id, s.key]));
const CASES = [['Jinx', 'Caitlyn', 'BOTTOM'], ['Darius', 'Teemo', 'TOP'], ['Syndra', 'Zed', 'MIDDLE'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Vi', 'LeeSin', 'JUNGLE'], ['Udyr', 'LeeSin', 'JUNGLE']];

test('a fed enemy weighs more in the threat profile', () => {
  const it = (names) => names.map((x) => db.items.find((i) => i.nameEn === x).id);
  const enemyIds = ['Sion', 'Warwick', 'Akali', 'Kalista', 'Teemo'];
  const enemyItems = { Sion: it(['Bramble Vest']), Warwick: it(['Pickaxe']), Akali: it(['Lich Bane', 'Shadowflame']), Kalista: it(['Long Sword']), Teemo: it(['Amplifying Tome']) };
  const enemyStats = { Sion: { deaths: 3 }, Warwick: { kills: 1, deaths: 3 }, Akali: { kills: 9, assists: 2 }, Kalista: { deaths: 4 }, Teemo: { kills: 3, deaths: 1 } };
  const w = threatWeights(db, enemyStats, enemyItems);
  assert.ok(w.Akali > 1.8 && w.Kalista < 1);
  const b = recommendBuild(db, { championId: 'XinZhao', enemyId: 'Warwick', role: 'JUNGLE', enemyIds, enemyItems, enemyStats });
  assert.ok(b.threats.some((x) => x.key === 'threat.fed' && x.params.enemy === 'Akali'));
  assert.strictEqual(db.itemById[b.boots.id].nameEn, "Mercury's Treads");
  assert.deepStrictEqual(threatWeights(db, null, enemyItems), {});
});
