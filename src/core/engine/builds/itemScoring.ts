// How much an item is worth to a build class: gold value of its stats under the class
// weights, a bonus for proven core items, and situational value against the enemy threats.
import type { Champion, Item } from '../../data/types.ts';
import type { BuildClass, Threats } from '../types.ts';
import { effectScale } from './itemEffects.ts';

const GOLD: Record<string, number> = { ad: 35, ap: 20, armor: 20, mr: 18, hp: 2.67, as: 25, crit: 40, haste: 26.7, lethality: 30, armorPen: 40,
  magicPen: 46, magicPenFlat: 31, lifesteal: 37.5, omnivamp: 40, mana: 1.4, manaRegen: 3, hpRegen: 3, hsp: 66, tenacity: 10, msPct: 39 };

export const WEIGHTS: Record<BuildClass, Record<string, number>> = {
  marksman: { ad: 1, as: 1, crit: 1.2, lifesteal: 0.5, armorPen: 0.7, msPct: 0.3 },
  'mage-burst': { ap: 1.1, magicPen: 0.5, magicPenFlat: 1, haste: 0.8, mana: 0.6 },
  'mage-battle': { ap: 1, hp: 0.7, haste: 0.7, magicPen: 0.6, mana: 0.3, omnivamp: 0.3 },
  'mage-artillery': { ap: 1.1, haste: 1, mana: 0.7, magicPen: 0.5, magicPenFlat: 0.8 },
  'assassin-ad': { ad: 1.1, lethality: 1.2, haste: 0.8, msPct: 0.4, armorPen: 0.5 },
  bruiser: { ad: 1, hp: 0.9, haste: 0.8, armor: 0.35, mr: 0.3, omnivamp: 0.4, lifesteal: 0.2, as: 0.2, armorPen: 0.4 },
  'ap-bruiser': { ap: 1, hp: 0.8, haste: 0.6, armor: 0.3, mr: 0.3, omnivamp: 0.5, magicPen: 0.4, as: 0.2 },
  tank: { hp: 1, armor: 1, mr: 1, haste: 0.6 },
  enchanter: { hsp: 1.2, haste: 1, ap: 0.5, manaRegen: 1, mana: 0.3, hp: 0.2 },
  'support-tank': { hp: 0.9, armor: 0.8, mr: 0.8, haste: 0.8 },
};

