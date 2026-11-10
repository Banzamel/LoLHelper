// Item build recommendation. Items are scored from their parsed stats against the
// champion's class weights and from what their passives do, adjusted for the enemy laner and
// enemy team threats (damage type, healing, tanks, burst, crowd control, auto-attackers,
// shields; in a match the enemies' real stats and items). The build is then picked item by
// item: each pick is the best next to the items already bought or chosen (synergy.ts).
import type { Champion, Db, Item } from '../../data/types.ts';
import type { TextKey } from '../../shared/json.ts';
import { recommendLoadout } from '../loadout/recommendLoadout.ts';
import { itemLessons } from '../history/learning.ts';
import { applyEnemyItems, threatWeights } from '../live/enemyItems.ts';
import { enemyDefence } from '../live/enemyProfile.ts';
import { nextPurchase, purchaseOrder } from '../live/purchases.ts';
import type { Build, BuildClass, BuildRequest, Threats } from '../types.ts';
import { classOf } from './classOf.ts';
import { effectScore } from './itemEffects.ts';
import { baseScore, conflicts, coreBonus, lateItem, situational, WEIGHTS, type SituationalReason } from './itemScoring.ts';
import { pickBoots, pickStarters } from './starters.ts';
import { synergy, synergyScore } from './synergy.ts';
import { analyzeThreats, threatLines } from './threats.ts';

interface Scored {
  item: Item;
  base: number;
  top: string[];
  sit: SituationalReason[];
  learned: TextKey[];
  sitScore: number;
}

function scoreItems(db: Db, champ: Champion, cls: BuildClass, t: Threats, req: BuildRequest): Scored[] {
  const lessons = itemLessons(req.history || null, { championId: req.championId, enemyId: req.enemyId || null, enemyIds: req.enemyIds || [] });
  return db.items.filter((i) => i.category === 'legendary').map((item) => {
    const base = baseScore(item, WEIGHTS[cls], champ);
    const sit = situational(item, cls, t);
    const lesson = lessons[item.id];
    // The player's own results with this champion in similar matches nudge item values.
    const learned = lesson && Math.abs(lesson.bonus) >= 0.1
      ? [{ key: lesson.bonus > 0 ? 'build.historyWin' : 'build.historyLoss', params: { wins: lesson.wins, games: lesson.games } }] : [];
    // Heal and shield power and mana regeneration mark an enchanter's item: its effects serve allies.
    const forAllies = cls !== 'enchanter' && (item.features.stats.hsp || item.features.stats.manaRegen) ? 1.5 : 0;
    const own = base.score + effectScore(item, cls).score + coreBonus(item, cls) + (lesson ? lesson.bonus : 0) - forAllies;
    return { item, base: own, top: base.top, sit, learned, sitScore: sit.reduce((s, r) => s + r.v, 0) };
  });
}

// Adds items to `chosen` up to `size`: each time the one worth the most next to what is
// already there, never one whose passive is already in the build.
function grow(scored: Scored[], chosen: Item[], size: number, sitWeight: number, cls: BuildClass): Item[] {
  const out = [...chosen];
  while (out.length < size) {
    let best: Scored | null = null;
    let bestValue = -Infinity;
    for (const s of scored) {
      if (out.includes(s.item) || conflicts(s.item, out)) continue;
      const value = s.base + s.sitScore * sitWeight + synergyScore(s.item, out, cls);
      if (value > bestValue) { best = s; bestValue = value; }
    }
    if (!best) break;
    out.push(best.item);
  }
  return out;
}

// Crit items only for marksmen (no Yun Tal on Garen).
function pickSituational(scored: Scored[], taken: Item[], cls: BuildClass): Scored[] {
  const situ: Scored[] = [];
  const candidates = scored.filter((x) => x.sitScore > 0 && x.base > 0.6 && (cls === 'marksman' || !('crit' in x.item.features.stats)));
  for (const s of [...candidates].sort((a, b) => (b.sitScore + b.base * 0.4) - (a.sitScore + a.base * 0.4))) {
    if (situ.length >= 5) break;
    if (!taken.includes(s.item) && !conflicts(s.item, [...taken, ...situ.map((x) => x.item)])) situ.push(s);
  }
  return situ;
}

