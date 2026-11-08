// Client match history, player analysis, live events and per-account settings (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase, nodeStorage, tempDir } from '../../helpers.ts';
import { compactGame } from '../../../src/core/matches/compactGame.ts';
import { MatchStore } from '../../../src/core/matches/MatchStore.ts';

const db = loadDatabase();
const key = (id) => db.byId[id].key;
const itemId = (n) => db.items.find((i) => i.nameEn === n).id;

// A raw /lol-match-history game: the player (puuid "me") is participant 1 on team 100.
function rawGame({ id = 1, queueId = 420, win = true, champ = 'Ahri', duration = 1800, created = 1000, full = true, lane = 'MIDDLE', k = 8, d = 3, a = 6 } = {}) {
  const lanes = [['TOP', 'SOLO'], ['JUNGLE', 'NONE'], ['MIDDLE', 'SOLO'], ['BOTTOM', 'DUO_CARRY'], ['BOTTOM', 'DUO_SUPPORT']];
  const champs = ['Garen', 'LeeSin', 'Zed', 'Jinx', 'Thresh', 'Darius', 'Vi', 'Syndra', 'Caitlyn', 'Lulu'];
  const participants = [];
  for (let i = 0; i < (full ? 10 : 1); i += 1) {
    const mine = i === 0;
    const team = i < 5 ? 100 : 200;
    const [l, r] = mine ? [lane, 'SOLO'] : lanes[i % 5];
    participants.push({
      participantId: i + 1, teamId: team, championId: key(mine ? champ : champs[i]), spell1Id: 4, spell2Id: 14,
      timeline: { lane: l, role: r },
      stats: {
        win: team === 100 ? win : !win, kills: mine ? k : 3, deaths: mine ? d : 4, assists: mine ? a : 5,
        item0: itemId("Luden's Echo"), item1: itemId('Sorcerer\'s Shoes'), item6: 3340,
        totalMinionsKilled: mine ? 210 : 150, neutralMinionsKilled: 4, goldEarned: 12000, totalDamageDealtToChampions: mine ? 30000 : 15000, visionScore: 20, champLevel: 16,
      },
    });
  }
  const swap = { 1: 3, 3: 1 };
  if (full) { participants[0].timeline.lane = lane; participants[2].timeline.lane = 'BOTTOM'; participants[2].timeline.role = 'DUO_CARRY'; }
  return {
    gameId: id, queueId, gameMode: queueId === 450 ? 'ARAM' : 'CLASSIC', gameCreation: created, gameDuration: duration, gameVersion: '16.21.123.4567',
    participantIdentities: participants.map((p) => ({ participantId: p.participantId, player: { puuid: p.participantId === 1 ? 'me' : `p${p.participantId}`, gameName: `Player${swap[p.participantId] || p.participantId}`, tagLine: 'EUNE' } })),
    participants,
    teams: [{ teamId: 100, win: win ? 'Win' : 'Fail', dragonKills: 3, baronKills: 1, towerKills: 8 }, { teamId: 200, win: win ? 'Fail' : 'Win', dragonKills: 1 }],
  };
}

test('the match store keeps full games and never downgrades them', async () => {
  const storage = nodeStorage(tempDir());
  const store = new MatchStore(storage);
  await store.use('profiles/me');
  assert.strictEqual(store.upsert([compactGame(rawGame({ id: 1, full: false }), db), compactGame(rawGame({ id: 2, created: 2000 }), db)]), 2);
  store.upsert([compactGame(rawGame({ id: 1 }), db)]);
  store.upsert([compactGame(rawGame({ id: 2, full: false, created: 2000 }), db)]);
  assert.ok(store.list().every((g) => g.full));
  assert.strictEqual(store.list()[0].id, 2);
  await store.save();
  const again = new MatchStore(storage);
  await again.use('profiles/me');
  assert.strictEqual(again.list().length, 2);
});
