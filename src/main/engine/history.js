// Learning from the player's own match history. Matches with the same champion count, the
// more similar the more they count (same lane opponent, shared enemies). Small samples are
// pulled towards zero, so one game never decides a build.

function similarity(g, { enemyId, enemyIds = [] }) {
  const shared = g.enemies.filter((e) => enemyIds.includes(e.championId)).length;
  return 1 + (enemyId && g.opponentId === enemyId ? 1.5 : 0) + 0.25 * shared;
}

// { itemId: { bonus, wins, games } } for the champion's finished items.
function itemLessons(history, { championId, enemyId, enemyIds }) {
  const acc = {};
  for (const g of history || []) {
    if (g.championId !== championId || g.win === null || g.win === undefined) continue;
    const s = similarity(g, { enemyId, enemyIds });
    for (const id of new Set(g.items)) {
      const a = acc[id] || (acc[id] = { w: 0, l: 0, wins: 0, games: 0 });
      if (g.win) { a.w += s; a.wins += 1; } else a.l += s;
      a.games += 1;
    }
  }
  const out = {};
  for (const [id, a] of Object.entries(acc)) {
    out[id] = { bonus: Math.round((1.2 * (a.w - a.l)) / (a.w + a.l + 2) * 100) / 100, wins: a.wins, games: a.games };
  }
  return out;
}

// The player's record with a champion: overall and against one enemy.
function championRecord(history, championId, enemyId = null) {
  const games = (history || []).filter((g) => g.championId === championId && typeof g.win === 'boolean');
  const vs = enemyId ? games.filter((g) => g.opponentId === enemyId) : [];
  const count = (list) => ({ wins: list.filter((g) => g.win).length, games: list.length });
  return { ...count(games), vs: count(vs) };
}

// Counter-pick nudge from the player's results: winrate with the champion (and against this
// lane opponent), shrunk towards 50% for small samples. Returns a score delta.
function counterNudge(history, championId, enemyId) {
  const r = championRecord(history, championId, enemyId);
  if (!r.games) return null;
  const all = (r.wins - (r.games - r.wins)) / (r.games + 3);
  const vs = r.vs.games ? (r.vs.wins - (r.vs.games - r.vs.wins)) / (r.vs.games + 2) : 0;
  return { delta: Math.round(8 * all + 10 * vs), record: r };
}

// A full game from the client's match history (lcu/matches.js) as a learning entry, or null
// when it does not teach anything (not a role-based Summoner's Rift game, remake, unknown lane).
const LEARN_QUEUES = [400, 420, 440, 480, 490, 700];

function fromMatch(db, game, puuid) {
  if (!game.full || !LEARN_QUEUES.includes(game.queueId) || game.duration < 300) return null;
  const me = game.players.find((p) => p.puuid === puuid);
  if (!me || !me.champ) return null;
  const keep = (id) => db.itemById[id] && ['legendary', 'boots', 'boots-upgrade'].includes(db.itemById[id].category);
  const enemies = game.players.filter((p) => p.team !== me.team);
  const opponent = me.pos ? enemies.find((p) => p.pos === me.pos) : null;
  return {
    id: String(game.id),
    championId: me.champ,
    role: me.pos,
    opponentId: opponent ? opponent.champ : null,
    enemies: enemies.map((e) => ({ championId: e.champ, position: e.pos, items: e.items.filter(keep) })),
    items: me.items.filter(keep),
    win: me.win,
  };
}

// The app's own records plus the client's games it has not recorded (same game id).
function learningHistory(db, local, games, puuid) {
  const known = new Set((local || []).map((g) => String(g.id)));
  const extra = (games || []).filter((g) => !known.has(String(g.id))).map((g) => fromMatch(db, g, puuid)).filter(Boolean);
  return [...(local || []), ...extra];
}

module.exports = { itemLessons, championRecord, counterNudge, fromMatch, learningHistory };
