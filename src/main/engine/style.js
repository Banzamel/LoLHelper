// Player analysis from compact games (lcu/matches.js): results per game type, role and
// champion, per-minute averages, a win-rate trend, the current streak and play-style traits
// (aggressive, farmer, team player…) measured against typical Summoner's Rift values.
const RIFT = ['solo', 'flex', 'normal', 'clash', 'bots'];
const REMAKE = 300;

// The player's participant: by puuid, or the only one a list entry has.
function playerOf(game, puuid) {
  return game.players.find((p) => p.puuid && p.puuid === puuid) || (game.players.length === 1 ? game.players[0] : null);
}

function rowOf(g, p) {
  const min = g.duration / 60;
  const team = g.players.filter((x) => x.team === p.team);
  const teamKills = g.full ? team.reduce((s, x) => s + x.k, 0) : 0;
  const teamDmg = g.full ? team.reduce((s, x) => s + x.dmg, 0) : 0;
  return {
    id: g.id, type: g.type, created: g.created, duration: g.duration, champ: p.champ, pos: p.pos, win: p.win,
    k: p.k, d: p.d, a: p.a, kda: (p.k + p.a) / Math.max(1, p.d),
    csm: p.cs / min, gpm: p.gold / min, dpm: p.dmg / min, vpm: p.vision / min,
    kp: teamKills ? (p.k + p.a) / teamKills : null,
    share: teamDmg ? p.dmg / teamDmg : null,
    rift: RIFT.includes(g.type),
  };
}

const round = (x, n = 2) => (x === null || Number.isNaN(x) ? null : Math.round(x * 10 ** n) / 10 ** n);

function average(rows, key) {
  const vals = rows.map((r) => r[key]).filter((v) => typeof v === 'number');
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

function summary(rows) {
  const wins = rows.filter((r) => r.win).length;
  return {
    games: rows.length, wins, winrate: rows.length ? round(wins / rows.length, 3) : null,
    k: round(average(rows, 'k'), 1), d: round(average(rows, 'd'), 1), a: round(average(rows, 'a'), 1),
    kda: round(average(rows, 'kda')), csm: round(average(rows, 'csm'), 1), gpm: round(average(rows, 'gpm'), 0),
    dpm: round(average(rows, 'dpm'), 0), vpm: round(average(rows, 'vpm')), kp: round(average(rows, 'kp'), 3), share: round(average(rows, 'share'), 3),
  };
}

function groupBy(rows, key) {
  const groups = {};
  for (const r of rows) {
    const k = key(r);
    if (k) (groups[k] = groups[k] || []).push(r);
  }
  return Object.entries(groups).map(([k, list]) => ({ key: k, ...summary(list) })).sort((a, b) => b.games - a.games);
}

// Play-style traits from Summoner's Rift games; tone says whether it is a strength or a habit to work on.
function traits(rows) {
  const rift = rows.filter((r) => r.rift);
  if (rift.length < 5) return [];
  const out = [];
  const add = (key, tone, value) => out.push({ key, tone, value });
  const laners = rift.filter((r) => ['TOP', 'MIDDLE', 'BOTTOM'].includes(r.pos));
  const perMin = (k) => average(rift.map((r) => ({ v: r[k] / (r.duration / 60) })), 'v');
  const fights = perMin('k') + perMin('d');
  const deaths = average(rift, 'd');
  const kp = average(rift, 'kp');
  const share = average(rift, 'share');
  const vpm = average(rift, 'vpm');
  if (fights >= 0.42) add('style.aggressive', 'neutral', round(fights * 10, 1));
  else if (fights <= 0.25) add('style.passive', 'neutral', round(fights * 10, 1));
  if (deaths >= 7) add('style.manyDeaths', 'minus', round(deaths, 1));
  else if (deaths <= 4) add('style.safe', 'plus', round(deaths, 1));
  if (laners.length >= 3) {
    const csm = average(laners, 'csm');
    if (csm >= 7) add('style.farmer', 'plus', round(csm, 1));
    else if (csm < 5.5) add('style.lowFarm', 'minus', round(csm, 1));
  }
  if (kp !== null && kp >= 0.6) add('style.teamplayer', 'plus', Math.round(kp * 100));
  else if (kp !== null && kp < 0.4) add('style.lonely', 'minus', Math.round(kp * 100));
  if (share !== null && share >= 0.27) add('style.carry', 'plus', Math.round(share * 100));
  if (vpm !== null && vpm >= 1.1) add('style.vision', 'plus', round(vpm, 2));
  else if (vpm !== null && vpm < 0.5) add('style.lowVision', 'minus', round(vpm, 2));
  const champs = groupBy(rift, (r) => r.champ);
  if (rift.length >= 10 && champs[0] && champs[0].games / rift.length >= 0.4) add('style.oneTrick', 'neutral', champs[0].key);
  else if (rift.length >= 15 && champs.length / rift.length >= 0.6) add('style.widePool', 'neutral', champs.length);
  return out;
}

// games: compact games, newest first; puuid: whose games they are.
function analyzeGames(games, puuid) {
  const rows = [];
  for (const g of games || []) {
    const p = playerOf(g, puuid);
    if (p && g.duration >= REMAKE) rows.push(rowOf(g, p));
  }
  const chrono = rows.slice().sort((a, b) => a.created - b.created);
  const trend = chrono.slice(-60).map((r, i, list) => {
    const window = list.slice(Math.max(0, i - 9), i + 1);
    return { id: r.id, created: r.created, win: r.win, kda: round(r.kda), csm: round(r.csm, 1), winrate: round(window.filter((x) => x.win).length / window.length, 3) };
  });
  let streak = null;
  for (const r of rows) {
    if (!streak) streak = { win: r.win, n: 1 };
    else if (r.win === streak.win) streak.n += 1;
    else break;
  }
  return {
    ...summary(rows),
    recent: summary(rows.slice(0, 10)),
    byType: groupBy(rows, (r) => r.type),
    byRole: groupBy(rows.filter((r) => r.rift), (r) => r.pos),
    byChampion: groupBy(rows, (r) => r.champ),
    trend,
    streak,
    traits: traits(rows),
  };
}

module.exports = { analyzeGames, playerOf, RIFT };
