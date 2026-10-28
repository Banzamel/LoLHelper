// Match history from the League client (/lol-match-history): the account's games of every
// mode, other players' recent games, and the per-minute gold of a game. Games are converted
// to a compact form and the account's own games are cached on disk (matches.json in the
// profile folder): finished games never change, so each one is downloaded only once.
const fs = require('fs');
const path = require('path');
const { rankFrom } = require('./roster');

const QUEUE_TYPES = {
  420: 'solo', 440: 'flex', 400: 'normal', 430: 'normal', 480: 'normal', 490: 'normal', 700: 'clash', 720: 'clash',
  450: 'aram', 100: 'aram', 2400: 'aram', 1700: 'arena', 1710: 'arena',
  830: 'bots', 840: 'bots', 850: 'bots', 870: 'bots', 880: 'bots', 890: 'bots',
};
const MODE_TYPES = { ARAM: 'aram', CHERRY: 'arena', PRACTICETOOL: 'custom', TUTORIAL: 'custom' };

function queueType(queueId, gameMode) {
  if (QUEUE_TYPES[queueId]) return QUEUE_TYPES[queueId];
  if (MODE_TYPES[gameMode]) return MODE_TYPES[gameMode];
  return queueId > 0 ? 'rotating' : 'custom';
}

// Lane from the participant's timeline (lane TOP/JUNGLE/MIDDLE/BOTTOM, role DUO_SUPPORT…).
function positionOf(p) {
  const direct = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' }[p.teamPosition || p.individualPosition];
  if (direct) return direct;
  const tl = p.timeline || {};
  const lane = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', MID: 'MIDDLE', BOTTOM: 'BOTTOM', BOT: 'BOTTOM' }[tl.lane];
  if (lane === 'BOTTOM' && /SUPPORT/.test(tl.role || '')) return 'SUPPORT';
  return lane || null;
}

const seconds = (d) => (d > 20000 ? Math.round(d / 1000) : d || 0);

// Raw LCU game (list entry or full details) -> compact game. `full` is true when all ten
// players are known (the list endpoint returns only the account's own participant).
function compactGame(raw, db) {
  const who = Object.fromEntries((raw.participantIdentities || []).map((i) => [i.participantId, i.player || {}]));
  const champId = (key) => (db.byKey[key] ? db.byKey[key].id : null);
  const players = (raw.participants || []).map((p) => {
    const w = who[p.participantId] || {};
    const s = p.stats || {};
    return {
      pid: p.participantId,
      puuid: w.puuid || null,
      name: w.gameName || w.summonerName || '',
      tag: w.tagLine || '',
      champ: champId(p.championId),
      team: p.teamId,
      pos: positionOf(p),
      spells: [p.spell1Id, p.spell2Id],
      keystone: s.perk0 || null,
      items: [s.item0, s.item1, s.item2, s.item3, s.item4, s.item5, s.item6].filter(Boolean),
      k: s.kills || 0,
      d: s.deaths || 0,
      a: s.assists || 0,
      cs: (s.totalMinionsKilled || 0) + (s.neutralMinionsKilled || 0),
      gold: s.goldEarned || 0,
      dmg: s.totalDamageDealtToChampions || 0,
      taken: s.totalDamageTaken || 0,
      vision: s.visionScore || 0,
      level: s.champLevel || 0,
      multi: s.largestMultiKill || 0,
      win: !!s.win,
    };
  });
  const teams = (raw.teams || []).map((t) => ({
    id: t.teamId,
    win: t.win === 'Win',
    kills: players.filter((p) => p.team === t.teamId).reduce((s, p) => s + p.k, 0),
    dragons: t.dragonKills || 0,
    barons: t.baronKills || 0,
    heralds: t.riftHeraldKills || 0,
    towers: t.towerKills || 0,
    inhibs: t.inhibitorKills || 0,
  }));
  return {
    id: raw.gameId,
    queueId: raw.queueId,
    type: queueType(raw.queueId, raw.gameMode),
    mode: raw.gameMode || null,
    created: raw.gameCreation || Date.parse(raw.gameCreationDate) || 0,
    duration: seconds(raw.gameDuration),
    version: (raw.gameVersion || '').split('.').slice(0, 2).join('.'),
    full: players.length >= 10,
    players,
    teams,
  };
}

// Per-minute gold of every participant from /lol-match-history/v1/game-timelines/{id}:
// { teams: [[minute, team100, team200]], players: { pid: [gold per minute] } }.
function compactTimeline(raw, game) {
  const teamOf = Object.fromEntries(game.players.map((p) => [p.pid, p.team]));
  const out = { teams: [], players: {} };
  (raw && raw.frames ? raw.frames : []).forEach((f, i) => {
    let blue = 0;
    let red = 0;
    for (const pf of Object.values(f.participantFrames || {})) {
      const gold = pf.totalGold || 0;
      (out.players[pf.participantId] = out.players[pf.participantId] || []).push(gold);
      if (teamOf[pf.participantId] === 100) blue += gold;
      else red += gold;
    }
    out.teams.push([Math.round((f.timestamp || i * 60000) / 60000), blue, red]);
  });
  return out.teams.length ? out : null;
}

