// The simulated match's players as the League client would report them: roles, ranks and
// puuids for the roster, and invented profiles with recent games for the player sheet.
import type { Db, Role } from '../data/types.ts';
import type { RosterEntry } from '../lcu/types.ts';
import { compactGame } from '../matches/compactGame.ts';
import type { CompactGame, PlayerProfile } from '../matches/types.ts';
import { PLAYERS, type GamePosition } from './scenario.ts';

const POSITION: Record<GamePosition, Role> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' };
const LANE: Record<GamePosition, string> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'BOTTOM' };
const OTHERS = ['Ahri', 'Garen', 'LeeSin', 'Jinx', 'Thresh', 'Darius', 'Vi', 'Zed', 'Caitlyn', 'Lulu', 'Syndra', 'Ezreal', 'Sett', 'Lux', 'Yasuo'];

export const isDemoPuuid = (puuid: string | null | undefined) => !!puuid && puuid.startsWith('demo-');

export function roster(): RosterEntry[] {
  return PLAYERS.map((pl, i) => ({
    championId: pl.champ, team: pl.team, position: POSITION[pl.pos], puuid: `demo-${pl.name}`,
    rank: pl.rank ? { tier: pl.rank[0], division: pl.rank[1], lp: (i * 17) % 100, wins: 40 + i * 3, losses: 36 + i * 2 }
      : { tier: null as string | null, wins: 0, losses: 0, previous: { tier: 'GOLD', division: 'II' } },
  }));
}

// Twenty recent games from a seeded random sequence, so the profile is the same every time.
function recentGames(db: Db, puuid: string, index: number): CompactGame[] {
  const pl = PLAYERS[index];
  let seed = index + 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const games: CompactGame[] = [];
  for (let g = 0; g < 20; g += 1) {
    const win = rnd() < 0.5 + (index % 3) * 0.06;
    const pick = rnd() < 0.55 ? pl.champ : OTHERS[Math.floor(rnd() * OTHERS.length)];
    games.push(compactGame({
      gameId: 9000000 + index * 100 + g, queueId: g % 5 === 4 ? 440 : 420, gameMode: 'CLASSIC', gameCreation: Date.now() - (g + 1) * 7 * 3600 * 1000,
      gameDuration: 1400 + Math.floor(rnd() * 800), gameVersion: db.meta ? db.meta.version : '',
      participantIdentities: [{ participantId: 1, player: { puuid, gameName: pl.name, tagLine: 'DEMO' } }],
      participants: [{
        participantId: 1, teamId: 100, championId: db.byId[pick] ? db.byId[pick].key : 0, spell1Id: 4, spell2Id: 14,
        timeline: { lane: LANE[pl.pos], role: pl.pos === 'UTILITY' ? 'DUO_SUPPORT' : pl.pos === 'BOTTOM' ? 'DUO_CARRY' : 'SOLO' },
        stats: { win, kills: Math.floor(rnd() * 11), deaths: Math.floor(rnd() * 8), assists: Math.floor(rnd() * 13), totalMinionsKilled: Math.floor(120 + rnd() * 120), goldEarned: 10000, totalDamageDealtToChampions: 15000, visionScore: 25, champLevel: 15 },
      }],
      teams: [],
    }, db));
  }
  return games;
}

export function player(db: Db, puuid: string): PlayerProfile | null {
  const name = puuid.replace(/^demo-/, '');
  const index = PLAYERS.findIndex((pl) => pl.name === name);
  if (index < 0) return null;
  const rank = roster()[index].rank;
  return { puuid, name, tag: 'DEMO', level: 120 + index * 37, icon: 4568 + index, ranks: { solo: rank, flex: null }, games: recentGames(db, puuid, index), historyHidden: false };
}
