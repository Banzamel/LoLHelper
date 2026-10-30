// Keeps the live client state (connection, game phase, game mode, champion select, mastery,
// match roster with ranks) and pushes it to the renderer whenever the LCU reports a change.
const { LcuClient } = require('./client');
const { normalizeSession } = require('./champselect');
const { modeOf } = require('./queues');
const { fetchRoster, withMyPosition } = require('./roster');
const { inferRoles } = require('../engine/roles');

const ROSTER_RETRY_MS = 5000;

const pageOf = (p) => (p && p.selectedPerkIds && p.selectedPerkIds.length
  ? { name: p.name, primaryStyleId: p.primaryStyleId, subStyleId: p.subStyleId, selectedPerkIds: p.selectedPerkIds } : null);

class LcuWatcher {
  constructor({ getDb, getPuuid = () => null, send, onPhase = () => {} }) {
    this.onPhase = onPhase;
    this.getDb = getDb;
    this.getPuuid = getPuuid;
    this.send = send;
    this.lcu = new LcuClient();
    this.status = { connected: false };
    this.phase = 'None';
    this.mode = null;
    this.draft = null;
    this.roster = null;
    // The roster as the client gave it, before the player's role from Draft is filled in.
    this.clientRoster = null;
    // The role the player chose in Draft: their position in modes without assigned roles.
    this.myRole = null;
    this.rosterTimer = null;
    this.mastery = {};
    this.pickable = [];
    this.runePage = null;
    this.lcu.on('status', (s) => this.onStatus(s));
    this.lcu.on('event', (e) => this.onEvent(e));
  }

  start(leagueDir) { this.lcu.start(leagueDir); }

  // false only when the mode is known and unsupported (ARAM, blind pick, custom games off the Rift…).
  get supported() { return !this.mode || this.mode.supported; }

  async onStatus(status) {
    this.status = status;
    this.send('lcu:status', status);
    if (!status.connected) { this.setDraft(null); this.setPhase('None'); return; }
    try {
      const list = await this.lcu.get('/lol-champion-mastery/v1/local-player/champion-mastery');
      this.mastery = Object.fromEntries((list || []).map((m) => [m.championId, m.championPoints]));
    } catch { this.mastery = {}; }
    try { await this.setPhase(await this.lcu.get('/lol-gameflow/v1/gameflow-phase')); } catch { /* client still loading */ }
    try { await this.refreshSession(await this.lcu.get('/lol-champ-select/v1/session')); } catch { /* not in champ select */ }
  }

  onEvent({ uri, eventType, data }) {
    if (uri === '/lol-gameflow/v1/gameflow-phase') this.setPhase(data);
    if (uri === '/lol-perks/v1/currentpage') this.setRunePage(eventType === 'Delete' ? null : data);
    if (uri === '/lol-champ-select/v1/session') {
      if (eventType === 'Delete') this.setDraft(null);
      else this.refreshSession(data);
    }
  }

  async setPhase(phase) {
    this.phase = phase;
    await this.refreshMode();
    this.send('lcu:phase', phase);
    if (phase === 'InProgress') this.loadRoster();
    else this.setRoster(null);
    this.onPhase(phase, this.mode);
  }

  async refreshMode() {
    let mode = null;
    if (this.status.connected && this.phase !== 'None') {
      try { mode = modeOf(await this.lcu.get('/lol-gameflow/v1/session')); } catch { /* no session */ }
    }
    this.mode = mode;
    this.send('lcu:mode', mode);
    if (!this.supported) this.setDraft(null);
  }

  // The teams appear in the gameflow session a moment after the game starts; retry until they do.
  async loadRoster() {
    clearTimeout(this.rosterTimer);
    const db = this.getDb();
    if (!db || !this.supported || this.phase !== 'InProgress') return;
    let roster = null;
    try {
      const session = await this.lcu.get('/lol-gameflow/v1/session');
      roster = await fetchRoster(this.lcu, session, db, this.mode ? this.mode.rankedQueue : 'RANKED_SOLO_5x5');
    } catch { /* retried below */ }
    if (this.phase !== 'InProgress') return;
    if (roster) this.setRoster(roster);
    else this.rosterTimer = setTimeout(() => this.loadRoster(), ROSTER_RETRY_MS);
  }

  setRoster(roster) {
    if (!roster) clearTimeout(this.rosterTimer);
    this.clientRoster = roster;
    this.roster = withMyPosition(roster, this.getPuuid(), this.myRole);
    this.send('lcu:roster', this.roster);
  }

  // The player chose their role in Draft; a roster without their position takes it.
  setMyRole(role) {
    this.myRole = role || null;
    if (this.clientRoster) this.setRoster(this.clientRoster);
  }

  async refreshSession(session) {
    const db = this.getDb();
    if (!db || !this.supported) return;
    const draft = normalizeSession(session, db);
    if (draft && (!this.draft || this.draft.gameId !== draft.gameId)) {
      try { this.pickable = await this.lcu.get('/lol-champ-select/v1/pickable-champion-ids'); } catch { this.pickable = []; }
      try { this.runePage = await this.lcu.get('/lol-perks/v1/currentpage'); } catch { this.runePage = null; }
    }
    if (draft) {
      draft.enemyRoles = inferRoles(db, draft.theirTeam.map((m) => ({ cellId: m.cellId, championId: m.championId, role: m.role })));
      draft.allyRoles = inferRoles(db, draft.myTeam.map((m) => ({ cellId: m.cellId, championId: m.championId || m.hoverId, role: m.role })));
    }
    if (draft) draft.myRunes = pageOf(this.runePage);
    this.setDraft(draft);
  }

  // The rune page selected in the client changed (the player picked or edited a page).
  setRunePage(page) {
    this.runePage = page;
    if (this.draft) this.setDraft({ ...this.draft, myRunes: pageOf(page) });
  }

  setDraft(draft) {
    this.draft = draft;
    this.send('lcu:draft', draft);
  }

  snapshot() {
    return { status: this.status, phase: this.phase, mode: this.mode, draft: this.draft, roster: this.roster };
  }
}

module.exports = { LcuWatcher };
