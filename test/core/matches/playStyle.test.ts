// Game rows, summaries and play-style traits.
import { test } from 'vitest';
import assert from 'node:assert';
import { average, groupBy, round, summary, type GameRow } from '../../../src/core/matches/gameRows.ts';
import { playStyle } from '../../../src/core/matches/playStyle.ts';

const row = (over: Partial<GameRow>): GameRow => ({
  id: 1, type: 'solo', created: 0, duration: 1800, champ: 'Ahri', pos: 'MIDDLE', win: true, k: 5, d: 3, a: 7, kda: 4,
  csm: 7.5, gpm: 400, dpm: 600, vpm: 0.8, kp: 0.65, share: 0.3, rift: true, ...over,
});

test('averages skip missing values and summaries round', () => {
  assert.strictEqual(average([row({ kp: null }), row({ kp: 0.5 })], (r) => r.kp), 0.5);
  assert.strictEqual(round(1.23456, 2), 1.23);
  assert.deepStrictEqual([summary([row({}), row({ win: false })]).winrate, summary([]).winrate], [0.5, null]);
  assert.deepStrictEqual(groupBy([row({}), row({ champ: 'Zed' }), row({})], (r) => r.champ).map((g) => [g.key, g.games]), [['Ahri', 2], ['Zed', 1]]);
});

test('fewer than five Rift games give no play style', () => {
  assert.deepStrictEqual(playStyle([row({}), row({})]), []);
});

test('a farming team player who carries is told so', () => {
  const keys = playStyle(Array.from({ length: 6 }, () => row({}))).map((t) => t.key);
  assert.ok(['style.farmer', 'style.teamplayer', 'style.carry'].every((k) => keys.includes(k)), keys.join());
});
