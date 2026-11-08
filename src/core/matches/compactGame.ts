// Raw client games (list entries or full details) and game timelines in the compact form the
// app stores and shows.
import type { Db, Role } from '../data/types.ts';
import type { RawJson } from '../shared/json.ts';
import type { CompactGame, CompactPlayer, GoldTimeline } from './types.ts';

const QUEUE_TYPES: Record<number, string> = {
  420: 'solo', 440: 'flex', 400: 'normal', 430: 'normal', 480: 'normal', 490: 'normal', 700: 'clash', 720: 'clash',
  450: 'aram', 100: 'aram', 2400: 'aram', 1700: 'arena', 1710: 'arena',
  830: 'bots', 840: 'bots', 850: 'bots', 870: 'bots', 880: 'bots', 890: 'bots',
};
const MODE_TYPES: Record<string, string> = { ARAM: 'aram', CHERRY: 'arena', PRACTICETOOL: 'custom', TUTORIAL: 'custom' };
const DIRECT: Record<string, Role> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' };
const LANES: Record<string, Role> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', MID: 'MIDDLE', BOTTOM: 'BOTTOM', BOT: 'BOTTOM' };

export function queueType(queueId: number, gameMode: string): string {
  if (QUEUE_TYPES[queueId]) return QUEUE_TYPES[queueId];
  if (MODE_TYPES[gameMode]) return MODE_TYPES[gameMode];
  return queueId > 0 ? 'rotating' : 'custom';
}

// Lane from the participant's timeline (lane TOP/JUNGLE/MIDDLE/BOTTOM, role DUO_SUPPORT…).
export function positionOf(p: RawJson): Role | null {
  const direct = DIRECT[p.teamPosition || p.individualPosition];
  if (direct) return direct;
  const tl = p.timeline || {};
  const lane = LANES[tl.lane];
  if (lane === 'BOTTOM' && /SUPPORT/.test(tl.role || '')) return 'SUPPORT';
  return lane || null;
}

const seconds = (d: number) => (d > 20000 ? Math.round(d / 1000) : d || 0);

function playerOf(p: RawJson, who: Record<number, RawJson>, db: Db): CompactPlayer {
  const w = who[p.participantId] || {};
  const s = p.stats || {};
  return {
    pid: p.participantId,
    puuid: w.puuid || null,
    name: w.gameName || w.summonerName || '',
    tag: w.tagLine || '',
    champ: db.byKey[p.championId] ? db.byKey[p.championId].id : null,
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
}

export function compactGame(raw: RawJson, db: Db): CompactGame {
  const who: Record<number, RawJson> = Object.fromEntries((raw.participantIdentities || []).map((i: RawJson) => [i.participantId, i.player || {}]));
  const players = (raw.participants || []).map((p: RawJson) => playerOf(p, who, db)) as CompactPlayer[];
  const teams = (raw.teams || []).map((t: RawJson) => ({
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

// Per-minute gold of every participant from /lol-match-history/v1/game-timelines/{id}.
export function compactTimeline(raw: RawJson, game: CompactGame): GoldTimeline | null {
  const teamOf = Object.fromEntries(game.players.map((p) => [p.pid, p.team]));
  const out: GoldTimeline = { teams: [], players: {} };
  (raw && raw.frames ? raw.frames : []).forEach((f: RawJson, i: number) => {
    let blue = 0;
    let red = 0;
    for (const pf of Object.values<RawJson>(f.participantFrames || {})) {
      const gold = pf.totalGold || 0;
      (out.players[pf.participantId] = out.players[pf.participantId] || []).push(gold);
      if (teamOf[pf.participantId] === 100) blue += gold;
      else red += gold;
    }
    out.teams.push([Math.round((f.timestamp || i * 60000) / 60000), blue, red]);
  });
  return out.teams.length ? out : null;
}
