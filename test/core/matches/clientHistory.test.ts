// The account's client match history synced into the cache, game details and other players'
// profiles, against a fake LCU.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase, nodeStorage, tempDir } from '../../helpers.ts';
import { matchDetail, PlayerLookup, syncMatches } from '../../../src/core/matches/clientHistory.ts';
import { MatchStore } from '../../../src/core/matches/MatchStore.ts';
import type { Lcu } from '../../../src/core/lcu/types.ts';

const db = loadDatabase();
const raw = (gameId: number, players = 1) => ({
  gameId, queueId: 420, gameMode: 'CLASSIC', gameCreation: gameId * 1000, gameDuration: 1800, gameVersion: '15.9.1',
  participantIdentities: Array.from({ length: players }, (_, i) => ({ participantId: i + 1, player: { puuid: i ? `p${i}` : 'me' } })),
  participants: Array.from({ length: players }, (_, i) => ({ participantId: i + 1, teamId: i < 5 ? 100 : 200, championId: db.byId.Ahri.key, stats: { win: i < 5 } })),
  teams: [],
});

function fakeLcu(gets: string[]): Lcu {
  return {
    async get(endpoint) {
      gets.push(endpoint);
      if (endpoint.includes('/matches?begIndex=0')) return { games: { games: [raw(2), raw(1)] } };
      if (endpoint.includes('/matches?')) return { games: { games: [] } };
      if (endpoint.includes('/game-timelines/')) return { frames: [{ timestamp: 0, participantFrames: { 1: { participantId: 1, totalGold: 500 } } }] };
      if (endpoint.includes('/games/')) return raw(Number(endpoint.split('/').pop()), 10);
      if (endpoint.includes('/summoners/puuid/')) return { gameName: 'Rival', tagLine: 'EUW', summonerLevel: 300 };
      throw new Error('404');
    },
    async request() { return null; },
  };
}

test('a sync fetches the list and the details of games known only from it', async () => {
  const store = await new MatchStore(nodeStorage(tempDir())).use('profiles/me');
  await syncMatches(fakeLcu([]), db, store, 'me');
  assert.deepStrictEqual([store.list().map((g) => g.id), store.list().every((g) => g.full), !!store.lastSync], [[2, 1], true, true]);
});

test('a game detail comes with its gold timeline, cached afterwards', async () => {
  const store = await new MatchStore(null).use(null);
  store.upsert([]);
  const gets: string[] = [];
  const game = await matchDetail(fakeLcu(gets), db, store, 5);
  assert.deepStrictEqual([game!.full, game!.gold!.teams], [true, [[0, 500, 0]]]);
  assert.strictEqual(await matchDetail(null, db, store, 99), null);
});

test('a player profile is cached and a hidden history is reported', async () => {
  const gets: string[] = [];
  const lookup = new PlayerLookup();
  const first = await lookup.fetch(fakeLcu(gets), db, 'rival');
  await lookup.fetch(fakeLcu(gets), db, 'rival');
  assert.deepStrictEqual([first.name, first.level, first.games.length, first.historyHidden], ['Rival', 300, 2, false]);
  assert.strictEqual(gets.length, 3);
});
