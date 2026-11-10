// What an item's passives and actives are worth to a build class on top of its stats: each
// kind of effect has a value in thousands of gold for the classes that use it, scaled by the
// effect's own number where the database has one (data/effectValues.ts).
import type { Item } from '../../data/types.ts';
import type { BuildClass } from '../types.ts';

const ATTACKERS: BuildClass[] = ['marksman', 'bruiser', 'ap-bruiser'];
const MAGES: BuildClass[] = ['mage-burst', 'mage-battle', 'mage-artillery'];
const FRONTLINE: BuildClass[] = ['bruiser', 'ap-bruiser', 'tank', 'support-tank'];
const DEALERS: BuildClass[] = ['marksman', 'assassin-ad', 'bruiser', 'ap-bruiser', ...MAGES];

const EFFECTS: Record<string, { v: number; cls: BuildClass[] }> = {
  // Bonus damage on every attack: for those who attack all fight long.
  onHitDamage: { v: 0.5, cls: ATTACKERS },
  // An empowered attack after each ability.
  spellblade: { v: 0.6, cls: ['bruiser', 'ap-bruiser', 'assassin-ad', 'mage-burst', 'tank'] },
  // Damage over time, strongest in long fights and on area abilities.
  burn: { v: 0.5, cls: ['mage-battle', 'mage-artillery', 'ap-bruiser', 'tank', 'support-tank'] },
  apMultiplier: { v: 0.4, cls: [...MAGES, 'ap-bruiser'] },
  damageAmp: { v: 0.4, cls: DEALERS },
  maxHpDamage: { v: 0.3, cls: DEALERS },
  armorShred: { v: 0.3, cls: ['bruiser', 'marksman', 'assassin-ad'] },
  mrShred: { v: 0.3, cls: [...MAGES, 'ap-bruiser'] },
  execute: { v: 0.2, cls: DEALERS },
  healSelf: { v: 0.4, cls: FRONTLINE },
  shieldSelf: { v: 0.3, cls: ['marksman', 'assassin-ad', ...FRONTLINE] },
  slowOnHit: { v: 0.25, cls: [...FRONTLINE, 'mage-battle'] },
};

// The number of an effect kind and its typical size: an effect is worth its value at that
// size, and up to 60% more or less with it.
const TYPICAL: Record<string, [string, number]> = {
  onHitDamage: ['onHit', 40], spellblade: ['spellblade', 175], maxHpDamage: ['targetHp', 6], damageAmp: ['amp', 10],
  armorShred: ['armorShred', 30], mrShred: ['mrShred', 30], apMultiplier: ['apMult', 30],
};

// How strong the item's effect of this kind is next to a typical one (1 when unknown).
export function effectScale(item: Item, kind: string): number {
  const typical = TYPICAL[kind];
  const value = typical && item.features.values ? item.features.values[typical[0]] : 0;
  return value ? Math.min(1.6, Math.max(0.4, value / typical[1])) : 1;
}

// score: thousands of gold; kinds: the effects that count for this class.
export function effectScore(item: Item, cls: BuildClass): { score: number; kinds: string[] } {
  const kinds = Object.keys(EFFECTS).filter((k) => item.features.flags[k] && EFFECTS[k].cls.includes(cls));
  return { score: kinds.reduce((s, k) => s + EFFECTS[k].v * effectScale(item, k), 0), kinds };
}
