// In-game data from the Live Client Data API (https://127.0.0.1:2999), served by the
// game itself while a match is running. Polled every few seconds; emits a compact
// snapshot: my champion, gold, level, items and both teams with real positions. The roster
// from the LCU (roles picked in draft, ranks) fills in what the game itself does not report.
const https = require('https');
const { EventEmitter } = require('events');

const agent = new https.Agent({ rejectUnauthorized: false });
const POSITION = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' };

function fetchGame() {
  return new Promise((resolve, reject) => {
    const req = https.get({ host: '127.0.0.1', port: 2999, path: '/liveclientdata/allgamedata', agent, timeout: 2500 }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(text)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function championIdOf(player, db) {
  const raw = (player.rawChampionName || '').replace('game_character_displayname_', '');
  if (db.byId[raw]) return raw;
  const name = (player.championName || '').toLowerCase();
  const found = db.champions.find((c) => c.id.toLowerCase() === name.replace(/[^a-z]/g, ''));
  return found ? found.id : raw || null;
}

function normalize(data, db, roster = null) {
  const meName = data.activePlayer.riotId || data.activePlayer.summonerName;
  const fromRoster = (championId, team) => (roster || []).find((r) => r.championId === championId && r.team === team) || {};
  const players = (data.allPlayers || []).map((p) => {
    const championId = championIdOf(p, db);
    const extra = fromRoster(championId, p.team);
    return {
      championId,
      name: p.riotId || p.summonerName,
      team: p.team,
      position: POSITION[p.position] || extra.position || null,
      rank: extra.rank || null,
      level: p.level,
      dead: p.isDead,
      items: (p.items || []).map((i) => i.itemID),
      scores: p.scores || {},
    };
  });
  const me = players.find((p) => p.name === meName) || null;
  const allies = me ? players.filter((p) => p.team === me.team) : [];
  const enemies = me ? players.filter((p) => p.team !== me.team) : players;
  return {
    gameTime: data.gameData ? data.gameData.gameTime : 0,
    gameMode: data.gameData ? data.gameData.gameMode : null,
    me: me && { ...me, gold: Math.floor(data.activePlayer.currentGold || 0) },
    allies,
    enemies,
  };
}

class LiveClient extends EventEmitter {
  constructor(getDb, getRoster = () => null) {
    super();
    this.getDb = getDb;
    this.getRoster = getRoster;
    this.timer = null;
    this.game = null;
  }

  start() {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), 3000);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.setGame(null);
  }

  async poll() {
    const db = this.getDb();
    if (!db) return;
    try {
      const data = await fetchGame();
      if (data && data.activePlayer && data.allPlayers) this.setGame(normalize(data, db, this.getRoster()));
    } catch {
      // Game still loading or already closed.
    }
  }

  setGame(game) {
    this.game = game;
    this.emit('game', game);
  }
}

module.exports = { LiveClient, normalize };
