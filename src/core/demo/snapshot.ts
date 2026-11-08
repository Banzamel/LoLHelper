// Simulated match: Live Client Data API snapshots of an invented 5v5 game, so anyone can see
// the Match view (scoreboard, enemies, tables, charts) without playing. The snapshot depends
// only on the game time, which runs faster than real time. Nothing from it is recorded.
import type { Db } from '../data/types.ts';
import type { RawJson } from '../shared/json.ts';
import { BUILDS, KILLS, OBJECTIVES, PLAYERS, riotId, SPELLS, type DemoPlayer } from './scenario.ts';

interface DemoEvent { EventName: string; EventTime: number; KillerName?: string; VictimName?: string; [field: string]: string | number | undefined }

function events(t: number): DemoEvent[] {
  const out: DemoEvent[] = [];
  for (const [at, k, v] of KILLS) if (at <= t) out.push({ EventName: 'ChampionKill', EventTime: at, KillerName: riotId(k), VictimName: riotId(v) });
  for (const [at, name, killer, extra, stolen] of OBJECTIVES) {
    if (at > t) continue;
    const e: DemoEvent = { EventName: name, EventTime: at, KillerName: riotId(killer) };
    if (name === 'DragonKill') Object.assign(e, { DragonType: extra, Stolen: stolen ? 'True' : 'False' });
    if (name === 'TurretKilled') e.TurretKilled = extra;
    if (name === 'InhibKilled') e.InhibKilled = extra;
    out.push(e);
  }
  return out.sort((a, b) => a.EventTime - b.EventTime);
}

// Death timer like the game's, roughly: longer later in the match.
const respawnAt = (t: number) => 6 + t / 75;
const teamOf = (riot: string | undefined) => PLAYERS.find((x) => riotId(x.name) === riot)?.team;

function playerAt(db: Db, pl: DemoPlayer, t: number, kills: DemoEvent[]): RawJson {
  const itemId = (name: string) => db.items.find((i) => i.nameEn === name)?.id ?? null;
  const id = riotId(pl.name);
  const build = BUILDS[pl.build];
  const done = Math.min(build.length, Math.floor((t * pl.pace) / 330));
  const items = [...build.slice(0, done).map(itemId), done < build.length && t > 120 ? (pl.build === 'mage' ? 1052 : 1036) : null, 3340].filter(Boolean);
  const deaths = kills.filter((e) => e.VictimName === id);
  const last = deaths[deaths.length - 1];
  const dead = !!last && t - last.EventTime < respawnAt(last.EventTime);
  const cs = pl.pos === 'UTILITY' ? 1.1 : pl.pos === 'JUNGLE' ? 5.4 : 7.1;
  const spell = (key: string) => ({ rawDisplayName: `GeneratedTip_SummonerSpell_${key}_DisplayName` });
  return {
    riotId: id, riotIdGameName: pl.name, summonerName: pl.name, rawChampionName: `game_character_displayname_${pl.champ}`, championName: pl.champ,
    team: pl.team, position: pl.pos, level: Math.min(18, 1 + Math.floor((t / 100) * pl.pace)), isDead: dead,
    respawnTimer: dead ? respawnAt(last.EventTime) - (t - last.EventTime) : 0,
    items: items.map((itemID) => ({ itemID })),
    scores: {
      kills: kills.filter((e) => e.KillerName === id).length, deaths: deaths.length,
      assists: kills.filter((e) => e.KillerName !== id && (e.EventTime * 7 + pl.name.length) % 3 === 0 && teamOf(e.KillerName) === pl.team).length,
      creepScore: Math.floor((cs * pl.pace * Math.max(0, t - 90)) / 60), wardScore: (t / 60) * (pl.pos === 'UTILITY' ? 1.9 : 0.55),
    },
    summonerSpells: { summonerSpellOne: spell(SPELLS[pl.pos][0]), summonerSpellTwo: spell(SPELLS[pl.pos][1]) },
    runes: { keystone: { id: pl.keystone } },
  };
}

// The /liveclientdata/allgamedata payload at game time t (seconds).
export function snapshot(db: Db, t: number): RawJson {
  const evs = events(t);
  const kills = evs.filter((e) => e.EventName === 'ChampionKill');
  const players = PLAYERS.map((pl) => playerAt(db, pl, t, kills));
  const me = players[0];
  const lvl: number = me.level;
  const levels = { Q: Math.min(5, Math.ceil(lvl / 2)), W: Math.min(5, Math.floor(lvl / 4)), E: Math.min(5, Math.floor(lvl / 5)), R: lvl >= 16 ? 3 : lvl >= 11 ? 2 : lvl >= 6 ? 1 : 0 };
  return {
    activePlayer: {
      riotId: me.riotId, summonerName: me.summonerName, currentGold: Math.floor((t * 7.3) % 2700),
      championStats: { attackDamage: 53 + lvl * 3, abilityPower: Math.round(30 + t / 7), armor: 21 + lvl * 4.2, magicResist: 30 + lvl * 1.3, attackSpeed: 0.67 + lvl * 0.01, abilityHaste: 15 + Math.floor(t / 300) * 5, moveSpeed: 345, maxHealth: 590 + lvl * 96 },
      abilities: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, { abilityLevel: v }])),
      fullRunes: { primaryRuneTree: { id: 8100 }, secondaryRuneTree: { id: 8200 }, generalRunes: [8112, 8139, 8138, 8135, 8226, 8210].map((id) => ({ id })), statRunes: [5008, 5008, 5001].map((id) => ({ id })) },
    },
    allPlayers: players,
    events: { Events: [{ EventName: 'GameStart', EventTime: 0 }, ...evs] },
    gameData: { gameTime: t, gameMode: 'CLASSIC' },
  };
}
