// Game mode gating, match roster with ranks and its merge into live data (needs `npm run fetch-data`).
import { test } from 'vitest';
import type { RosterEntry } from '../../../src/core/lcu/types.ts';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../helpers.ts';
import { rankFrom, withMyPosition } from '../../../src/core/lcu/roster.ts';

const db = loadDatabase();
const session = (id, extra = {}) => ({ gameData: { queue: { id, gameMode: id === 450 ? 'ARAM' : 'CLASSIC' }, ...extra } });

// A custom game as the gameflow session reports it: no queue id, map and game mode on the queue.
const customSession = (mapId, gameMode) => ({ gameData: { isCustomGame: true, queue: { id: -1, mapId, gameMode } }, map: { id: mapId, gameMode } });

test('the player without a position takes the role chosen in Draft', () => {
  const roster = fixture<RosterEntry[]>([{ puuid: 'me', championId: 'Ahri', position: null }, { puuid: 'bot', championId: 'Annie', position: null }]);

  const filled = withMyPosition(roster, 'me', 'TOP');

  assert.deepStrictEqual(filled.map((p) => p.position), ['TOP', null]);
});

test('an assigned position wins over the role chosen in Draft', () => {
  const roster = fixture<RosterEntry[]>([{ puuid: 'me', championId: 'Ahri', position: 'MIDDLE' }]);

  assert.strictEqual(withMyPosition(roster, 'me', 'TOP')[0].position, 'MIDDLE');
});

test('ranked stats are read for the game\'s queue', () => {
  const stats = { queueMap: {
    RANKED_SOLO_5x5: { tier: 'GOLD', division: 'II', leaguePoints: 45, wins: 60, losses: 50 },
    RANKED_FLEX_SR: { tier: 'MASTER', division: 'NA', leaguePoints: 120, wins: 10, losses: 2 },
  } };
  assert.deepStrictEqual(rankFrom(stats, 'RANKED_SOLO_5x5'), { tier: 'GOLD', division: 'II', lp: 45, wins: 60, losses: 50 });
  assert.strictEqual(rankFrom(stats, 'RANKED_FLEX_SR').division, null);
  assert.strictEqual(rankFrom({ queueMap: { RANKED_SOLO_5x5: { tier: 'NONE' } } }, 'RANKED_SOLO_5x5').tier, null);
  assert.deepStrictEqual(rankFrom({ queueMap: { RANKED_SOLO_5x5: { tier: '', previousSeasonEndTier: 'SILVER', previousSeasonEndDivision: 'III' } } }, 'RANKED_SOLO_5x5').previous, { tier: 'SILVER', division: 'III' });
});
