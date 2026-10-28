// Client match history, player analysis, live events and per-account settings (needs `npm run fetch-data`).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { compactGame, compactTimeline, queueType, MatchStore } = require('../src/main/lcu/matches');
const { analyzeGames } = require('../src/main/engine/style');
const { fromMatch, learningHistory } = require('../src/main/engine/history');
const { normalize } = require('../src/main/lcu/liveclient');
const { Settings } = require('../src/main/settings');
const demo = require('../src/main/demo');

const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));
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

test('client games become compact games with lanes, items and team totals', () => {
  const g = compactGame(rawGame(), db);
  assert.strictEqual(g.full, true);
  assert.strictEqual(g.type, 'solo');
  assert.strictEqual(g.version, '16.21');
  const me = g.players.find((p) => p.puuid === 'me');
  assert.strictEqual(me.champ, 'Ahri');
  assert.strictEqual(me.pos, 'MIDDLE');
  assert.strictEqual(me.cs, 214);
  assert.strictEqual(g.players.find((p) => p.pid === 5).pos, 'SUPPORT');
  assert.strictEqual(g.teams[0].kills, 8 + 4 * 3);
  assert.strictEqual(queueType(450, 'ARAM'), 'aram');
  assert.strictEqual(queueType(9999, 'CHERRY'), 'arena');
  assert.strictEqual(compactGame(rawGame({ full: false }), db).full, false);
  const tl = compactTimeline({ frames: [0, 1].map((m) => ({ timestamp: m * 60000, participantFrames: Object.fromEntries(g.players.map((p) => [p.pid, { participantId: p.pid, totalGold: 500 + m * (p.team === 100 ? 400 : 300) }])) })) }, g);
  assert.deepStrictEqual(tl.teams[1], [1, 5 * 900, 5 * 800]);
  assert.strictEqual(tl.players[1].length, 2);
});

test('the match store keeps full games and never downgrades them', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lolh-'));
  const store = new MatchStore();
  store.use(dir);
  assert.strictEqual(store.upsert([compactGame(rawGame({ id: 1, full: false }), db), compactGame(rawGame({ id: 2, created: 2000 }), db)]), 2);
  store.upsert([compactGame(rawGame({ id: 1 }), db)]);
  store.upsert([compactGame(rawGame({ id: 2, full: false, created: 2000 }), db)]);
  assert.ok(store.list().every((g) => g.full));
  assert.strictEqual(store.list()[0].id, 2);
  store.save();
  const again = new MatchStore();
  again.use(dir);
  assert.strictEqual(again.list().length, 2);
});

test('the analysis summarises results, roles, trend and play style', () => {
  const games = [];
  for (let i = 0; i < 12; i += 1) games.push(compactGame(rawGame({ id: i + 1, created: 1000 + i, win: i % 3 !== 0, k: 12, d: 9, a: 4 }), db));
  games.push(compactGame(rawGame({ id: 50, queueId: 450, created: 5000, champ: 'Lux' }), db));
  games.push(compactGame(rawGame({ id: 51, duration: 200, created: 6000 }), db));
  const a = analyzeGames(games.reverse(), 'me');
  assert.strictEqual(a.games, 13, 'the remake is skipped');
  assert.deepStrictEqual(a.byType.map((x) => x.key), ['solo', 'aram']);
  assert.strictEqual(a.byRole[0].key, 'MIDDLE');
  assert.strictEqual(a.byChampion[0].key, 'Ahri');
  assert.strictEqual(a.trend.length, 13);
  assert.ok(a.streak.n >= 1);
  const keys = a.traits.map((t) => t.key);
  assert.ok(keys.includes('style.aggressive'));
  assert.ok(keys.includes('style.manyDeaths'));
  assert.ok(keys.includes('style.oneTrick'));
});