// Proven core items per class, best first. Stat value alone misses what passives give
// (Trinity Force's Spellblade, Sterak's Gage's lifeline), so these get a bonus.
const CLASS_CORE: Partial<Record<BuildClass, string[]>> = {
  bruiser: ['Trinity Force', 'Sundered Sky', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Spear of Shojin', 'Eclipse', 'Hullbreaker', 'Titanic Hydra', 'Ravenous Hydra'],
  marksman: ['Infinity Edge', 'Kraken Slayer', 'Yun Tal Wildarrows', 'The Collector', 'Phantom Dancer', "Lord Dominik's Regards", 'Bloodthirster', "Runaan's Hurricane", 'Statikk Shiv', 'Navori Flickerblade'],
  'assassin-ad': ["Youmuu's Ghostblade", 'Profane Hydra', 'Voltaic Cyclosword', 'Edge of Night', "Serylda's Grudge", 'Axiom Arc', 'Hubris', 'The Collector', 'Eclipse'],
  'mage-burst': ['Stormsurge', 'Shadowflame', 'Malignance', "Rabadon's Deathcap", 'Void Staff', "Zhonya's Hourglass", 'Lich Bane', 'Blackfire Torch'],
  'mage-battle': ["Liandry's Torment", "Rylai's Crystal Scepter", 'Malignance', 'Cosmic Drive', "Rabadon's Deathcap", 'Void Staff', "Zhonya's Hourglass", 'Blackfire Torch'],
  'mage-artillery': ['Malignance', 'Blackfire Torch', 'Shadowflame', "Rabadon's Deathcap", 'Void Staff', "Liandry's Torment"],
  'ap-bruiser': ['Riftmaker', "Liandry's Torment", 'Hextech Rocketbelt', 'Cosmic Drive', "Nashor's Tooth", "Zhonya's Hourglass", "Rabadon's Deathcap"],
  tank: ['Heartsteel', 'Sunfire Aegis', "Jak'Sho, The Protean", 'Hollow Radiance', 'Unending Despair', "Randuin's Omen", 'Kaenic Rookern', 'Force of Nature', "Warmog's Armor", "Dead Man's Plate"],
};

export function coreBonus(item: Item, cls: BuildClass): number {
  const list = CLASS_CORE[cls];
  const i = list ? list.indexOf(item.nameEn) : -1;
  return i < 0 ? 0 : 1.6 - i * 0.08;
}

// score: stat value in thousands of gold; top: the three stats that give the most.
export function baseScore(item: Item, w: Record<string, number>, champ: Champion): { score: number; top: string[] } {
  let score = 0;
  const contrib: [string, number][] = [];
  for (const [stat, value] of Object.entries(item.features.stats)) {
    const part = (w[stat] || 0) * value * (GOLD[stat] || 0);
    if (part > 0) contrib.push([stat, part]);
    score += part;
  }
  if (champ.resource !== 'MANA' && item.features.stats.mana) score *= 0.35;
  contrib.sort((a, b) => b[1] - a[1]);
  return { score: score / 1000, top: [...new Set(contrib.slice(0, 3).map(([s]) => (s === 'magicPenFlat' ? 'magicPen' : s)))] };
}

export interface SituationalReason { v: number; key: string; params?: Record<string, number> }

// How far `x` is over `from`, in steps, up to 3; a sliver over is not a reason yet.
const over = (x: number, from: number, step: number) => { const v = Math.min(3, (x - from) / step); return v >= 0.25 ? v : 0; };

export function situational(item: Item, cls: BuildClass, t: Threats): SituationalReason[] {
  const f = item.features.flags;
  const s = item.features.stats;
  const reasons: SituationalReason[] = [];
  const add = (v: number, key: string, params?: Record<string, number>) => { if (v) reasons.push({ v, key, ...(params ? { params } : {}) }); };
  const squishy = !['tank', 'support-tank', 'bruiser', 'ap-bruiser'].includes(cls);
  const dealsDamage = !['enchanter', 'support-tank', 'tank'].includes(cls);
  const d = t.defence;
  // An ally's Grievous Wounds already covers most of the healing.
  if (f.grievous && t.healing >= 0.3) add((3 * t.healing + 1) * (t.allyGrievous ? 0.4 : 1), 'build.grievous');
  if (d && dealsDamage) {
    // In a match the enemies' real stats decide which penetration pays off.
    // Penetration from a passive counts too (Terminus), and so does reducing the resistance.
    const pen = !!(item.features.values && item.features.values.penPct);
    if (WEIGHTS[cls].ad && (s.armorPen || f.armorShred || pen)) add(over(d.armor, 90, 30), 'build.penVsArmor', { armor: d.armor });
    if (WEIGHTS[cls].ap && (s.magicPen || f.mrShred || pen)) add(over(d.mr, 55, 20), 'build.penVsMr', { mr: d.mr });
    if (f.maxHpDamage) add(over(d.hp, 2400, 500) * effectScale(item, 'maxHpDamage'), 'build.vsHealth', { hp: d.hp });
  } else if (dealsDamage && (s.armorPen || s.magicPen || f.maxHpDamage || f.armorShred || f.mrShred) && t.tanks >= 0.35) add(2.5 * t.tanks, 'build.penVsTanks');
  // Resistances lose value against enemies who bought penetration.
  if (s.armor && t.ad >= 0.6) add(2 * t.ad * (squishy ? 0.7 : 1) * (1 - 0.4 * (t.pen ? t.pen.armor : 0)), 'build.armor');
  if (s.mr && t.ap >= 0.5) add(2 * t.ap * (squishy ? 0.7 : 1) * (1 - 0.4 * (t.pen ? t.pen.magic : 0)), 'build.mr');
  // Healing is cut by the enemies' Grievous Wounds.
  if ((s.lifesteal || s.omnivamp || f.healSelf) && (t.antiHeal || 0) >= 0.4) add(-1.5 * (t.antiHeal || 0), 'build.healingCut');
  if (f.stasis && (t.burstAD + t.burstAP) >= 0.25) add(2.5, 'build.stasis');
  if ((f.revive || f.lifeline) && t.burstAD + t.burstAP >= 0.25 && squishy) add(2, 'build.surviveBurst');
  if (f.spellshield && t.ap >= 0.5) add(1.5, 'build.spellshield');
  if ((f.cleanse || s.tenacity) && t.cc >= 1.6) add(2, 'build.cleanse');
  if ((f.antiAttackSpeed || f.blockAttacks || f.thorns || f.antiCrit) && t.autoAttack >= 0.4) add(2 * t.autoAttack + 0.5, 'build.antiAuto');
  if (f.antiShield && t.shields >= 0.3) add(2, 'build.antiShield');
  return reasons;
}

// Buy-order rank: % penetration and multiplier items go last.
export function lateItem(item: Item): number {
  const s = item.features.stats;
  if (s.magicPen || s.armorPen >= 30) return 2;
  if (Object.keys(s).length === 1 && (s.ap >= 120 || s.ad >= 60)) return 1;
  return 0;
}

// Two items that share a unique passive (or are both stasis, anti-heal or lifeline) do not stack.
export function conflicts(item: Item, chosen: Item[]): boolean {
  const p = new Set(item.features.passives.filter((x) => x !== 'ACTIVE'));
  return chosen.some((c) => c.features.passives.some((x) => p.has(x))
    || (c.features.flags.grievous && item.features.flags.grievous)
    || (c.features.flags.stasis && item.features.flags.stasis)
    || (c.features.flags.lifeline && item.features.flags.lifeline));
}