const LIST_PAGE = 20;
const listUrl = (puuid, beg, end) => `/lol-match-history/v1/products/lol/${puuid}/matches?begIndex=${beg}&endIndex=${end}`;
const gamesOf = (res) => (res && res.games && res.games.games) || [];

// The account's own games, cached in matches.json of the profile folder.
class MatchStore {
  constructor() {
    this.file = null;
    this.games = [];
    this.lastSync = null;
  }

  use(dir) {
    this.file = dir ? path.join(dir, 'matches.json') : null;
    this.games = [];
    this.lastSync = null;
    if (!this.file) return;
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.games = saved.games || [];
      this.lastSync = saved.lastSync || null;
    } catch { /* nothing cached yet */ }
  }

  list() { return this.games; }

  get(id) { return this.games.find((g) => String(g.id) === String(id)) || null; }

  // Adds new games and upgrades list entries to full ones; returns how many were new.
  upsert(games) {
    let added = 0;
    for (const g of games) {
      if (!g || !g.id) continue;
      const i = this.games.findIndex((x) => x.id === g.id);
      if (i < 0) { this.games.push(g); added += 1; } else if (g.full || !this.games[i].full) this.games[i] = { ...this.games[i], ...g, gold: this.games[i].gold || g.gold };
    }
    this.games.sort((a, b) => b.created - a.created);
    this.games = this.games.slice(0, 1000);
    return added;
  }

  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify({ lastSync: this.lastSync, games: this.games }));
  }
}

// Downloads the account's recent games (all pages when `deep`, else until nothing is new)
// and the details of the latest games known only from the list.
async function syncMatches(lcu, db, store, puuid, { deep = false, details = 40 } = {}) {
  const max = deep ? 200 : 60;
  for (let beg = 0; beg < max; beg += LIST_PAGE) {
    const games = gamesOf(await lcu.get(listUrl(puuid, beg, beg + LIST_PAGE)));
    if (!games.length) break;
    const added = store.upsert(games.map((g) => compactGame(g, db)));
    if (!added && !deep) break;
  }
  for (const g of store.list().filter((x) => !x.full).slice(0, details)) {
    try { store.upsert([compactGame(await lcu.get(`/lol-match-history/v1/games/${g.id}`), db)]); } catch { /* removed or unavailable */ }
  }
  store.lastSync = new Date().toISOString();
  store.save();
}

// A game with all players and its per-minute gold, from the cache when there.
async function matchDetail(lcu, db, store, id) {
  let game = store.get(id);
  if (!lcu) return game;
  if (!game || !game.full) {
    const full = compactGame(await lcu.get(`/lol-match-history/v1/games/${id}`), db);
    if (game) store.upsert([full]);
    game = store.get(id) || full;
  }
  if (game.gold === undefined) {
    try { game.gold = compactTimeline(await lcu.get(`/lol-match-history/v1/game-timelines/${id}`), game); } catch { game.gold = null; }
    store.save();
  }
  return game;
}

// Any player's profile: name, level, ranks and the last games (cached for a few minutes).
const PLAYER_TTL = 5 * 60 * 1000;
const playerCache = new Map();

async function fetchPlayer(lcu, db, puuid) {
  const hit = playerCache.get(puuid);
  if (hit && Date.now() - hit.at < PLAYER_TTL) return hit.data;
  const [summoner, ranked, history] = await Promise.allSettled([
    lcu.get(`/lol-summoner/v2/summoners/puuid/${puuid}`),
    lcu.get(`/lol-ranked/v1/ranked-stats/${puuid}`),
    lcu.get(listUrl(puuid, 0, LIST_PAGE)),
  ]);
  const s = summoner.status === 'fulfilled' ? summoner.value || {} : {};
  const r = ranked.status === 'fulfilled' ? ranked.value : null;
  const data = {
    puuid,
    name: s.gameName || s.displayName || '',
    tag: s.tagLine || '',
    level: s.summonerLevel || null,
    icon: s.profileIconId || null,
    ranks: { solo: rankFrom(r, 'RANKED_SOLO_5x5'), flex: rankFrom(r, 'RANKED_FLEX_SR') },
    games: history.status === 'fulfilled' ? gamesOf(history.value).map((g) => compactGame(g, db)).sort((a, b) => b.created - a.created) : [],
    historyHidden: history.status !== 'fulfilled',
  };
  playerCache.set(puuid, { at: Date.now(), data });
  return data;
}

module.exports = { compactGame, compactTimeline, queueType, positionOf, MatchStore, syncMatches, matchDetail, fetchPlayer };
