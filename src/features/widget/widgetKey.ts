// What the widget's build depends on: items, level, gold (by 50) and the enemies' items, ranks
// and positions. Polls that change nothing of this reuse the last build.
import type { PlayingGame } from '../../core/live/types.ts';

export function widgetKey(game: PlayingGame): string {
  return JSON.stringify([game.me.items, game.me.level, Math.floor(game.me.gold / 50), game.enemies.map((e) => [e.items, e.rank, e.position])]);
}
