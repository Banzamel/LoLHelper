// Engine tests on the bundled database (run `npm run fetch-data` first).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { COUNTERS } from '../../../../src/core/engine/knowledge/counters.ts';

const db = loadDatabase();

test('knowledge base uses valid Data Dragon ids', () => {
  const unknown = Object.entries(COUNTERS).flatMap(([k, list]) => [k, ...list]).filter((id) => !db.byId[id]);
  assert.deepStrictEqual([...new Set(unknown)], []);
});
