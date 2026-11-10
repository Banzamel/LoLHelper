// The item style of a champion: its build class, or a narrower style when the kit says the
// class builds wrongly for it. Read from what the abilities scale with (data/championScaling):
// Master Yi and Yasuo are assassins by class but live off attacks and crit, Vayne and Kog'Maw
// are marksmen who build on-hit instead of crit, Kai'Sa and Teemo are mages who attack.
import type { Champion } from '../../data/types.ts';
import { hasArchetype as has } from '../archetypes.ts';
import type { BuildClass, ItemStyle } from '../types.ts';

const PHYSICAL_FIGHTERS: BuildClass[] = ['assassin-ad', 'bruiser'];
const MAGES: BuildClass[] = ['mage-burst', 'mage-battle', 'mage-artillery'];

export function itemStyle(c: Champion, cls: BuildClass): ItemStyle {
  const s = c.scaling;
  if (!s) return cls;
  if (cls === 'marksman') {
    // Crit marksmen have crit in their kit; the others build on-hit, or cast (Ezreal).
    if (s.crit > 0 || s.onHit === 0) return cls;
    return has(c, ['MAGE']) && s.ad >= 300 ? 'caster-ad' : 'onhit';
  }
  if (PHYSICAL_FIGHTERS.includes(cls) && c.attackType === 'MELEE') {
    // The kit scales with critical strike chance itself (Yasuo, Yone, Tryndamere, Gangplank).
    if (s.critChance > 0 && has(c, ['SKIRMISHER', 'SPECIALIST'])) return 'crit-fighter';
    // Several abilities apply on-hit effects (Master Yi, Bel'Veth).
    if (s.onHit >= 2 && has(c, ['SKIRMISHER'])) return 'onhit';
    // An assassin whose damage scales with AP more than with AD and never with attacks (Akali).
    if (cls === 'assassin-ad' && s.ap > s.ad && s.onHit === 0 && s.crit === 0) return 'mage-burst';
  }
  if (MAGES.includes(cls) && has(c, ['MARKSMAN']) && s.onHit >= 1 && s.attack >= 3) return 'ap-attacker';
  return cls;
}
