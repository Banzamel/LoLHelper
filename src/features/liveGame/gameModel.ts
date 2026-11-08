// In-game helpers shared by the Match view and the widget: who the lane opponent is and the
// build adapted to the live match.
import type { Role } from '../../core/data/types.ts';
import type { Build } from '../../core/engine/types.ts';
import type { LivePlayer, PlayingGame } from '../../core/live/types.ts';
import type { BuildService } from '../builds/index.ts';
import type { GameData } from '../database/index.ts';

export interface GameBuild {
  role: Role;
  opp: LivePlayer | null;
  owned: number[];
  build: Build;
  // The buy order with the boots the player already finished in place of the recommended pair.
  fullIds: number[];
}

export const isPlaying = (game: { me: unknown } | null | undefined): game is PlayingGame => !!game && !!game.me;

export const bought = (data: GameData, ids: number[]) => ids.filter((id) => { const it = data.item(id); return !!it && !['consumable', 'trinket'].includes(it.category); });

// Nothing bought yet (a trinket does not count): time for the starting items.
export const needsStarters = (data: GameData, game: PlayingGame) => !game.me.items.some((id) => { const it = data.item(id); return !!it && it.category !== 'trinket'; });
export const startersCost = (data: GameData, build: Build) => build.starters.reduce((sum, s) => sum + (data.item(s.id)?.gold.total || 0) * s.count, 0);

export function myRole(data: GameData, game: PlayingGame): Role {
  if (game.me.position) return game.me.position;
  const c = data.champ(game.me.championId);
  return c ? c.positions[0] : 'MIDDLE';
}

export function laneOpponent(data: GameData, game: PlayingGame, role: Role): LivePlayer | null {
  const byPos = game.enemies.find((e) => e.position === role);
  if (byPos) return byPos;
  return game.enemies.find((e) => data.champ(e.championId)?.positions.includes(role)) || null;
}

export async function buildForGame(builds: BuildService, data: GameData, game: PlayingGame): Promise<GameBuild> {
  const role = myRole(data, game);
  const opp = laneOpponent(data, game, role);
  const owned = bought(data, game.me.items);
  const key = (p: LivePlayer) => p.championId || '';
  const build = await builds.build({
    championId: game.me.championId || '',
    enemyId: opp ? opp.championId : null,
    enemyIds: game.enemies.map((e) => e.championId),
    role,
    enemyItems: Object.fromEntries(game.enemies.map((e) => [key(e), bought(data, e.items)])),
    enemyStats: Object.fromEntries(game.enemies.map((e) => [key(e), e.scores || {}])),
    ownedItems: game.me.items,
    gold: game.me.gold,
  });
  const ownedBoots = owned.find((id) => ['boots', 'boots-upgrade'].includes(data.item(id)?.category || ''));
  const fullIds = build.order.map((id) => (build.boots && id === build.boots.id && ownedBoots ? ownedBoots : id));
  return { role, opp, owned, build, fullIds };
}

// The ability the skill order says to level next (null at level 18 or for non-standard kits).
export function nextSkill(build: Build, level: number): { key: string; level: number } | null {
  const levels = build.skills && build.skills.levels;
  if (!levels || level >= 18) return null;
  return { key: levels[level], level: level + 1 };
}

export const csPerMin = (cs: number | undefined, game: { gameTime: number }) => ((cs || 0) / Math.max(1, game.gameTime / 60)).toFixed(1);
