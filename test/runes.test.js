// Rune guide (engine/runes.js): keystone tips, predicted and real enemy keystones. Runs on the
// bundled database (run `npm run fetch-data` first) and checks the lang files.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { keystoneTip, predictKeystone, enemyKeystones, runeGuide } = require('../src/main/engine/runes');
const { KEYSTONE_TIPS } = require('../src/main/engine/knowledge');

const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));
const LANGS = ['pl', 'en'].map((code) => require(`../src/renderer/lang/${code}.json`));
const KEYSTONES = db.runes.trees.flatMap((tree) => tree.slots[0]);
const keystoneId = (key) => KEYSTONES.find((r) => r.key === key).id;
const isKeystone = (id) => KEYSTONES.some((r) => r.id === id);

const ELECTROCUTE = keystoneId('Electrocute');
const CONQUEROR = keystoneId('Conqueror');
const NOT_A_KEYSTONE = db.runes.trees[0].slots[1][0].id;

test('every keystone in the database has curated tips', () => {
  const missing = KEYSTONES.filter((r) => !KEYSTONE_TIPS.includes(r.key)).map((r) => r.key);

  assert.deepStrictEqual(missing, []);
});

test('every keystone tip text exists in every language', () => {
  const keys = KEYSTONES.flatMap((r) => { const tip = keystoneTip(db, r.id); return [tip.use, tip.watch]; });

  const missing = LANGS.flatMap((lang) => keys.filter((k) => !lang[k]));

  assert.deepStrictEqual(missing, []);
});

test('a keystone tip holds the use and watch keys of the keystone', () => {
  const tip = keystoneTip(db, ELECTROCUTE);

  assert.deepStrictEqual(tip, { id: ELECTROCUTE, use: 'rune.use.Electrocute', watch: 'rune.watch.Electrocute' });
});

test('an unknown rune id has no keystone tip', () => {
  assert.strictEqual(keystoneTip(db, 123456), null);
});

test('a rune outside the keystone row has no keystone tip', () => {
  assert.strictEqual(keystoneTip(db, NOT_A_KEYSTONE), null);
});

test('a burst mage is predicted to play Electrocute', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Syndra, 'MIDDLE'), ELECTROCUTE);
});

test('an artillery mage is predicted to play Arcane Comet', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Xerath, 'MIDDLE'), keystoneId('ArcaneComet'));
});

test('a marksman is predicted to play Lethal Tempo', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Jinx, 'BOTTOM'), keystoneId('LethalTempo'));
});

test('a top lane tank is predicted to play Grasp of the Undying', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Malphite, 'TOP'), keystoneId('GraspOfTheUndying'));
});

test('a jungle tank is predicted to play Aftershock', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Sejuani, 'JUNGLE'), keystoneId('Aftershock'));
});

test('an assassin is predicted to play Electrocute', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Zed, 'MIDDLE'), ELECTROCUTE);
});

test('an enchanter is predicted to play Summon Aery', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Janna, 'SUPPORT'), keystoneId('SummonAery'));
});

test('without a role the prediction uses the champion\'s main position', () => {
  assert.strictEqual(predictKeystone(db, db.byId.Sejuani), predictKeystone(db, db.byId.Sejuani, db.byId.Sejuani.positions[0]));
});

test('an unknown champion has no predicted keystone', () => {
  assert.strictEqual(predictKeystone(db, null, 'MIDDLE'), null);
});

test('every champion in the database gets a predicted keystone of the database', () => {
  const invalid = db.champions.filter((c) => !isKeystone(predictKeystone(db, c))).map((c) => c.id);

  assert.deepStrictEqual(invalid, []);
});

test('an enemy\'s real keystone wins over the prediction', () => {
  const [enemy] = enemyKeystones(db, [{ championId: 'Syndra', role: 'MIDDLE', keystone: CONQUEROR }]);

  assert.deepStrictEqual(enemy, { championId: 'Syndra', role: 'MIDDLE', keystone: CONQUEROR, predicted: false, watch: 'rune.watch.Conqueror' });
});

test('an enemy without a real keystone gets the predicted one, marked as predicted', () => {
  const [enemy] = enemyKeystones(db, [{ championId: 'Syndra', role: 'MIDDLE' }]);

  assert.deepStrictEqual(enemy, { championId: 'Syndra', role: 'MIDDLE', keystone: ELECTROCUTE, predicted: true, watch: 'rune.watch.Electrocute' });
});

test('an enemy keystone id that is not a keystone falls back to the prediction', () => {
  const [enemy] = enemyKeystones(db, [{ championId: 'Syndra', role: 'MIDDLE', keystone: NOT_A_KEYSTONE }]);

  assert.strictEqual(enemy.predicted, true);
});

test('empty slots and unknown champions are left out of the enemy keystones', () => {
  const enemies = enemyKeystones(db, [null, { championId: null }, { championId: 'NotAChampion' }, { championId: 'Zed' }]);

  assert.deepStrictEqual(enemies.map((e) => e.championId), ['Zed']);
});

test('the rune guide holds tips for the shown keystones and skips unknown ones', () => {
  const guide = runeGuide(db, { keystones: [ELECTROCUTE, 123456], enemies: [] });

  assert.deepStrictEqual(Object.keys(guide.tips), [String(ELECTROCUTE)]);
});

test('an empty rune guide query gives no tips and no enemies', () => {
  assert.deepStrictEqual(runeGuide(db), { tips: {}, enemies: [] });
});
