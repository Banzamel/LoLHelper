// Rune presets per build class, written with English rune names and resolved against the
// current Data Dragon rune trees (runePages.ts), then tuned for the matchup.
import type { Champion } from '../../data/types.ts';
import type { BuildClass, Threats } from '../types.ts';

export interface RunePreset {
  tree: string;
  keystone: string;
  rows: string[];
  sub: string;
  subRunes: string[];
  shards: number[];
}

const PRESETS: Record<BuildClass, RunePreset> = {
  marksman: { tree: 'Precision', keystone: 'Lethal Tempo', rows: ['Presence of Mind', 'Legend: Alacrity', 'Coup de Grace'], sub: 'Inspiration', subRunes: ['Magical Footwear', 'Biscuit Delivery'], shards: [5005, 5008, 5011] },
  'mage-burst': { tree: 'Domination', keystone: 'Electrocute', rows: ['Taste of Blood', 'Grisly Mementos', 'Ultimate Hunter'], sub: 'Sorcery', subRunes: ['Manaflow Band', 'Transcendence'], shards: [5008, 5008, 5011] },
  'mage-artillery': { tree: 'Sorcery', keystone: 'Arcane Comet', rows: ['Manaflow Band', 'Transcendence', 'Scorch'], sub: 'Inspiration', subRunes: ['Biscuit Delivery', 'Cosmic Insight'], shards: [5007, 5008, 5011] },
  'mage-battle': { tree: 'Precision', keystone: 'Conqueror', rows: ['Presence of Mind', 'Legend: Haste', 'Last Stand'], sub: 'Sorcery', subRunes: ['Manaflow Band', 'Transcendence'], shards: [5008, 5008, 5011] },
  'assassin-ad': { tree: 'Domination', keystone: 'Electrocute', rows: ['Sudden Impact', 'Grisly Mementos', 'Relentless Hunter'], sub: 'Precision', subRunes: ['Triumph', 'Last Stand'], shards: [5008, 5008, 5011] },
  bruiser: { tree: 'Precision', keystone: 'Conqueror', rows: ['Triumph', 'Legend: Alacrity', 'Last Stand'], sub: 'Resolve', subRunes: ['Bone Plating', 'Unflinching'], shards: [5005, 5008, 5011] },
  'ap-bruiser': { tree: 'Precision', keystone: 'Conqueror', rows: ['Triumph', 'Legend: Haste', 'Last Stand'], sub: 'Resolve', subRunes: ['Bone Plating', 'Unflinching'], shards: [5008, 5008, 5011] },
  tank: { tree: 'Resolve', keystone: 'Grasp of the Undying', rows: ['Demolish', 'Bone Plating', 'Overgrowth'], sub: 'Inspiration', subRunes: ['Magical Footwear', 'Biscuit Delivery'], shards: [5007, 5001, 5011] },
  enchanter: { tree: 'Sorcery', keystone: 'Summon Aery', rows: ['Manaflow Band', 'Transcendence', 'Scorch'], sub: 'Resolve', subRunes: ['Font of Life', 'Revitalize'], shards: [5007, 5008, 5011] },
  'support-tank': { tree: 'Resolve', keystone: 'Aftershock', rows: ['Font of Life', 'Bone Plating', 'Unflinching'], sub: 'Inspiration', subRunes: ['Biscuit Delivery', 'Cosmic Insight'], shards: [5007, 5010, 5011] },
};

// The class preset adjusted for the role only (no matchup), as a fresh copy.
export function rolePreset(cls: BuildClass, role: string | null): RunePreset {
  const preset = PRESETS[cls];
  const p = { ...preset, rows: [...preset.rows], subRunes: [...preset.subRunes], shards: [...preset.shards] };
  if (role === 'JUNGLE' && cls === 'tank') Object.assign(p, { keystone: 'Aftershock', rows: ['Font of Life', 'Bone Plating', 'Unflinching'] });
  return p;
}

// The preset tuned for the lane opponent and the enemy threats; reasons are loadout.* keys.
export function tune(cls: BuildClass, role: string | null, laner: Champion | null, t: Threats): { p: RunePreset; reasons: string[] } {
  const p = rolePreset(cls, role);
  const reasons: string[] = [];
  const melee = ['bruiser', 'ap-bruiser', 'tank', 'assassin-ad'].includes(cls);
  if (cls === 'marksman' && t.tanks >= 0.35) { p.rows[2] = 'Cut Down'; reasons.push('loadout.cutDown'); }
  if (cls === 'marksman' && laner && laner.attackType === 'MELEE' && laner.archetypes.some((a) => ['ASSASSIN', 'DIVER'].includes(a))) {
    p.keystone = 'Fleet Footwork'; reasons.push('loadout.fleet');
  }
  if (laner && laner.attackType === 'RANGED' && melee && role !== null && ['TOP', 'MIDDLE'].includes(role)) {
    if (p.sub === 'Resolve') p.subRunes[0] = 'Second Wind';
    if (p.tree === 'Resolve') p.rows[1] = 'Second Wind';
    if (p.sub === 'Resolve' || p.tree === 'Resolve') reasons.push('loadout.secondWind');
  }
  if (t.cc >= 2) { p.shards[2] = 5013; reasons.push('loadout.tenacity'); }
  return { p, reasons };
}
