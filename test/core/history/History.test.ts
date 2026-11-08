// The recorded match history per profile, and the storage helpers it writes through.
import { test } from 'vitest';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, nodeStorage, tempDir } from '../../helpers.ts';
import { History } from '../../../src/core/history/History.ts';
import type { HistoryEntry } from '../../../src/core/history/types.ts';
import { joinPath, queueWrite, readJson } from '../../../src/core/shared/storage.ts';

const entry = (id: string) => fixture<HistoryEntry>({ id, championId: 'Ahri', items: [], enemies: [], win: true });
const settle = () => new Promise((r) => setTimeout(r, 20));

test('matches are added once, newest first, removed and cleared', async () => {
  const root = tempDir();
  const history = await new History(nodeStorage(root)).use('profiles/a');
  assert.strictEqual(history.add(entry('1')), true);
  assert.strictEqual(history.add(entry('1')), false);
  history.add(entry('2'));
  assert.deepStrictEqual(history.list().map((g) => g.id), ['2', '1']);
  history.remove('2');
  await settle();
  assert.deepStrictEqual((await new History(nodeStorage(root)).use('profiles/a')).list().map((g) => g.id), ['1']);
  history.clear();
  assert.deepStrictEqual(history.list(), []);
});

test('a history from before profiles moves to the first profile', async () => {
  const root = tempDir();
  fs.writeFileSync(path.join(root, 'history.json'), JSON.stringify([entry('9')]));
  const history = await new History(nodeStorage(root)).use('profiles/a', '');
  assert.deepStrictEqual([history.list().length, fs.existsSync(path.join(root, 'history.json'))], [1, false]);
});

test('queued writes land in order and a broken file reads as the fallback', async () => {
  const storage = nodeStorage(tempDir());
  void queueWrite(storage, 'x.json', '1');
  await queueWrite(storage, 'x.json', '2');
  assert.strictEqual(await readJson(storage, 'x.json', 0), 2);
  await storage.write('bad.json', '{');
  assert.strictEqual(await readJson(storage, 'bad.json', 'fallback'), 'fallback');
  assert.strictEqual(joinPath('', 'a', null, 'b.json'), 'a/b.json');
});
