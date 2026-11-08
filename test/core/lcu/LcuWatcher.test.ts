// Game mode gating, match roster with ranks and its merge into live data (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../helpers.ts';
import { LcuWatcher } from '../../../src/core/lcu/LcuWatcher.ts';

const db = loadDatabase();
const session = (id, extra = {}) => ({ gameData: { queue: { id, gameMode: id === 450 ? 'ARAM' : 'CLASSIC' }, ...extra } });

// A custom game as the gameflow session reports it: no queue id, map and game mode on the queue.
const customSession = (mapId, gameMode) => ({ gameData: { isCustomGame: true, queue: { id: -1, mapId, gameMode } }, map: { id: mapId, gameMode } });

test('the watcher roster takes the role the player chooses in Draft later', () => {
  const sent = [];
  const watcher = new LcuWatcher({ getDb: () => null, getPuuid: () => 'me', send: (channel, payload) => sent.push([channel, payload]) });
  watcher.setRoster([{ puuid: 'me', championId: 'Ahri', team: 'ORDER', position: null, rank: null }]);

  watcher.setMyRole('JUNGLE');

  assert.strictEqual(watcher.roster[0].position, 'JUNGLE');
  assert.deepStrictEqual(sent.at(-1), ['lcu:roster', watcher.roster]);
});
