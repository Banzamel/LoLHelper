// Players of the running match from /lol-gameflow/v1/session (both teams with the roles
// picked in draft) plus each player's ranked stats from /lol-ranked/v1/ranked-stats/{puuid}.
import type { Db, Role } from '../data/types.ts';
import type { RawJson } from '../shared/json.ts';
import type { Lcu, Rank, RosterEntry } from './types.ts';

const POSITION: Record<string, Role> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' };
const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

const tierOf = (tier: string | undefined) => (tier && tier !== 'NONE' ? tier : null);

export function rankFrom(stats: RawJson, queueType: string): Rank | null {
  if (!stats) return null;
  const entry = (stats.queueMap && stats.queueMap[queueType]) || (stats.queues || []).find((q: RawJson) => q.queueType === queueType);
  if (!entry || !tierOf(entry.tier)) {
    // Not placed this season yet: fall back to where the player ended last season.
    const prev = entry && tierOf(entry.previousSeasonEndTier);
    return {
      tier: null, wins: 0, losses: 0,
      previous: prev ? { tier: prev, division: APEX.includes(prev) || entry.previousSeasonEndDivision === 'NA' ? null : entry.previousSeasonEndDivision || null } : null,
    };
  }
  return {
    tier: entry.tier,
    division: APEX.includes(entry.tier) || entry.division === 'NA' ? null : entry.division,
    lp: entry.leaguePoints || 0,
    wins: entry.wins || 0,
    losses: entry.losses || 0,
  };
}

// Both teams with ranks, or null when the teams are not known yet.
export async function fetchRoster(lcu: Lcu, session: RawJson, db: Db, queueType: string): Promise<RosterEntry[] | null> {
  const data = session && session.gameData;
  if (!data || !(data.teamOne || []).length) return null;
  const idOf = (key: number) => (db.byKey[key] ? db.byKey[key].id : null);
  const players: { p: RawJson; team: RosterEntry['team'] }[] = [
    ...(data.teamOne || []).map((p: RawJson) => ({ p, team: 'ORDER' })),
    ...(data.teamTwo || []).map((p: RawJson) => ({ p, team: 'CHAOS' })),
  ];
  return Promise.all(players.map(async ({ p, team }) => {
    let rank: Rank | null = null;
    if (p.puuid) {
      try { rank = rankFrom(await lcu.get(`/lol-ranked/v1/ranked-stats/${p.puuid}`), queueType); } catch { /* bot or hidden */ }
    }
    return { championId: idOf(p.championId), team, position: POSITION[p.selectedPosition] || null, puuid: p.puuid || null, rank };
  }));
}

// The roster with the player's position filled in by `role` (the role chosen in Draft) when
// the game assigns none (Practice Tool, custom games). Other players keep theirs.
export function withMyPosition(roster: RosterEntry[] | null, puuid: string | null, role: Role | null): RosterEntry[] | null {
  if (!roster || !puuid || !role) return roster;
  return roster.map((p) => (p.puuid === puuid && !p.position ? { ...p, position: role } : p));
}
