// Keeps the live client state (connection, game phase, game mode, champion select, mastery,
// match roster with ranks) and reports every change through `send`. The connection itself
// (lockfile discovery, HTTPS, WebSocket events) lives in Rust and is passed in.
import type { Db, Role } from '../data/types.ts';
import { inferRoles } from '../engine/roles.ts';
import type { RawJson } from '../shared/json.ts';
import { normalizeSession } from './champselect.ts';
import { modeOf } from './queues.ts';
import { fetchRoster, withMyPosition } from './roster.ts';
import type { ClientRunePage, Draft, GameMode, LcuConnection, LcuEvent, LcuStatus, RosterEntry } from './types.ts';

const ROSTER_RETRY_MS = 5000;

export type WatcherMessage =
  | ['lcu:status', LcuStatus] | ['lcu:phase', string] | ['lcu:mode', GameMode | null]
  | ['lcu:draft', Draft | null] | ['lcu:roster', RosterEntry[] | null];

export interface WatcherOptions {
  lcu?: LcuConnection;
  getDb: () => Db | null;
  getPuuid?: () => string | null;
  send: (...message: WatcherMessage) => void;
  onPhase?: (phase: string, mode: GameMode | null) => void;
}

// A connection that never connects (tests, no client).
const offline: LcuConnection = {
  start() {},
  onStatus() {},
  onEvent() {},
  get: () => Promise.reject(new Error('LCU not connected')),
  request: () => Promise.reject(new Error('LCU not connected')),
};

const pageOf = (p: RawJson): ClientRunePage | null => (p && p.selectedPerkIds && p.selectedPerkIds.length
  ? { name: p.name, primaryStyleId: p.primaryStyleId, subStyleId: p.subStyleId, selectedPerkIds: p.selectedPerkIds } : null);

export class LcuWatcher {
  readonly lcu: LcuConnection;
  status: LcuStatus = { connected: false };
  phase = 'None';
  mode: GameMode | null = null;
  draft: Draft | null = null;
  roster: RosterEntry[] | null = null;
  // The roster as the client gave it, before the player's role from Draft is filled in.
  private clientRoster: RosterEntry[] | null = null;
  // The role the player chose in Draft: their position in modes without assigned roles.
  private myRole: Role | null = null;
  private rosterTimer: ReturnType<typeof setTimeout> | undefined;
  mastery: Record<number, number> = {};
  pickable: number[] = [];
  private runePage: RawJson = null;
  private readonly options: WatcherOptions;

  constructor(options: WatcherOptions) {
    this.options = options;
    this.lcu = options.lcu || offline;
    this.lcu.onStatus((s) => { void this.handleStatus(s); });
    this.lcu.onEvent((e) => this.handleEvent(e));
  }

  start(leagueDir: string) { this.lcu.start(leagueDir); }

  // false only when the mode is known and unsupported (ARAM, blind pick, custom games off the Rift…).
  get supported() { return !this.mode || this.mode.supported; }

  private send(...message: WatcherMessage) { this.options.send(...message); }

  private async handleStatus(status: LcuStatus) {
    this.status = status;
    this.send('lcu:status', status);
    if (!status.connected) { this.setDraft(null); await this.setPhase('None'); return; }
    try {
      const list: RawJson[] = await this.lcu.get('/lol-champion-mastery/v1/local-player/champion-mastery');
      this.mastery = Object.fromEntries((list || []).map((m) => [m.championId, m.championPoints]));
    } catch { this.mastery = {}; }
    try { await this.setPhase(await this.lcu.get('/lol-gameflow/v1/gameflow-phase')); } catch { /* client still loading */ }
    try { await this.refreshSession(await this.lcu.get('/lol-champ-select/v1/session')); } catch { /* not in champ select */ }
  }

  private handleEvent({ uri, eventType, data }: LcuEvent) {
    if (uri === '/lol-gameflow/v1/gameflow-phase') void this.setPhase(data);
    if (uri === '/lol-perks/v1/currentpage') this.setRunePage(eventType === 'Delete' ? null : data);
    if (uri === '/lol-champ-select/v1/session') {
      if (eventType === 'Delete') this.setDraft(null);
      else void this.refreshSession(data);
    }
  }

  async setPhase(phase: string) {
    this.phase = phase;
    await this.refreshMode();
    this.send('lcu:phase', phase);
    if (phase === 'InProgress') void this.loadRoster();
    else this.setRoster(null);
    this.options.onPhase?.(phase, this.mode);
  }

  private async refreshMode() {
    let mode: GameMode | null = null;
    if (this.status.connected && this.phase !== 'None') {
      try { mode = modeOf(await this.lcu.get('/lol-gameflow/v1/session')); } catch { /* no session */ }
    }
    this.mode = mode;
    this.send('lcu:mode', mode);
    if (!this.supported) this.setDraft(null);
  }

  // The teams appear in the gameflow session a moment after the game starts; retry until they do.
  private async loadRoster() {
    clearTimeout(this.rosterTimer);
    const db = this.options.getDb();
    if (!db || !this.supported || this.phase !== 'InProgress') return;
    let roster: RosterEntry[] | null = null;
    try {
      const session = await this.lcu.get('/lol-gameflow/v1/session');
      roster = await fetchRoster(this.lcu, session, db, this.mode ? this.mode.rankedQueue : 'RANKED_SOLO_5x5');
    } catch { /* retried below */ }
    if (this.phase !== 'InProgress') return;
    if (roster) this.setRoster(roster);
    else this.rosterTimer = setTimeout(() => { void this.loadRoster(); }, ROSTER_RETRY_MS);
  }

  setRoster(roster: RosterEntry[] | null) {
    if (!roster) clearTimeout(this.rosterTimer);
    this.clientRoster = roster;
    this.roster = withMyPosition(roster, this.options.getPuuid?.() ?? null, this.myRole);
    this.send('lcu:roster', this.roster);
  }

  // The player chose their role in Draft; a roster without their position takes it.
  setMyRole(role: Role | null) {
    this.myRole = role || null;
    if (this.clientRoster) this.setRoster(this.clientRoster);
  }

  private async refreshSession(session: RawJson) {
    const db = this.options.getDb();
    if (!db || !this.supported) return;
    const base = normalizeSession(session, db);
    if (!base) { this.setDraft(null); return; }
    if (!this.draft || this.draft.gameId !== base.gameId) {
      try { this.pickable = await this.lcu.get('/lol-champ-select/v1/pickable-champion-ids'); } catch { this.pickable = []; }
      try { this.runePage = await this.lcu.get('/lol-perks/v1/currentpage'); } catch { this.runePage = null; }
    }
    this.setDraft({
      ...base,
      enemyRoles: inferRoles(db, base.theirTeam.map((m) => ({ cellId: m.cellId, championId: m.championId, role: m.role }))),
      allyRoles: inferRoles(db, base.myTeam.map((m) => ({ cellId: m.cellId, championId: m.championId || m.hoverId, role: m.role }))),
      myRunes: pageOf(this.runePage),
    });
  }

  // The rune page selected in the client changed (the player picked or edited a page).
  private setRunePage(page: RawJson) {
    this.runePage = page;
    if (this.draft) this.setDraft({ ...this.draft, myRunes: pageOf(page) });
  }

  private setDraft(draft: Draft | null) {
    this.draft = draft;
    this.send('lcu:draft', draft);
  }

  snapshot() {
    return { status: this.status, phase: this.phase, mode: this.mode, draft: this.draft, roster: this.roster };
  }
}
