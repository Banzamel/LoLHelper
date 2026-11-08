// Practice Tool and custom games: no assigned roles and possibly no enemies at all; the Draft,
// loading screen and match features still answer (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../helpers.ts';
import { normalizeSession } from '../../../src/core/lcu/champselect.ts';

const db = loadDatabase();
const keyOf = (id) => Number(db.byId[id].key);

// Champion select of the Practice Tool: the player alone, no assigned position, no enemies.
const practiceSelect = { localPlayerCellId: 0, myTeam: [{ cellId: 0, championId: keyOf('Ahri'), assignedPosition: '' }], theirTeam: [], actions: [] };

test('a champion select without assigned positions gives members without a role', () => {
  const draft = normalizeSession(practiceSelect, db);

  assert.deepStrictEqual([draft.myTeam[0].role, draft.myTeam[0].isMe, draft.theirTeam.length], [null, true, 0]);
});
