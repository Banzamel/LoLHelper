// The ability to level next in a running match. The game starts at level 1 with one skill
// point, so the next skill-up is the one after the points already spent (level 1 at the start),
// and the order is followed against what the player really levelled, not only the count.
import type { Build } from '../types.ts';

export interface NextSkill { key: string; level: number }

// abilities: the player's ability levels ({ Q: 1, W: 0, … }); null when the game does not report them.
export function nextSkill(build: Pick<Build, 'skills'>, level: number, abilities: Record<string, number> | null): NextSkill | null {
  const order = build.skills && build.skills.levels;
  if (!order || !order.length) return null;
  const known = !!abilities && Object.keys(abilities).length > 0;
  // Without ability levels the points spent follow the level: the current level's point is still free.
  const spent = known ? Object.values(abilities).reduce((s, v) => s + (v || 0), 0) : Math.max(0, level - 1);
  if (spent >= 18 || spent >= order.length) return null;
  if (!known) return { key: order[spent], level: spent + 1 };
  const planned: Record<string, number> = {};
  for (const key of order) {
    planned[key] = (planned[key] || 0) + 1;
    if (planned[key] > (abilities[key] || 0)) return { key, level: spent + 1 };
  }
  return null;
}
