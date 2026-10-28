// Simulated match: Live Client Data API snapshots of an invented 5v5 game, so anyone can see
// the Match view (scoreboard, enemies, tables, charts) without playing. The snapshot depends
// only on the game time, which runs faster than real time. Players also get invented ranks and
// recent games for the player sheet. Nothing from a simulated match is recorded.
const { compactGame } = require('./lcu/matches');

const SPEED = 5;
const START = 8 * 60;
const END = 42 * 60;

const BUILDS = {
  mage: ["Luden's Echo", "Sorcerer's Shoes", "Rabadon's Deathcap", "Zhonya's Hourglass", 'Void Staff', 'Shadowflame'],
  fighter: ['Trinity Force', 'Plated Steelcaps', "Sterak's Gage", "Death's Dance", 'Black Cleaver', 'Guardian Angel'],
  marksman: ['Infinity Edge', "Berserker's Greaves", 'Kraken Slayer', "Lord Dominik's Regards", 'Bloodthirster', 'Guardian Angel'],
  support: ['Locket of the Iron Solari', 'Plated Steelcaps', "Knight's Vow", 'Redemption', 'Zeke\'s Convergence'],
  assassin: ["Youmuu's Ghostblade", 'Ionian Boots of Lucidity', 'Edge of Night', "Serylda's Grudge", 'Bloodthirster', 'Guardian Angel'],
};

// [name, champion, team, position, build, pace (items and levels), keystone, rank]
const PLAYERS = [
  ['You', 'Ahri', 'ORDER', 'MIDDLE', 'mage', 1.08, 8112, ['EMERALD', 'III']],
  ['IronWall', 'Garen', 'ORDER', 'TOP', 'fighter', 0.92, 8010, ['PLATINUM', 'I']],
  ['LeafBlade', 'LeeSin', 'ORDER', 'JUNGLE', 'fighter', 1.0, 8010, ['EMERALD', 'IV']],
  ['ArcLight', 'Jinx', 'ORDER', 'BOTTOM', 'marksman', 1.02, 8008, ['DIAMOND', 'IV']],
  ['Lantern', 'Thresh', 'ORDER', 'UTILITY', 'support', 0.7, 8439, ['PLATINUM', 'II']],
  ['Guillotine', 'Darius', 'CHAOS', 'TOP', 'fighter', 1.18, 8010, ['EMERALD', 'II']],
  ['Piltover', 'Vi', 'CHAOS', 'JUNGLE', 'fighter', 0.95, 8010, ['PLATINUM', 'III']],
  ['Shuriken', 'Zed', 'CHAOS', 'MIDDLE', 'assassin', 1.22, 8112, ['DIAMOND', 'II']],
  ['Headshot', 'Caitlyn', 'CHAOS', 'BOTTOM', 'marksman', 0.86, 8021, ['GOLD', 'I']],
  ['Pixie', 'Lulu', 'CHAOS', 'UTILITY', 'support', 0.62, 8214, null],
];
const POSITION = { UTILITY: 'SUPPORT' };
const SPELLS = { JUNGLE: ['SummonerSmite', 'SummonerFlash'], UTILITY: ['SummonerFlash', 'SummonerExhaust'], TOP: ['SummonerFlash', 'SummonerTeleport'], BOTTOM: ['SummonerFlash', 'SummonerHeal'], MIDDLE: ['SummonerFlash', 'SummonerDot'] };

