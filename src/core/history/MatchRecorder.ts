// Follows one match from the live snapshots (purchase timeline, last known state) and turns
// it into a history entry when it ends. Only recorded modes are followed (not the Practice
// Tool or custom games).
import type { Db } from '../data/types.ts';
import type { GameMode } from '../lcu/types.ts';
import type { LiveGame, PlayingGame } from '../live/types.ts';
import type { RawJson } from '../shared/json.ts';
import type { HistoryEntry } from './types.ts';

const REMAKE_SECONDS = 300;

interface Followed {
  startedAt: number;
  queueId: number | null;
  purchases: { id: number; t: number }[];
  last?: PlayingGame;
  result?: string;
}

export class MatchRecorder {
  match: Followed | null = null;
  private prevItems: number[] = [];

  reset() {
    this.match = null;
    this.prevItems = [];
  }

  // An unknown mode is followed; a mode that is not recorded is not.
  update(game: LiveGame | null, mode: GameMode | null) {
    if (!game || !game.me || (mode && mode.recorded === false)) return;
    if (!this.match) {
      this.match = { startedAt: Date.now(), queueId: mode ? mode.queueId : null, purchases: [] };
      this.prevItems = [];
    }
    const items = game.me.items || [];
    for (const id of new Set(items)) {
      const before = this.prevItems.filter((x) => x === id).length;
      const now = items.filter((x) => x === id).length;
      if (now > before) this.match.purchases.push({ id, t: Math.round(game.gameTime || 0) });
    }
    this.prevItems = items;
    this.match.last = game as PlayingGame;
    if (game.result) this.match.result = game.result;
  }

  // The history entry; eog: /lol-end-of-game/v1/eog-stats-block (may be null). Null for a
  // remake or when the result is unknown.
  finish(db: Db, eog: RawJson, role: string | null): HistoryEntry | null {
    const m = this.match;
    this.reset();
    if (!m || !m.last) return null;
    const g = m.last;
    const duration = Math.round((eog && eog.gameLength) || g.gameTime || 0);
    if (duration < REMAKE_SECONDS) return null;
    const team = eog && (eog.teams || []).find((x: RawJson) => x.isPlayerTeam);
    const win = team ? !!team.isWinningTeam : (m.result ? m.result === 'Win' : null);
    if (win === null) return null;
    const keep = (id: number) => !!db.itemById[id] && ['legendary', 'boots', 'boots-upgrade'].includes(db.itemById[id].category);
    const opponent = g.enemies.find((e) => e.position && e.position === role);
    return {
      id: String((eog && eog.gameId) || m.startedAt),
      date: new Date(m.startedAt).toISOString(),
      queueId: m.queueId,
      championId: g.me.championId || '',
      role,
      opponentId: opponent ? opponent.championId : null,
      enemies: g.enemies.map((e) => ({ championId: e.championId, position: e.position || null, items: e.items.filter(keep) })),
      allies: g.allies.filter((a) => a.name !== g.me.name).map((a) => ({ championId: a.championId, position: a.position || null })),
      items: g.me.items.filter(keep),
      purchases: m.purchases.filter((p) => keep(p.id)),
      kda: { kills: g.me.scores.kills || 0, deaths: g.me.scores.deaths || 0, assists: g.me.scores.assists || 0 },
      cs: g.me.scores.creepScore || 0,
      level: g.me.level,
      duration,
      win,
      gold: (g.timeline || []).filter((x, i, all) => i === all.length - 1 || Math.floor(x.t / 60) !== Math.floor(all[i + 1].t / 60))
        .map((x) => [Math.round(x.t / 60), x.ally, x.enemy]),
    };
  }
}
