// The account's own games, cached in matches.json of its profile folder: finished games never
// change, so each one is downloaded only once.
import { joinPath, queueWrite, readJson, type Storage } from '../shared/storage.ts';
import type { CompactGame } from './types.ts';

const LIMIT = 1000;

export class MatchStore {
  private readonly storage: Storage | null;
  private file: string | null = null;
  private games: CompactGame[] = [];
  lastSync: string | null = null;

  constructor(storage: Storage | null = null) {
    this.storage = storage;
  }

  // dir: the profile folder (relative to the storage root), null for none.
  async use(dir: string | null): Promise<this> {
    this.file = dir !== null ? joinPath(dir, 'matches.json') : null;
    this.games = [];
    this.lastSync = null;
    if (!this.file || !this.storage) return this;
    const saved = await readJson<{ games?: CompactGame[]; lastSync?: string } | null>(this.storage, this.file, null);
    if (saved) {
      this.games = saved.games || [];
      this.lastSync = saved.lastSync || null;
    }
    return this;
  }

  list() { return this.games; }

  get(id: string | number) { return this.games.find((g) => String(g.id) === String(id)) || null; }

  // Adds new games and upgrades list entries to full ones; returns how many were new.
  upsert(games: CompactGame[]): number {
    let added = 0;
    for (const g of games) {
      if (!g || !g.id) continue;
      const i = this.games.findIndex((x) => x.id === g.id);
      if (i < 0) { this.games.push(g); added += 1; } else if (g.full || !this.games[i].full) this.games[i] = { ...this.games[i], ...g, gold: this.games[i].gold || g.gold };
    }
    this.games.sort((a, b) => b.created - a.created);
    this.games = this.games.slice(0, LIMIT);
    return added;
  }

  save(): Promise<void> {
    if (!this.file || !this.storage) return Promise.resolve();
    return queueWrite(this.storage, this.file, JSON.stringify({ lastSync: this.lastSync, games: this.games }));
  }
}
