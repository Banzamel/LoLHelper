// Exports to the League client against a fake LCU: rune pages, summoner spells, item sets.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../helpers.ts';
import { exportRunePage, exportSummonerSpells, recommendedPages, spellOrder } from '../../../src/core/lcu/perks.ts';
import { exportItemSet, toItemSet } from '../../../src/core/lcu/itemsets.ts';
import { recommendBuild } from '../../../src/core/engine/builds/recommendBuild.ts';
import type { Lcu } from '../../../src/core/lcu/types.ts';

const db = loadDatabase();
const runes = { primaryStyleId: 8100, subStyleId: 8200, selectedPerkIds: [8112, 8139, 8138, 8135, 8226, 8210, 5008, 5008, 5001] };

function fakeLcu(responses: Record<string, unknown>, failPost = false) {
  const calls: [string, string, unknown?][] = [];
  const lcu: Lcu = {
    async get(endpoint) { calls.push(['GET', endpoint]); return responses[endpoint]; },
    async request(method, endpoint, body) {
      calls.push([method, endpoint, body]);
      if (failPost && method === 'POST') throw new Error('no free page');
      return null;
    },
  };
  return { lcu, calls };
}

test('the app\'s own rune page is replaced', async () => {
  const { lcu, calls } = fakeLcu({ '/lol-perks/v1/pages': [{ id: 7, name: 'LoL Helper: Ahri', isEditable: true }] });
  assert.deepStrictEqual(await exportRunePage(lcu, runes, 'Ahri'), { status: 'ok' });
  assert.deepStrictEqual(calls.map((c) => c[0]), ['GET', 'DELETE', 'POST']);
});

test('without a free page the player is asked before the current page is overwritten', async () => {
  const pages = [{ id: 3, name: 'Mine', isEditable: true, current: true }];
  assert.deepStrictEqual(await exportRunePage(fakeLcu({ '/lol-perks/v1/pages': pages }, true).lcu, runes, 'Ahri'), { status: 'noSlot' });
  const { lcu, calls } = fakeLcu({ '/lol-perks/v1/pages': pages }, false);
  await exportRunePage(lcu, runes, 'Ahri', { overwriteCurrent: true });
  assert.strictEqual(calls.length, 2);
});

test('Flash goes on the key the player chose', async () => {
  assert.deepStrictEqual(spellOrder([14, 4], true), [4, 14]);
  assert.deepStrictEqual(spellOrder([4, 14], false), [14, 4]);
  const { lcu, calls } = fakeLcu({});
  await exportSummonerSpells(lcu, [4, 14], { flashOnD: false });
  assert.deepStrictEqual(calls[0][2], { spell1Id: 14, spell2Id: 4 });
});

test('client-recommended pages keep only complete ones', async () => {
  const page = { primaryPerkStyleId: 8100, secondaryPerkStyleId: 8200, perks: runes.selectedPerkIds.map((id) => ({ id })), summonerSpellIds: [4, 14] };
  const { lcu } = fakeLcu({ '/lol-perks/v1/recommended-pages/champion/103/position/UTILITY/map/11': [page, { perks: [] }] });
  assert.deepStrictEqual(await recommendedPages(lcu, 103, 'SUPPORT'), [{ ...runes, spells: [4, 14] }]);
});

test('an item set replaces only the app\'s own set', async () => {
  const build = recommendBuild(db, { championId: 'Ahri', role: 'MIDDLE' });
  const names = { start: 'S', boots: 'B', core: 'C', situational: 'X', full: 'F' };
  assert.strictEqual(toItemSet(build, 103, 'Ahri', names).blocks[0].type, 'S');
  const sets = { itemSets: [{ uid: 'lolhelper-103' }, { uid: 'mine' }] };
  const { lcu, calls } = fakeLcu({ '/lol-summoner/v1/current-summoner': { summonerId: 1, accountId: 2 }, '/lol-item-sets/v1/item-sets/1/sets': sets });
  assert.strictEqual(await exportItemSet(lcu, build, 103, 'Ahri', names), 'lolhelper-103');
  const body = calls[calls.length - 1][2] as { itemSets: { uid: string }[] };
  assert.deepStrictEqual(body.itemSets.map((s) => s.uid), ['lolhelper-103', 'mine']);
});
