// Engine tests on the bundled database (run `npm run fetch-data` first).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../helpers.ts';
import { inferRoles } from '../../../src/core/engine/roles.ts';
import { teamNotes } from '../../../src/core/engine/team/teamNotes.ts';

const db = loadDatabase();

// Practice Tool and custom games: no assigned roles and possibly no enemies at all; the Draft,
// loading screen and match features still answer (needs `npm run fetch-data`).

const keyOf = (id) => Number(db.byId[id].key);

// Champion select of the Practice Tool: the player alone, no assigned position, no enemies.
const practiceSelect = { localPlayerCellId: 0, myTeam: [{ cellId: 0, championId: keyOf('Ahri'), assignedPosition: '' }], theirTeam: [], actions: [] };

test('enemy roles are inferred one per position', () => {
  const roles = inferRoles(db, ['Jinx', 'Malphite', 'Thresh', 'LeeSin', 'Ahri'].map((id, i) => ({ cellId: i, championId: id, role: null })));
  assert.deepStrictEqual(Object.values(roles).sort(), ['BOTTOM', 'JUNGLE', 'MIDDLE', 'SUPPORT', 'TOP']);
  assert.strictEqual(roles[0], 'BOTTOM');
  assert.strictEqual(roles[2], 'SUPPORT');
});

test('roles of an empty enemy team are inferred as none', () => {
  assert.deepStrictEqual(inferRoles(db, []), {});
});

test('allies without roles get inferred roles', () => {
  const roles = inferRoles(db, [{ cellId: 1, championId: 'Jinx', role: null }, { cellId: 2, championId: 'Thresh', role: null }]);

  assert.deepStrictEqual(roles, { 1: 'BOTTOM', 2: 'SUPPORT' });
});

test('team notes for allies without roles still hold the ally composition', () => {
  const allies = ['Malphite', 'Orianna', 'Jinx', 'Leona'].map((championId) => ({ championId, role: null }));

  const notes = teamNotes(db, { me: { championId: 'Amumu', role: 'JUNGLE' }, allies, enemies: [] });

  assert.ok(notes.composition.allies, 'ally composition');
});
