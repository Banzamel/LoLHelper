// The invented 5v5 match of the simulation: its players, builds and the story of the game —
// an even early game, a lead for the player's team mid-game, a comeback attempt by the enemies.

export const SPEED = 5;
export const START = 8 * 60;
export const END = 42 * 60;

export type BuildKind = 'mage' | 'fighter' | 'marksman' | 'support' | 'assassin';
export type GamePosition = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';

export const BUILDS: Record<BuildKind, string[]> = {
  mage: ["Luden's Echo", "Sorcerer's Shoes", "Rabadon's Deathcap", "Zhonya's Hourglass", 'Void Staff', 'Shadowflame'],
  fighter: ['Trinity Force', 'Plated Steelcaps', "Sterak's Gage", "Death's Dance", 'Black Cleaver', 'Guardian Angel'],
  marksman: ['Infinity Edge', "Berserker's Greaves", 'Kraken Slayer', "Lord Dominik's Regards", 'Bloodthirster', 'Guardian Angel'],
  support: ['Locket of the Iron Solari', 'Plated Steelcaps', "Knight's Vow", 'Redemption', "Zeke's Convergence"],
  assassin: ["Youmuu's Ghostblade", 'Ionian Boots of Lucidity', 'Edge of Night', "Serylda's Grudge", 'Bloodthirster', 'Guardian Angel'],
};

export interface DemoPlayer {
  name: string;
  champ: string;
  team: 'ORDER' | 'CHAOS';
  pos: GamePosition;
  build: BuildKind;
  // How fast items and levels come (1 = average).
  pace: number;
  keystone: number;
  rank: [string, string] | null;
}

const p = (name: string, champ: string, team: DemoPlayer['team'], pos: GamePosition, build: BuildKind, pace: number, keystone: number, rank: DemoPlayer['rank']): DemoPlayer =>
  ({ name, champ, team, pos, build, pace, keystone, rank });

export const PLAYERS: DemoPlayer[] = [
  p('You', 'Ahri', 'ORDER', 'MIDDLE', 'mage', 1.08, 8112, ['EMERALD', 'III']),
  p('IronWall', 'Garen', 'ORDER', 'TOP', 'fighter', 0.92, 8010, ['PLATINUM', 'I']),
  p('LeafBlade', 'LeeSin', 'ORDER', 'JUNGLE', 'fighter', 1.0, 8010, ['EMERALD', 'IV']),
  p('ArcLight', 'Jinx', 'ORDER', 'BOTTOM', 'marksman', 1.02, 8008, ['DIAMOND', 'IV']),
  p('Lantern', 'Thresh', 'ORDER', 'UTILITY', 'support', 0.7, 8439, ['PLATINUM', 'II']),
  p('Guillotine', 'Darius', 'CHAOS', 'TOP', 'fighter', 1.18, 8010, ['EMERALD', 'II']),
  p('Piltover', 'Vi', 'CHAOS', 'JUNGLE', 'fighter', 0.95, 8010, ['PLATINUM', 'III']),
  p('Shuriken', 'Zed', 'CHAOS', 'MIDDLE', 'assassin', 1.22, 8112, ['DIAMOND', 'II']),
  p('Headshot', 'Caitlyn', 'CHAOS', 'BOTTOM', 'marksman', 0.86, 8021, ['GOLD', 'I']),
  p('Pixie', 'Lulu', 'CHAOS', 'UTILITY', 'support', 0.62, 8214, null),
];

export const SPELLS: Record<GamePosition, [string, string]> = {
  JUNGLE: ['SummonerSmite', 'SummonerFlash'], UTILITY: ['SummonerFlash', 'SummonerExhaust'], TOP: ['SummonerFlash', 'SummonerTeleport'],
  BOTTOM: ['SummonerFlash', 'SummonerHeal'], MIDDLE: ['SummonerFlash', 'SummonerDot'],
};

// [time, killer, victim]
export const KILLS: [number, string, string][] = [
  [195, 'Shuriken', 'You'], [330, 'You', 'Shuriken'], [405, 'LeafBlade', 'Guillotine'], [520, 'Guillotine', 'IronWall'],
  [610, 'ArcLight', 'Headshot'], [700, 'Shuriken', 'ArcLight'], [770, 'You', 'Pixie'], [905, 'Piltover', 'LeafBlade'],
  [980, 'Guillotine', 'Lantern'], [1060, 'You', 'Shuriken'], [1120, 'ArcLight', 'Piltover'], [1180, 'LeafBlade', 'Headshot'],
  [1300, 'Guillotine', 'IronWall'], [1390, 'Shuriken', 'You'], [1450, 'ArcLight', 'Pixie'], [1460, 'You', 'Guillotine'],
  [1610, 'Piltover', 'ArcLight'], [1700, 'IronWall', 'Piltover'], [1820, 'Shuriken', 'Lantern'], [1840, 'LeafBlade', 'Shuriken'],
  [1990, 'Guillotine', 'You'], [2050, 'ArcLight', 'Guillotine'], [2140, 'You', 'Headshot'], [2210, 'Headshot', 'IronWall'],
  [2330, 'ArcLight', 'Shuriken'], [2400, 'LeafBlade', 'Pixie'], [2440, 'You', 'Piltover'],
];

// [time, event, killer, extra (dragon type / structure), stolen]
export const OBJECTIVES: [number, string, string, string?, boolean?][] = [
  [330, 'HordeKill', 'Piltover'], [380, 'DragonKill', 'LeafBlade', 'Fire'], [690, 'TurretKilled', 'You', 'Turret_T2_C_05_A'],
  [830, 'DragonKill', 'Piltover', 'Air'], [880, 'HeraldKill', 'LeafBlade'], [1010, 'TurretKilled', 'Guillotine', 'Turret_T1_R_03_A'],
  [1150, 'TurretKilled', 'ArcLight', 'Turret_T2_R_03_A'], [1250, 'DragonKill', 'LeafBlade', 'Hextech', true], [1520, 'BaronKill', 'LeafBlade'],
  [1600, 'TurretKilled', 'IronWall', 'Turret_T2_L_02_A'], [1750, 'DragonKill', 'Piltover', 'Hextech'], [1900, 'InhibKilled', 'ArcLight', 'Barracks_T2_C1'],
  [2100, 'DragonKill', 'LeafBlade', 'Hextech'], [2300, 'TurretKilled', 'Shuriken', 'Turret_T1_L_03_A'],
];

export const riotId = (name: string) => `${name}#DEMO`;