// [time, killer, victim] — the story of the match: an even early game, a lead for the
// player's team mid-game, a comeback attempt by the enemies.
const KILLS = [
  [195, 'Shuriken', 'You'], [330, 'You', 'Shuriken'], [405, 'LeafBlade', 'Guillotine'], [520, 'Guillotine', 'IronWall'],
  [610, 'ArcLight', 'Headshot'], [700, 'Shuriken', 'ArcLight'], [770, 'You', 'Pixie'], [905, 'Piltover', 'LeafBlade'],
  [980, 'Guillotine', 'Lantern'], [1060, 'You', 'Shuriken'], [1120, 'ArcLight', 'Piltover'], [1180, 'LeafBlade', 'Headshot'],
  [1300, 'Guillotine', 'IronWall'], [1390, 'Shuriken', 'You'], [1450, 'ArcLight', 'Pixie'], [1460, 'You', 'Guillotine'],
  [1610, 'Piltover', 'ArcLight'], [1700, 'IronWall', 'Piltover'], [1820, 'Shuriken', 'Lantern'], [1840, 'LeafBlade', 'Shuriken'],
  [1990, 'Guillotine', 'You'], [2050, 'ArcLight', 'Guillotine'], [2140, 'You', 'Headshot'], [2210, 'Headshot', 'IronWall'],
  [2330, 'ArcLight', 'Shuriken'], [2400, 'LeafBlade', 'Pixie'], [2440, 'You', 'Piltover'],
];
const OBJECTIVES = [
  [330, 'HordeKill', 'Piltover'], [380, 'DragonKill', 'LeafBlade', 'Fire'], [690, 'TurretKilled', 'You', 'Turret_T2_C_05_A'],
  [830, 'DragonKill', 'Piltover', 'Air'], [880, 'HeraldKill', 'LeafBlade'], [1010, 'TurretKilled', 'Guillotine', 'Turret_T1_R_03_A'],
  [1150, 'TurretKilled', 'ArcLight', 'Turret_T2_R_03_A'], [1250, 'DragonKill', 'LeafBlade', 'Hextech', true], [1520, 'BaronKill', 'LeafBlade'],
  [1600, 'TurretKilled', 'IronWall', 'Turret_T2_L_02_A'], [1750, 'DragonKill', 'Piltover', 'Hextech'], [1900, 'InhibKilled', 'ArcLight', 'Barracks_T2_C1'],
  [2100, 'DragonKill', 'LeafBlade', 'Hextech'], [2300, 'TurretKilled', 'Shuriken', 'Turret_T1_L_03_A'],
];

const riotId = (name) => `${name}#DEMO`;

function events(t) {
  const out = [];
  for (const [at, k, v] of KILLS) if (at <= t) out.push({ EventName: 'ChampionKill', EventTime: at, KillerName: riotId(k), VictimName: riotId(v) });
  for (const [at, name, killer, extra, stolen] of OBJECTIVES) {
    if (at > t) continue;
    const e = { EventName: name, EventTime: at, KillerName: riotId(killer) };
    if (name === 'DragonKill') Object.assign(e, { DragonType: extra, Stolen: stolen ? 'True' : 'False' });
    if (name === 'TurretKilled') e.TurretKilled = extra;
    if (name === 'InhibKilled') e.InhibKilled = extra;
    out.push(e);
  }
  return out.sort((a, b) => a.EventTime - b.EventTime);
}

// Death timer like the game's, roughly: longer later in the match.
const respawnAt = (t) => 6 + t / 75;

// The /liveclientdata/allgamedata payload at game time t (seconds).
function snapshot(db, t) {
  const itemId = (name) => { const it = db.items.find((i) => i.nameEn === name); return it ? it.id : null; };
  const evs = events(t);
  const kills = evs.filter((e) => e.EventName === 'ChampionKill');
  const players = PLAYERS.map(([name, champ, team, pos, build, pace]) => {
    const id = riotId(name);
    const done = Math.min(BUILDS[build].length, Math.floor((t * pace) / 330));
    const items = [...BUILDS[build].slice(0, done).map(itemId), done < BUILDS[build].length && t > 120 ? (build === 'mage' ? 1052 : 1036) : null, 3340].filter(Boolean);
    const deaths = kills.filter((e) => e.VictimName === id);
    const last = deaths[deaths.length - 1];
    const dead = !!last && t - last.EventTime < respawnAt(last.EventTime);
    const cs = { UTILITY: 1.1, JUNGLE: 5.4 }[pos] || 7.1;
    return {
      riotId: id, riotIdGameName: name, summonerName: name, rawChampionName: `game_character_displayname_${champ}`, championName: champ, team, position: pos,
      level: Math.min(18, 1 + Math.floor((t / 100) * pace)), isDead: dead, respawnTimer: dead ? respawnAt(last.EventTime) - (t - last.EventTime) : 0,
      items: items.map((itemID) => ({ itemID })),
      scores: {
        kills: kills.filter((e) => e.KillerName === id).length, deaths: deaths.length,
        assists: kills.filter((e) => e.KillerName !== id && (e.EventTime * 7 + name.length) % 3 === 0 && PLAYERS.find((p) => riotId(p[0]) === e.KillerName)[2] === team).length,
        creepScore: Math.floor((cs * pace * Math.max(0, t - 90)) / 60), wardScore: (t / 60) * (pos === 'UTILITY' ? 1.9 : 0.55),
      },
      summonerSpells: { summonerSpellOne: { rawDisplayName: `GeneratedTip_SummonerSpell_${SPELLS[pos][0]}_DisplayName` }, summonerSpellTwo: { rawDisplayName: `GeneratedTip_SummonerSpell_${SPELLS[pos][1]}_DisplayName` } },
      runes: { keystone: { id: PLAYERS.find((p) => p[0] === name)[6] } },
    };
  });
  const me = players[0];
  const lvl = me.level;
  const levels = { Q: Math.min(5, Math.ceil(lvl / 2)), W: Math.min(5, Math.floor(lvl / 4)), E: Math.min(5, Math.floor(lvl / 5)), R: lvl >= 16 ? 3 : lvl >= 11 ? 2 : lvl >= 6 ? 1 : 0 };
  return {
    activePlayer: {
      riotId: me.riotId, summonerName: me.summonerName, currentGold: Math.floor((t * 7.3) % 2700),
      championStats: { attackDamage: 53 + lvl * 3, abilityPower: Math.round(30 + t / 7), armor: 21 + lvl * 4.2, magicResist: 30 + lvl * 1.3, attackSpeed: 0.67 + lvl * 0.01, abilityHaste: 15 + Math.floor(t / 300) * 5, moveSpeed: 345, maxHealth: 590 + lvl * 96 },
      abilities: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, { abilityLevel: v }])),
      fullRunes: { primaryRuneTree: { id: 8100 }, secondaryRuneTree: { id: 8200 }, generalRunes: [8112, 8139, 8138, 8135, 8226, 8210].map((id) => ({ id })), statRunes: [5008, 5008, 5001].map((id) => ({ id })) },
    },
    allPlayers: players,
    events: { Events: [{ EventName: 'GameStart', EventTime: 0 }, ...evs] },
    gameData: { gameTime: t, gameMode: 'CLASSIC' },
  };
}

