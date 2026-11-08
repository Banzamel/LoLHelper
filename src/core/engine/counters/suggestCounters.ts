// Counter-pick recommendations for a role: the lane matchup (or blind-pick safety), the team,
// the champion pool and the player's own results with each candidate.
import type { Champion, Db, Role } from '../../data/types.ts';
import { counterNudge } from '../history/learning.ts';
import { COUNTERS } from '../knowledge/counters.ts';
import type { CounterPick, LearningEntry, Reason } from '../types.ts';
import { blindScore, counterList, matchup, sumDeltas, type Overrides } from './matchup.ts';
import { enemyTeamFit, poolBonus, teamNeeds } from './teamFit.ts';

export interface CounterRequest {
  role: Role | null;
  enemyId?: string | null;
  allyIds?: string[];
  enemyIds?: string[];
  excludeIds?: string[];
  // Champion keys the client lets the player pick (empty or missing: any).
  pickableIds?: number[] | null;
  pool?: Record<string, string[]> | null;
  mastery?: Record<number, number> | null;
  overrides?: Overrides;
  history?: LearningEntry[] | null;
  limit?: number;
}

const known = (db: Db, ids: string[]) => ids.map((id) => db.byId[id]).filter((c): c is Champion => !!c);

export function suggestCounters(db: Db, req: CounterRequest): CounterPick[] {
  const { role, enemyId = null, allyIds = [], enemyIds = [], excludeIds = [], pickableIds, overrides = {}, limit = 15 } = req;
  const enemy = enemyId ? db.byId[enemyId] || null : null;
  const allies = known(db, allyIds);
  const others = known(db, enemyIds.filter((id) => id !== enemyId));
  const exclude = new Set(excludeIds);
  const pickable = pickableIds && pickableIds.length ? new Set(pickableIds) : null;

  const results: CounterPick[] = [];
  for (const c of db.champions) {
    if (exclude.has(c.id) || (enemy && c.id === enemy.id)) continue;
    if (pickable && !pickable.has(c.key)) continue;
    if (role && !c.positions.includes(role)) continue;
    const base = enemy ? matchup(c, enemy, role, overrides) : blindScore(c, overrides);
    const nudge = counterNudge(req.history || null, c.id, enemyId);
    const mine: Reason[] = nudge && nudge.delta ? [{ delta: nudge.delta, key: 'counter.history', params: { wins: nudge.record.wins, games: nudge.record.games } }] : [];
    const extra = [...teamNeeds(c, allies), ...enemyTeamFit(c, others, overrides), ...poolBonus(c, role, req.pool || null, req.mastery || null), ...mine];
    const score = Math.max(0, Math.min(100, base.score + sumDeltas(extra)));
    results.push({ id: c.id, score, reasons: [...base.reasons, ...extra].sort((a, b) => (b.delta || 0) - (a.delta || 0)) });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// For the champion detail page: who it beats and who beats it.
export function championMatchups(db: Db, id: string, overrides: Overrides = {}): { strong: string[]; weak: string[] } {
  const me = db.byId[id];
  if (!me) return { strong: [], weak: [] };
  const weak = counterList(id, overrides).filter((x) => db.byId[x]);
  const strong = Object.entries({ ...COUNTERS, ...overrides })
    .filter(([enemy, list]) => list.includes(id) && db.byId[enemy]).map(([enemy]) => enemy);
  const role = me.positions[0];
  const peers = db.champions.filter((c) => c.id !== id && c.positions.some((p) => me.positions.includes(p)));
  const scored = peers.map((e) => ({ id: e.id, score: matchup(me, e, role, overrides).score })).sort((a, b) => b.score - a.score);
  for (const s of scored) { if (strong.length >= 8) break; if (!strong.includes(s.id) && !weak.includes(s.id)) strong.push(s.id); }
  for (const s of scored.reverse()) { if (weak.length >= 8) break; if (!weak.includes(s.id) && !strong.includes(s.id)) weak.push(s.id); }
  return { strong: strong.slice(0, 8), weak: weak.slice(0, 8) };
}
