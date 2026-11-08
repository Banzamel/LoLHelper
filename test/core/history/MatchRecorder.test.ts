// Match recording and learning from the player's history (needs `npm run fetch-data`).
import { test } from 'vitest';
import type { GameMode } from '../../../src/core/lcu/types.ts';
import type { LiveGame } from '../../../src/core/live/types.ts';
import assert from 'node:assert';
import { loadDatabase, fixture } from '../../helpers.ts';
import { MatchRecorder } from '../../../src/core/history/MatchRecorder.ts';

const db = loadDatabase();
const id = (n) => db.items.find((i) => i.nameEn === n).id;

function snapshot(items, gameTime, result = null) {
  const p = (championId, team, position) => ({ championId, team, position, name: `${championId}#1`, items: [], scores: {}, level: 10 });
  return fixture<LiveGame>({
    gameTime, result,
    me: { ...p('XinZhao', 'CHAOS', 'JUNGLE'), items, scores: { kills: 5, deaths: 2, assists: 7, creepScore: 150 } },
    allies: [p('XinZhao', 'CHAOS', 'JUNGLE'), p('Vex', 'CHAOS', 'MIDDLE')],
    enemies: [p('Warwick', 'ORDER', 'JUNGLE'), p('Sion', 'ORDER', 'TOP')],
  });
}

test('the recorder keeps the purchase timeline and the result', () => {
  const r = new MatchRecorder();
  r.update(snapshot([id('Phage')], 400), fixture({ queueId: 400 }));
  r.update(snapshot([id('Trinity Force')], 900), fixture({ queueId: 400 }));
  r.update(snapshot([id('Trinity Force'), id('Black Cleaver')], 1500, 'Win'), fixture({ queueId: 400 }));
  const e = r.finish(db, null, 'JUNGLE');
  assert.strictEqual(e.win, true);
  assert.strictEqual(e.opponentId, 'Warwick');
  assert.deepStrictEqual(e.purchases.map((p) => db.itemById[p.id].nameEn), ['Trinity Force', 'Black Cleaver']);
  assert.deepStrictEqual(e.kda, { kills: 5, deaths: 2, assists: 7 });
  // Remakes and matches without a result are not saved.
  r.update(snapshot([], 120, 'Lose'), fixture({}));
  assert.strictEqual(r.finish(db, null, 'JUNGLE'), null);
  assert.strictEqual(new MatchRecorder().finish(db, { gameLength: 1800, teams: [{ isPlayerTeam: true, isWinningTeam: false }] }, 'TOP'), null);
});

test('a Practice Tool match is not recorded', () => {
  const r = new MatchRecorder();
  const practice = fixture<GameMode>({ queueId: -1, key: 'practice', supported: true, recorded: false });

  r.update(snapshot([id('Trinity Force')], 1500, 'Win'), practice);

  assert.strictEqual(r.finish(db, null, 'JUNGLE'), null);
});

test('a custom game is not recorded', () => {
  const r = new MatchRecorder();
  const custom = fixture<GameMode>({ queueId: -1, key: 'custom', supported: true, recorded: false });

  r.update(snapshot([id('Trinity Force')], 1500, 'Win'), custom);

  assert.strictEqual(r.match, null);
});
