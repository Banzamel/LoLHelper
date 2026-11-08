// Item build recommendation. Items are scored from their parsed stats against the
// champion's class weights, then adjusted for the enemy laner and enemy team threats
// (damage type, healing, tanks, burst, crowd control, auto-attackers, shields).
import type { Champion, Db, Item } from '../../data/types.ts';
import { recommendLoadout } from '../loadout/recommendLoadout.ts';
import { itemLessons } from '../history/learning.ts';
import { applyEnemyItems, threatWeights } from '../live/enemyItems.ts';
import { nextPurchase, purchaseOrder } from '../live/purchases.ts';
import type { Build, BuildClass, BuildRequest, Threats } from '../types.ts';
import { classOf } from './classOf.ts';
import { baseScore, conflicts, coreBonus, lateItem, situational, WEIGHTS, type SituationalReason } from './itemScoring.ts';
import { pickBoots, pickStarters } from './starters.ts';
import { analyzeThreats, threatLines } from './threats.ts';

interface Scored {
  item: Item;
  base: number;
  top: string[];
  sit: SituationalReason[];
  learned: { key: string; params: Record<string, number> }[];
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
    return { item, base: base.score + coreBonus(item, cls) + (lesson ? lesson.bonus : 0), top: base.top, sit, learned, sitScore: sit.reduce((s, r) => s + r.v, 0) };
  });
}

const ranked = (list: Scored[], sitWeight: number, baseWeight = 1) =>
  [...list].sort((a, b) => (b.base * baseWeight + b.sitScore * sitWeight) - (a.base * baseWeight + a.sitScore * sitWeight));

// Items already bought in game stay in the build (ranked first) and are never replaced. In a
// running match the situation weighs more, so the core adapts too (not only boots).
function pickCore(scored: Scored[], owned: Set<number>, t: Threats): Scored[] {
  const core = scored.filter((s) => owned.has(s.item.id)).slice(0, 3);
  for (const s of ranked(scored, t.live ? 0.6 : 0.15)) {
    if (core.length >= 3) break;
    if (!core.includes(s) && !conflicts(s.item, core.map((c) => c.item))) core.push(s);
  }
  // Buy order: owned items first, then % penetration and multiplier items last.
  return core.sort((a, b) => (Number(owned.has(b.item.id)) - Number(owned.has(a.item.id))) || (lateItem(a.item) - lateItem(b.item)));
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

// In a running match the situation counts more: a fed burst enemy pulls Maw / Edge of Night in.
function fillFull(scored: Scored[], taken: Item[], t: Threats): Item[] {
  const full = [...taken];
  for (const s of ranked(scored, t.live ? 0.6 : 0.3).filter((x) => !taken.includes(x.item))) {
    if (full.length >= 5) break;
    if (!conflicts(s.item, full)) full.push(s.item);
  }
  return full;
}

export function recommendBuild(db: Db, req: BuildRequest): Build {
  const champ = db.byId[req.championId];
  if (!champ) throw new Error(`Unknown champion ${req.championId}`);
  const enemyId = req.enemyId || null;
  const role = req.role || champ.positions[0];
  const laner = enemyId ? db.byId[enemyId] || null : null;
  const enemies = (req.enemyIds || []).map((id) => (id ? db.byId[id] : undefined)).filter((c): c is Champion => !!c);
  const cls = classOf(champ, role);
  const weights = threatWeights(db, req.enemyStats || null, req.enemyItems || null);
  const t = applyEnemyItems(db, analyzeThreats(laner, enemies, (e) => weights[e.id] || 1), req.enemyItems || null, weights);
  const owned = new Set((req.ownedItems || []).filter((id) => db.itemById[id] && db.itemById[id].category === 'legendary'));

  const scored = scoreItems(db, champ, cls, t, req);
  const core = pickCore(scored, owned, t);
  const taken = core.map((c) => c.item);
  for (const s of scored) if (owned.has(s.item.id) && !taken.includes(s.item)) taken.push(s.item);
  const situ = pickSituational(scored, taken, cls);
  const full = fillFull(scored, taken, t);
  const reasonsOf = (s: Scored) => [...s.sit.map((r) => ({ key: r.key })), ...s.learned];

  const build: Build = {
    championId: champ.id, enemyId, role, cls, threats: threatLines(t, weights),
    starters: pickStarters(db, cls, role, laner),
    boots: pickBoots(db, cls, t),
    core: core.map((c) => ({ id: c.item.id, stats: c.top, owned: owned.has(c.item.id), reasons: reasonsOf(c) })),
    situational: situ.map((s) => ({ id: s.item.id, reasons: reasonsOf(s) })),
    full: full.slice(0, 5).map((i) => i.id),
    order: [],
    ...recommendLoadout(db, { champ, cls, role, laner, threats: t }),
  };
  build.order = purchaseOrder(build);
  if (req.ownedItems) build.next = nextPurchase(db, build, req.ownedItems, req.gold ?? null);
  return build;
}
