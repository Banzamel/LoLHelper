// Build classes and the champion archetype check they rely on.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { classOf } from '../../../../src/core/engine/builds/classOf.ts';
import { hasArchetype } from '../../../../src/core/engine/archetypes.ts';

const db = loadDatabase();

test('champions get the build class of their kit', () => {
  const cases: [string, string, string][] = [['Jinx', 'BOTTOM', 'marksman'], ['Lulu', 'SUPPORT', 'enchanter'], ['Malphite', 'TOP', 'tank'],
    ['Leona', 'SUPPORT', 'support-tank'], ['Zed', 'MIDDLE', 'assassin-ad'], ['Syndra', 'MIDDLE', 'mage-burst'], ['Darius', 'TOP', 'bruiser']];
  assert.deepStrictEqual(cases.map(([id, role]) => classOf(db.byId[id], role)), cases.map(([, , cls]) => cls));
});

test('an archetype check is false for a missing champion', () => {
  assert.strictEqual(hasArchetype(null, ['MARKSMAN']), false);
  assert.strictEqual(hasArchetype(db.byId.Jinx, ['MARKSMAN']), true);
});
