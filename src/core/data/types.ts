// The champion and item database built from Data Dragon (data/builder). Language-independent
// files; the translated texts live in texts/<lang>.json and are merged in by the UI.

export type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'SUPPORT';
export const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'SUPPORT'];

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
}

export interface Champion {
  id: string;
  key: number;
  tags: string[];
  resource: string;
  info: Record<string, number>;
  stats: Record<string, number>;
  positions: Role[];
  positionRates: Partial<Record<Role, number>> | null;
  archetypes: string[];
  attackType: string;
  damageType: 'AD' | 'AP';
  ratings: Record<string, number>;
  passiveIcon: string;
  spells: ChampionSpell[];
  // Ability trait counts (data/parse: hardCC, dash, heal…) plus range figures.
  traits: Record<string, number>;
  icon: string;
}

export interface ItemFeatures {
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  passives: string[];
  // Numbers of the effects, read from their full texts (data/effectValues.ts): onHit (damage
  // per attack), spellblade (% base AD), targetHp (% of the target's health), amp (% increased
  // damage), armorShred / mrShred / penPct (%), apMult (%).
  values?: Record<string, number>;
}

// One passive or active of an item in full, with its numbers (English, from Meraki Analytics).
export interface ItemEffectText {
  name: string;
  text: string;
  active?: boolean;
}

export interface Item {
  id: number;
  nameEn: string;
  gold: { base: number; total: number; sell: number; purchasable?: boolean };
  tags: string[];
  from: number[];
  into: number[];
  category: string;
  features: ItemFeatures;
  // Missing for items Meraki does not list.
  effects?: ItemEffectText[];
  icon: string;
}

export interface Rune {
  id: number;
  key: string;
  nameEn: string;
  icon: string;
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
}

// The language-independent database files as stored on disk.
export interface RawDatabase {
  meta: DbMeta | null;
  champions: Champion[];
  items: Item[];
  runes: RuneData;
  summoners: SummonerSpell[];
}

// The loaded database with lookup tables (data/store).
export interface Db extends RawDatabase {
  byId: Record<string, Champion>;
  byKey: Record<number, Champion>;
  itemById: Record<number, Item>;
}

// Translated texts of one language (texts/<lang>.json).
export interface DbTexts {
  champions: Record<string, ChampionTexts>;
  items: Record<number, { name: string; plaintext: string; description: string }>;
  runes: Record<number, { name: string; description?: string }>;
  summoners: Record<string, { name: string; description: string }>;
}

export interface ChampionTexts {
  name: string;
  title: string;
  blurb: string;
  allytips: string[];
  enemytips: string[];
  passive: { name: string; description: string };
  spells: { name: string; description: string; costType: string }[];
}
