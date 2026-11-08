// Fight roles of champions used by the briefs, ally tips and compositions.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { classOfChampion, hasCC, isFrontline, isHyperCarry, isSquishyCarry } from '../../../../src/core/engine/team/predicates.ts';
import { BRIEFS, KEYSTONE_TIPS } from '../../../../src/core/engine/knowledge/tips.ts';

const db = loadDatabase();

test('fight roles follow archetypes and ratings', () => {
  assert.strictEqual(isHyperCarry(db.byId.Jinx), true);
  assert.strictEqual(isFrontline(db.byId.Malphite), true);
  assert.strictEqual(isSquishyCarry(db.byId.Malphite), false);
  assert.strictEqual(hasCC(null), false);
  assert.notStrictEqual(classOfChampion(db.byId.Lulu), 'OTHER');
});

test('the curated tables are not empty', () => {
  assert.ok(Object.keys(BRIEFS).length > 0 && KEYSTONE_TIPS.length > 0);
});
