// Building the database from Data Dragon with a fake network and file system: the files it
// writes, the icons it downloads and the progress it reports.
import { test } from 'vitest';
import assert from 'node:assert';
import { buildDatabase, latestVersion } from '../../../../src/core/data/builder/buildDatabase.ts';
import { buildItems, buildRunes, buildSummoners } from '../../../../src/core/data/builder/items.ts';
import { iconDownloads, textsOf } from '../../../../src/core/data/builder/assets.ts';

const champ = {
  id: 'Ahri', key: '103', name: 'Ahri', title: 'the Nine-Tailed Fox', blurb: 'A fox.', tags: ['Mage', 'Assassin'], partype: 'Mana',
  info: { attack: 3, defense: 4, magic: 8, difficulty: 5 }, stats: { attackrange: 550 },
  passive: { name: 'Essence Theft', description: 'Heals.', image: { full: 'Ahri_P.png' } },
  spells: ['Q', 'W', 'E', 'R'].map((k) => ({ name: k, description: 'Deals damage.', cooldownBurn: '7', costBurn: '60', rangeBurn: '900', maxrank: k === 'R' ? 3 : 5, range: [900], image: { full: `Ahri${k}.png` } })),
};
const item = { name: 'Boots', description: '<stats>25 Move Speed</stats>', gold: { base: 300, total: 300, sell: 210, purchasable: true }, maps: { 11: true }, tags: ['Boots'], into: ['3006'] };
const runes = [{ id: 8100, key: 'Domination', name: 'Domination', icon: 'perk-images/Styles/7200_Domination.png', slots: [{ runes: [{ id: 8112, key: 'Electrocute', name: 'Electrocute', icon: 'perk-images/E.png', shortDesc: 'Burst.' }] }] }];
const spells = { SummonerFlash: { id: 'SummonerFlash', key: '4', name: 'Flash', description: 'Blink.', cooldownBurn: '300', modes: ['CLASSIC'], image: { full: 'SummonerFlash.png' } } };

function fakeIo() {
  const written: Record<string, string> = {};
  const downloaded: string[] = [];
  return {
    written, downloaded,
    async getJson(url: string) {
      if (url.endsWith('versions.json')) return ['15.9.1', '15.8.1'];
      if (url.includes('merakianalytics')) throw new Error('offline');
      if (url.endsWith('championFull.json')) return { data: { Ahri: champ } };
      if (url.endsWith('item.json')) return { data: { 1001: item } };
      if (url.endsWith('runesReforged.json')) return runes;
      return { data: spells };
    },
    async writeText(rel: string, text: string) { written[rel] = text; },
    async download(files: { url: string; rel: string }[], onTick: (done: number, total: number) => void) {
      files.forEach((f, i) => { downloaded.push(f.url); onTick(i + 1, files.length); });
      return [];
    },
  };
}

test('the newest Data Dragon version is used', async () => {
  assert.strictEqual(await latestVersion(fakeIo().getJson), '15.9.1');
});

test('a database is written with texts per language, icons and its meta', async () => {
  const io = fakeIo();
  const steps: string[] = [];
  const meta = await buildDatabase({ io, onProgress: (p) => steps.push(p.key) });
  assert.deepStrictEqual([meta.version, meta.champions, meta.items, meta.failures], ['15.9.1', 1, 1, 0]);
  assert.deepStrictEqual(Object.keys(io.written).sort(), ['champions.json', 'items.json', 'meta.json', 'runes.json', 'summoners.json', 'texts/en.json', 'texts/pl.json']);
  assert.ok(io.downloaded.includes('https://ddragon.leagueoflegends.com/cdn/15.9.1/img/champion/Ahri.png'));
  assert.ok(io.downloaded.includes('https://ddragon.leagueoflegends.com/cdn/img/perk-images/E.png'));
  assert.deepStrictEqual([steps[0], steps[steps.length - 1]], ['update.versions', 'update.done']);
});

test('items, runes and summoner spells keep what the app uses', () => {
  const [boots] = buildItems({ 1001: item, 20001: item });
  assert.deepStrictEqual([boots.id, boots.category, boots.into], [1001, 'component', [3006]]);
  assert.strictEqual(buildRunes(runes).shards.length, 7);
  assert.deepStrictEqual(buildSummoners(spells)[0], { id: 4, key: 'SummonerFlash', nameEn: 'Flash', cooldown: '300', icon: 'img/summoner/SummonerFlash.png' });
});

test('texts fall back to English and icons cover every record', () => {
  const items = buildItems({ 1001: item });
  const texts = textsOf({ champs: {}, items: {}, runes, summoners: spells }, { champs: { Ahri: champ }, items: { 1001: item } }, ['Ahri'], items);
  assert.strictEqual(texts.champions.Ahri.title, 'the Nine-Tailed Fox');
  assert.strictEqual(texts.summoners[4].name, 'Flash');
  const icons = iconDownloads('15.9.1', [], items, buildRunes(runes), buildSummoners(spells));
  assert.deepStrictEqual(icons.map((i) => i.rel), ['img/perk-images/Styles/7200_Domination.png', 'img/perk-images/E.png',
    ...buildRunes(runes).shards.map((s) => s.icon), 'img/summoner/SummonerFlash.png', 'img/item/1001.png']);
});
