// Champion briefs: in 1–2 lines what a champion does in a fight (its class plus a few
// standout traits), built from the database so it works for every champion — new ones
// included; curated briefs (knowledge/tips) win where the rules fall short.
import type { Champion } from '../../data/types.ts';
import { BRIEFS } from '../knowledge/tips.ts';
import { classOfChampion, hasCC, MELEE_CLASSES, RANGED_CLASSES } from './predicates.ts';

const MAX_TRAITS = 3;

export interface Brief { key: string; traits: string[] }

// Standout traits, most telling first; only the first MAX_TRAITS that apply are shown.
export const TRAITS: [string, (c: Champion, cls: string) => boolean][] = [
  ['brief.trait.cc', (c) => hasCC(c)],
  ['brief.trait.mobile', (c) => c.ratings.mobility >= 3],
  ['brief.trait.tanky', (c) => c.ratings.toughness >= 3],
  ['brief.trait.glassCannon', (c) => c.ratings.damage >= 3 && c.ratings.toughness <= 1],
  // An unusual attack range for the class is worth saying (ranged top laner, melee mage).
  ['brief.trait.ranged', (c, cls) => c.attackType === 'RANGED' && MELEE_CLASSES.includes(cls)],
  ['brief.trait.melee', (c, cls) => c.attackType === 'MELEE' && RANGED_CLASSES.includes(cls)],
  ['brief.trait.longRange', (c) => c.traits.longRange >= 2],
  ['brief.trait.sustain', (c) => c.traits.heal >= 2],
  ['brief.trait.tankShred', (c) => c.traits.percentHp >= 1 || c.traits.trueDamage >= 2],
  ['brief.trait.untargetable', (c) => c.traits.untargetable >= 1],
  ['brief.trait.stealth', (c) => c.traits.stealth >= 1],
  ['brief.trait.execute', (c) => c.traits.execute >= 1],
  ['brief.trait.energy', (c) => c.resource === 'ENERGY'],
  ['brief.trait.manaless', (c) => c.resource !== 'MANA' && c.resource !== 'ENERGY'],
  ['brief.trait.hard', (c) => c.ratings.difficulty >= 3],
];

// { key, traits: [key] } for a champion, or null when the champion is unknown.
export function championBrief(c: Champion | null | undefined): Brief | null {
  if (!c) return null;
  if (BRIEFS[c.id]) return { key: BRIEFS[c.id], traits: [] };
  const cls = classOfChampion(c);
  const traits = TRAITS.filter(([, applies]) => applies(c, cls)).map(([key]) => key).slice(0, MAX_TRAITS);
  return { key: `brief.class.${cls}`, traits };
}
