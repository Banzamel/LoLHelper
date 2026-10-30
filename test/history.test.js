// Match recording and learning from the player's history (needs `npm run fetch-data`).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadDatabase } = require('../src/main/data/store');
const { MatchRecorder } = require('../src/main/history');
const { itemLessons, counterNudge } = require('../src/main/engine/history');
const { recommendBuild } = require('../src/main/engine/builds');

const db = loadDatabase(path.join(__dirname, '..', 'resources', 'data'));
const id = (n) => db.items.find((i) => i.nameEn === n).id;

function snapshot(items, gameTime, result = null) {
  const p = (championId, team, position) => ({ championId, team, position, name: `${championId}#1`, items: [], scores: {}, level: 10 });
  return {
    gameTime, result,
    me: { ...p('XinZhao', 'CHAOS', 'JUNGLE'), items, scores: { kills: 5, deaths: 2, assists: 7, creepScore: 150 } },
    allies: [p('XinZhao', 'CHAOS', 'JUNGLE'), p('Vex', 'CHAOS', 'MIDDLE')],
    enemies: [p('Warwick', 'ORDER', 'JUNGLE'), p('Sion', 'ORDER', 'TOP')],
  };
}

test('the recorder keeps the purchase timeline and the result', () => {
  const r = new MatchRecorder();
  r.update(snapshot([id('Phage')], 400), { queueId: 400 });
  r.update(snapshot([id('Trinity Force')], 900), { queueId: 400 });
  r.update(snapshot([id('Trinity Force'), id('Black Cleaver')], 1500, 'Win'), { queueId: 400 });
  const e = r.finish(db, null, 'JUNGLE');
  assert.strictEqual(e.win, true);
  assert.strictEqual(e.opponentId, 'Warwick');
  assert.deepStrictEqual(e.purchases.map((p) => db.itemById[p.id].nameEn), ['Trinity Force', 'Black Cleaver']);
  assert.deepStrictEqual(e.kda, { kills: 5, deaths: 2, assists: 7 });
  // Remakes and matches without a result are not saved.
  r.update(snapshot([], 120, 'Lose'), {});
  assert.strictEqual(r.finish(db, null, 'JUNGLE'), null);
  assert.strictEqual(new MatchRecorder().finish(db, { gameLength: 1800, teams: [{ isPlayerTeam: true, isWinningTeam: false }] }, 'TOP'), null);
});

test('a Practice Tool match is not recorded', () => {
  const r = new MatchRecorder();
  const practice = { queueId: -1, key: 'practice', supported: true, recorded: false };

  r.update(snapshot([id('Trinity Force')], 1500, 'Win'), practice);

  assert.strictEqual(r.finish(db, null, 'JUNGLE'), null);
});

test('a custom game is not recorded', () => {
  const r = new MatchRecorder();
  const custom = { queueId: -1, key: 'custom', supported: true, recorded: false };

  r.update(snapshot([id('Trinity Force')], 1500, 'Win'), custom);

  assert.strictEqual(r.match, null);
});

test('items won with in similar matches gain value, lost ones lose it', () => {
  const game = (win, items, opponentId = 'Warwick') => ({ championId: 'XinZhao', opponentId, win, items, enemies: [{ championId: opponentId }] });
  const cleaver = id('Black Cleaver');
  const eclipse = id('Eclipse');
  const history = [game(true, [eclipse]), game(true, [eclipse]), game(false, [cleaver]), game(false, [cleaver]), game(false, [cleaver])];
  const l = itemLessons(history, { championId: 'XinZhao', enemyId: 'Warwick', enemyIds: ['Warwick'] });
  assert.ok(l[eclipse].bonus > 0 && l[cleaver].bonus < 0);
  const plain = recommendBuild(db, { championId: 'XinZhao', enemyId: 'Warwick', role: 'JUNGLE' });
  const learned = recommendBuild(db, { championId: 'XinZhao', enemyId: 'Warwick', role: 'JUNGLE', history });
  assert.ok(plain.core.some((c) => c.id === cleaver));
  assert.ok(learned.full.indexOf(eclipse) >= 0);
  assert.ok(learned.core.some((c) => c.reasons.some((r) => r.key === 'build.historyWin')) || learned.full.includes(eclipse));
  assert.ok(counterNudge(history, 'XinZhao', 'Warwick').delta < 0);
  assert.strictEqual(counterNudge(history, 'Garen', 'Teemo'), null);
});
