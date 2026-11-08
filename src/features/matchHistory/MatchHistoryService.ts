// The account's history: matches the app recorded (with purchase timelines) and every game
// from the client's match history, cached per profile. The engine learns from both.
import * as demo from '../../core/demo/index.ts';
import type { LearningEntry } from '../../core/engine/types.ts';
import { History } from '../../core/history/History.ts';
import type { HistoryEntry } from '../../core/history/types.ts';
import { analyzeGames, type Analysis } from '../../core/matches/analyzeGames.ts';
import { matchDetail, PlayerLookup, syncMatches } from '../../core/matches/clientHistory.ts';
import { learningHistory } from '../../core/matches/learningEntries.ts';
import { MatchStore } from '../../core/matches/MatchStore.ts';
import type { CompactGame, PlayerProfile } from '../../core/matches/types.ts';
import type { Storage } from '../../core/shared/storage.ts';
import { Store } from '../../shared/lib/Store.ts';
import type { ClientService } from '../client/index.ts';
import type { DatabaseService } from '../database/index.ts';

export interface MatchesState { games: CompactGame[]; analysis: Analysis | null; lastSync: string | null; syncing: boolean }
export interface PlayerSheetData extends PlayerProfile { analysis: Analysis }

export class MatchHistoryService {
  readonly store = new Store<{ history: HistoryEntry[]; matches: MatchesState }>({
    history: [], matches: { games: [], analysis: null, lastSync: null, syncing: false },
  });
  private readonly history: History;
  private readonly matches: MatchStore;
  private readonly players = new PlayerLookup();
  private puuid: string | null = null;

  constructor(storage: Storage, private readonly client: ClientService, private readonly database: DatabaseService) {
    this.history = new History(storage);
    this.matches = new MatchStore(storage);
  }

  // Switches to the account's profile folder; a history saved before profiles existed moves
  // to the first profile.
  async useProfile(dir: string, puuid: string) {
    this.puuid = puuid;
    await this.history.use(dir, '');
    await this.matches.use(dir);
    this.publish();
  }

  private publish(syncing = this.store.get().matches.syncing) {
    const games = this.matches.list();
    this.store.set({
      history: this.history.list(),
      matches: { games: [...games], analysis: this.puuid ? analyzeGames(games, this.puuid) : null, lastSync: this.matches.lastSync, syncing },
    });
  }

  // Everything the engine learns from: the app's own records plus the client's history.
  learnFrom(): LearningEntry[] {
    const db = this.database.data;
    return db && this.puuid ? learningHistory(db.db, this.history.list(), this.matches.list(), this.puuid) : this.history.list();
  }

  async refresh({ deep = false } = {}) {
    const db = this.database.data;
    if (!this.puuid || !db || this.store.get().matches.syncing || !this.client.connected) return;
    this.publish(true);
    try { await syncMatches(this.client.lcu, db.db, this.matches, this.puuid, { deep }); } catch (e) { console.error('[matches]', e); }
    this.publish(false);
  }

  async detail(id: number): Promise<CompactGame | null> {
    const db = this.database.data;
    if (!db) return null;
    const game = await matchDetail(this.client.connected ? this.client.lcu : null, db.db, this.matches, id);
    this.publish();
    return game;
  }

  // Any player's profile; players of the simulated match have invented ones.
  async player(puuid: string): Promise<PlayerSheetData> {
    const db = this.database.data;
    if (!db) throw new Error('No database');
    const data = demo.isDemoPuuid(puuid) ? demo.player(db.db, puuid) : await this.connectedPlayer(puuid);
    if (!data) throw new Error('Unknown player');
    return { ...data, analysis: analyzeGames(data.games, puuid) };
  }

  private connectedPlayer(puuid: string) {
    const db = this.database.data;
    if (!this.client.connected || !db) throw new Error('LCU not connected');
    return this.players.fetch(this.client.lcu, db.db, puuid);
  }

  record(entry: HistoryEntry) { if (this.history.add(entry)) this.publish(); }
  remove(id: string) { this.history.remove(id); this.publish(); }
  clear() { this.history.clear(); this.publish(); }
}
