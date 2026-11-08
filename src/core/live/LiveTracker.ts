// The match timeline built from successive snapshots: item gold, kills and CS of both teams
// and every player's item gold, for the charts and the recorded history.
import type { LiveGame, TimelinePoint } from './types.ts';

const SAMPLE_EVERY = 20;

const total = <T>(list: T[], key: (p: T) => number | undefined) => list.reduce((s, p) => s + (key(p) || 0), 0);

// One point of the timeline at the snapshot's game time.
export function sample(game: LiveGame): TimelinePoint {
  return {
    t: Math.round(game.gameTime),
    ally: total(game.allies, (p) => p.itemGold),
    enemy: total(game.enemies, (p) => p.itemGold),
    allyKills: game.objectives.ally.kills,
    enemyKills: game.objectives.enemy.kills,
    allyCs: total(game.allies, (p) => p.scores.creepScore),
    enemyCs: total(game.enemies, (p) => p.scores.creepScore),
    players: Object.fromEntries([...game.allies, ...game.enemies].map((p) => [p.name, p.itemGold])),
  };
}

export class LiveTracker {
  private timeline: TimelinePoint[] = [];

  reset() { this.timeline = []; }

  // Adds a point every SAMPLE_EVERY seconds of game time and on every kill (the latest point
  // is refreshed in between); a game time going back means a new match.
  track(game: LiveGame): LiveGame {
    const last = this.timeline[this.timeline.length - 1];
    if (last && game.gameTime < last.t - 30) this.timeline = [];
    const point = sample(game);
    const prev = this.timeline[this.timeline.length - 1];
    const before = this.timeline[this.timeline.length - 2];
    const fresh = !prev || !before || prev.t - before.t >= SAMPLE_EVERY || point.allyKills !== prev.allyKills || point.enemyKills !== prev.enemyKills;
    if (fresh) this.timeline.push(point);
    else this.timeline[this.timeline.length - 1] = point;
    return { ...game, timeline: this.timeline.slice() };
  }
}
