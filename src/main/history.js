// Match history: every supported match the player finishes is saved (champion, role, lane
// opponent, both teams, items in purchase order, score, result) to history.json in the user
// data folder. The engine learns from it (engine/history.js).
const fs = require('fs');
const path = require('path');

const LIMIT = 500;
const REMAKE_SECONDS = 300;

class History {
  constructor(dir) {
    this.file = path.join(dir, 'history.json');
    try { this.games = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { this.games = []; }
  }

  list() { return this.games; }

  save() {
    fs.writeFileSync(this.file, JSON.stringify(this.games));
  }

  add(entry) {
    if (this.games.some((g) => g.id === entry.id)) return false;
    this.games = [entry, ...this.games].slice(0, LIMIT);
    this.save();
    return true;
  }

  remove(id) {
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
  constructor() { this.reset(); }

  reset() {
    this.match = null;
    this.prevItems = [];
  }

  // game: the normalized live snapshot (liveclient.normalize); mode: watcher mode.
  update(game, mode) {
    if (!game || !game.me) return;
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
    this.match.last = game;
    if (game.result) this.match.result = game.result;
  }

  // Builds the history entry; eog: /lol-end-of-game/v1/eog-stats-block (may be null).
  finish(db, eog, role) {
    const m = this.match;
    this.reset();
    if (!m || !m.last) return null;
    const g = m.last;
    const duration = Math.round((eog && eog.gameLength) || g.gameTime || 0);
    if (duration < REMAKE_SECONDS) return null;
    const team = eog && (eog.teams || []).find((x) => x.isPlayerTeam);
    const win = team ? !!team.isWinningTeam : (m.result ? m.result === 'Win' : null);
    if (win === null) return null;
    const keep = (id) => db.itemById[id] && ['legendary', 'boots', 'boots-upgrade'].includes(db.itemById[id].category);
    const opponent = g.enemies.find((e) => e.position && e.position === role);
    return {
      id: String((eog && eog.gameId) || m.startedAt),
      date: new Date(m.startedAt).toISOString(),
      queueId: m.queueId,
      championId: g.me.championId,
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
    };
  }
}

module.exports = { History, MatchRecorder };
