// Rune guide: curated tips for every keystone (how to use it, how to play against it) and the
// keystones of the enemies — the real ones from the running match, or in Draft and on the
// loading screen the keystone a champion of that class typically plays, predicted with the same
// presets the player's own rune page comes from (loadout). Texts are translation keys.
import type { Champion, Db, Rune } from '../data/types.ts';
import { classOf } from './builds/classOf.ts';
import { KEYSTONE_TIPS } from './knowledge/tips.ts';
import { typicalKeystone } from './loadout/runePages.ts';

export interface KeystoneTip { id: number; use: string; watch: string }
export interface EnemyKeystone { championId: string; role: string | null; keystone: number | null; predicted: boolean; watch: string | null }
export interface RuneGuideQuery {
  keystones?: number[];
  enemies?: { championId: string | null; role?: string | null; keystone?: number | null }[];
}
export interface RuneGuide { tips: Record<number, KeystoneTip>; enemies: EnemyKeystone[] }

// The keystone rune (first row of a tree) with this id, or null.
function keystoneById(db: Db, id: number | null | undefined): Rune | null {
  for (const tree of db.runes.trees) {
    const found = tree.slots[0].find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}

// Keys for a keystone with curated tips, else null (not a keystone, unknown id, no tips).
export function keystoneTip(db: Db, id: number | null): KeystoneTip | null {
  const keystone = keystoneById(db, id);
  if (id === null || !keystone || !KEYSTONE_TIPS.includes(keystone.key)) return null;
  return { id, use: `rune.use.${keystone.key}`, watch: `rune.watch.${keystone.key}` };
}

// The keystone id a champion typically plays in the role (its main position when unknown);
// null for an unknown champion or without rune data.
export function predictKeystone(db: Db, champion: Champion | null | undefined, role: string | null = null): number | null {
  if (!champion) return null;
  const position = role || champion.positions[0];
  return typicalKeystone(db, classOf(champion, position), position);
}

// Each known enemy with its keystone: the real one when it is a keystone of the database,
// otherwise the predicted one ({ predicted: true }); watch is the "play against it" key or null.
export function enemyKeystones(db: Db, enemies: RuneGuideQuery['enemies'] = []): EnemyKeystone[] {
  return enemies.filter((e) => e && e.championId && db.byId[e.championId]).map((e) => {
    const champion = db.byId[e.championId as string];
    const real = keystoneById(db, e.keystone) ? e.keystone ?? null : null;
    const keystone = real || predictKeystone(db, champion, e.role || null);
    const tip = keystoneTip(db, keystone);
    return { championId: champion.id, role: e.role || null, keystone, predicted: !real, watch: tip ? tip.watch : null };
  });
}

// The tips for the keystones the caller shows and the enemies' keystones.
export function runeGuide(db: Db, { keystones = [], enemies = [] }: RuneGuideQuery = {}): RuneGuide {
  const tips: Record<number, KeystoneTip> = {};
  for (const id of keystones) {
    const tip = keystoneTip(db, id);
    if (tip) tips[id] = tip;
  }
  return { tips, enemies: enemyKeystones(db, enemies) };
}
