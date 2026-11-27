// What a champion's class rules get wrong, champion by champion: the keystone it really plays,
// the order it maxes its basic abilities in, and the class or item style where the class from
// its archetypes builds it wrongly (Fizz is an AP assassin, Jayce and Quinn build lethality,
// Kayle builds AP with attack speed, Zyra or Morgana support build as mages, not as tanks).
// A value can depend on the role: { ANY: …, MIDDLE: … }. Champions or roles left out fall back
// to the class rules (classOf.ts, itemStyle.ts, loadout/presets.ts, loadout/skills.ts).
import type { BuildClass, ItemStyle } from '../types.ts';

export type Keystone = 'Conqueror' | 'Lethal Tempo' | 'Fleet Footwork' | 'Press the Attack' | 'Electrocute' | 'Dark Harvest'
  | 'Hail of Blades' | 'Arcane Comet' | 'Summon Aery' | 'First Strike' | 'Grasp of the Undying' | 'Aftershock' | 'Guardian';

type ByRole<T> = T | Partial<Record<'ANY' | 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'SUPPORT', T>>;

export interface ChampKnowledge {
  // Basic abilities in the order they are maxed ("QEW").
  max?: string;
  ks?: ByRole<Keystone>;
  cls?: ByRole<BuildClass>;
  style?: ByRole<ItemStyle>;
}

const C = 'Conqueror', LT = 'Lethal Tempo', FF = 'Fleet Footwork', PTA = 'Press the Attack', E = 'Electrocute', DH = 'Dark Harvest',
  HOB = 'Hail of Blades', AC = 'Arcane Comet', AERY = 'Summon Aery', FS = 'First Strike', GRASP = 'Grasp of the Undying', GUARD = 'Guardian';

