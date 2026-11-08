// One-on-one matchups, blind-pick safety and what a pick adds to the team.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { blindScore, counterList, matchup } from '../../../../src/core/engine/counters/matchup.ts';
import { enemyTeamFit, poolBonus, teamNeeds } from '../../../../src/core/engine/counters/teamFit.ts';
import { ARCH_BEATS } from '../../../../src/core/engine/knowledge/archetypes.ts';

const db = loadDatabase();
const c = (id: string) => db.byId[id];

test('a curated counter scores above 50 with its reason', () => {
  const m = matchup(c('Vayne'), c('Darius'), 'TOP', {});
  assert.ok(m.score > 50);
  assert.ok(m.reasons.some((r) => r.key === 'reason.knownCounter'));
});

test('the player\'s overrides replace the curated counters', () => {
  assert.deepStrictEqual(counterList('Darius', { Darius: ['Teemo'] }), ['Teemo']);
  assert.ok(matchup(c('Teemo'), c('Darius'), 'TOP', { Darius: ['Teemo'] }).reasons.some((r) => r.key === 'reason.knownCounter'));
});

test('blind picks start at 60 and every archetype in the table is known', () => {
  assert.ok(Math.abs(blindScore(c('Garen'), {}).score - 60) <= 10);
  const known = new Set(db.champions.flatMap((x) => x.archetypes));
  assert.deepStrictEqual(Object.keys(ARCH_BEATS).filter((a) => !known.has(a) && a !== 'SPECIALIST'), []);
});

test('an AP pick is wanted next to an AD team, the pool and mastery count', () => {
  assert.ok(teamNeeds(c('Syndra'), ['Darius', 'Zed', 'Jinx'].map(c)).some((r) => r.key === 'reason.teamNeedsAP'));
  assert.ok(enemyTeamFit(c('Vayne'), [c('Darius')], {}).some((r) => r.key === 'reason.goodVsOthers'));
  const bonus = poolBonus(c('Ahri'), 'MIDDLE', { MIDDLE: ['Ahri'] }, { [c('Ahri').key]: 120000 });
  assert.deepStrictEqual(bonus.map((r) => r.key), ['reason.inPool', 'reason.mastery']);
});
