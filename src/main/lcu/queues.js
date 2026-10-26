// Game modes the app supports: Summoner's Rift queues with assigned roles (draft, ranked,
// Clash, role-based quick queues). ARAM, blind pick, rotating modes and custom games are skipped.
const ROLE_QUEUES = {
  400: 'normalDraft',
  420: 'rankedSolo',
  440: 'rankedFlex',
  480: 'swiftplay',
  490: 'quickplay',
  700: 'clash',
};

// Mode from /lol-gameflow/v1/session; null while the client is not in a lobby or game.
function modeOf(session) {
  const queue = session && session.gameData && session.gameData.queue;
  if (!queue || queue.id === undefined || queue.id === -1) {
    // Custom games carry no queue; they are not supported either.
    return session && session.gameData && session.gameData.isCustomGame ? { queueId: -1, key: 'custom', supported: false } : null;
  }
  const key = ROLE_QUEUES[queue.id] || null;
  return {
    queueId: queue.id,
    key: key || (queue.gameMode || '').toLowerCase() || 'other',
    supported: !!key,
    // Ranked stats to show: flex in flex games, solo/duo everywhere else.
    rankedQueue: queue.id === 440 ? 'RANKED_FLEX_SR' : 'RANKED_SOLO_5x5',
  };
}

module.exports = { ROLE_QUEUES, modeOf };
