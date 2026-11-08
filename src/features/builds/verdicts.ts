// Whether the player's own rune page and spells match the recommendation.
import type { RunePage } from '../../core/engine/types.ts';

export type Verdict = 'match' | 'sameKeystone' | 'differs';
export const VERDICT_CHIP: Record<Verdict, string> = { match: 'plus', sameKeystone: 'teal', differs: 'minus' };

// null when the current choice is unknown.
export function runeVerdict(rec: RunePage, cur: { selectedPerkIds: number[]; subStyleId: number | null } | null | undefined): Verdict | null {
  if (!cur || !cur.selectedPerkIds || !cur.selectedPerkIds.length) return null;
  if (cur.selectedPerkIds[0] !== rec.selectedPerkIds[0]) return 'differs';
  const same = rec.selectedPerkIds.slice(0, 6).every((id) => cur.selectedPerkIds.includes(id)) && cur.subStyleId === rec.subStyleId;
  return same ? 'match' : 'sameKeystone';
}

export function spellVerdict(rec: number[], cur: (number | null)[] | null | undefined): Verdict | null {
  if (!cur || cur.filter(Boolean).length < 2) return null;
  return rec.every((id) => cur.includes(id)) ? 'match' : 'differs';
}
