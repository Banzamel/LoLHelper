// The League client (LCU) as the app sees it: connection, game mode, champion select and the
// players of the running match.
import type { Role } from '../data/types.ts';
import type { RawJson } from '../shared/json.ts';

// REST over the client's local HTTPS port; responses are raw client JSON.
export interface Lcu {
  get(endpoint: string): Promise<RawJson>;
  request(method: string, endpoint: string, body?: unknown): Promise<RawJson>;
}

export interface LcuStatus { connected: boolean; port?: number; source?: string }
export interface LcuEvent { uri: string; eventType: string; data: RawJson }

// The connection with status and WAMP event callbacks (Rust side: lockfile, HTTPS, WebSocket).
export interface LcuConnection extends Lcu {
  start(leagueDir: string): void;
  onStatus(fn: (status: LcuStatus) => void): void;
  onEvent(fn: (event: LcuEvent) => void): void;
}

export interface GameMode {
  queueId: number;
  key: string;
  // The app shows its views (role-based Rift queues, Rift custom games, Practice Tool).
  supported: boolean;
  // Finished matches are saved and learned from.
  recorded: boolean;
  rankedQueue: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR';
}

export interface Rank {
  tier: string | null;
  division?: string | null;
  lp?: number;
  wins: number;
  losses: number;
  // Where an unplaced player ended last season.
  previous?: { tier: string; division: string | null } | null;
}

export interface RosterEntry {
  championId: string | null;
  team: 'ORDER' | 'CHAOS';
  position: Role | null;
  puuid: string | null;
  rank: Rank | null;
}

export interface DraftMember {
  cellId: number;
  championId: string | null;
  hoverId: string | null;
  role: Role | null;
  isMe: boolean;
  spells: [number, number] | null;
  locked: boolean;
}

export interface ClientRunePage {
  name?: string;
  primaryStyleId: number;
  subStyleId: number;
  selectedPerkIds: number[];
}

export interface Draft {
  gameId: number;
  phase: string | null;
  myTeam: DraftMember[];
  theirTeam: DraftMember[];
  bans: string[];
  myAction: { id: number; type: string } | null;
  enemyRoles: Record<number, Role>;
  allyRoles: Record<number, Role>;
  myRunes: ClientRunePage | null;
}