export const CHAMPIONS: Record<string, ChampKnowledge> = {
  Aatrox: { max: 'QEW', ks: C },
  Ahri: { max: 'QWE', ks: E },
  Akali: { max: 'QEW', ks: E },
  Akshan: { max: 'QEW', ks: PTA },
  Alistar: { max: 'QWE' },
  Ambessa: { max: 'QEW', ks: C },
  Amumu: { max: 'EQW' },
  Anivia: { max: 'EQW', ks: AC },
  Annie: { max: 'QWE', ks: E },
  Aphelios: { ks: C },
  Ashe: { max: 'WQE', ks: LT },
  AurelionSol: { ks: AC },
  Azir: { max: 'WQE', ks: LT },
  Bard: { max: 'QWE', ks: GUARD, cls: 'enchanter' },
  Belveth: { max: 'QEW', ks: LT },
  Blitzcrank: { max: 'QEW' },
  Brand: { max: 'WQE', ks: { ANY: AC, JUNGLE: DH }, cls: 'mage-artillery' },
  Braum: { max: 'QEW', ks: GUARD },
  Caitlyn: { max: 'QWE', ks: FF },
  Camille: { max: 'QEW', ks: C },
  Cassiopeia: { max: 'EQW', ks: C },
  Chogath: { max: 'QEW', ks: GRASP },
  Corki: { max: 'QEW', ks: PTA },
  Darius: { max: 'QEW', ks: C },
  Diana: { max: 'QWE', ks: { ANY: C, MIDDLE: E } },
  DrMundo: { max: 'QEW', ks: { ANY: GRASP, JUNGLE: C } },
  Draven: { max: 'QWE', ks: LT },
  Ekko: { max: 'QEW', ks: E },
  Elise: { max: 'QWE', ks: E },
  Evelynn: { max: 'QEW', ks: E },
  Ezreal: { max: 'QEW', ks: C },
  Fiddlesticks: { ks: DH },
  Fiora: { max: 'QEW', ks: C },
  Fizz: { ks: E, cls: 'mage-burst' },
  Galio: { max: 'QEW' },
  Gangplank: { max: 'QEW', ks: GRASP },
  Garen: { max: 'EQW', ks: C },
  Gnar: { max: 'QWE', ks: C },
  Gragas: { max: 'QEW', ks: { MIDDLE: AC }, cls: { MIDDLE: 'mage-burst' } },
  Graves: { max: 'QEW', ks: FF },
  Gwen: { max: 'QEW', ks: C },
  Hecarim: { max: 'QWE', ks: C },
  Heimerdinger: { ks: AC },
  Hwei: { ks: AC },
  Illaoi: { max: 'QEW', ks: C },
  Irelia: { max: 'QEW', ks: C },
  Ivern: { ks: AERY, cls: 'enchanter' },
  Janna: { max: 'EWQ', ks: AERY },
  JarvanIV: { max: 'QEW', ks: C },
  Jayce: { ks: { ANY: FS, TOP: C }, cls: 'assassin-ad', style: 'assassin-ad' },
  Jhin: { max: 'QWE', ks: FF },
  Jinx: { max: 'QWE', ks: LT },
  Kaisa: { max: 'QEW', ks: LT, cls: 'marksman', style: 'ap-attacker' },
  Kalista: { max: 'EQW', ks: LT },
  Karma: { ks: { ANY: AERY, MIDDLE: AC, TOP: AC } },
  Karthus: { max: 'QEW', ks: DH },
  Katarina: { max: 'QEW', ks: E },
  Kayle: { max: 'EQW', ks: LT, style: 'ap-attacker' },
  Kayn: { max: 'QWE' },
  Kennen: { max: 'QWE' },
  Khazix: { max: 'QWE' },
  Kled: { ks: C },
  KogMaw: { max: 'WQE', ks: LT },
  Lissandra: { max: 'QWE', ks: E },
  Lucian: { max: 'QEW', ks: PTA },
  Lulu: { max: 'EQW', ks: AERY },
  Lux: { max: 'EQW', ks: AC },
  Malzahar: { max: 'EQW', ks: AC },
  MasterYi: { max: 'QEW', ks: LT },
  MissFortune: { max: 'QEW', ks: PTA },
  MonkeyKing: { max: 'QEW', ks: C },
  Mordekaiser: { max: 'QEW', ks: C },
  Morgana: { ks: { ANY: AERY, MIDDLE: DH, JUNGLE: DH }, cls: 'mage-burst' },
  Naafiri: { max: 'QEW', ks: E },
  Nami: { max: 'WEQ', ks: AERY },
  Neeko: { max: 'QEW', ks: E, cls: 'mage-burst' },
  Nilah: { max: 'QEW', ks: C },
  Nocturne: { max: 'QEW', ks: C },
  Olaf: { max: 'QEW', ks: C },
  Orianna: { max: 'QWE', ks: AC },
  Pantheon: { max: 'QEW' },
  Pyke: { max: 'QEW', ks: HOB },
  Qiyana: { max: 'QEW', ks: E },
  Quinn: { max: 'QEW', ks: PTA, cls: 'assassin-ad', style: 'assassin-ad' },
  Rakan: { ks: GUARD },
  Renata: { ks: GUARD },
  Rengar: { max: 'QWE' },
  Riven: { max: 'QEW', ks: C },
  Rumble: { max: 'QEW' },
  Ryze: { max: 'QEW', ks: C },
  Samira: { max: 'QEW', ks: C },
  Senna: { ks: FF },
  Seraphine: { max: 'QEW', ks: { ANY: AC, SUPPORT: AERY } },
  Shen: { max: 'QEW', ks: GRASP },
  Sivir: { max: 'QWE', ks: LT },
  Smolder: { max: 'QWE', ks: FF },
  Sona: { max: 'QWE', ks: AERY },
  Soraka: { max: 'WQE', ks: AERY },
  Swain: { ks: C },
  Sylas: { max: 'QWE', ks: C },
  Syndra: { max: 'QWE', ks: E },
  Taliyah: { ks: { ANY: AC, JUNGLE: C } },
  Talon: { max: 'WQE', ks: E },
  Taric: { ks: GUARD },
  Teemo: { max: 'EQW', ks: PTA },
  Tristana: { max: 'EQW', ks: LT },
  Tryndamere: { max: 'EQW', ks: LT },
  TwistedFate: { ks: FS },
  Twitch: { ks: LT },
  Vayne: { max: 'QWE', ks: LT },
  Veigar: { max: 'QWE', ks: AC },
  Velkoz: { ks: AC },
  Vex: { max: 'QEW', ks: E },
  Vi: { max: 'QEW', ks: C },
  Viego: { max: 'QEW', ks: C },
  Viktor: { max: 'QEW', ks: FS },
  Vladimir: { max: 'QEW', ks: C },
  Xayah: { ks: LT },
  Xerath: { max: 'QWE', ks: AC },
  Yasuo: { max: 'QEW', ks: LT },
  Yone: { max: 'QWE', ks: LT },
  Yuumi: { max: 'EQW', ks: AERY },
  Zed: { max: 'QEW', ks: E },
  Ziggs: { max: 'QEW', ks: AC },
  Zilean: { ks: { ANY: AERY, MIDDLE: AC }, cls: { ANY: 'enchanter', MIDDLE: 'mage-artillery' } },
  Zyra: { ks: AC, cls: 'mage-artillery' },
};

function forRole<T>(value: ByRole<T> | undefined, role: string | null): T | null {
  if (value === undefined) return null;
  if (typeof value !== 'object' || value === null) return value as T;
  const map = value as Partial<Record<string, T>>;
  return (role && map[role]) || map.ANY || null;
}

export const knownClass = (id: string, role: string | null) => forRole(CHAMPIONS[id]?.cls, role);
export const knownStyle = (id: string, role: string | null) => forRole(CHAMPIONS[id]?.style, role);
export const knownKeystone = (id: string, role: string | null) => forRole(CHAMPIONS[id]?.ks, role);
export const knownMaxOrder = (id: string) => CHAMPIONS[id]?.max || null;
