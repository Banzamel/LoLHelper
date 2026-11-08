// The match timeline: a point every 20 s of game time and on every kill, reset on a new match.
import { test } from 'vitest';
import assert from 'node:assert';
import { fixture } from '../../helpers.ts';
import { LiveTracker, sample } from '../../../src/core/live/LiveTracker.ts';
import type { LiveGame } from '../../../src/core/live/types.ts';

const game = (t: number, kills = 0) => fixture<LiveGame>({
  gameTime: t,
  allies: [{ name: 'A', itemGold: 1000, scores: { creepScore: 10 } }],
  enemies: [{ name: 'B', itemGold: 800, scores: {} }],
  objectives: { ally: { kills }, enemy: { kills: 0 } },
});

test('a sample sums both teams', () => {
  assert.deepStrictEqual(sample(game(61)), { t: 61, ally: 1000, enemy: 800, allyKills: 0, enemyKills: 0, allyCs: 10, enemyCs: 0, players: { A: 1000, B: 800 } });
});

test('points are kept every 20 s and on kills; the latest is refreshed in between', () => {
  const tracker = new LiveTracker();
  tracker.track(game(0));
  tracker.track(game(3));
  tracker.track(game(6));
  assert.deepStrictEqual(tracker.track(game(9)).timeline!.map((p) => p.t), [0, 9]);
  assert.deepStrictEqual(tracker.track(game(10, 1)).timeline!.map((p) => p.t), [0, 9, 10]);
});

test('a game time going back starts a new timeline', () => {
  const tracker = new LiveTracker();
  tracker.track(game(600));
  assert.deepStrictEqual(tracker.track(game(5)).timeline!.map((p) => p.t), [5]);
});
