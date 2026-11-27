// Boots the Live Client API does not report (the 2026 role-quest slot, Magical Footwear boots).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../helpers.ts';
import { BootsTracker } from '../../../src/core/live/BootsTracker.ts';
import { nextPurchase } from '../../../src/core/engine/live/purchases.ts';
import type { LiveGame } from '../../../src/core/live/types.ts';

const db = loadDatabase();
const id = (n: string) => db.items.find((i) => i.nameEn === n)!.id;
const game = (t: number, items: number[], gold = 0, perks: number[] = [], scores = {}) => ({
  gameTime: t, allies: [], enemies: [],
  me: { items, gold, scores, runes: perks.length ? { primaryStyleId: 8000, subStyleId: 8300, selectedPerkIds: perks } : null },
}) as unknown as LiveGame;

test('boots once seen stay owned after the game stops listing them', () => {
  const tracker = new BootsTracker();
  const greaves = id("Berserker's Greaves");
  tracker.track(game(600, [greaves, id('Infinity Edge')]), db);
  const later = tracker.track(game(1500, [id('Infinity Edge')]), db);
  assert.deepStrictEqual(later.me!.hiddenBoots, { id: greaves, finished: true });
});

test('Magical Footwear boots count once granted, earlier with takedowns', () => {
  const tracker = new BootsTracker();
  assert.strictEqual(tracker.track(game(600, [], 0, [8304]), db).me!.hiddenBoots, undefined);
  // 4 takedowns: granted at 12:00 - 3:00 = 9:00.
  assert.deepStrictEqual(tracker.track(game(545, [], 0, [8304], { kills: 2, assists: 2 }), db).me!.hiddenBoots, { id: 2422, finished: false });
});

test('a big purchase that changed no visible item upgraded the hidden boots', () => {
  const tracker = new BootsTracker();
  const items = [id('Infinity Edge')];
  tracker.track(game(800, items, 1500, [8304]), db);
  assert.deepStrictEqual(tracker.track(game(803, items, 600, [8304]), db).me!.hiddenBoots, { id: null, finished: true });
});

test('hidden boots are not recommended again and take no inventory slot', () => {
  const legendaries = db.items.filter((i) => i.category === 'legendary').slice(0, 6).map((i) => i.id);
  const build = { full: legendaries.slice(0, 5), boots: { id: id("Sorcerer's Shoes"), upgrade: null, reason: '' } };
  assert.strictEqual(nextPurchase(db, build, legendaries.slice(0, 2), null, { id: null, finished: true })!.id, legendaries[1 + 1]);
  // Plain hidden boots: the upgrade is planned from them, even with six visible items.
  const next = nextPurchase(db, build, legendaries, null, { id: 2422, finished: false })!;
  assert.strictEqual(next.id, build.boots.id);
  assert.ok(next.parts.some((p) => p.owned));
});
