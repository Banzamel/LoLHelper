// Champion roles in a fight, from archetypes, ratings and ability traits, shared by the briefs,
// the ally tips and the team composition.
import type { Champion } from '../../data/types.ts';
import { hasArchetype as has } from '../archetypes.ts';

export type MaybeChampion = Champion | null | undefined;

// Most specific class first: Meraki lists subclasses (CATCHER) next to broad ones (SUPPORT).
export const CLASS_ORDER = ['ENCHANTER', 'CATCHER', 'WARDEN', 'VANGUARD', 'JUGGERNAUT', 'DIVER', 'SKIRMISHER', 'ASSASSIN', 'BURST',
  'BATTLEMAGE', 'ARTILLERY', 'MARKSMAN', 'SPECIALIST', 'TANK', 'FIGHTER', 'MAGE', 'SUPPORT'];
export const MELEE_CLASSES = ['JUGGERNAUT', 'DIVER', 'SKIRMISHER', 'VANGUARD', 'WARDEN', 'TANK', 'FIGHTER'];
export const RANGED_CLASSES = ['MARKSMAN', 'ARTILLERY', 'BURST', 'BATTLEMAGE', 'MAGE', 'ENCHANTER'];
export const ENGAGE = ['VANGUARD', 'CATCHER'];
const FRONTLINE = ['TANK', 'VANGUARD', 'WARDEN', 'JUGGERNAUT'];
const SQUISHY_DAMAGE = ['MARKSMAN', 'ARTILLERY', 'BURST', 'MAGE'];
export const DIVE = ['ASSASSIN', 'DIVER', 'SKIRMISHER'];
export const SIDE_LANES = ['TOP', 'MIDDLE', 'BOTTOM'];
export const GANKABLE = [...SIDE_LANES, 'SUPPORT'];

export { has };
export const hasCC = (c: MaybeChampion) => !!c && (c.traits.hardCC >= 2 || c.ratings.control >= 3);
export const isFrontline = (c: MaybeChampion) => has(c, FRONTLINE) && !!c && c.ratings.toughness >= 3;
export const isSquishyCarry = (c: MaybeChampion) => has(c, SQUISHY_DAMAGE) && !!c && c.ratings.toughness <= 1;

export const classOfChampion = (c: Champion) => CLASS_ORDER.find((a) => c.archetypes.includes(a)) || 'OTHER';

export const isEngager = (c: Champion) => has(c, ['VANGUARD', 'DIVER']) || (hasCC(c) && c.ratings.toughness >= 3);
export const isProtector = (c: Champion) => has(c, ['ENCHANTER', 'WARDEN']);
// Long-range marksmen (Jayce, Varus) poke rather than carry long fights.
export const isHyperCarry = (c: Champion) => has(c, ['MARKSMAN']) && !has(c, ['ARTILLERY']) && c.attackType === 'RANGED';
export const isPoker = (c: Champion) => c.attackType === 'RANGED' && (has(c, ['ARTILLERY']) || c.traits.longRange >= 2);
// Meraki tags many duelists (Fiora, Jax) as ASSASSIN too; they split rather than pick.
export const isPicker = (c: Champion) => has(c, ['CATCHER']) || (has(c, ['ASSASSIN']) && !has(c, ['SKIRMISHER'])) || c.traits.stealth >= 1;
export const isSplitPusher = (c: Champion) => has(c, ['SKIRMISHER']);
