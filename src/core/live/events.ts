// Objectives per team and the kill/objective feed from the game's event list.
import type { RawJson } from '../shared/json.ts';
import type { FeedEvent, Objectives } from './types.ts';

type Team = 'ORDER' | 'CHAOS';
type TeamOf = (name: string | undefined) => string | null;

const OBJECTIVES: Record<string, keyof Objectives> = {
  DragonKill: 'dragons', BaronKill: 'barons', HeraldKill: 'heralds', HordeKill: 'grubs', AtakhanKill: 'atakhan', TurretKilled: 'towers', InhibKilled: 'inhibs',
};
const emptyObjectives = (): Objectives => ({ kills: 0, dragons: [], barons: 0, heralds: 0, grubs: 0, atakhan: 0, towers: 0, inhibs: 0 });
export const baseName = (name: string | undefined) => (name || '').split('#')[0];

const other = (team: string | null): Team | null => (team === 'ORDER' ? 'CHAOS' : team === 'CHAOS' ? 'ORDER' : null);

// The team credited with an event, or null when it cannot be told. Kills go to the victim's
// opponents, structures to the owner's opponents (Turret_T1_… is ORDER's).
function eventTeam(e: RawJson, teamOf: TeamOf): Team | null {
  if (e.EventName === 'ChampionKill') return other(teamOf(e.VictimName)) || (teamOf(e.KillerName) as Team | null);
  const structure = /_T([12])_/.exec(e.TurretKilled || e.InhibKilled || '');
  if (structure) return structure[1] === '1' ? 'CHAOS' : 'ORDER';
  return teamOf(e.KillerName) as Team | null;
}

const lookup = (map: Map<string, string | null>, name: string | undefined) => (name ? map.get(name) || map.get(baseName(name)) || null : null);

export interface TeamEvents {
  ORDER: Objectives;
  CHAOS: Objectives;
  // Latest first, with the team as ORDER / CHAOS (normalize turns it into ally / enemy).
  feed: (Omit<FeedEvent, 'team'> & { team: Team | null })[];
}

// players: name -> champion id of everyone in the match.
export function readEvents(data: RawJson, players: { name: string; championId: string | null }[]): TeamEvents {
  const teams = new Map<string, string | null>();
  for (const p of data.allPlayers || []) {
    for (const n of [p.riotId, p.riotIdGameName, p.summonerName, baseName(p.riotId)]) if (n) teams.set(n, p.team);
  }
  const champs = new Map<string, string | null>();
  for (const p of players) for (const n of [p.name, baseName(p.name)]) if (n) champs.set(n, p.championId);
  const out: TeamEvents = { ORDER: emptyObjectives(), CHAOS: emptyObjectives(), feed: [] };
  for (const e of (data.events && data.events.Events) || []) {
    const key = e.EventName === 'ChampionKill' ? 'kills' : OBJECTIVES[e.EventName];
    if (!key) continue;
    const team = eventTeam(e, (name) => lookup(teams, name));
    if (team) {
      if (key === 'dragons') out[team].dragons.push(e.DragonType || 'Fire');
      else (out[team][key] as number) += 1;
    }
    out.feed.push({
      t: Math.round(e.EventTime || 0), type: key, team,
      killer: lookup(champs, e.KillerName), victim: lookup(champs, e.VictimName),
      dragon: e.DragonType || null, stolen: e.Stolen === 'True' || e.Stolen === true,
    });
  }
  out.feed = out.feed.slice(-40).reverse();
  return out;
}
