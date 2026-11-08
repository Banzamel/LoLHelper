// In-game data from the Live Client Data API, served by the game itself while a match runs,
// as a compact snapshot: my champion, gold, level, stats, items, both teams with real
// positions, the objectives each team took and a kill feed. The roster from the LCU (roles
// picked in draft, ranks, puuids) fills in what the game does not report.
import type { Db, Role } from '../data/types.ts';
import type { RosterEntry } from '../lcu/types.ts';
import type { RawJson } from '../shared/json.ts';
import { readEvents } from './events.ts';
import type { LiveGame, LivePlayer, LiveRunePage, Side } from './types.ts';

const POSITION: Record<string, Role> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'SUPPORT' };
const STAT_KEYS = ['attackDamage', 'abilityPower', 'armor', 'magicResist', 'attackSpeed', 'abilityHaste', 'critChance', 'moveSpeed',
  'maxHealth', 'lifeSteal', 'omnivamp', 'physicalLethality', 'armorPenetrationPercent', 'magicPenetrationFlat', 'magicPenetrationPercent', 'attackRange', 'tenacity'];

function championIdOf(player: RawJson, db: Db): string | null {
  const raw: string = (player.rawChampionName || '').replace('game_character_displayname_', '');
  if (db.byId[raw]) return raw;
  const name: string = (player.championName || '').toLowerCase();
  const found = db.champions.find((c) => c.id.toLowerCase() === name.replace(/[^a-z]/g, ''));
  return found ? found.id : raw || null;
}

// Summoner spell id from "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName" (longest
// matching spell key, so variants like SummonerSmite… still resolve), else by English name.
function spellIdOf(spell: RawJson, db: Db): number | null {
  if (!spell) return null;
  const raw: string = spell.rawDisplayName || '';
  const list = db.summoners || [];
  const byKey = list.filter((s) => raw.includes(s.key)).sort((a, b) => b.key.length - a.key.length)[0];
  const found = byKey || list.find((s) => s.nameEn === spell.displayName);
  return found ? found.id : null;
}

// The local player's full rune page in the client's format (keystone first, then shards).
function runePageOf(full: RawJson): LiveRunePage | null {
  if (!full || !full.primaryRuneTree) return null;
  return {
    primaryStyleId: full.primaryRuneTree.id,
    subStyleId: full.secondaryRuneTree ? full.secondaryRuneTree.id : null,
    selectedPerkIds: [...(full.generalRunes || []), ...(full.statRunes || [])].map((r: RawJson) => r.id),
  };
}

const itemGold = (db: Db, items: number[]) => items.reduce((s, id) => s + (db.itemById[id] ? db.itemById[id].gold.total : 0), 0);

function playerOf(p: RawJson, db: Db, roster: RosterEntry[] | null): LivePlayer {
  const championId = championIdOf(p, db);
  const extra = (roster || []).find((r) => r.championId === championId && r.team === p.team);
  const items: number[] = (p.items || []).map((i: RawJson) => i.itemID);
  return {
    championId,
    name: p.riotId || p.summonerName,
    puuid: extra ? extra.puuid : null,
    team: p.team,
    position: POSITION[p.position] || (extra ? extra.position : null) || null,
    rank: extra ? extra.rank : null,
    level: p.level,
    dead: !!p.isDead,
    respawn: p.isDead ? Math.ceil(p.respawnTimer || 0) : 0,
    spells: p.summonerSpells ? [spellIdOf(p.summonerSpells.summonerSpellOne, db), spellIdOf(p.summonerSpells.summonerSpellTwo, db)] : [],
    keystone: p.runes && p.runes.keystone ? p.runes.keystone.id : null,
    items,
    itemGold: itemGold(db, items),
    scores: p.scores || {},
  };
}

// data: /liveclientdata/allgamedata.
export function normalize(data: RawJson, db: Db, roster: RosterEntry[] | null = null): LiveGame {
  const meName = data.activePlayer.riotId || data.activePlayer.summonerName;
  const players = (data.allPlayers || []).map((p: RawJson) => playerOf(p, db, roster)) as LivePlayer[];
  const me = players.find((p) => p.name === meName) || null;
  const allies = me ? players.filter((p) => p.team === me.team) : [];
  const enemies = me ? players.filter((p) => p.team !== me.team) : players;
  const end = ((data.events && data.events.Events) || []).find((e: RawJson) => e.EventName === 'GameEnd');
  const events = readEvents(data, players);
  const myTeam = me ? me.team : 'ORDER';
  const enemyTeam = myTeam === 'ORDER' ? 'CHAOS' : 'ORDER';
  const side = (team: string | null): Side | null => (team === myTeam ? 'ally' : team === enemyTeam ? 'enemy' : null);
  const cs = data.activePlayer.championStats || {};
  const abilities = data.activePlayer.abilities || {};
  return {
    result: end ? end.Result : null,
    gameTime: data.gameData ? data.gameData.gameTime : 0,
    gameMode: data.gameData ? data.gameData.gameMode : null,
    me: me && {
      ...me,
      gold: Math.floor(data.activePlayer.currentGold || 0),
      runes: runePageOf(data.activePlayer.fullRunes),
      stats: Object.fromEntries(STAT_KEYS.filter((k) => typeof cs[k] === 'number').map((k) => [k, Math.round(cs[k] * 100) / 100])),
      abilities: Object.fromEntries(['Q', 'W', 'E', 'R'].map((k) => [k, abilities[k] ? abilities[k].abilityLevel || 0 : 0])),
    },
    allies,
    enemies,
    objectives: { ally: events[myTeam === 'ORDER' ? 'ORDER' : 'CHAOS'], enemy: events[enemyTeam] },
    feed: events.feed.map((e) => ({ ...e, team: side(e.team) })),
  };
}
