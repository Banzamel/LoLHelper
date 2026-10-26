// Shared in-game helpers for the Match view and the overlay widget: who the lane opponent
// is and the build adapted to the live match.
import { champ, item } from './store.js';

export const bought = (ids) => ids.filter((id) => item(id) && !['consumable', 'trinket'].includes(item(id).category));

// Nothing bought yet (a trinket does not count): time for the starting items.
export const needsStarters = (game) => !game.me.items.some((id) => item(id) && item(id).category !== 'trinket');
export const startersCost = (build) => build.starters.reduce((sum, s) => sum + (item(s.id) ? item(s.id).gold.total * s.count : 0), 0);

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
    enemyStats: Object.fromEntries(game.enemies.map((e) => [e.championId, e.scores || {}])),
    ownedItems: game.me.items,
    gold: game.me.gold,
  });
  // Buy order with the boots the player already finished in place of the recommended pair.
  const ownedBoots = owned.find((id) => ['boots', 'boots-upgrade'].includes(item(id).category));
  const fullIds = build.order.map((id) => (build.boots && id === build.boots.id && ownedBoots ? ownedBoots : id));
  return { role, opp, owned, build, fullIds };
}

// The ability the skill order says to level next (null at level 18 or for non-standard kits).
export function nextSkill(build, level) {
  const levels = build.skills && build.skills.levels;
  if (!levels || level >= 18) return null;
  return { key: levels[level], level: level + 1 };
}
