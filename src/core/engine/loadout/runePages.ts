// Rune presets resolved against the Data Dragon rune trees: a renamed or removed rune falls
// back to the first one in its row.
import type { Db, Rune, RuneTree } from '../../data/types.ts';
import type { BuildClass, RunePage } from '../types.ts';
import { rolePreset, type RunePreset } from './presets.ts';

const pick = (row: Rune[], name: string) => (row.find((r) => r.nameEn === name) || row[0]).id;

export function resolveRunes(db: Db, p: RunePreset): RunePage | null {
  const trees = db.runes.trees;
  const tree = trees.find((x) => x.nameEn === p.tree) || trees[0];
  const sub: RuneTree | undefined = trees.find((x) => x.nameEn === p.sub && x.id !== tree.id) || trees.find((x) => x.id !== tree.id);
  if (!tree || !sub) return null;
  const perks = [pick(tree.slots[0], p.keystone), ...[1, 2, 3].map((i) => pick(tree.slots[i], p.rows[i - 1]))];
  const used = new Set<number>();
  for (const name of p.subRunes) {
    const idx = sub.slots.findIndex((row, i) => i > 0 && !used.has(i) && row.some((r) => r.nameEn === name));
    if (idx > 0) { used.add(idx); perks.push(pick(sub.slots[idx], name)); }
  }
  for (let i = 1; perks.length < 6 && i < sub.slots.length; i++) if (!used.has(i)) { used.add(i); perks.push(sub.slots[i][0].id); }
  return { primaryStyleId: tree.id, subStyleId: sub.id, selectedPerkIds: [...perks, ...p.shards] };
}

// The keystone id a champion of this class typically plays in the role (the preset without
// matchup tweaks), resolved like the full page; null without rune data.
export function typicalKeystone(db: Db, cls: BuildClass, role: string | null): number | null {
  const { tree: treeName, keystone } = rolePreset(cls, role);
  const trees = db.runes.trees;
  const tree = trees.find((x) => x.nameEn === treeName) || trees[0];
  if (!tree) return null;
  return pick(tree.slots[0], keystone);
}

// Of the pages the client recommends, the one closest to the matchup-tuned page: same
// keystone first, then the same trees and the most shared runes.
export function closestPage<P extends RunePage>(pages: P[], ours: RunePage): P | null {
  const score = (p: RunePage) => (p.selectedPerkIds[0] === ours.selectedPerkIds[0] ? 10 : 0)
    + (p.primaryStyleId === ours.primaryStyleId ? 3 : 0) + (p.subStyleId === ours.subStyleId ? 2 : 0)
    + p.selectedPerkIds.filter((id) => ours.selectedPerkIds.includes(id)).length;
  return pages.reduce<P | null>((best, p) => (!best || score(p) > score(best) ? p : best), null);
}
