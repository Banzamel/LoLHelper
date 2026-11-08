// The threat profile of the enemy team (shares 0–1), the lane opponent counted twice, and the
// threat lines shown with a build.
import type { Champion } from '../../data/types.ts';
import type { TextKey } from '../../shared/json.ts';
import { hasArchetype as has } from '../archetypes.ts';
import { FED } from '../live/enemyItems.ts';
import type { Threats } from '../types.ts';

// weightOf(champion): how dangerous that enemy is in the running match (1 = average);
// a fed enemy shifts the threat profile towards what they deal.
export function analyzeThreats(laner: Champion | null, enemies: Champion[], weightOf: (e: Champion) => number = () => 1): Threats {
  const list = [...(laner ? [laner, laner] : []), ...enemies.filter((e) => !laner || e.id !== laner.id)];
  const n = list.reduce((s, e) => s + weightOf(e), 0) || 1;
  const count = (fn: (e: Champion) => boolean) => list.reduce((s, e) => s + (fn(e) ? weightOf(e) : 0), 0) / n;
  return {
    ad: count((e) => e.damageType === 'AD'),
    ap: count((e) => e.damageType === 'AP'),
    healing: count((e) => e.traits.heal >= 2 || has(e, ['ENCHANTER'])),
    tanks: count((e) => e.ratings.toughness >= 3 || has(e, ['TANK', 'VANGUARD', 'WARDEN'])),
    burstAD: count((e) => e.damageType === 'AD' && has(e, ['ASSASSIN'])),
    burstAP: count((e) => e.damageType === 'AP' && has(e, ['BURST', 'ASSASSIN'])),
    cc: list.reduce((s, e) => s + e.traits.hardCC * weightOf(e), 0) / n,
    autoAttack: count((e) => has(e, ['MARKSMAN', 'SKIRMISHER'])),
    shields: count((e) => e.traits.shield >= 2),
    empty: !list.length,
  };
}

export function threatLines(t: Threats, weights: Record<string, number>): TextKey[] {
  if (t.empty) return [];
  const lines: TextKey[] = [{ key: 'threat.damageSplit', params: { ad: Math.round(t.ad * 100), ap: Math.round(t.ap * 100) } }];
  if (t.healing >= 0.3) lines.push({ key: 'threat.healing' });
  if (t.tanks >= 0.35) lines.push({ key: 'threat.tanks' });
  if (t.burstAD + t.burstAP >= 0.25) lines.push({ key: 'threat.burst' });
  if (t.cc >= 1.6) lines.push({ key: 'threat.cc' });
  if (t.autoAttack >= 0.4) lines.push({ key: 'threat.autoAttack' });
  if (t.live) lines.push({ key: 'threat.fromItems' });
  for (const [id, w] of Object.entries(weights)) if (w >= FED) lines.push({ key: 'threat.fed', params: { enemy: id } });
  return lines;
}
