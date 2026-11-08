// Learning from the player's own match history. Matches with the same champion count, the
// more similar the more they count (same lane opponent, shared enemies). Small samples are
// pulled towards zero, so one game never decides a build.
import type { LearningEntry } from '../types.ts';

interface Context { enemyId: string | null; enemyIds: (string | null)[] }
interface WinRecord { wins: number; games: number }

function similarity(g: LearningEntry, { enemyId, enemyIds }: Context): number {
  const shared = g.enemies.filter((e) => enemyIds.includes(e.championId)).length;
  return 1 + (enemyId && g.opponentId === enemyId ? 1.5 : 0) + 0.25 * shared;
}

export interface ItemLesson { bonus: number; wins: number; games: number }

// { itemId: { bonus, wins, games } } for the champion's finished items.
export function itemLessons(history: LearningEntry[] | null, { championId, enemyId, enemyIds }: Context & { championId: string }): Record<number, ItemLesson> {
  const acc: Record<number, { w: number; l: number; wins: number; games: number }> = {};
  for (const g of history || []) {
    if (g.championId !== championId || g.win === null || g.win === undefined) continue;
    const s = similarity(g, { enemyId, enemyIds });
    for (const id of new Set(g.items)) {
      const a = acc[id] || (acc[id] = { w: 0, l: 0, wins: 0, games: 0 });
      if (g.win) { a.w += s; a.wins += 1; } else a.l += s;
      a.games += 1;
    }
  }
  const out: Record<number, ItemLesson> = {};
  for (const [id, a] of Object.entries(acc)) {
    out[Number(id)] = { bonus: Math.round((1.2 * (a.w - a.l)) / (a.w + a.l + 2) * 100) / 100, wins: a.wins, games: a.games };
  }
  return out;
}

// The player's record with a champion: overall and against one enemy.
export function championRecord(history: LearningEntry[] | null, championId: string, enemyId: string | null = null): WinRecord & { vs: WinRecord } {
  const games = (history || []).filter((g) => g.championId === championId && typeof g.win === 'boolean');
  const vs = enemyId ? games.filter((g) => g.opponentId === enemyId) : [];
  const count = (list: LearningEntry[]) => ({ wins: list.filter((g) => g.win).length, games: list.length });
  return { ...count(games), vs: count(vs) };
}

// Counter-pick nudge from the player's results: winrate with the champion (and against this
// lane opponent), shrunk towards 50% for small samples. Returns a score delta.
export function counterNudge(history: LearningEntry[] | null, championId: string, enemyId: string | null) {
  const r = championRecord(history, championId, enemyId);
  if (!r.games) return null;
  const all = (r.wins - (r.games - r.wins)) / (r.games + 3);
  const vs = r.vs.games ? (r.vs.wins - (r.vs.games - r.vs.wins)) / (r.vs.games + 2) : 0;
  return { delta: Math.round(8 * all + 10 * vs), record: r };
}
