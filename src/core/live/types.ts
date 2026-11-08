// A running match as read from the Live Client Data API (https://127.0.0.1:2999), normalized
// (normalize.ts) and with the timeline the tracker keeps (LiveTracker.ts).
import type { Role } from '../data/types.ts';
import type { Rank } from '../lcu/types.ts';

export type Side = 'ally' | 'enemy';

export interface Scores {
  kills?: number;
  deaths?: number;
  assists?: number;
  creepScore?: number;
  wardScore?: number;
}

export interface LivePlayer {
  championId: string | null;
  name: string;
  puuid: string | null;
  team: string;
  position: Role | null;
  rank: Rank | null;
  level: number;
  dead: boolean;
  respawn: number;
  // [D, F] as bound in the game.
  spells: (number | null)[];
  keystone: number | null;
  items: number[];
  itemGold: number;
  scores: Scores;
}

export interface LiveRunePage {
  primaryStyleId: number;
  subStyleId: number | null;
  selectedPerkIds: number[];
}

export interface Me extends LivePlayer {
  gold: number;
  runes: LiveRunePage | null;
  stats: Record<string, number>;
  abilities: Record<string, number>;
}

export interface Objectives {
  kills: number;
  dragons: string[];
  barons: number;
  heralds: number;
  grubs: number;
  atakhan: number;
  towers: number;
  inhibs: number;
}

export interface FeedEvent {
  t: number;
  type: string;
  team: Side | null;
  killer: string | null;
  victim: string | null;
  dragon: string | null;
  stolen: boolean;
}

export interface TimelinePoint {
  t: number;
  ally: number;
  enemy: number;
  allyKills: number;
  enemyKills: number;
  allyCs: number;
  enemyCs: number;
  players: Record<string, number>;
}

export interface LiveGame {
  result: string | null;
  gameTime: number;
  gameMode: string | null;
  me: Me | null;
  allies: LivePlayer[];
  enemies: LivePlayer[];
  objectives: { ally: Objectives; enemy: Objectives };
  feed: FeedEvent[];
  timeline?: TimelinePoint[];
  // A simulated match (shown only, never recorded).
  demo?: boolean;
}

// A game with the player in it: what every in-game view works with.
export type PlayingGame = LiveGame & { me: Me };
