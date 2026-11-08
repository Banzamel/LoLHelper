// Shapes shared by the engine, the backend and the UI. The database comes from Data Dragon
// (data/builder.ts); the fields used across modules are typed, the rest stays open.

export type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'SUPPORT';
export type Team = 'ORDER' | 'CHAOS';

export interface DbMeta {
  schema?: number;
  version: string;
  languages?: string[];
  builtAt: string;
  champions: number;
  items: number;
  failures?: number;
}

export interface ChampionSpell {
  key: string;
  cooldown: string;
  cost: string;
  range: string;
  maxrank: number;
  icon: string;
  labels: string[];
  [extra: string]: any;
}

export interface Champion {
  id: string;
  key: number;
  tags: string[];
  resource: string;
  info: Record<string, number>;
  stats: Record<string, number>;
  positions: Role[];
  positionRates: Record<string, number> | null;
  archetypes: string[];
  attackType: 'MELEE' | 'RANGED' | string;
  damageType: 'AD' | 'AP';
  ratings: Record<string, number>;
  passiveIcon: string;
  spells: ChampionSpell[];
  traits: Record<string, number>;
  icon: string;
  [extra: string]: any;
}

export interface Item {
  id: number;
  nameEn: string;
  gold: { base: number; total: number; sell: number; purchasable?: boolean };
  tags: string[];
  from: number[];
  into: number[];
  category: string;
  features: { stats: Record<string, number>; flags: Record<string, boolean>; passives: string[] };
  icon: string;
  [extra: string]: any;
}

export interface Rune {
  id: number;
  key: string;
  nameEn: string;
  icon: string;
  [extra: string]: any;
}

export interface RuneTree extends Rune {
  slots: Rune[][];
}

export interface RuneData {
  trees: RuneTree[];
  shards: { id: number; icon: string }[];
}

export interface SummonerSpell {
  id: number;
  key: string;
  nameEn: string;
  cooldown: string;
  icon: string;
  [extra: string]: any;
}

// The language-independent database files as stored on disk.
export interface RawDatabase {
  meta: DbMeta | null;
  champions: Champion[];
  items: Item[];
  runes: RuneData;
  summoners: SummonerSpell[];
}

// The loaded database with lookup tables (data/store.ts).
export interface Db extends RawDatabase {
  byId: Record<string, Champion>;
  byKey: Record<string, Champion>;
  itemById: Record<number, Item>;
}

// The League Client API as the engine uses it (REST over the client's local HTTPS port).
export interface Lcu {
  get<T = any>(endpoint: string): Promise<T>;
  request<T = any>(method: string, endpoint: string, body?: unknown): Promise<T>;
}
