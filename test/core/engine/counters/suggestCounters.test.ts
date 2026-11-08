// Engine tests on the bundled database (run `npm run fetch-data` first).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { suggestCounters, championMatchups } from '../../../../src/core/engine/counters/suggestCounters.ts';
import { COUNTERS } from '../../../../src/core/engine/knowledge/counters.ts';

const db = loadDatabase();

// Practice Tool and custom games: no assigned roles and possibly no enemies at all; the Draft,
// loading screen and match features still answer (needs `npm run fetch-data`).

const keyOf = (id) => Number(db.byId[id].key);

// Champion select of the Practice Tool: the player alone, no assigned position, no enemies.
const practiceSelect = { localPlayerCellId: 0, myTeam: [{ cellId: 0, championId: keyOf('Ahri'), assignedPosition: '' }], theirTeam: [], actions: [] };

test('counters respect role and exclusions', () => {
  const recs = suggestCounters(db, { role: 'TOP', enemyId: 'Darius', excludeIds: ['Vayne'] });
  assert.ok(recs.length > 0);
  assert.ok(recs.every((r) => db.byId[r.id].positions.includes('TOP')));
  assert.ok(!recs.some((r) => r.id === 'Vayne' || r.id === 'Darius'));
  assert.ok(recs[0].score >= recs[recs.length - 1].score);
});

test('known counters rank high', () => {
  const ids = suggestCounters(db, { role: 'MIDDLE', enemyId: 'Zed', limit: 8 }).map((r) => r.id);
  assert.ok(ids.some((id) => COUNTERS.Zed.includes(id)));
});

test('blind pick works without an opponent', () => {
  assert.ok(suggestCounters(db, { role: 'SUPPORT' }).length > 0);
});

test('matchups list strong and weak champions', () => {
  const m = championMatchups(db, 'Darius');
  assert.ok(m.weak.includes('Vayne'));
  assert.ok(m.strong.length > 0);
});

test('counter-picks without enemies are blind picks for the chosen role', () => {
  const recs = suggestCounters(db, { enemyId: null, role: 'JUNGLE', enemyIds: [] });

  assert.ok(recs.length > 0, 'blind picks');
});
