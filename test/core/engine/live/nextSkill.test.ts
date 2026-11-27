// The next skill-up in a running match.
import { test } from 'vitest';
import assert from 'node:assert';
import { nextSkill } from '../../../../src/core/engine/live/nextSkill.ts';

const order = ['Q', 'W', 'E', 'Q', 'Q', 'R', 'Q', 'W', 'Q', 'W', 'R', 'W', 'W', 'E', 'E', 'R', 'E', 'E'];
const build = { skills: { levels: order } } as never;

test('at the start of the game the first skill is taken at level 1', () => {
  assert.deepStrictEqual(nextSkill(build, 1, { Q: 0, W: 0, E: 0, R: 0 }), { key: 'Q', level: 1 });
  assert.deepStrictEqual(nextSkill(build, 1, null), { key: 'Q', level: 1 });
});

test('after spending the point the next one is for the next level', () => {
  assert.deepStrictEqual(nextSkill(build, 1, { Q: 1, W: 0, E: 0, R: 0 }), { key: 'W', level: 2 });
  assert.deepStrictEqual(nextSkill(build, 6, { Q: 3, W: 1, E: 1, R: 0 }), { key: 'R', level: 6 });
});

test('the order is followed against what the player really levelled', () => {
  // Q then E instead of Q then W: W is still missing.
  assert.deepStrictEqual(nextSkill(build, 3, { Q: 1, W: 0, E: 1, R: 0 }), { key: 'W', level: 3 });
});

test('nothing left at level 18', () => {
  assert.strictEqual(nextSkill(build, 18, { Q: 5, W: 5, E: 5, R: 3 }), null);
});
