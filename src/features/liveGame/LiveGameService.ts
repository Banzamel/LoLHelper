// The running match from the game's Live Client Data API, polled while a match runs in a
// supported mode, recorded into the history when it ends — or a simulated match on request.
import * as demo from '../../core/demo/index.ts';
import { MatchRecorder } from '../../core/history/MatchRecorder.ts';
import type { RosterEntry } from '../../core/lcu/types.ts';
import { LiveTracker } from '../../core/live/LiveTracker.ts';
import { normalize } from '../../core/live/normalize.ts';
import type { LiveGame } from '../../core/live/types.ts';
import type { RawJson } from '../../core/shared/json.ts';
import { liveGameData } from '../../platform/index.ts';
import { Store } from '../../shared/lib/Store.ts';
import type { ClientService } from '../client/index.ts';
import type { DatabaseService } from '../database/index.ts';
import type { MatchHistoryService } from '../matchHistory/index.ts';

const POLL_MS = 3000;
const HISTORY_DELAY_MS = 15000;

export interface DevSwitches { live: boolean; roster: RosterEntry[] | null }

export class LiveGameService {
  readonly store = new Store<{ game: LiveGame | null; demo: boolean }>({ game: null, demo: false });
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly tracker = new LiveTracker();
  private readonly recorder = new MatchRecorder();
  private demoStartedAt: number | null = null;

  constructor(
    private readonly database: DatabaseService,
    private readonly client: ClientService,
    private readonly history: MatchHistoryService,
    private readonly dev: DevSwitches,
  ) {
    client.onPhase((phase) => this.onPhase(phase));
  }

  private roster(): RosterEntry[] | null {
    return this.demoStartedAt !== null ? demo.roster() : this.dev.roster || this.client.roster;
  }

  // The Live Client API only exists while a match runs: poll it during InProgress only, and
  // only in supported modes. A real match ends the simulation.
  private onPhase(phase: string) {
    if (this.demoStartedAt !== null && phase === 'InProgress') this.stopDemo();
    if (this.demoStartedAt !== null) return;
    if (phase === 'EndOfGame' || (['None', 'Lobby'].includes(phase) && this.recorder.match)) void this.finishMatch();
    if (this.dev.live) return;
    if (phase === 'InProgress' && this.client.supported) this.start();
    else this.stop();
  }

  start() {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => { void this.poll(); }, POLL_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.tracker.reset();
    this.setGame(null);
  }

  private demoTime() {
    const elapsed = (Date.now() - (this.demoStartedAt || Date.now())) / 1000;
    return Math.min(demo.END, demo.START + elapsed * demo.SPEED);
  }

  private async snapshot(): Promise<RawJson> {
    const db = this.database.data;
    return this.demoStartedAt !== null && db ? demo.snapshot(db.db, this.demoTime()) : liveGameData();
  }

  private async poll() {
    const db = this.database.data;
    if (!db) return;
    try {
      const data = await this.snapshot();
      if (data && data.activePlayer && data.allPlayers) this.setGame(this.tracker.track(normalize(data, db.db, this.roster())));
    } catch { /* game still loading or already closed */ }
  }

  // A simulated match is only shown: never recorded and never over the desktop as a widget.
  private setGame(game: LiveGame | null) {
    if (this.demoStartedAt !== null) { this.store.set({ game: game && { ...game, demo: true } }); return; }
    if (game && game.me) this.recorder.update(game, this.client.mode);
    this.store.set({ game });
  }

  // Starts the simulated match (refused while a real one runs). The first minutes are filled
  // in at once, so the charts have a history from the start.
  startDemo(): boolean {
    const db = this.database.data;
    const game = this.store.get().game;
    if (!db || (this.demoStartedAt === null && game && game.me)) return false;
    this.stop();
    this.demoStartedAt = Date.now();
    for (let t = 30; t < demo.START; t += 20) this.tracker.track(normalize(demo.snapshot(db.db, t), db.db, demo.roster()));
    this.store.set({ demo: true });
    this.start();
    return true;
  }

  stopDemo() {
    if (this.demoStartedAt === null) return;
    this.demoStartedAt = null;
    this.stop();
    this.store.set({ demo: false });
    if (this.dev.live || (this.client.phase === 'InProgress' && this.client.supported)) this.start();
  }

  // Saves the finished match with its result (end-of-game stats, else the live GameEnd event).
  private async finishMatch() {
    const db = this.database.data;
    const last = this.recorder.match?.last;
    if (!last || !db) return;
    let eog: RawJson = null;
    try { eog = await this.client.lcu.get('/lol-end-of-game/v1/eog-stats-block'); } catch { /* not available */ }
    const me = last.me;
    const role = me.position || (me.championId && db.db.byId[me.championId] ? db.db.byId[me.championId].positions[0] : null);
    const entry = this.recorder.finish(db.db, eog, role);
    if (entry) this.history.record(entry);
    // The client lists the game in its match history a moment after it ends.
    setTimeout(() => { void this.history.refresh(); }, HISTORY_DELAY_MS);
  }
}
