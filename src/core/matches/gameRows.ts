// One player's games as rows of per-minute figures, and their summaries.
import type { CompactGame, CompactPlayer } from './types.ts';

// Game types played on Summoner's Rift (the play style is measured there).
export const RIFT = ['solo', 'flex', 'normal', 'clash', 'bots'];

export interface GameRow {
  id: number;
  type: string;
  created: number;
  duration: number;
  champ: string | null;
  pos: string | null;
  win: boolean;
  k: number;
  d: number;
  a: number;
  kda: number;
  csm: number;
  gpm: number;
  dpm: number;
  vpm: number;
  kp: number | null;
  share: number | null;
  rift: boolean;
}

export interface Summary {
  games: number;
  wins: number;
  winrate: number | null;
  k: number | null; d: number | null; a: number | null;
  kda: number | null; csm: number | null; gpm: number | null; dpm: number | null; vpm: number | null;
  kp: number | null; share: number | null;
}

// The player's participant: by puuid, or the only one a list entry has.
export function playerOf(game: CompactGame, puuid: string | null): CompactPlayer | null {
  return game.players.find((p) => p.puuid && p.puuid === puuid) || (game.players.length === 1 ? game.players[0] : null);
}

export function rowOf(g: CompactGame, p: CompactPlayer): GameRow {
  const min = g.duration / 60;
  const team = g.players.filter((x) => x.team === p.team);
  const teamKills = g.full ? team.reduce((s, x) => s + x.k, 0) : 0;
  const teamDmg = g.full ? team.reduce((s, x) => s + x.dmg, 0) : 0;
  return {
    id: g.id, type: g.type, created: g.created, duration: g.duration, champ: p.champ, pos: p.pos, win: p.win,
    k: p.k, d: p.d, a: p.a, kda: (p.k + p.a) / Math.max(1, p.d),
    csm: p.cs / min, gpm: p.gold / min, dpm: p.dmg / min, vpm: p.vision / min,
    kp: teamKills ? (p.k + p.a) / teamKills : null,
    share: teamDmg ? p.dmg / teamDmg : null,
    rift: RIFT.includes(g.type),
  };
}

export const round = (x: number | null, n = 2) => (x === null || Number.isNaN(x) ? null : Math.round(x * 10 ** n) / 10 ** n);

export function average<T>(rows: T[], key: (r: T) => number | null): number | null {
  const vals = rows.map(key).filter((v): v is number => typeof v === 'number');
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

export function summary(rows: GameRow[]): Summary {
  const wins = rows.filter((r) => r.win).length;
  const avg = (key: (r: GameRow) => number | null) => average(rows, key);
  return {
    games: rows.length, wins, winrate: rows.length ? round(wins / rows.length, 3) : null,
    k: round(avg((r) => r.k), 1), d: round(avg((r) => r.d), 1), a: round(avg((r) => r.a), 1),
    kda: round(avg((r) => r.kda)), csm: round(avg((r) => r.csm), 1), gpm: round(avg((r) => r.gpm), 0),
    dpm: round(avg((r) => r.dpm), 0), vpm: round(avg((r) => r.vpm)), kp: round(avg((r) => r.kp), 3), share: round(avg((r) => r.share), 3),
  };
}

export type Group = Summary & { key: string };

export function groupBy(rows: GameRow[], key: (r: GameRow) => string | null): Group[] {
  const groups: Record<string, GameRow[]> = {};
  for (const r of rows) {
    const k = key(r);
    if (k) (groups[k] = groups[k] || []).push(r);
  }
  return Object.entries(groups).map(([k, list]) => ({ key: k, ...summary(list) })).sort((a, b) => b.games - a.games);
}
