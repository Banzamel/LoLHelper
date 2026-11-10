// What the widget's build depends on: items, level, gold (by 50), the enemies' ranks and all
// that the build itself reads from both teams (a kill alone changes how fed an enemy is).
// Polls that change nothing of this reuse the last build.
import type { PlayingGame } from '../../core/live/types.ts';
import { buildInputs } from '../liveGame/index.ts';

export function widgetKey(game: PlayingGame): string {
  return JSON.stringify([game.me.items, game.me.level, Math.floor(game.me.gold / 50), game.enemies.map((e) => e.rank), buildInputs(game)]);
}
