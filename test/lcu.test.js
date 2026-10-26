// Game mode gating, match roster with ranks and its merge into live data (needs `npm run fetch-data`).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { modeOf } = require('../src/main/lcu/queues');
const { fetchRoster, rankFrom } = require('../src/main/lcu/roster');
const { normalize } = require('../src/main/lcu/liveclient');

const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));
const session = (id, extra = {}) => ({ gameData: { queue: { id, gameMode: id === 450 ? 'ARAM' : 'CLASSIC' }, ...extra } });

test('only role-based Summoner\'s Rift queues are supported', () => {
  for (const id of [400, 420, 440, 480, 490, 700]) assert.strictEqual(modeOf(session(id)).supported, true, `queue ${id}`);
  for (const id of [430, 450, 900, 1700]) assert.strictEqual(modeOf(session(id)).supported, false, `queue ${id}`);
  assert.strictEqual(modeOf({ gameData: { queue: { id: -1 }, isCustomGame: true } }).supported, false);
  assert.strictEqual(modeOf(null), null);
  assert.strictEqual(modeOf(session(440)).rankedQueue, 'RANKED_FLEX_SR');
  assert.strictEqual(modeOf(session(420)).rankedQueue, 'RANKED_SOLO_5x5');
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

test('roster positions and ranks fill in the live data', async () => {
  const keyOf = (id) => Number(db.byId[id].key);
  const lcu = { get: async (uri) => ({ queueMap: { RANKED_SOLO_5x5: { tier: uri.endsWith('b') ? 'SILVER' : 'BRONZE', division: 'I', leaguePoints: 10, wins: 1, losses: 1 } } }) };
  const roster = await fetchRoster(lcu, session(420, {
    teamOne: [{ puuid: 'a', championId: keyOf('Jinx'), selectedPosition: 'BOTTOM' }],
    teamTwo: [{ puuid: 'b', championId: keyOf('Thresh'), selectedPosition: 'UTILITY' }],
  }), db, 'RANKED_SOLO_5x5');
  const p = (champ, team) => ({ championName: champ, rawChampionName: `game_character_displayname_${champ}`, riotId: `${champ}#1`, team, position: '', level: 1, items: [], scores: {} });
  const game = normalize({ activePlayer: { riotId: 'Jinx#1', currentGold: 500 }, allPlayers: [p('Jinx', 'ORDER'), p('Thresh', 'CHAOS')], gameData: {} }, db, roster);
  assert.strictEqual(game.me.position, 'BOTTOM');
  assert.strictEqual(game.me.rank.tier, 'BRONZE');
  assert.deepStrictEqual([game.enemies[0].position, game.enemies[0].rank.tier], ['SUPPORT', 'SILVER']);
  assert.strictEqual(await fetchRoster(lcu, session(420), db, 'RANKED_SOLO_5x5'), null);
});

test('summoner spells (D/F) and runes are read from live data', () => {
  const spell = (key) => ({ displayName: key, rawDisplayName: `GeneratedTip_SummonerSpell_${key}_DisplayName` });
  const player = {
    championName: 'Jinx', rawChampionName: 'game_character_displayname_Jinx', riotId: 'Jinx#1', team: 'ORDER', level: 1, items: [], scores: {},
    summonerSpells: { summonerSpellOne: spell('SummonerFlash'), summonerSpellTwo: spell('SummonerHeal') }, runes: { keystone: { id: 8008 } },
  };
  const fullRunes = {
    primaryRuneTree: { id: 8000 }, secondaryRuneTree: { id: 8100 },
    generalRunes: [8008, 9111, 9104, 8014, 8139, 8135].map((id) => ({ id })), statRunes: [5005, 5008, 5011].map((id) => ({ id })),
  };
  const game = normalize({ activePlayer: { riotId: 'Jinx#1', currentGold: 500, fullRunes }, allPlayers: [player], gameData: {} }, db);
  assert.deepStrictEqual(game.me.spells, [4, 7]);
  assert.strictEqual(game.me.keystone, 8008);
  assert.deepStrictEqual(game.me.runes, { primaryStyleId: 8000, subStyleId: 8100, selectedPerkIds: [8008, 9111, 9104, 8014, 8139, 8135, 5005, 5008, 5011] });
});
