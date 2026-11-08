// Player analysis from compact games: results per game type, role and champion, per-minute
// averages, a win-rate trend, the current streak and play-style traits.
import { groupBy, playerOf, round, rowOf, summary, type GameRow, type Group, type Summary } from './gameRows.ts';
import { playStyle, type StyleTrait } from './playStyle.ts';
import type { CompactGame } from './types.ts';

const REMAKE = 300;

export interface TrendPoint { id: number; created: number; win: boolean; kda: number | null; csm: number | null; winrate: number | null }

export interface Analysis extends Summary {
  recent: Summary;
  byType: Group[];
  byRole: Group[];
  byChampion: Group[];
  trend: TrendPoint[];
  streak: { win: boolean; n: number } | null;
  traits: StyleTrait[];
}

// games: compact games, newest first; puuid: whose games they are.
export function analyzeGames(games: CompactGame[] | null, puuid: string | null): Analysis {
  const rows: GameRow[] = [];
  for (const g of games || []) {
    const p = playerOf(g, puuid);
    if (p && g.duration >= REMAKE) rows.push(rowOf(g, p));
  }
  const chrono = rows.slice().sort((a, b) => a.created - b.created);
  const trend = chrono.slice(-60).map((r, i, list) => {
    const window = list.slice(Math.max(0, i - 9), i + 1);
    return { id: r.id, created: r.created, win: r.win, kda: round(r.kda), csm: round(r.csm, 1), winrate: round(window.filter((x) => x.win).length / window.length, 3) };
  });
  let streak: Analysis['streak'] = null;
  for (const r of rows) {
    if (!streak) streak = { win: r.win, n: 1 };
    else if (r.win === streak.win) streak.n += 1;
    else break;
  }
  return {
    ...summary(rows),
    recent: summary(rows.slice(0, 10)),
    byType: groupBy(rows, (r) => r.type),
    byRole: groupBy(rows.filter((r) => r.rift), (r) => r.pos),
    byChampion: groupBy(rows, (r) => r.champ),
    trend,
    streak,
    traits: playStyle(rows),
  };
}

export { playerOf };
