// Matches the app recorded, saved to history.json in the account's profile folder (up to
// LIMIT, newest first). The engine learns from them (engine/history).
import { joinPath, queueWrite, readJson, type Storage } from '../shared/storage.ts';
import type { HistoryEntry } from './types.ts';

const LIMIT = 500;

export class History {
  private readonly storage: Storage;
  private file = 'history.json';
  private games: HistoryEntry[] = [];

  constructor(storage: Storage) {
    this.storage = storage;
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

  list(): HistoryEntry[] { return this.games; }

  add(entry: HistoryEntry): boolean {
    if (this.games.some((g) => g.id === entry.id)) return false;
    this.games = [entry, ...this.games].slice(0, LIMIT);
    void this.save();
    return true;
  }

  remove(id: string) {
    this.games = this.games.filter((g) => g.id !== id);
    void this.save();
  }

  clear() {
    this.games = [];
    void this.save();
  }

  private save() {
    return queueWrite(this.storage, this.file, JSON.stringify(this.games));
  }
}
