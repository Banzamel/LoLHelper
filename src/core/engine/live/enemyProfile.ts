// What the enemies actually have in a running match, per enemy: armour, magic resist and
// health from their champion, level and items, and what the passives of their items do
// (anti-heal, shields, penetration). The Live Client API gives the stats of the active player
// only, so the enemies' are computed here.
import type { Db, Item } from '../../data/types.ts';
import type { BuildRequest, Threats } from '../types.ts';

// A champion stat at a level (Riot's growth curve).
export function statAt(base: number, perLevel: number, level: number): number {
  const n = Math.max(1, level) - 1;
  return base + perLevel * n * (0.7025 + 0.0175 * n);
}

const itemsOf = (db: Db, ids: number[] | undefined) => (ids || []).map((i) => db.itemById[i]).filter((it): it is Item => !!it);
const total = (items: Item[], stat: string) => items.reduce((s, it) => s + (it.features.stats[stat] || 0), 0);

// The average enemy's armour, magic resist and health, the lane opponent counted twice (the
// one hit most). Undefined without levels: outside a match.
export function enemyDefence(db: Db, req: Pick<BuildRequest, 'enemyLevels' | 'enemyItems' | 'enemyId'>): Threats['defence'] {
  let armor = 0;
  let mr = 0;
  let hp = 0;
  let n = 0;
  for (const [id, level] of Object.entries(req.enemyLevels || {})) {
    const c = db.byId[id];
    if (!c || !level) continue;
    const items = itemsOf(db, (req.enemyItems || {})[id]);
    const w = id === req.enemyId ? 2 : 1;
    armor += w * (statAt(c.stats.armor, c.stats.armorperlevel, level) + total(items, 'armor'));
    mr += w * (statAt(c.stats.spellblock, c.stats.spellblockperlevel, level) + total(items, 'mr'));
    hp += w * (statAt(c.stats.hp, c.stats.hpperlevel, level) + total(items, 'hp'));
    n += w;
  }
  return n ? { armor: Math.round(armor / n), mr: Math.round(mr / n), hp: Math.round(hp / n) } : undefined;
}

export interface EnemyEffects {
  // Shares (0–1) of the enemies who have an item with the effect.
  antiHeal: number;
  shields: number;
  // Enemies healing from their items: a stat counts fully, a healing passive half.
  healers: number;
  // Shares of the enemies, weighted by how fed they are, who bought penetration.
  pen: { armor: number; magic: number };
}

// weights (enemyItems.threatWeights): a fed enemy's penetration counts for more.
export function enemyEffects(db: Db, enemyItems: BuildRequest['enemyItems'], weights: Record<string, number> = {}): EnemyEffects {
  const out: EnemyEffects = { antiHeal: 0, shields: 0, healers: 0, pen: { armor: 0, magic: 0 } };
  const entries = Object.entries(enemyItems || {});
  if (!entries.length) return out;
  let weight = 0;
  for (const [id, ids] of entries) {
    const items = itemsOf(db, ids);
    const w = weights[id] || 1;
    const has = (flag: string) => items.some((it) => it.features.flags[flag]);
    weight += w;
    if (has('grievous')) out.antiHeal += 1;
    if (has('shieldSelf')) out.shields += 1;
    if (total(items, 'lifesteal') + total(items, 'omnivamp') + total(items, 'hsp') > 0) out.healers += 1;
    else if (has('healSelf')) out.healers += 0.5;
    if (total(items, 'armorPen') >= 20 || total(items, 'lethality') >= 30) out.pen.armor += w;
    if (total(items, 'magicPen') >= 20 || total(items, 'magicPenFlat') >= 25) out.pen.magic += w;
  }
  const n = entries.length;
  return { antiHeal: out.antiHeal / n, shields: out.shields / n, healers: out.healers / n, pen: { armor: out.pen.armor / weight, magic: out.pen.magic / weight } };
}
