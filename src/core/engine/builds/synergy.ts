// What an item is worth next to the items already chosen or bought: stats and effects that
// multiply each other (crit chance with crit damage, attack speed with on-hit damage, %
// penetration and AP multipliers with the damage they scale) and stats that stop paying off
// when stacked. Values are thousands of gold, added to the item's own score.
import type { Item } from '../../data/types.ts';
import type { BuildClass } from '../types.ts';
import { WEIGHTS, type SituationalReason } from './itemScoring.ts';

const sum = (items: Item[], stat: string) => items.reduce((s, i) => s + (i.features.stats[stat] || 0), 0);
const count = (items: Item[], fn: (i: Item) => boolean) => items.filter(fn).length;
// Yun Tal Wildarrows lists 0% crit and gains 25% from its passive.
const critOf = (i: Item) => ('crit' in i.features.stats ? i.features.stats.crit || 25 : 0);

// Reasons with a negative value are penalties; only the positive ones are shown to the player.
export function synergy(item: Item, chosen: Item[], cls: BuildClass): SituationalReason[] {
  const w = WEIGHTS[cls];
  const s = item.features.stats;
  const f = item.features.flags;
  const out: SituationalReason[] = [];
  const add = (v: number, key: string) => { if (v) out.push({ v, key }); };
  if (w.crit) {
    const crit = chosen.reduce((t, i) => t + critOf(i), 0);
    // Crit damage needs crit chance first; crit chance over 100% is wasted.
    if (s.critDmg) add(crit >= 50 ? 1.2 : crit >= 25 ? 0.3 : -0.8, 'build.synCrit');
    else if (critOf(item)) add(crit >= 100 ? -1.2 : 0.3 * Math.min(3, crit / 25), 'build.synCrit');
  }
  if (w.as) {
    if (f.onHitDamage) add(0.6 * Math.min(1.2, sum(chosen, 'as') / 100), 'build.synOnHit');
    else if (s.as >= 25) add(0.25 * Math.min(3, count(chosen, (i) => !!i.features.flags.onHitDamage)), 'build.synOnHit');
  }
  // Percentage penetration and multipliers scale the damage already bought.
  if (w.ad && s.armorPen >= 20) {
    const n = count(chosen, (i) => i.features.stats.ad >= 40);
    add(n ? 0.3 * Math.min(4, n) : -0.5, 'build.synPen');
  }
  if (w.ap && s.magicPen >= 20) {
    const n = count(chosen, (i) => i.features.stats.ap >= 60);
    add(n ? 0.3 * Math.min(4, n) : -0.5, 'build.synPen');
  }
  if (w.ap && f.apMultiplier) {
    const n = count(chosen, (i) => i.features.stats.ap >= 60);
    add(n ? 0.4 * Math.min(4, n) : -0.6, 'build.synAp');
  }
  if (w.lethality && s.lethality) add(0.2 * Math.min(3, count(chosen, (i) => !!i.features.stats.lethality)), 'build.synLethality');
  // Diminishing returns.
  if (s.haste && sum(chosen, 'haste') >= 80) add(-0.4, 'build.synCapped');
  if ((s.lifesteal || s.omnivamp) && sum(chosen, 'lifesteal') + sum(chosen, 'omnivamp') >= 20) add(-0.5, 'build.synCapped');
  return out;
}

export const synergyScore = (item: Item, chosen: Item[], cls: BuildClass) => synergy(item, chosen, cls).reduce((s, r) => s + r.v, 0);
