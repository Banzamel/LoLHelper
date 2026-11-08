// The account shown at launch: the one last played on this computer, from the profile folders,
// and its label in the lang files.
import { test } from 'vitest';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lastPlayedAccount } from '../src/core/profiles.ts';
import { nodeStorage } from './helpers.ts';
import en from '../src/lang/en.json';
import pl from '../src/lang/pl.json';


const profilesDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lolh-profiles-'));

// Writes `<dir>/<folder>/account.json`; `mtime` (a Date) sets its modification time.
function writeAccount(dir, folder, content, mtime = null) {
  const file = path.join(dir, folder, 'account.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  if (mtime) fs.utimesSync(file, mtime, mtime);
}

test('the account seen most recently in the client is the last played', async () => {
  const dir = profilesDir();
  writeAccount(dir, 'a', { puuid: 'a', gameName: 'Older', lastSeenAt: '2026-10-28T20:00:00.000Z' });
  writeAccount(dir, 'b', { puuid: 'b', gameName: 'Newer', lastSeenAt: '2026-10-30T20:00:00.000Z' });

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.deepStrictEqual(account, { puuid: 'b', gameName: 'Newer', lastSeenAt: '2026-10-30T20:00:00.000Z' });
});

test('the time an account was seen wins over a newer file modification time', async () => {
  const dir = profilesDir();
  writeAccount(dir, 'a', { puuid: 'a', lastSeenAt: '2026-10-30T20:00:00.000Z' }, new Date('2026-10-01T00:00:00Z'));
  writeAccount(dir, 'b', { puuid: 'b', lastSeenAt: '2026-10-29T20:00:00.000Z' }, new Date('2026-10-31T00:00:00Z'));

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account.puuid, 'a');
});

test('accounts saved without a seen time fall back to the file modification time', async () => {
  const dir = profilesDir();
  writeAccount(dir, 'a', { puuid: 'a' }, new Date('2026-10-30T20:00:00Z'));
  writeAccount(dir, 'b', { puuid: 'b' }, new Date('2026-10-28T20:00:00Z'));
  writeAccount(dir, 'c', { puuid: 'c', lastSeenAt: '2026-10-29T20:00:00.000Z' }, new Date('2026-10-31T00:00:00Z'));

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account.puuid, 'a');
});

test('an unparseable seen time falls back to the file modification time', async () => {
  const dir = profilesDir();
  writeAccount(dir, 'a', { puuid: 'a', lastSeenAt: 'yesterday' }, new Date('2026-10-30T20:00:00Z'));
  writeAccount(dir, 'b', { puuid: 'b', lastSeenAt: '2026-10-29T20:00:00.000Z' });

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account.puuid, 'a');
});

test('corrupt accounts and accounts without a puuid are skipped', async () => {
  const dir = profilesDir();
  writeAccount(dir, 'corrupt', '{"puuid": "corrupt", "lastSeenAt": "2026-10-30', new Date('2026-10-31T00:00:00Z'));
  writeAccount(dir, 'nameless', { gameName: 'No puuid', lastSeenAt: '2026-10-30T20:00:00.000Z' });
  writeAccount(dir, 'null', 'null');
  writeAccount(dir, 'good', { puuid: 'good', lastSeenAt: '2026-10-01T00:00:00.000Z' });

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account.puuid, 'good');
});

test('profile folders without an account file are skipped', async () => {
  const dir = profilesDir();
  fs.mkdirSync(path.join(dir, 'empty'));
  fs.writeFileSync(path.join(dir, 'stray.json'), '{}');
  writeAccount(dir, 'good', { puuid: 'good' });

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account.puuid, 'good');
});

test('no account is played when no profile folder holds a readable account', async () => {
  const dir = profilesDir();
  writeAccount(dir, 'corrupt', 'not json');

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account, null);
});

test('no account is played when the profiles folder is empty', async () => {
  const dir = profilesDir();

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account, null);
});

test('no account is played when the profiles folder does not exist', async () => {
  const dir = path.join(profilesDir(), 'profiles');

  const account = await lastPlayedAccount(nodeStorage(dir), '');

  assert.strictEqual(account, null);
});

test('the last played account label exists in every language', async () => {
  const langs: Record<string, string>[] = [pl, en];
  const keys = ['history.lastPlayed', 'history.lastPlayedHint'];

  const missing = langs.flatMap((dict) => keys.filter((k) => !dict[k]));

  assert.deepStrictEqual(missing, []);
});
