// Enemy role inference. The client hides enemy positions in champion select, so each enemy
// pick is assigned to the position that maximises the total fit over the whole team.
import { ROLES, type Champion, type Db, type Role } from '../data/types.ts';

const TAG_ROLE: Record<string, Role> = { Marksman: 'BOTTOM', Support: 'SUPPORT', Mage: 'MIDDLE', Assassin: 'MIDDLE', Fighter: 'TOP', Tank: 'TOP' };

export interface RolePick {
  cellId: number;
  championId: string | null;
  // A role the client assigned (fixed), else null.
  role: Role | null;
}

function fit(champ: Champion, role: Role): number {
  // Play rates: a role the champion is rarely played in (Teemo jungle) weighs little.
  const rates = champ.positionRates;
  const total = rates ? Object.values(rates).reduce((a, b) => a + (b || 0), 0) : 0;
  if (rates && total > 0) return 2 * ((rates[role] || 0) / total) + (champ.positions.includes(role) ? 0.3 : 0);
  let w = 0;
  if (champ.positions.includes(role)) w += 1 + 1 / champ.positions.length;
  if (TAG_ROLE[champ.tags[0]] === role) w += 0.4;
  return w;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

// { cellId: role } for every pick with a role, fixed or inferred.
export function inferRoles(db: Db, picks: RolePick[]): Record<number, Role> {
  const fixed: Record<number, Role> = Object.fromEntries(picks.filter((p) => p.role).map((p) => [p.cellId, p.role as Role]));
  const free = picks.filter((p) => !p.role && p.championId && db.byId[p.championId]);
  const openRoles = ROLES.filter((r) => !Object.values(fixed).includes(r));
  let best: Role[] | null = null;
  let bestScore = -1;
  for (const perm of permutations(openRoles)) {
    let score = 0;
    free.forEach((p, i) => { if (perm[i]) score += fit(db.byId[p.championId as string], perm[i]); });
    if (score > bestScore) { bestScore = score; best = perm; }
  }
  const result = { ...fixed };
  free.forEach((p, i) => { if (best && best[i]) result[p.cellId] = best[i]; });
  return result;
}

export { ROLES };
