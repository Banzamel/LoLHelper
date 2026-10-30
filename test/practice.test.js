// Practice Tool and custom games: no assigned roles and possibly no enemies at all; the Draft,
// loading screen and match features still answer (needs `npm run fetch-data`).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { normalizeSession } = require('../src/main/lcu/champselect');
const { inferRoles } = require('../src/main/engine/roles');
const { teamNotes } = require('../src/main/engine/team');
const { runeGuide } = require('../src/main/engine/runes');
const { recommendBuild } = require('../src/main/engine/builds');
const { suggestCounters } = require('../src/main/engine/counters');

const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));
const keyOf = (id) => Number(db.byId[id].key);

// Champion select of the Practice Tool: the player alone, no assigned position, no enemies.
const practiceSelect = { localPlayerCellId: 0, myTeam: [{ cellId: 0, championId: keyOf('Ahri'), assignedPosition: '' }], theirTeam: [], actions: [] };

test('a champion select without assigned positions gives members without a role', () => {
  const draft = normalizeSession(practiceSelect, db);

  assert.deepStrictEqual([draft.myTeam[0].role, draft.myTeam[0].isMe, draft.theirTeam.length], [null, true, 0]);
});

test('roles of an empty enemy team are inferred as none', () => {
  assert.deepStrictEqual(inferRoles(db, []), {});
});

test('allies without roles get inferred roles', () => {
  const roles = inferRoles(db, [{ cellId: 1, championId: 'Jinx', role: null }, { cellId: 2, championId: 'Thresh', role: null }]);

  assert.deepStrictEqual(roles, { 1: 'BOTTOM', 2: 'SUPPORT' });
});

test('team notes for a player alone hold the brief and no composition', () => {
  const notes = teamNotes(db, { me: { championId: 'Ahri', role: 'MIDDLE' }, allies: [], enemies: [] });

  assert.deepStrictEqual([Object.keys(notes.briefs), notes.composition.enemies, notes.allyTips.length], [['Ahri'], null, 0]);
});

test('team notes for allies without roles still hold the ally composition', () => {
  const allies = ['Malphite', 'Orianna', 'Jinx', 'Leona'].map((championId) => ({ championId, role: null }));

  const notes = teamNotes(db, { me: { championId: 'Amumu', role: 'JUNGLE' }, allies, enemies: [] });

  assert.ok(notes.composition.allies, 'ally composition');
});

test('the rune guide without enemies has only the shown keystone tips', () => {
  const guide = runeGuide(db, { keystones: [8112], enemies: [] });

  assert.deepStrictEqual([Object.keys(guide.tips), guide.enemies], [['8112'], []]);
});

test('a build without enemies is still complete', () => {
  const build = recommendBuild(db, { championId: 'Ahri', enemyId: null, enemyIds: [], role: 'MIDDLE', enemyItems: {}, enemyStats: {}, ownedItems: [], gold: 500 });

  assert.ok(build.core.length > 0 && build.starters.length > 0, 'core and starters');
});

test('counter-picks without enemies are blind picks for the chosen role', () => {
  const recs = suggestCounters(db, { enemyId: null, role: 'JUNGLE', enemyIds: [] });

  assert.ok(recs.length > 0, 'blind picks');
});
