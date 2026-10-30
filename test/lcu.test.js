// Game mode gating, match roster with ranks and its merge into live data (needs `npm run fetch-data`).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { modeOf } = require('../src/main/lcu/queues');
const { fetchRoster, rankFrom, withMyPosition } = require('../src/main/lcu/roster');
const { LcuWatcher } = require('../src/main/lcu/watcher');
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

// A custom game as the gameflow session reports it: no queue id, map and game mode on the queue.
const customSession = (mapId, gameMode) => ({ gameData: { isCustomGame: true, queue: { id: -1, mapId, gameMode } }, map: { id: mapId, gameMode } });

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

test('the player without a position takes the role chosen in Draft', () => {
  const roster = [{ puuid: 'me', championId: 'Ahri', position: null }, { puuid: 'bot', championId: 'Annie', position: null }];

  const filled = withMyPosition(roster, 'me', 'TOP');

  assert.deepStrictEqual(filled.map((p) => p.position), ['TOP', null]);
});

test('an assigned position wins over the role chosen in Draft', () => {
  const roster = [{ puuid: 'me', championId: 'Ahri', position: 'MIDDLE' }];

  assert.strictEqual(withMyPosition(roster, 'me', 'TOP')[0].position, 'MIDDLE');
});

test('the watcher roster takes the role the player chooses in Draft later', () => {
  const sent = [];
  const watcher = new LcuWatcher({ getDb: () => null, getPuuid: () => 'me', send: (channel, payload) => sent.push([channel, payload]) });
  watcher.setRoster([{ puuid: 'me', championId: 'Ahri', team: 'ORDER', position: null }]);

  watcher.setMyRole('JUNGLE');

  assert.strictEqual(watcher.roster[0].position, 'JUNGLE');
  assert.deepStrictEqual(sent.at(-1), ['lcu:roster', watcher.roster]);
});

test('a Practice Tool roster without roles gives the live player the chosen role and no enemies', async () => {
  const lcu = { get: async () => ({ queueMap: {} }) };
  const roster = await fetchRoster(lcu, { gameData: { teamOne: [{ puuid: 'me', championId: Number(db.byId.Ahri.key), selectedPosition: '' }], teamTwo: [] } }, db, 'RANKED_SOLO_5x5');
  const player = { championName: 'Ahri', rawChampionName: 'game_character_displayname_Ahri', riotId: 'Me#1', team: 'ORDER', position: '', level: 1, items: [], scores: {} };

  const game = normalize({ activePlayer: { riotId: 'Me#1', currentGold: 500 }, allPlayers: [player], gameData: {} }, db, withMyPosition(roster, 'me', 'BOTTOM'));

  assert.deepStrictEqual([game.me.position, game.enemies.length], ['BOTTOM', 0]);
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
