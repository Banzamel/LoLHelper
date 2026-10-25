// Keeps the live client state (connection, game phase, champion select, mastery) and
// pushes it to the renderer whenever the LCU reports a change.
const { LcuClient } = require('./client');
const { normalizeSession } = require('./champselect');
const { inferRoles } = require('../engine/roles');

class LcuWatcher {
  constructor({ getDb, send, onPhase = () => {} }) {
    this.onPhase = onPhase;
    this.getDb = getDb;
    this.send = send;
    this.lcu = new LcuClient();
    this.status = { connected: false };
    this.phase = 'None';
    this.draft = null;
    this.mastery = {};
    this.pickable = [];
    this.lcu.on('status', (s) => this.onStatus(s));
    this.lcu.on('event', (e) => this.onEvent(e));
  }

  start(leagueDir) { this.lcu.start(leagueDir); }

  async onStatus(status) {
    this.status = status;
    this.send('lcu:status', status);
    if (!status.connected) { this.setDraft(null); this.setPhase('None'); return; }
    try {
      const list = await this.lcu.get('/lol-champion-mastery/v1/local-player/champion-mastery');
      this.mastery = Object.fromEntries((list || []).map((m) => [m.championId, m.championPoints]));
    } catch { this.mastery = {}; }
    try { this.setPhase(await this.lcu.get('/lol-gameflow/v1/gameflow-phase')); } catch { /* client still loading */ }
    try { await this.refreshSession(await this.lcu.get('/lol-champ-select/v1/session')); } catch { /* not in champ select */ }
  }

  onEvent({ uri, eventType, data }) {
    if (uri === '/lol-gameflow/v1/gameflow-phase') this.setPhase(data);
    if (uri === '/lol-champ-select/v1/session') {
      if (eventType === 'Delete') this.setDraft(null);
      else this.refreshSession(data);
    }
  }

  setPhase(phase) {
    this.phase = phase;
    this.send('lcu:phase', phase);
    this.onPhase(phase);
  }

  async refreshSession(session) {
    const db = this.getDb();
    if (!db) return;
    const draft = normalizeSession(session, db);
    if (draft && (!this.draft || this.draft.gameId !== draft.gameId)) {
      try { this.pickable = await this.lcu.get('/lol-champ-select/v1/pickable-champion-ids'); } catch { this.pickable = []; }
    }
    if (draft) {
      draft.enemyRoles = inferRoles(db, draft.theirTeam.map((m) => ({ cellId: m.cellId, championId: m.championId, role: m.role })));
      draft.allyRoles = inferRoles(db, draft.myTeam.map((m) => ({ cellId: m.cellId, championId: m.championId || m.hoverId, role: m.role })));
    }
    this.setDraft(draft);
  }

  setDraft(draft) {
    this.draft = draft;
    this.send('lcu:draft', draft);
  }

  snapshot() {
    return { status: this.status, phase: this.phase, draft: this.draft };
  }
}

module.exports = { LcuWatcher };