test('client games teach the engine unless the app recorded them itself', () => {
  const g = compactGame(rawGame({ id: 7 }), db);
  const entry = fromMatch(db, g, 'me');
  assert.strictEqual(entry.championId, 'Ahri');
  assert.strictEqual(entry.opponentId, 'Syndra');
  assert.ok(entry.items.includes(itemId("Luden's Echo")) && !entry.items.includes(3340));
  assert.strictEqual(fromMatch(db, compactGame(rawGame({ queueId: 450 }), db), 'me'), null);
  const merged = learningHistory(db, [{ id: '7', championId: 'Ahri', items: [], enemies: [], win: false }], [g, compactGame(rawGame({ id: 8 }), db)], 'me');
  assert.deepStrictEqual(merged.map((x) => x.id), ['7', '8']);
});

test('live events give objectives per team and a kill feed', () => {
  const player = (name, champ, team) => ({ riotId: `${name}#EUW`, riotIdGameName: name, rawChampionName: `game_character_displayname_${champ}`, team, items: [], scores: {}, level: 6 });
  const data = {
    activePlayer: { riotId: 'Me#EUW', currentGold: 500, championStats: { attackDamage: 80.5 }, abilities: { Q: { abilityLevel: 3 } } },
    allPlayers: [player('Me', 'Ahri', 'ORDER'), player('Foe', 'Zed', 'CHAOS')],
    gameData: { gameTime: 600 },
    events: { Events: [
      { EventName: 'ChampionKill', EventTime: 300, KillerName: 'Me', VictimName: 'Foe' },
      { EventName: 'DragonKill', EventTime: 400, KillerName: 'Foe', DragonType: 'Air', Stolen: 'False' },
      { EventName: 'TurretKilled', EventTime: 500, KillerName: 'Minion', TurretKilled: 'Turret_T2_L_03_A' },
    ] },
  };
  const g = normalize(data, db);
  assert.strictEqual(g.objectives.ally.kills, 1);
  assert.deepStrictEqual(g.objectives.enemy.dragons, ['Air']);
  assert.strictEqual(g.objectives.ally.towers, 1);
  assert.deepStrictEqual(g.feed.map((e) => [e.type, e.team]), [['towers', 'ally'], ['dragons', 'enemy'], ['kills', 'ally']]);
  assert.strictEqual(g.feed[2].victim, 'Zed');
  assert.strictEqual(g.me.stats.attackDamage, 80.5);
  assert.strictEqual(g.me.abilities.Q, 3);
});

test('account settings are kept per profile, shared settings stay shared', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lolh-'));
  const s = new Settings(dir);
  s.set({ pool: { TOP: ['Garen'] }, language: 'en' });
  s.useProfile(path.join(dir, 'profiles', 'a'));
  assert.deepStrictEqual(s.get('pool'), { TOP: ['Garen'] }, 'the first account inherits the old pool');
  s.set({ pool: { TOP: ['Darius'] }, alwaysOnTop: true });
  s.useProfile(path.join(dir, 'profiles', 'b'));
  assert.deepStrictEqual(s.get('pool').TOP, [], 'a new account starts empty');
  assert.strictEqual(s.get('alwaysOnTop'), true);
  s.useProfile(path.join(dir, 'profiles', 'a'));
  assert.deepStrictEqual(s.get('pool'), { TOP: ['Darius'] });
  assert.strictEqual(new Settings(dir).get('language'), 'en');
});

test('the simulated match is a complete game that develops over time', () => {
  const early = normalize(demo.snapshot(db, demo.START), db, demo.roster());
  const late = normalize(demo.snapshot(db, demo.END), db, demo.roster());
  assert.strictEqual(early.me.championId, 'Ahri');
  assert.strictEqual(early.allies.length, 5);
  assert.strictEqual(early.enemies.length, 5);
  assert.ok(early.enemies.every((e) => e.position && e.puuid && e.rank));
  assert.ok(late.objectives.ally.kills > early.objectives.ally.kills);
  assert.ok(late.objectives.ally.dragons.length + late.objectives.enemy.dragons.length >= 4);
  assert.ok(late.me.itemGold > early.me.itemGold);
  const p = demo.player(db, 'demo-Shuriken');
  assert.strictEqual(p.games.length, 20);
  assert.strictEqual(demo.player(db, 'demo-Nobody'), null);
});
