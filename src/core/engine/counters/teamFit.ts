// What a candidate brings beyond the lane matchup: what the team still needs, how it fares
// against the other enemies, and the player's own champion pool and mastery.
import type { Champion } from '../../data/types.ts';
import { hasArchetype as has } from '../archetypes.ts';
import type { Reason } from '../types.ts';
import { counterList, TANKY, type Overrides } from './matchup.ts';

export function teamNeeds(me: Champion, allies: Champion[]): Reason[] {
  const reasons: Reason[] = [];
  if (!allies.length) return reasons;
  const ad = allies.filter((a) => a.damageType === 'AD').length;
  const ap = allies.length - ad;
  if (me.damageType === 'AP' && ad - ap >= 2) reasons.push({ delta: 5, key: 'reason.teamNeedsAP' });
  if (me.damageType === 'AD' && ap - ad >= 2) reasons.push({ delta: 5, key: 'reason.teamNeedsAD' });
  if (me.damageType === 'AD' && ad >= 3 && ap === 0) reasons.push({ delta: -4, key: 'reason.tooMuchAD' });
  const frontline = allies.some((a) => has(a, TANKY) && a.ratings.toughness >= 3);
  if (!frontline && allies.length >= 2 && has(me, TANKY) && me.ratings.toughness >= 3) reasons.push({ delta: 4, key: 'reason.needFrontline' });
  const cc = allies.reduce((s, a) => s + a.traits.hardCC, 0);
  if (cc <= allies.length && me.traits.hardCC >= 2) reasons.push({ delta: 3, key: 'reason.addsCC' });
  return reasons;
}

export function enemyTeamFit(me: Champion, enemies: Champion[], overrides: Overrides): Reason[] {
  const reasons: Reason[] = [];
  const wins = enemies.filter((e) => counterList(e.id, overrides).includes(me.id)).length;
  if (wins) reasons.push({ delta: 3 * wins, key: 'reason.goodVsOthers', params: { n: wins } });
  const mobile = enemies.filter((e) => e.ratings.mobility >= 3).length;
  if (mobile >= 3 && me.traits.hardCC >= 2) reasons.push({ delta: 3, key: 'reason.mobileEnemyTeam' });
  return reasons;
}

// pool: champion ids per role; mastery: champion points by champion key.
export function poolBonus(me: Champion, role: string | null, pool: Record<string, string[]> | null, mastery: Record<number, number> | null): Reason[] {
  const reasons: Reason[] = [];
  if (role && ((pool && pool[role]) || []).includes(me.id)) reasons.push({ delta: 8, key: 'reason.inPool' });
  const pts = mastery ? mastery[me.key] || 0 : 0;
  if (pts >= 20000) {
    reasons.push({ delta: Math.min(6, Math.round(Math.log10(pts / 10000) * 4) + 2), key: 'reason.mastery', params: { n: Math.round(pts / 1000) } });
  }
  return reasons;
}
