// How well one champion plays into another in a role: curated matchup knowledge, archetype
// matchups and ability traits (range, CC, mobility, %HP damage…). Score 0–100 plus reasons.
import type { Champion } from '../../data/types.ts';
import { hasArchetype as has } from '../archetypes.ts';
import { ARCH_BEATS } from '../knowledge/archetypes.ts';
import { COUNTERS } from '../knowledge/counters.ts';
import type { Reason } from '../types.ts';

export type Overrides = Record<string, string[]>;

const LANE_ROLES = new Set(['TOP', 'MIDDLE']);
export const TANKY = ['TANK', 'VANGUARD', 'WARDEN', 'JUGGERNAUT'];
export const sumDeltas = (reasons: Reason[]) => reasons.reduce((s, r) => s + (r.delta || 0), 0);

// Champions known to beat `id`; the player's own overrides replace the curated list.
export function counterList(id: string, overrides: Overrides = {}): string[] {
  return overrides[id] || COUNTERS[id] || [];
}

function archetypeEdge(me: Champion, enemy: Champion): number {
  let edge = 0;
  for (const a of me.archetypes) for (const b of enemy.archetypes) {
    if ((ARCH_BEATS[a] || []).includes(b)) edge += 1;
    if ((ARCH_BEATS[b] || []).includes(a)) edge -= 1;
  }
  return Math.max(-2, Math.min(2, edge));
}

export function matchup(me: Champion, enemy: Champion, role: string | null, overrides: Overrides): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const add = (delta: number, key: string, params?: Record<string, string>) => { if (delta) reasons.push({ delta, key, params }); };

  const idx = counterList(enemy.id, overrides).indexOf(me.id);
  if (idx >= 0) add(Math.max(14, 24 - idx * 2), 'reason.knownCounter', { champ: enemy.id });
  if (counterList(me.id, overrides).includes(enemy.id)) add(-18, 'reason.counteredBy', { champ: enemy.id });

  const edge = archetypeEdge(me, enemy);
  if (edge > 0) add(edge * 4, 'reason.archetypeGood');
  if (edge < 0) add(edge * 4, 'reason.archetypeBad');

  const meRanged = me.attackType === 'RANGED';
  const enemyRanged = enemy.attackType === 'RANGED';
  if (!role || LANE_ROLES.has(role)) {
    if (meRanged && !enemyRanged) add(enemy.ratings.mobility <= 1 ? 9 : 5, 'reason.rangeAdvantage');
    if (!meRanged && enemyRanged && me.ratings.mobility <= 1) add(-5, 'reason.rangeDisadvantage');
  }

  if (enemy.ratings.mobility >= 3 && me.traits.hardCC >= 2) add(6, 'reason.ccVsMobile');
  if (enemy.ratings.mobility <= 1 && (me.traits.longRange >= 2 || me.archetypes.includes('ARTILLERY'))) add(5, 'reason.pokeImmobile');
  if ((enemy.ratings.toughness >= 3 || has(enemy, TANKY)) && (me.traits.percentHp || me.traits.trueDamage)) add(7, 'reason.percentVsTank');
  if (has(enemy, ['ASSASSIN', 'BURST'])) {
    if (me.ratings.toughness >= 3) add(4, 'reason.tankyVsBurst');
    if (me.traits.untargetable) add(3, 'reason.untargetable');
    if (me.ratings.toughness <= 1 && me.ratings.mobility <= 1) add(-5, 'reason.squishyVsAssassin');
  }
  if (enemy.archetypes.includes('JUGGERNAUT') && enemy.ratings.mobility <= 2 && (meRanged || me.ratings.mobility >= 3)) add(5, 'reason.kiteJuggernaut');
  if (enemy.traits.heal >= 2 && me.ratings.damage >= 3 && has(me, ['ASSASSIN', 'BURST'])) add(3, 'reason.burstVsHeal');
  if (role === 'SUPPORT' || role === 'BOTTOM') {
    if (has(enemy, ['ENCHANTER']) && has(me, ['CATCHER', 'VANGUARD'])) add(5, 'reason.engageVsEnchanter');
    if (has(enemy, ['CATCHER', 'VANGUARD']) && (me.traits.hardCC >= 2 || has(me, ['WARDEN']))) add(3, 'reason.counterEngage');
  }
  return { score: Math.max(0, Math.min(100, 50 + sumDeltas(reasons))), reasons };
}

// Blind pick safety when the enemy laner is unknown: fewer known counters = safer.
export function blindScore(me: Champion, overrides: Overrides): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const countered = counterList(me.id, overrides).length;
  if (countered === 0) reasons.push({ delta: 4, key: 'reason.noHardCounters' });
  else if (countered >= 6) reasons.push({ delta: -4, key: 'reason.riskyBlind' });
  if (me.ratings.toughness >= 2 && me.ratings.mobility >= 2) reasons.push({ delta: 3, key: 'reason.safeBlind' });
  if (me.ratings.difficulty >= 3) reasons.push({ delta: -2, key: 'reason.hardMechanics' });
  return { score: 60 + sumDeltas(reasons), reasons };
}
