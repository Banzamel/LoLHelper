// The player's own inventory decides the next item to buy: the buy order, the recipe tree
// against what is owned, and the biggest part affordable right now.
import type { Db, Item } from '../../data/types.ts';
import type { Build, NextPurchase } from '../types.ts';

// Rune-granted Slightly Magical Boots count as plain Boots when planning purchases.
const ALIASES: Record<number, number> = { 2422: 1001 };
const isFinishedBoots = (it: Item | undefined) => !!it && (it.category === 'boots' || it.category === 'boots-upgrade');

export interface PlanNode {
  id: number;
  owned: boolean;
  // Gold still needed for this node.
  cost: number;
  children: PlanNode[];
}

// Buy order: first item, boots, then the rest (owned items keep their place at the front).
export function purchaseOrder(build: Pick<Build, 'full' | 'boots'>): number[] {
  const full = build.full.slice(0, 5);
  const boots = build.boots ? [build.boots.id] : [];
  return [...full.slice(0, 1), ...boots, ...full.slice(1)];
}

// The recipe tree of `id` against the inventory: owned parts are used up (each once) and
// cost nothing.
export function planItem(db: Db, id: number, owned: number[] | null): PlanNode {
  const inv = (owned || []).map((x) => ALIASES[x] || x);
  const take = (x: number) => { const i = inv.indexOf(x); if (i < 0) return false; inv.splice(i, 1); return true; };
  const walk = (x: number, top: boolean): PlanNode => {
    if (!top && take(x)) return { id: x, owned: true, cost: 0, children: [] };
    const it = db.itemById[x];
    const children = (it.from || []).filter((c) => db.itemById[c]).map((c) => walk(c, false));
    const cost = (children.length ? it.gold.base : it.gold.total) + children.reduce((s, c) => s + c.cost, 0);
    return { id: x, owned: false, cost, children };
  };
  return walk(id, true);
}

// What to buy now towards `node`: the whole item when affordable, else the most expensive
// missing part that fits in `gold` (null when even the cheapest part is too expensive).
function buyNow(node: PlanNode, gold: number): PlanNode | null {
  if (node.cost <= gold) return node;
  let best: PlanNode | null = null;
  const visit = (n: PlanNode) => n.children.forEach((c) => {
    if (c.owned) return;
    if (c.cost <= gold && (!best || c.cost > best.cost)) best = c;
    visit(c);
  });
  visit(node);
  return best;
}

// Next purchase: the first item of the buy order not owned yet, the part to buy for it now
// and its direct parts (owned or not).
export function nextPurchase(db: Db, build: Pick<Build, 'full' | 'boots'>, owned: number[] | null, gold: number | null = null): NextPurchase | null {
  const have = new Set(owned || []);
  const bootsDone = (owned || []).some((id) => isFinishedBoots(db.itemById[id]));
  for (const id of purchaseOrder(build)) {
    if (have.has(id) || !db.itemById[id]) continue;
    if (build.boots && id === build.boots.id && bootsDone) continue;
    const plan = planItem(db, id, owned);
    const buy = gold === null ? null : buyNow(plan, gold);
    return {
      id,
      cost: plan.cost,
      buy: buy ? { id: buy.id, cost: buy.cost } : null,
      parts: plan.children.map((c) => ({ id: c.id, owned: c.owned, cost: c.cost })),
    };
  }
  return null;
}
