// Game modes the app supports: Summoner's Rift queues with assigned roles (draft, ranked,
// Clash, role-based quick queues), plus Summoner's Rift custom games and the Practice Tool
// (no assigned roles; never recorded into the history the app learns from). ARAM, blind pick,
// rotating modes and custom games on other maps are skipped.
const ROLE_QUEUES = {
  400: 'normalDraft',
  420: 'rankedSolo',
  440: 'rankedFlex',
  480: 'swiftplay',
  490: 'quickplay',
  700: 'clash',
};

const SUMMONERS_RIFT = 11;
const PRACTICE_TOOL = 'PRACTICETOOL';
const RIFT_CUSTOM_MODES = ['CLASSIC', PRACTICE_TOOL];
const NO_QUEUE = -1;

// Ranked stats to show: flex in flex games, solo/duo everywhere else.
const rankedQueueOf = (queueId) => (queueId === 440 ? 'RANKED_FLEX_SR' : 'RANKED_SOLO_5x5');

// Custom games carry no queue (id -1); the map and the game mode come from the queue or,
// when the client leaves them empty there, from the session's map.
function customModeOf(session) {
  const queue = session.gameData.queue || {};
  const map = session.map || {};
  const mapId = queue.mapId || map.id || null;
  const gameMode = queue.gameMode || map.gameMode || '';
  return {
    queueId: NO_QUEUE,
    key: gameMode === PRACTICE_TOOL ? 'practice' : 'custom',
    supported: mapId === SUMMONERS_RIFT && RIFT_CUSTOM_MODES.includes(gameMode),
    recorded: false,
    rankedQueue: rankedQueueOf(NO_QUEUE),
  };
}

const isCustom = (session) => {
  const data = session.gameData;
  const queue = data.queue;
  return !!data.isCustomGame || !!(queue && queue.gameMode === PRACTICE_TOOL) || !!(session.map && session.map.gameMode === PRACTICE_TOOL);
};

// Mode from /lol-gameflow/v1/session; null while the client is not in a lobby or game.
// supported: the app shows its views; recorded: the finished match is saved and learned from.
function modeOf(session) {
  if (!session || !session.gameData) return null;
  if (isCustom(session)) return customModeOf(session);
  const queue = session.gameData.queue;
  if (!queue || queue.id === undefined || queue.id === NO_QUEUE) return null;
  const key = ROLE_QUEUES[queue.id] || null;
  return {
    queueId: queue.id,
    key: key || (queue.gameMode || '').toLowerCase() || 'other',
    supported: !!key,
    recorded: !!key,
    rankedQueue: rankedQueueOf(queue.id),
  };
}

module.exports = { ROLE_QUEUES, modeOf };
