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

// Summoner spell id from "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName" (longest
// matching spell key, so variants like SummonerSmite… still resolve), else by English name.
function spellIdOf(spell, db) {
  if (!spell) return null;
  const raw = spell.rawDisplayName || '';
  const list = db.summoners || [];
  const byKey = list.filter((s) => raw.includes(s.key)).sort((a, b) => b.key.length - a.key.length)[0];
  const found = byKey || list.find((s) => s.nameEn === spell.displayName);
  return found ? found.id : null;
}

// The local player's full rune page in the client's format (keystone first, then shards).
function runePageOf(full) {
  if (!full || !full.primaryRuneTree) return null;
  return {
    primaryStyleId: full.primaryRuneTree.id,
    subStyleId: full.secondaryRuneTree ? full.secondaryRuneTree.id : null,
    selectedPerkIds: [...(full.generalRunes || []), ...(full.statRunes || [])].map((r) => r.id),
  };
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
      // [D, F] as bound in the game.
      spells: p.summonerSpells ? [spellIdOf(p.summonerSpells.summonerSpellOne, db), spellIdOf(p.summonerSpells.summonerSpellTwo, db)] : [],
      keystone: p.runes && p.runes.keystone ? p.runes.keystone.id : null,
      items: (p.items || []).map((i) => i.itemID),
      scores: p.scores || {},
    };
  });
  const me = players.find((p) => p.name === meName) || null;
  const allies = me ? players.filter((p) => p.team === me.team) : [];
  const enemies = me ? players.filter((p) => p.team !== me.team) : players;
  const end = ((data.events && data.events.Events) || []).find((e) => e.EventName === 'GameEnd');
  return {
    result: end ? end.Result : null,
    gameTime: data.gameData ? data.gameData.gameTime : 0,
    gameMode: data.gameData ? data.gameData.gameMode : null,
    me: me && { ...me, gold: Math.floor(data.activePlayer.currentGold || 0), runes: runePageOf(data.activePlayer.fullRunes) },
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
