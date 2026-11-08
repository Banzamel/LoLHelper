// Game mode gating, match roster with ranks and its merge into live data (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../helpers.ts';
import { modeOf } from '../../../src/core/lcu/queues.ts';

const db = loadDatabase();
const session = (id, extra = {}) => ({ gameData: { queue: { id, gameMode: id === 450 ? 'ARAM' : 'CLASSIC' }, ...extra } });

// A custom game as the gameflow session reports it: no queue id, map and game mode on the queue.
const customSession = (mapId, gameMode) => ({ gameData: { isCustomGame: true, queue: { id: -1, mapId, gameMode } }, map: { id: mapId, gameMode } });

test('only role-based Summoner\'s Rift queues are supported', () => {
  for (const id of [400, 420, 440, 480, 490, 700]) assert.strictEqual(modeOf(session(id)).supported, true, `queue ${id}`);
  for (const id of [430, 450, 900, 1700]) assert.strictEqual(modeOf(session(id)).supported, false, `queue ${id}`);
  assert.strictEqual(modeOf({ gameData: { queue: { id: -1 }, isCustomGame: true } }).supported, false);
  assert.strictEqual(modeOf(null), null);
  assert.strictEqual(modeOf(session(440)).rankedQueue, 'RANKED_FLEX_SR');
  assert.strictEqual(modeOf(session(420)).rankedQueue, 'RANKED_SOLO_5x5');
});

test('the Practice Tool on Summoner\'s Rift is supported and not recorded', () => {
  const mode = modeOf(customSession(11, 'PRACTICETOOL'));

  assert.deepStrictEqual([mode.key, mode.supported, mode.recorded], ['practice', true, false]);
});

test('a Summoner\'s Rift custom game is supported and not recorded', () => {
  const mode = modeOf(customSession(11, 'CLASSIC'));

  assert.deepStrictEqual([mode.key, mode.supported, mode.recorded], ['custom', true, false]);
});

test('a custom ARAM game is not supported', () => {
  const mode = modeOf(customSession(12, 'ARAM'));

  assert.deepStrictEqual([mode.key, mode.supported, mode.recorded], ['custom', false, false]);
});

test('a custom game takes the map and mode from the session map when the queue leaves them empty', () => {
  const session = { gameData: { isCustomGame: true, queue: { id: -1, mapId: 0, gameMode: '' } }, map: { id: 11, gameMode: 'PRACTICETOOL' } };

  const mode = modeOf(session);

  assert.deepStrictEqual([mode.key, mode.supported], ['practice', true]);
});

test('a normal draft game stays supported and recorded', () => {
  const mode = modeOf(session(400));

  assert.deepStrictEqual([mode.queueId, mode.key, mode.supported, mode.recorded], [400, 'normalDraft', true, true]);
});

test('a session without game data has no mode', () => {
  assert.strictEqual(modeOf({}), null);
});
