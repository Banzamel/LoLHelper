// Game mode gating, match roster with ranks and its merge into live data (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../helpers.ts';
import { fetchRoster, withMyPosition } from '../../../src/core/lcu/roster.ts';
import { normalize } from '../../../src/core/live/normalize.ts';

const db = loadDatabase();
const session = (id, extra = {}) => ({ gameData: { queue: { id, gameMode: id === 450 ? 'ARAM' : 'CLASSIC' }, ...extra } });

// A custom game as the gameflow session reports it: no queue id, map and game mode on the queue.
const customSession = (mapId, gameMode) => ({ gameData: { isCustomGame: true, queue: { id: -1, mapId, gameMode } }, map: { id: mapId, gameMode } });

// Runes, summoner spells, skill order and in-game adjustments (needs `npm run fetch-data`).

const runeTree = Object.fromEntries(db.runes.trees.flatMap((t) => t.slots.flat().map((r) => [r.id, t.id])));
const spellKey = Object.fromEntries(db.summoners.map((s) => [s.id, s.key]));
const CASES = [['Jinx', 'Caitlyn', 'BOTTOM'], ['Darius', 'Teemo', 'TOP'], ['Syndra', 'Zed', 'MIDDLE'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Vi', 'LeeSin', 'JUNGLE'], ['Udyr', 'LeeSin', 'JUNGLE']];

test('a Practice Tool roster without roles gives the live player the chosen role and no enemies', async () => {
  const lcu = { get: async () => ({ queueMap: {} }) };
  const roster = await fetchRoster(fixture(lcu), { gameData: { teamOne: [{ puuid: 'me', championId: Number(db.byId.Ahri.key), selectedPosition: '' }], teamTwo: [] } }, db, 'RANKED_SOLO_5x5');
  const player = { championName: 'Ahri', rawChampionName: 'game_character_displayname_Ahri', riotId: 'Me#1', team: 'ORDER', position: '', level: 1, items: [], scores: {} };

  const game = normalize({ activePlayer: { riotId: 'Me#1', currentGold: 500 }, allPlayers: [player], gameData: {} }, db, withMyPosition(roster, 'me', 'BOTTOM'));

  assert.deepStrictEqual([game.me.position, game.enemies.length], ['BOTTOM', 0]);
});

test('roster positions and ranks fill in the live data', async () => {
  const keyOf = (id) => Number(db.byId[id].key);
  const lcu = { get: async (uri) => ({ queueMap: { RANKED_SOLO_5x5: { tier: uri.endsWith('b') ? 'SILVER' : 'BRONZE', division: 'I', leaguePoints: 10, wins: 1, losses: 1 } } }) };
  const roster = await fetchRoster(fixture(lcu), session(420, {
    teamOne: [{ puuid: 'a', championId: keyOf('Jinx'), selectedPosition: 'BOTTOM' }],
    teamTwo: [{ puuid: 'b', championId: keyOf('Thresh'), selectedPosition: 'UTILITY' }],
  }), db, 'RANKED_SOLO_5x5');
  const p = (champ, team) => ({ championName: champ, rawChampionName: `game_character_displayname_${champ}`, riotId: `${champ}#1`, team, position: '', level: 1, items: [], scores: {} });
  const game = normalize({ activePlayer: { riotId: 'Jinx#1', currentGold: 500 }, allPlayers: [p('Jinx', 'ORDER'), p('Thresh', 'CHAOS')], gameData: {} }, db, roster);
  assert.strictEqual(game.me.position, 'BOTTOM');
  assert.strictEqual(game.me.rank.tier, 'BRONZE');
  assert.deepStrictEqual([game.enemies[0].position, game.enemies[0].rank.tier], ['SUPPORT', 'SILVER']);
  assert.strictEqual(await fetchRoster(fixture(lcu), session(420), db, 'RANKED_SOLO_5x5'), null);
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

test('live client data is normalized with real positions', () => {
  const p = (champ, team, position) => ({ championName: champ, rawChampionName: `game_character_displayname_${champ}`, riotId: `${champ}#1`, team, position, level: 5, items: [], scores: {} });
  const game = normalize({
    activePlayer: { riotId: 'Jinx#1', currentGold: 500 },
    allPlayers: [p('Jinx', 'ORDER', 'BOTTOM'), p('MonkeyKing', 'CHAOS', 'TOP'), p('Thresh', 'CHAOS', 'UTILITY')],
    gameData: { gameTime: 60 },
  }, db);
  assert.strictEqual(game.me.championId, 'Jinx');
  assert.strictEqual(game.me.gold, 500);
  assert.deepStrictEqual(game.enemies.map((e) => [e.championId, e.position]), [['MonkeyKing', 'TOP'], ['Thresh', 'SUPPORT']]);
});
