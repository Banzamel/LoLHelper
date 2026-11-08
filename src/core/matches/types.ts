// Games from the League client's match history (/lol-match-history) in a compact form.
import type { Role } from '../data/types.ts';
import type { Rank } from '../lcu/types.ts';

export interface CompactPlayer {
  pid: number;
  puuid: string | null;
  name: string;
  tag: string;
  champ: string | null;
  team: number;
  pos: Role | null;
  spells: number[];
  keystone: number | null;
  items: number[];
  k: number;
  d: number;
  a: number;
  cs: number;
  gold: number;
  dmg: number;
  taken: number;
  vision: number;
  level: number;
  multi: number;
  win: boolean;
}

export interface CompactTeam {
  id: number;
  win: boolean;
  kills: number;
  dragons: number;
  barons: number;
  heralds: number;
  towers: number;
  inhibs: number;
}

// Per-minute gold: teams [[minute, team100, team200]], players { participantId: [gold] }.
export interface GoldTimeline {
  teams: number[][];
  players: Record<number, number[]>;
}

export interface CompactGame {
  id: number;
  queueId: number;
  type: string;
  mode: string | null;
  created: number;
  duration: number;
  version: string;
  // All ten players are known (the list endpoint returns only the account's own participant).
  full: boolean;
  players: CompactPlayer[];
  teams: CompactTeam[];
  // undefined: not fetched yet; null: not available.
  gold?: GoldTimeline | null;
}

export interface PlayerProfile {
  puuid: string;
  name: string;
  tag: string;
  level: number | null;
  icon: number | null;
  ranks: { solo: Rank | null; flex: Rank | null };
  games: CompactGame[];
  historyHidden: boolean;
}
