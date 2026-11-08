// Match recording and learning from the player's history (needs `npm run fetch-data`).
import { test } from 'vitest';
import type { LearningEntry } from '../../../../src/core/engine/types.ts';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../../helpers.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';
import { itemLessons, counterNudge } from '../../../../src/core/engine/history/learning.ts';

const db = loadDatabase();
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

test('items won with in similar matches gain value, lost ones lose it', () => {
  const game = (win, items, opponentId = 'Warwick') => fixture<LearningEntry>({ championId: 'XinZhao', opponentId, win, items, enemies: [{ championId: opponentId }] });
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
