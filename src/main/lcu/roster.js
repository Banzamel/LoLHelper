// Players of the running match from /lol-gameflow/v1/session (both teams with the roles
// picked in draft) plus each player's ranked stats from /lol-ranked/v1/ranked-stats/{puuid}.
const POSITION = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' };
const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

function rankFrom(stats, queueType) {
  if (!stats) return null;
  const entry = (stats.queueMap && stats.queueMap[queueType]) || (stats.queues || []).find((q) => q.queueType === queueType);
  if (!entry || !entry.tier || entry.tier === 'NONE') return { tier: null, wins: 0, losses: 0 };
  return {
    tier: entry.tier,
    division: APEX.includes(entry.tier) || entry.division === 'NA' ? null : entry.division,
    lp: entry.leaguePoints || 0,
    wins: entry.wins || 0,
    losses: entry.losses || 0,
  };
}

// Returns [{championId, team, position, puuid, rank}] or null when the teams are not known yet.
async function fetchRoster(lcu, session, db, queueType) {
  const data = session && session.gameData;
  if (!data || !(data.teamOne || []).length) return null;
  const idOf = (key) => (db.byKey[key] ? db.byKey[key].id : null);
  const players = [
    ...(data.teamOne || []).map((p) => ({ p, team: 'ORDER' })),
    ...(data.teamTwo || []).map((p) => ({ p, team: 'CHAOS' })),
  ];
  return Promise.all(players.map(async ({ p, team }) => {
    let rank = null;
    if (p.puuid) {
      try { rank = rankFrom(await lcu.get(`/lol-ranked/v1/ranked-stats/${p.puuid}`), queueType); } catch { /* bot or hidden */ }
    }
    return { championId: idOf(p.championId), team, position: POSITION[p.selectedPosition] || null, puuid: p.puuid || null, rank };
  }));
}

module.exports = { fetchRoster, rankFrom };
