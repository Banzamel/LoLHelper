// Results of the recommendation engine. Every text is a translation key (shared/json TextKey).
import type { Role } from '../data/types.ts';
import type { TextKey } from '../shared/json.ts';

export type BuildClass = 'marksman' | 'mage-burst' | 'mage-battle' | 'mage-artillery' | 'assassin-ad' | 'bruiser'
  | 'ap-bruiser' | 'tank' | 'enchanter' | 'support-tank';

// What a champion buys: its class, or a narrower style read from its kit (builds/itemStyle.ts):
// attack speed and on-hit, crit on a melee fighter, an attacking mage, an AD caster.
export type ItemStyle = BuildClass | 'onhit' | 'crit-fighter' | 'ap-attacker' | 'caster-ad';

// Share (0–1) of the enemy team with each kind of threat, weighted by how fed each enemy is.
export interface Threats {
  ad: number;
  ap: number;
  healing: number;
  tanks: number;
  burstAD: number;
  burstAP: number;
  cc: number;
  autoAttack: number;
  shields: number;
  empty: boolean;
  // Adjusted by what the enemies actually bought in a running match.
  live?: boolean;
  // In a match (live/enemyProfile.ts): the average enemy's stats from champion, level and items.
  defence?: { armor: number; mr: number; hp: number };
  // Share of the enemies who bought armour / magic penetration, weighted by how fed they are.
  pen?: { armor: number; magic: number };
  // Share of the enemies with Grievous Wounds on an item.
  antiHeal?: number;
  // An ally already applies Grievous Wounds.
  allyGrievous?: boolean;
}

// A counter-pick or build reason; delta is the score change it brought.
export interface Reason extends TextKey {
  delta?: number;
}

export interface CounterPick {
  id: string;
  score: number;
  reasons: Reason[];
}

export interface RunePage {
  primaryStyleId: number;
  subStyleId: number;
  selectedPerkIds: number[];
}

export interface RecommendedRunes extends RunePage {
  reasons: string[];
}

export interface SkillOrder {
  max: string[];
  // The ability to level at each level 1–18, null for kits without the usual ranks.
  levels: string[] | null;
  known: boolean;
}

export interface Loadout {
  runes: RecommendedRunes | null;
  spells: { ids: number[]; reason: string };
  skills: SkillOrder;
}

export interface BuildItem {
  id: number;
  stats?: string[];
  owned?: boolean;
  reasons: TextKey[];
}

export interface NextPurchase {
  id: number;
  cost: number;
  buy: { id: number; cost: number } | null;
  parts: { id: number; owned: boolean; cost: number }[];
  // Why this item, the strongest reason first.
  reasons?: TextKey[];
}

export interface Build extends Loadout {
  championId: string;
  enemyId: string | null;
  role: Role;
  cls: BuildClass;
  // The style the items were picked for (the class unless the kit says otherwise).
  style: ItemStyle;
  threats: TextKey[];
  starters: { id: number; count: number }[];
  boots: { id: number; upgrade: number | null; reason: string } | null;
  core: BuildItem[];
  situational: BuildItem[];
  full: number[];
  order: number[];
  next?: NextPurchase | null;
}

// What the engine learns from: a match the app recorded or a game from the client's history.
export interface LearningEntry {
  id: string;
  championId: string;
  role?: string | null;
  opponentId: string | null;
  enemies: { championId: string | null; position?: string | null; items?: number[] }[];
  items: number[];
  win: boolean | null;
}

export interface BuildRequest {
  championId: string;
  enemyId?: string | null;
  enemyIds?: (string | null)[];
  role?: Role | null;
  // In a match: what each enemy bought and their score, by champion id.
  enemyItems?: Record<string, number[]> | null;
  enemyStats?: Record<string, { kills?: number; deaths?: number; assists?: number }> | null;
  enemyLevels?: Record<string, number> | null;
  // What each ally (the player excluded) bought, by champion id.
  allyItems?: Record<string, number[]> | null;
  ownedItems?: number[] | null;
  gold?: number | null;
  history?: LearningEntry[] | null;
}
