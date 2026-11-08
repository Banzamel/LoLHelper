// Choosing and loading the active database (downloaded or bundled).
import { test } from 'vitest';
import assert from 'node:assert';
import { chooseDatabase, compareVersions, loadDatabase, readMeta, SCHEMA } from '../../../src/core/data/store.ts';
import type { DbMeta } from '../../../src/core/data/types.ts';

const meta = (version: string, schema = SCHEMA): DbMeta => ({ version, schema, builtAt: '', champions: 0, items: 0 });

test('versions compare part by part', () => {
  assert.ok(compareVersions('15.10.1', '15.9.1') > 0);
  assert.strictEqual(compareVersions('15.9', '15.9.0'), 0);
});

test('the downloaded database wins when it is at least as new as the bundled one', () => {
  assert.strictEqual(chooseDatabase(meta('15.10.1'), meta('15.9.1')), 'user');
  assert.strictEqual(chooseDatabase(meta('15.9.1'), meta('15.10.1')), 'bundled');
  assert.strictEqual(chooseDatabase(meta('15.9.1'), meta('15.9.1')), 'user');
});

test('a database of an older layout is ignored', () => {
  assert.strictEqual(chooseDatabase(meta('16.1.1', 1), meta('15.9.1')), 'bundled');
  assert.strictEqual(chooseDatabase(null, meta('15.9.1', 1)), null);
});

test('a database loads with lookup tables and survives missing files', async () => {
  const files: Record<string, string> = {
    'meta.json': JSON.stringify(meta('15.9.1')),
    'champions.json': JSON.stringify([{ id: 'Ahri', key: 103 }]),
    'items.json': JSON.stringify([{ id: 1001, nameEn: 'Boots' }]),
  };
  const db = await loadDatabase(async (name) => files[name] ?? null);
  assert.strictEqual(db.byKey[103].id, 'Ahri');
  assert.strictEqual(db.itemById[1001].nameEn, 'Boots');
  assert.deepStrictEqual([db.runes.trees, db.summoners], [[], []]);
  assert.strictEqual((await readMeta(async () => 'not json')), null);
});
