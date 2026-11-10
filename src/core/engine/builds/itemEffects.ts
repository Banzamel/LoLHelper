// What an item's passives and actives are worth to a build class on top of its stats: each
// kind of effect has a value in thousands of gold for the classes that use it, scaled by the
// effect's own number where the database has one (data/effectValues.ts).
import type { Item } from '../../data/types.ts';
import type { ItemStyle } from '../types.ts';

const ATTACKERS: ItemStyle[] = ['marksman', 'bruiser', 'ap-bruiser', 'onhit', 'crit-fighter', 'ap-attacker'];
const MAGES: ItemStyle[] = ['mage-burst', 'mage-battle', 'mage-artillery'];
const FRONTLINE: ItemStyle[] = ['bruiser', 'ap-bruiser', 'tank', 'support-tank'];
const PHYSICAL: ItemStyle[] = ['marksman', 'assassin-ad', 'bruiser', 'onhit', 'crit-fighter', 'caster-ad'];
const DEALERS: ItemStyle[] = [...PHYSICAL, 'ap-bruiser', 'ap-attacker', ...MAGES];

const EFFECTS: Record<string, { v: number; cls: ItemStyle[] }> = {
  // Bonus damage on every attack: for those who attack all fight long.
  onHitDamage: { v: 0.5, cls: ATTACKERS },
  // An empowered attack after each ability.
  spellblade: { v: 0.6, cls: ['bruiser', 'ap-bruiser', 'assassin-ad', 'mage-burst', 'tank', 'crit-fighter', 'caster-ad'] },
  // Damage over time, strongest in long fights and on area abilities.
  burn: { v: 0.5, cls: ['mage-battle', 'mage-artillery', 'ap-bruiser', 'tank', 'support-tank'] },
  // On-hit effects applied a second time, or by extra bolts (Guinsoo's Rageblade, Runaan's Hurricane).
  onHitAmp: { v: 0.5, cls: ['onhit', 'ap-attacker'] },
  // Damage that grows with the mana the item itself builds up (Manamune, Archangel's Staff).
  manaScaling: { v: 0.9, cls: ['caster-ad', ...MAGES] },
  apMultiplier: { v: 0.4, cls: [...MAGES, 'ap-bruiser', 'ap-attacker'] },
  damageAmp: { v: 0.4, cls: DEALERS },
  maxHpDamage: { v: 0.3, cls: DEALERS },
  armorShred: { v: 0.3, cls: PHYSICAL },
  mrShred: { v: 0.3, cls: [...MAGES, 'ap-bruiser', 'ap-attacker'] },
  execute: { v: 0.2, cls: DEALERS },
  healSelf: { v: 0.4, cls: [...FRONTLINE, 'onhit', 'crit-fighter'] },
  shieldSelf: { v: 0.3, cls: ['marksman', 'assassin-ad', 'onhit', 'crit-fighter', ...FRONTLINE] },
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
export function effectScore(item: Item, cls: ItemStyle): { score: number; kinds: string[] } {
  const kinds = Object.keys(EFFECTS).filter((k) => item.features.flags[k] && EFFECTS[k].cls.includes(cls));
  return { score: kinds.reduce((s, k) => s + EFFECTS[k].v * effectScale(item, k), 0), kinds };
}