// Roles, ranks and puuids, as the League client reports them for a real match.
function roster() {
  return PLAYERS.map(([name, champ, team, pos, , , , rank], i) => ({
    championId: champ, team, position: POSITION[pos] || pos, puuid: `demo-${name}`,
    rank: rank ? { tier: rank[0], division: rank[1], lp: (i * 17) % 100, wins: 40 + i * 3, losses: 36 + i * 2 } : { tier: null, wins: 0, losses: 0, previous: { tier: 'GOLD', division: 'II' } },
  }));
}

// An invented player profile with recent games for the player sheet.
function player(db, puuid) {
  const name = puuid.replace(/^demo-/, '');
  const index = PLAYERS.findIndex((p) => p[0] === name);
  if (index < 0) return null;
  const [, champ, , pos, , , , rank] = PLAYERS[index];
  const others = ['Ahri', 'Garen', 'LeeSin', 'Jinx', 'Thresh', 'Darius', 'Vi', 'Zed', 'Caitlyn', 'Lulu', 'Syndra', 'Ezreal', 'Sett', 'Lux', 'Yasuo'];
  let seed = index + 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const lane = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'BOTTOM' }[pos];
  const games = [];
  for (let g = 0; g < 20; g += 1) {
    const win = rnd() < 0.5 + (index % 3) * 0.06;
    const pick = rnd() < 0.55 ? champ : others[Math.floor(rnd() * others.length)];
    const raw = {
      gameId: 9000000 + index * 100 + g, queueId: g % 5 === 4 ? 440 : 420, gameMode: 'CLASSIC', gameCreation: Date.now() - (g + 1) * 7 * 3600 * 1000,
      gameDuration: 1400 + Math.floor(rnd() * 800), gameVersion: db.meta ? db.meta.version : '',
      participantIdentities: [{ participantId: 1, player: { puuid, gameName: name, tagLine: 'DEMO' } }],
      participants: [{
        participantId: 1, teamId: 100, championId: db.byId[pick] ? db.byId[pick].key : 0, spell1Id: 4, spell2Id: 14,
        timeline: { lane, role: pos === 'UTILITY' ? 'DUO_SUPPORT' : pos === 'BOTTOM' ? 'DUO_CARRY' : 'SOLO' },
        stats: { win, kills: Math.floor(rnd() * 11), deaths: Math.floor(rnd() * 8), assists: Math.floor(rnd() * 13), totalMinionsKilled: Math.floor(120 + rnd() * 120), goldEarned: 10000, totalDamageDealtToChampions: 15000, visionScore: 25, champLevel: 15 },
      }],
      teams: [],
    };
    games.push(compactGame(raw, db));
  }
  const ranks = roster()[index].rank;
  return { puuid, name, tag: 'DEMO', level: 120 + index * 37, icon: 4568 + index, ranks: { solo: ranks, flex: null }, games, historyHidden: false };
}

module.exports = { snapshot, roster, player, SPEED, START, END };
