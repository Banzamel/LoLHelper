// Match history: every match the player finishes in a recorded mode (role-based queues; not the
// Practice Tool or custom games) is saved (champion, role, lane opponent, both teams, items in
// purchase order, score, result, gold over time) to history.json in the account's profile
// folder. The engine learns from it (engine/history.ts).
import type { Db } from './types.ts';
import { joinPath, queueWrite, readJson, type Storage } from './storage.ts';

const LIMIT = 500;
const REMAKE_SECONDS = 300;

export interface HistoryEntry {
  id: string;
  date: string;
  queueId: number | null;
  championId: string;
  role: string | null;
  opponentId: string | null;
  enemies: { championId: string; position: string | null; items: number[] }[];
  allies: { championId: string; position: string | null }[];
  items: number[];
  purchases: { id: number; t: number }[];
  kda: { kills: number; deaths: number; assists: number };
  cs: number;
  level: number;
  duration: number;
  win: boolean;
  gold: number[][];
  [extra: string]: any;
}

class History {
  storage: Storage;
  file: string;
  games: HistoryEntry[];

  constructor(storage: Storage) {
    this.storage = storage;
    this.file = 'history.json';
    this.games = [];
  }

  // Loads the history of the folder `dir` (relative to the storage root); a history saved
  // before profiles existed (in `legacyDir`) moves to the first profile that has none.
  async use(dir: string, legacyDir: string | null = null): Promise<this> {
    this.file = joinPath(dir, 'history.json');
    const legacy = legacyDir !== null ? joinPath(legacyDir, 'history.json') : null;
    if (legacy && legacy !== this.file && (await this.storage.exists(legacy)) && !(await this.storage.exists(this.file))) {
      await this.storage.rename(legacy, this.file);
    }
    const games = await readJson<HistoryEntry[]>(this.storage, this.file, []);
    this.games = Array.isArray(games) ? games : [];
    return this;
  }

  list() { return this.games; }

  save() {
    return queueWrite(this.storage, this.file, JSON.stringify(this.games));
  }

  add(entry: HistoryEntry) {
    if (this.games.some((g) => g.id === entry.id)) return false;
    this.games = [entry, ...this.games].slice(0, LIMIT);
    this.save();
    return true;
  }

  remove(id: string) {
    this.games = this.games.filter((g) => g.id !== id);
    this.save();
  }

  clear() {
    this.games = [];
    this.save();
  }
}

// Follows one match from the live snapshots: purchase timeline and the last known state.
class MatchRecorder {
  match: any;
  prevItems: number[];

  constructor() {
    this.match = null;
    this.prevItems = [];
  }

  reset() {
    this.match = null;
    this.prevItems = [];
  }

  // game: the normalized live snapshot (liveclient.normalize); mode: watcher mode. A mode that
  // is not recorded (Practice Tool, custom games) is not followed; an unknown mode is.
  update(game: any, mode: any) {
    if (!game || !game.me || (mode && mode.recorded === false)) return;
    if (!this.match) {
      this.match = { startedAt: Date.now(), queueId: mode ? mode.queueId : null, purchases: [] };
      this.prevItems = [];
    }
    const items: number[] = game.me.items || [];
    for (const id of new Set(items)) {
      const before = this.prevItems.filter((x) => x === id).length;
      const now = items.filter((x) => x === id).length;
      if (now > before) this.match.purchases.push({ id, t: Math.round(game.gameTime || 0) });
    }
    this.prevItems = items;
    this.match.last = game;
    if (game.result) this.match.result = game.result;
  }

  // Builds the history entry; eog: /lol-end-of-game/v1/eog-stats-block (may be null).
  finish(db: Db, eog: any, role: string | null): HistoryEntry | null {
    const m = this.match;
    this.reset();
    if (!m || !m.last) return null;
    const g = m.last;
    const duration = Math.round((eog && eog.gameLength) || g.gameTime || 0);
    if (duration < REMAKE_SECONDS) return null;
    const team = eog && (eog.teams || []).find((x: any) => x.isPlayerTeam);
    const win = team ? !!team.isWinningTeam : (m.result ? m.result === 'Win' : null);
    if (win === null) return null;
    const keep = (id: number) => !!db.itemById[id] && ['legendary', 'boots', 'boots-upgrade'].includes(db.itemById[id].category);
    const opponent = g.enemies.find((e: any) => e.position && e.position === role);
    return {
      id: String((eog && eog.gameId) || m.startedAt),
      date: new Date(m.startedAt).toISOString(),
      queueId: m.queueId,
      championId: g.me.championId,
      role,
      opponentId: opponent ? opponent.championId : null,
      enemies: g.enemies.map((e: any) => ({ championId: e.championId, position: e.position || null, items: e.items.filter(keep) })),
      allies: g.allies.filter((a: any) => a.name !== g.me.name).map((a: any) => ({ championId: a.championId, position: a.position || null })),
      items: g.me.items.filter(keep),
      purchases: m.purchases.filter((p: any) => keep(p.id)),
      kda: { kills: g.me.scores.kills || 0, deaths: g.me.scores.deaths || 0, assists: g.me.scores.assists || 0 },
      cs: g.me.scores.creepScore || 0,
      level: g.me.level,
      duration,
      win,
      // Item gold of both teams once a minute: [minute, allies, enemies].
      gold: (g.timeline || []).filter((x: any, i: number, all: any[]) => i === all.length - 1 || Math.floor(x.t / 60) !== Math.floor(all[i + 1].t / 60))
        .map((x: any) => [Math.round(x.t / 60), x.ally, x.enemy]),
    };
  }
}

export { History, MatchRecorder };
