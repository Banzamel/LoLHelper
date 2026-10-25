// Engine tests on the bundled database (run `npm run fetch-data` first).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { suggestCounters, championMatchups } = require('../src/main/engine/counters');
const { recommendBuild } = require('../src/main/engine/builds');
const { inferRoles } = require('../src/main/engine/roles');
const { COUNTERS } = require('../src/main/engine/knowledge');

const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));

test('knowledge base uses valid Data Dragon ids', () => {
  const unknown = Object.entries(COUNTERS).flatMap(([k, list]) => [k, ...list]).filter((id) => !db.byId[id]);
  assert.deepStrictEqual([...new Set(unknown)], []);
});

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

test('builds have starters, boots, core and six-slot full build', () => {
  for (const [c, e, role] of [['Jinx', 'Caitlyn', 'BOTTOM'], ['Malphite', 'Darius', 'TOP'], ['Lulu', 'Blitzcrank', 'SUPPORT'], ['Syndra', 'Ahri', 'MIDDLE'], ['Vi', 'LeeSin', 'JUNGLE']]) {
    const b = recommendBuild(db, { championId: c, enemyId: e, enemyIds: [e], role });
    assert.ok(b.starters.length >= 1, `${c} starters`);
    assert.ok(b.boots && db.itemById[b.boots.id], `${c} boots`);
    assert.strictEqual(b.core.length, 3, `${c} core`);
    assert.strictEqual(new Set(b.full).size, b.full.length, `${c} unique items`);
    assert.strictEqual(b.full.length, 5, `${c} full build`);
  }
});

test('anti-heal is suggested against healers', () => {
  const b = recommendBuild(db, { championId: 'Darius', enemyId: 'Aatrox', enemyIds: ['Aatrox', 'Soraka', 'Vladimir', 'Warwick', 'Yuumi'], role: 'TOP' });
  const ids = [...b.core, ...b.situational].map((x) => x.id);
  assert.ok(ids.some((id) => db.itemById[id].features.flags.grievous));
});

test('enemy roles are inferred one per position', () => {
  const roles = inferRoles(db, ['Jinx', 'Malphite', 'Thresh', 'LeeSin', 'Ahri'].map((id, i) => ({ cellId: i, championId: id })));
  assert.deepStrictEqual(Object.values(roles).sort(), ['BOTTOM', 'JUNGLE', 'MIDDLE', 'SUPPORT', 'TOP']);
  assert.strictEqual(roles[0], 'BOTTOM');
  assert.strictEqual(roles[2], 'SUPPORT');
});

test('matchups list strong and weak champions', () => {
  const m = championMatchups(db, 'Darius');
  assert.ok(m.weak.includes('Vayne'));
  assert.ok(m.strong.length > 0);
});
