// Converts the raw /lol-champ-select/v1/session payload into a compact draft state
// (teams, positions, bans, current action) keyed by Data Dragon champion ids.
const POSITION = { top: 'TOP', jungle: 'JUNGLE', middle: 'MIDDLE', bottom: 'BOTTOM', utility: 'SUPPORT' };

function normalizeSession(session, db) {
  if (!session || !session.myTeam) return null;
  const idOf = (key) => (key && db.byKey[key] ? db.byKey[key].id : null);
  const actions = (session.actions || []).flat();

  const member = (m, ally) => ({
    cellId: m.cellId,
    championId: idOf(m.championId),
    hoverId: ally ? idOf(m.championPickIntent) : null,
    role: POSITION[m.assignedPosition] || null,
    isMe: ally && m.cellId === session.localPlayerCellId,
    spells: ally && m.cellId === session.localPlayerCellId ? [m.spell1Id, m.spell2Id] : null,
    locked: actions.some((a) => a.actorCellId === m.cellId && a.type === 'pick' && a.completed),
  });

  const bans = actions.filter((a) => a.type === 'ban' && a.completed && a.championId).map((a) => idOf(a.championId)).filter(Boolean);
  for (const id of [...((session.bans || {}).myTeamBans || []), ...((session.bans || {}).theirTeamBans || [])]) {
    const champ = idOf(id);
    if (champ && !bans.includes(champ)) bans.push(champ);
  }
  const current = actions.find((a) => a.isInProgress && a.actorCellId === session.localPlayerCellId);

  return {
    gameId: session.gameId,
    phase: session.timer ? session.timer.phase : null,
    myTeam: session.myTeam.map((m) => member(m, true)),
    theirTeam: (session.theirTeam || []).map((m) => member(m, false)),
    bans,
    myAction: current ? { id: current.id, type: current.type } : null,
  };
}

module.exports = { normalizeSession };
