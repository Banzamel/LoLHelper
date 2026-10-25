// Runes, summoner spells, skill order and in-game adjustments (needs `npm run fetch-data`).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { recommendBuild } = require('../src/main/engine/builds');
const { normalize } = require('../src/main/lcu/liveclient');

const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));
const runeTree = Object.fromEntries(db.runes.trees.flatMap((t) => t.slots.flat().map((r) => [r.id, t.id])));
const spellKey = Object.fromEntries(db.summoners.map((s) => [s.id, s.key]));
const CASES = [['Jinx', 'Caitlyn', 'BOTTOM'], ['Darius', 'Teemo', 'TOP'], ['Syndra', 'Zed', 'MIDDLE'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Vi', 'LeeSin', 'JUNGLE'], ['Udyr', 'LeeSin', 'JUNGLE']];

test('rune pages are valid: keystone + 3 primary, 2 secondary from another tree, 3 shards', () => {
  for (const [c, e, role] of CASES) {
    const { runes } = recommendBuild(db, { championId: c, enemyId: e, enemyIds: [e], role });
    const ids = runes.selectedPerkIds;
    assert.strictEqual(ids.length, 9, c);
    assert.notStrictEqual(runes.primaryStyleId, runes.subStyleId, c);
    assert.ok(ids.slice(0, 4).every((id) => runeTree[id] === runes.primaryStyleId), `${c} primary`);
    assert.ok(ids.slice(4, 6).every((id) => runeTree[id] === runes.subStyleId), `${c} secondary`);
    assert.strictEqual(new Set(ids.slice(0, 6)).size, 6, `${c} unique runes`);
    assert.ok(ids.slice(6).every((id) => db.runes.shards.some((s) => s.id === id)), `${c} shards`);
  }
});

test('summoner spells follow the role', () => {
  const spells = (c, e, role) => recommendBuild(db, { championId: c, enemyId: e, enemyIds: [e], role }).spells.ids.map((id) => spellKey[id]);
  assert.deepStrictEqual(spells('Vi', 'LeeSin', 'JUNGLE'), ['SummonerFlash', 'SummonerSmite']);
  assert.ok(spells('Jinx', 'Caitlyn', 'BOTTOM').includes('SummonerFlash'));
  assert.ok(spells('Darius', 'Teemo', 'TOP').includes('SummonerTeleport'));
});

test('skill order levels R at 6/11/16 and maxes the first ability first', () => {
  const { skills } = recommendBuild(db, { championId: 'Jinx', enemyId: 'Caitlyn', role: 'BOTTOM' });
  assert.deepStrictEqual(skills.max, ['Q', 'W', 'E']);
  assert.strictEqual(skills.levels.length, 18);
  assert.deepStrictEqual([6, 11, 16].map((l) => skills.levels[l - 1]), ['R', 'R', 'R']);
  assert.strictEqual(skills.levels.filter((k) => k === 'Q').length, 5);
  const udyr = recommendBuild(db, { championId: 'Udyr', enemyId: 'LeeSin', role: 'JUNGLE' }).skills;
  assert.strictEqual(udyr.levels, null);
});

test('in game: owned items stay, next purchase is not owned, enemy items shift threats', () => {
  const base = { championId: 'Jinx', enemyId: 'Caitlyn', enemyIds: ['Caitlyn', 'Malphite', 'Zed', 'Lux', 'LeeSin'], role: 'BOTTOM' };
  const plain = recommendBuild(db, base);
  const owned = [3032, 3006];
  const live = recommendBuild(db, { ...base, ownedItems: owned, enemyItems: { Lux: [6655, 3089, 3157], Zed: [3089], Malphite: [3157] } });
  assert.ok(live.full.includes(3032));
  assert.ok(live.next && !owned.includes(live.next));
  assert.ok(live.threats.some((x) => x.key === 'threat.fromItems'));
  const ap = (b) => b.threats.find((x) => x.key === 'threat.damageSplit').params.ap;
  assert.ok(ap(live) > ap(plain));
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
