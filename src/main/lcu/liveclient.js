// In-game data from the Live Client Data API (https://127.0.0.1:2999), served by the
// game itself while a match is running. Polled every few seconds; emits a compact
// snapshot: my champion, gold, level, stats, items, both teams with real positions, the
// objectives each team took, a kill feed and the item gold of both teams over time. The
// roster from the LCU (roles picked in draft, ranks, puuids) fills in what the game does not report.
const https = require('https');
const { EventEmitter } = require('events');

const agent = new https.Agent({ rejectUnauthorized: false });
const POSITION = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' };

function fetchGame() {
  return new Promise((resolve, reject) => {
    const req = https.get({ host: '127.0.0.1', port: 2999, path: '/liveclientdata/allgamedata', agent, timeout: 2500 }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(text)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function championIdOf(player, db) {
  const raw = (player.rawChampionName || '').replace('game_character_displayname_', '');
  if (db.byId[raw]) return raw;
  const name = (player.championName || '').toLowerCase();
  const found = db.champions.find((c) => c.id.toLowerCase() === name.replace(/[^a-z]/g, ''));
  return found ? found.id : raw || null;
}

// Summoner spell id from "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName" (longest
// matching spell key, so variants like SummonerSmite… still resolve), else by English name.
function spellIdOf(spell, db) {
  if (!spell) return null;
  const raw = spell.rawDisplayName || '';
  const list = db.summoners || [];
  const byKey = list.filter((s) => raw.includes(s.key)).sort((a, b) => b.key.length - a.key.length)[0];
  const found = byKey || list.find((s) => s.nameEn === spell.displayName);
  return found ? found.id : null;
}

// The local player's full rune page in the client's format (keystone first, then shards).
function runePageOf(full) {
  if (!full || !full.primaryRuneTree) return null;
  return {
    primaryStyleId: full.primaryRuneTree.id,
    subStyleId: full.secondaryRuneTree ? full.secondaryRuneTree.id : null,
    selectedPerkIds: [...(full.generalRunes || []), ...(full.statRunes || [])].map((r) => r.id),
  };
}

const itemGold = (db, items) => items.reduce((s, id) => s + (db.itemById[id] ? db.itemById[id].gold.total : 0), 0);

// The team ('ORDER' | 'CHAOS') credited with an event, or null when it cannot be told. Kills
// go to the victim's opponents, structures to the owner's opponents (Turret_T1_… is ORDER's).
function eventTeam(e, teamOf) {
  const other = (team) => (team === 'ORDER' ? 'CHAOS' : team === 'CHAOS' ? 'ORDER' : null);
  if (e.EventName === 'ChampionKill') return other(teamOf(e.VictimName)) || teamOf(e.KillerName);
  const structure = /_T([12])_/.exec(e.TurretKilled || e.InhibKilled || '');
  if (structure) return structure[1] === '1' ? 'CHAOS' : 'ORDER';
  return teamOf(e.KillerName);
}

const OBJECTIVES = { DragonKill: 'dragons', BaronKill: 'barons', HeraldKill: 'heralds', HordeKill: 'grubs', AtakhanKill: 'atakhan', TurretKilled: 'towers', InhibKilled: 'inhibs' };
const emptyObjectives = () => ({ kills: 0, dragons: [], barons: 0, heralds: 0, grubs: 0, atakhan: 0, towers: 0, inhibs: 0 });
const baseName = (name) => (name || '').split('#')[0];

// Objectives per team and the latest events (kills, objectives, structures) for the feed.
function readEvents(data, players) {
  const teams = new Map();
  for (const p of data.allPlayers || []) {
    for (const n of [p.riotId, p.riotIdGameName, p.summonerName, baseName(p.riotId)]) if (n) teams.set(n, p.team);
  }
  const champs = new Map();
  for (const p of players) for (const n of [p.name, baseName(p.name)]) if (n) champs.set(n, p.championId);
  const lookup = (map, name) => (name ? map.get(name) || map.get(baseName(name)) || null : null);
  const out = { ORDER: emptyObjectives(), CHAOS: emptyObjectives(), feed: [] };
  for (const e of (data.events && data.events.Events) || []) {
    const key = e.EventName === 'ChampionKill' ? 'kills' : OBJECTIVES[e.EventName];
    if (!key) continue;
    const team = eventTeam(e, (name) => lookup(teams, name));
    if (team) {
      if (key === 'dragons') out[team].dragons.push(e.DragonType || 'Fire');
      else out[team][key] += 1;
    }
    out.feed.push({
      t: Math.round(e.EventTime || 0), type: key, team,
      killer: lookup(champs, e.KillerName), victim: lookup(champs, e.VictimName),
      dragon: e.DragonType || null, stolen: e.Stolen === 'True' || e.Stolen === true,
    });
  }
  out.feed = out.feed.slice(-40).reverse();
  return out;
}

const STAT_KEYS = ['attackDamage', 'abilityPower', 'armor', 'magicResist', 'attackSpeed', 'abilityHaste', 'critChance', 'moveSpeed',
  'maxHealth', 'lifeSteal', 'omnivamp', 'physicalLethality', 'armorPenetrationPercent', 'magicPenetrationFlat', 'magicPenetrationPercent', 'attackRange', 'tenacity'];

function normalize(data, db, roster = null) {
  const meName = data.activePlayer.riotId || data.activePlayer.summonerName;
  const fromRoster = (championId, team) => (roster || []).find((r) => r.championId === championId && r.team === team) || {};
  const players = (data.allPlayers || []).map((p) => {
    const championId = championIdOf(p, db);
    const extra = fromRoster(championId, p.team);
    const items = (p.items || []).map((i) => i.itemID);
    return {
      championId,
      name: p.riotId || p.summonerName,
      puuid: extra.puuid || null,
      team: p.team,
      position: POSITION[p.position] || extra.position || null,
      rank: extra.rank || null,
      level: p.level,
      dead: p.isDead,
      respawn: p.isDead ? Math.ceil(p.respawnTimer || 0) : 0,
      // [D, F] as bound in the game.
      spells: p.summonerSpells ? [spellIdOf(p.summonerSpells.summonerSpellOne, db), spellIdOf(p.summonerSpells.summonerSpellTwo, db)] : [],
      keystone: p.runes && p.runes.keystone ? p.runes.keystone.id : null,
      items,
      itemGold: itemGold(db, items),
      scores: p.scores || {},
    };
  });
  const me = players.find((p) => p.name === meName) || null;
  const allies = me ? players.filter((p) => p.team === me.team) : [];
  const enemies = me ? players.filter((p) => p.team !== me.team) : players;
  const end = ((data.events && data.events.Events) || []).find((e) => e.EventName === 'GameEnd');
  const events = readEvents(data, players);
  const myTeam = me ? me.team : 'ORDER';
  const enemyTeam = myTeam === 'ORDER' ? 'CHAOS' : 'ORDER';
  const side = (team) => (team === myTeam ? 'ally' : team === enemyTeam ? 'enemy' : null);
  const cs = data.activePlayer.championStats || {};
  const abilities = data.activePlayer.abilities || {};
  return {
    result: end ? end.Result : null,
    gameTime: data.gameData ? data.gameData.gameTime : 0,
    gameMode: data.gameData ? data.gameData.gameMode : null,
    me: me && {
      ...me,
      gold: Math.floor(data.activePlayer.currentGold || 0),
      runes: runePageOf(data.activePlayer.fullRunes),
      stats: Object.fromEntries(STAT_KEYS.filter((k) => typeof cs[k] === 'number').map((k) => [k, Math.round(cs[k] * 100) / 100])),
      abilities: Object.fromEntries(['Q', 'W', 'E', 'R'].map((k) => [k, abilities[k] ? abilities[k].abilityLevel || 0 : 0])),
    },
    allies,
    enemies,
    objectives: { ally: events[myTeam], enemy: events[enemyTeam] },
    feed: events.feed.map((e) => ({ ...e, team: side(e.team) })),
  };
}

const total = (list, key) => list.reduce((s, p) => s + (key(p) || 0), 0);

// One point of the match timeline: item gold, kills and CS of both teams and the item gold
// of every player (by name) at game time t.
function sample(game) {
  return {
    t: Math.round(game.gameTime),
    ally: total(game.allies, (p) => p.itemGold),
    enemy: total(game.enemies, (p) => p.itemGold),
    allyKills: game.objectives.ally.kills,
    enemyKills: game.objectives.enemy.kills,
    allyCs: total(game.allies, (p) => p.scores.creepScore),
    enemyCs: total(game.enemies, (p) => p.scores.creepScore),
    players: Object.fromEntries([...game.allies, ...game.enemies].map((p) => [p.name, p.itemGold])),
  };
}

const SAMPLE_EVERY = 20;

class LiveClient extends EventEmitter {
  constructor(getDb, getRoster = () => null) {
    super();
    this.getDb = getDb;
    this.getRoster = getRoster;
    this.timer = null;
    this.game = null;
    this.timeline = [];
    // A function returning allgamedata snapshots in place of the game (simulated match).
    this.source = null;
  }

  simulate(source) {
    this.stop();
    this.source = source;
  }

  start() {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), 3000);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.timeline = [];
    this.setGame(null);
  }

  async poll() {
    const db = this.getDb();
    if (!db) return;
    try {
      const data = this.source ? this.source() : await fetchGame();
      if (data && data.activePlayer && data.allPlayers) this.setGame(this.track(normalize(data, db, this.getRoster())));
    } catch {
      // Game still loading or already closed.
    }
  }

  // Adds a timeline point every SAMPLE_EVERY seconds of game time and on every kill (the
  // latest point is refreshed in between); a game time going back means a new match.
  track(game) {
    const last = this.timeline[this.timeline.length - 1];
    if (last && game.gameTime < last.t - 30) this.timeline = [];
    const point = sample(game);
    const prev = this.timeline[this.timeline.length - 1];
    const before = this.timeline[this.timeline.length - 2];
    const fresh = !prev || !before || prev.t - before.t >= SAMPLE_EVERY || point.allyKills !== prev.allyKills || point.enemyKills !== prev.enemyKills;
    if (fresh) this.timeline.push(point);
    else this.timeline[this.timeline.length - 1] = point;
    return { ...game, timeline: this.timeline.slice() };
  }

  setGame(game) {
    this.game = game;
    this.emit('game', game);
  }
}

module.exports = { LiveClient, normalize, sample };
