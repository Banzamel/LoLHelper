// Shared in-game helpers for the Match view and the overlay widget: who the lane opponent
// is and the build adapted to the live match.
import { champ, item } from './store.js';

export const bought = (ids) => ids.filter((id) => item(id) && !['consumable', 'trinket'].includes(item(id).category));

export function myRole(game) {
  if (game.me.position) return game.me.position;
  const c = champ(game.me.championId);
  return c ? c.positions[0] : 'MIDDLE';
}

export function laneOpponent(game, role) {
  const byPos = game.enemies.find((e) => e.position === role);
  if (byPos) return byPos;
  return game.enemies.find((e) => champ(e.championId) && champ(e.championId).positions.includes(role)) || null;
}

export async function buildForGame(game) {
  const role = myRole(game);
  const opp = laneOpponent(game, role);
  const owned = bought(game.me.items);
  const build = await window.api.build({
    championId: game.me.championId,
    enemyId: opp ? opp.championId : null,
    enemyIds: game.enemies.map((e) => e.championId),
    role,
    enemyItems: Object.fromEntries(game.enemies.map((e) => [e.championId, bought(e.items)])),
    ownedItems: owned,
  });
  const ownedBoots = owned.find((id) => item(id).tags.includes('Boots') && item(id).category !== 'component');
  const fullIds = [ownedBoots || (build.boots && build.boots.id), ...build.full].filter(Boolean);
  return { role, opp, owned, build, fullIds };
}

// The ability the skill order says to level next (null at level 18 or for non-standard kits).
export function nextSkill(build, level) {
  const levels = build.skills && build.skills.levels;
  if (!levels || level >= 18) return null;
  return { key: levels[level], level: level + 1 };
}
