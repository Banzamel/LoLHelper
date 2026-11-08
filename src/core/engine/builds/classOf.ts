// The build class of a champion in a role: decides stat weights, starters, boots and runes.
import type { Champion } from '../../data/types.ts';
import { hasArchetype as has } from '../archetypes.ts';
import type { BuildClass } from '../types.ts';

export function classOf(c: Champion, role: string | null): BuildClass {
  const ap = c.damageType === 'AP';
  if (has(c, ['MARKSMAN']) && !ap) return 'marksman';
  if (has(c, ['ENCHANTER'])) return 'enchanter';
  // Fighters tagged TANK (Xin Zhao, Warwick, Garen, Sett…) are bruisers; only pure tanks count here.
  const tanky = has(c, ['VANGUARD', 'WARDEN'])
    || (has(c, ['TANK']) && c.ratings.damage <= 2 && !has(c, ['FIGHTER', 'DIVER', 'JUGGERNAUT', 'SKIRMISHER']));
  if (tanky) return role === 'SUPPORT' ? 'support-tank' : 'tank';
  if (has(c, ['CATCHER'])) return ap ? 'support-tank' : 'assassin-ad';
  if (has(c, ['ASSASSIN']) && !ap && (c.ratings.toughness <= 1 || !has(c, ['FIGHTER', 'DIVER', 'JUGGERNAUT']))) return 'assassin-ad';
  if (ap && has(c, ['FIGHTER', 'JUGGERNAUT', 'DIVER', 'SKIRMISHER']) && c.attackType === 'MELEE') return 'ap-bruiser';
  if (ap && has(c, ['BATTLEMAGE'])) return 'mage-battle';
  if (ap && has(c, ['ARTILLERY'])) return 'mage-artillery';
  if (ap) return 'mage-burst';
  if (has(c, ['MARKSMAN'])) return 'marksman';
  return 'bruiser';
}
