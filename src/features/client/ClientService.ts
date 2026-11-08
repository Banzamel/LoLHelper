// The League client as observable state: connection, game phase, game mode, champion select
// and the match roster (core LcuWatcher over the Rust connection).
import type { Db, Role } from '../../core/data/types.ts';
import { LcuWatcher, type WatcherMessage } from '../../core/lcu/LcuWatcher.ts';
import type { Draft, GameMode, Lcu, LcuConnection, LcuStatus, RosterEntry } from '../../core/lcu/types.ts';
import { Store } from '../../shared/lib/Store.ts';

export interface ClientState {
  lcu: LcuStatus;
  phase: string;
  mode: GameMode | null;
  draft: Draft | null;
  // Players of the running match, known from the loading screen on.
  roster: RosterEntry[] | null;
}

type PhaseListener = (phase: string, mode: GameMode | null) => void;

export class ClientService {
  readonly store = new Store<ClientState>({ lcu: { connected: false }, phase: 'None', mode: null, draft: null, roster: null });
  private readonly watcher: LcuWatcher;
  private readonly phaseListeners: PhaseListener[] = [];
  private readonly connectListeners: (() => void)[] = [];

  constructor(connection: LcuConnection, getDb: () => Db | null, getPuuid: () => string | null) {
    this.watcher = new LcuWatcher({
      lcu: connection,
      getDb,
      getPuuid,
      send: (...message) => this.receive(message),
      onPhase: (phase, mode) => this.phaseListeners.forEach((fn) => fn(phase, mode)),
    });
  }

  private receive([channel, payload]: WatcherMessage) {
    if (channel === 'lcu:status') {
      this.store.set({ lcu: payload });
      if (payload.connected) this.connectListeners.forEach((fn) => fn());
    }
    if (channel === 'lcu:phase') this.store.set({ phase: payload });
    if (channel === 'lcu:mode') this.store.set({ mode: payload });
    if (channel === 'lcu:draft') this.store.set({ draft: payload });
    if (channel === 'lcu:roster') this.store.set({ roster: payload });
  }

  start(leagueDir: string) { this.watcher.start(leagueDir); }

  get connected() { return this.store.get().lcu.connected; }
  get lcu(): Lcu { return this.watcher.lcu; }
  // false only when the mode is known and unsupported (ARAM, blind pick, custom games off the Rift…).
  get supported() { return this.watcher.supported; }
  get mode() { return this.watcher.mode; }
  get phase() { return this.watcher.phase; }
  get roster() { return this.watcher.roster; }
  get mastery() { return this.watcher.mastery; }
  get pickable() { return this.watcher.pickable; }

  // The player's position in modes without assigned roles comes from the role chosen in Draft.
  setMyRole(role: Role) { this.watcher.setMyRole(role); }

  onPhase(fn: PhaseListener) { this.phaseListeners.push(fn); }
  onConnected(fn: () => void) { this.connectListeners.push(fn); }
}
