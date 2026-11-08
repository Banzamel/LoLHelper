// Runes, summoner spells, skill order and in-game adjustments (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { closestPage } from '../../../../src/core/engine/loadout/runePages.ts';

const db = loadDatabase();
const runeTree = Object.fromEntries(db.runes.trees.flatMap((t) => t.slots.flat().map((r) => [r.id, t.id])));
const spellKey = Object.fromEntries(db.summoners.map((s) => [s.id, s.key]));
const CASES = [['Jinx', 'Caitlyn', 'BOTTOM'], ['Darius', 'Teemo', 'TOP'], ['Syndra', 'Zed', 'MIDDLE'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Vi', 'LeeSin', 'JUNGLE'], ['Udyr', 'LeeSin', 'JUNGLE']];

test('the closest client-recommended rune page wins', () => {
  const page = (ks, primary, sub) => ({ primaryStyleId: primary, subStyleId: sub, selectedPerkIds: [ks, 1, 2, 3, 4, 5, 6, 7, 8] });
  const pages = [page(8005, 8000, 8300), page(8010, 8000, 8300), page(9923, 8100, 8000)];
  assert.strictEqual(closestPage(pages, page(8010, 8000, 8400)).selectedPerkIds[0], 8010);
  assert.strictEqual(closestPage([], page(8010, 8000, 8400)), null);
});
