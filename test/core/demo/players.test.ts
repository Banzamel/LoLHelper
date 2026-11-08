// The simulated match's players: roster with ranks and invented profiles.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../helpers.ts';
import { isDemoPuuid, player, roster } from '../../../src/core/demo/players.ts';

const db = loadDatabase();

test('the roster has ten players with roles and demo puuids', () => {
  const r = roster();
  assert.strictEqual(r.length, 10);
  assert.ok(r.every((p) => p.position && isDemoPuuid(p.puuid)));
  assert.strictEqual(isDemoPuuid('real-puuid'), false);
});

test('a demo profile is the same every time and unknown names have none', () => {
  const a = player(db, 'demo-Shuriken');
  const b = player(db, 'demo-Shuriken');
  assert.strictEqual(a!.games.length, 20);
  assert.deepStrictEqual(a!.games.map((g) => g.players[0].win), b!.games.map((g) => g.players[0].win));
  assert.strictEqual(player(db, 'demo-Nobody'), null);
});