// The threats of a request: static champion traits, then what the match shows.
function threatsOf(db: Db, req: BuildRequest, laner: Champion | null, weights: Record<string, number>): Threats {
  const enemies = (req.enemyIds || []).map((id) => (id ? db.byId[id] : undefined)).filter((c): c is Champion => !!c);
  const t = applyEnemyItems(db, analyzeThreats(laner, enemies, (e) => weights[e.id] || 1), req.enemyItems || null, weights);
  const allies = Object.values(req.allyItems || {}).flat();
  return { ...t, defence: enemyDefence(db, req), allyGrievous: allies.some((id) => !!db.itemById[id]?.features.flags.grievous) };
}

export function recommendBuild(db: Db, req: BuildRequest): Build {
  const champ = db.byId[req.championId];
  if (!champ) throw new Error(`Unknown champion ${req.championId}`);
  const enemyId = req.enemyId || null;
  const role = req.role || champ.positions[0];
  const laner = enemyId ? db.byId[enemyId] || null : null;
  const cls = classOf(champ, role);
  const weights = threatWeights(db, req.enemyStats || null, req.enemyItems || null);
  const t = threatsOf(db, req, laner, weights);
  const owned = new Set((req.ownedItems || []).filter((id) => db.itemById[id] && db.itemById[id].category === 'legendary'));

  const scored = scoreItems(db, champ, cls, t, req);
  const byItem = new Map(scored.map((s) => [s.item, s]));
  // Items already bought in game stay in the build (first) and are never replaced. In a
  // running match the situation weighs more, so the core adapts too (not only boots).
  const have = scored.filter((s) => owned.has(s.item.id)).map((s) => s.item);
  const start = grow(scored, have, 3, t.live ? 0.6 : 0.15, cls);
  // Buy order of the core: owned items first, then % penetration and multiplier items last.
  const core = start.slice(0, 3).sort((a, b) => (Number(owned.has(b.id)) - Number(owned.has(a.id))) || (lateItem(a) - lateItem(b)));
  const taken = [...core, ...start.slice(3)];
  const situ = pickSituational(scored, taken, cls);
  // In a running match the situation counts more: a fed burst enemy pulls Maw / Edge of Night in.
  const full = grow(scored, taken, 5, t.live ? 0.6 : 0.3, cls).slice(0, 5);
  // Why an item: the enemy situation, the player's history, and what it does with the rest.
  const reasonsOf = (item: Item): TextKey[] => {
    const s = byItem.get(item);
    const own = s ? [...s.sit, ...synergy(item, full.filter((x) => x !== item), cls)].filter((r) => r.v > 0).sort((a, b) => b.v - a.v) : [];
    return [...own.map((r) => ({ key: r.key, ...(r.params ? { params: r.params } : {}) })), ...(s ? s.learned : [])];
  };

  const build: Build = {
    championId: champ.id, enemyId, role, cls, threats: threatLines(t, weights),
    starters: pickStarters(db, cls, role, laner),
    boots: pickBoots(db, cls, t),
    core: core.map((item) => ({ id: item.id, stats: byItem.get(item)?.top || [], owned: owned.has(item.id), reasons: reasonsOf(item) })),
    situational: situ.map((s) => ({ id: s.item.id, reasons: reasonsOf(s.item) })),
    full: full.map((i) => i.id),
    order: [],
    ...recommendLoadout(db, { champ, cls, role, laner, threats: t }),
  };
  build.order = purchaseOrder(build);
  if (req.ownedItems) {
    build.next = nextPurchase(db, build, req.ownedItems, req.gold ?? null);
    const next = build.next && db.itemById[build.next.id];
    if (build.next && next) build.next.reasons = build.boots && next.id === build.boots.id ? [{ key: build.boots.reason }] : reasonsOf(next);
  }
  return build;
}
