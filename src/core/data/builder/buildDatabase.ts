// Builds the local champion/item database from Riot's Data Dragon (official, public CDN)
// and Meraki Analytics (champion positions and archetypes, full item effects). Icons are downloaded locally
// so the app works offline once the database exists.
//
// Output: champions.json / items.json hold language-independent data (stats, traits, icons);
// texts/<lang>.json holds the translated names and descriptions for each app language.
import type { RawJson } from '../../shared/json.ts';
import { DATA_LOCALES } from '../locales.ts';
import { SCHEMA } from '../store.ts';
import type { DbMeta } from '../types.ts';
import { DDRAGON, iconDownloads, textsOf, type Download } from './assets.ts';
import { buildChampion } from './champions.ts';
import { buildItems, buildRunes, buildSummoners } from './items.ts';

// Network and file access of the builder, so the same code runs in the app (Rust commands
// limited to the app data folder) and in scripts/fetch-data.ts (Node fetch + fs).
export interface BuilderIo {
  getJson(url: string): Promise<RawJson>;
  // Writes a text file of the output folder (path relative to it).
  writeText(rel: string, text: string): Promise<void>;
  // Downloads the files into the output folder; onTick(done, total) after each one. Resolves
  // with the error messages of the downloads that failed.
  download(files: Download[], onTick: (done: number, total: number) => void): Promise<string[]>;
}

export interface Progress { key: string; params?: Record<string, string | number>; pct: number }

export const MERAKI_HOST = 'https://cdn.merakianalytics.com';
const MERAKI = `${MERAKI_HOST}/riot/lol/resources/latest/en-US/champions.json`;
const MERAKI_ITEMS = `${MERAKI_HOST}/riot/lol/resources/latest/en-US/items.json`;
// Play rate per position (% of games), keyed by champion key.
const MERAKI_RATES = `${MERAKI_HOST}/riot/lol/resources/latest/en-US/championrates.json`;

async function fetchLocale(io: BuilderIo, cdn: string, loc: string): Promise<RawJson> {
  const [champs, items, runes, summoners] = await Promise.all([
    io.getJson(`${cdn}/data/${loc}/championFull.json`), io.getJson(`${cdn}/data/${loc}/item.json`),
    io.getJson(`${cdn}/data/${loc}/runesReforged.json`), io.getJson(`${cdn}/data/${loc}/summoner.json`),
  ]);
  return { champs: champs.data, items: items.data, runes, summoners: summoners.data };
}

export async function latestVersion(getJson: (url: string) => Promise<RawJson>): Promise<string> {
  const versions = await getJson(`${DDRAGON}/api/versions.json`);
  return versions[0];
}

export async function buildDatabase({ io, onProgress = () => {} }: { io: BuilderIo; onProgress?: (p: Progress) => void }): Promise<DbMeta> {
  onProgress({ key: 'update.versions', pct: 0 });
  const version = await latestVersion((url) => io.getJson(url));
  const cdn = `${DDRAGON}/cdn/${version}`;

  onProgress({ key: 'update.downloading', params: { version }, pct: 3 });
  const locales = [...new Set(['en_US', ...Object.values(DATA_LOCALES)])];
  const raw: Record<string, RawJson> = {};
  await Promise.all(locales.map(async (loc) => { raw[loc] = await fetchLocale(io, cdn, loc); }));
  const meraki = await io.getJson(MERAKI).catch(() => ({}));
  const rates = (await io.getJson(MERAKI_RATES).catch(() => ({}))).data || {};
  const merakiItems = await io.getJson(MERAKI_ITEMS).catch(() => ({}));

  onProgress({ key: 'update.analyzing', pct: 15 });
  const en = raw.en_US;
  const ids = Object.keys(en.champs).sort();
  const champions = ids.map((id) => buildChampion(en.champs[id], meraki[id], rates[en.champs[id].key]));
  const items = buildItems(en.items, merakiItems);
  const runes = buildRunes(en.runes);
  const summoners = buildSummoners(en.summoners);
  for (const [lang, loc] of Object.entries(DATA_LOCALES)) {
    await io.writeText(`texts/${lang}.json`, JSON.stringify(textsOf(raw[loc], en, ids, items)));
  }

  const failures = await io.download(iconDownloads(version, champions, items, runes, summoners), (done, total) => {
    if (done % 20 === 0 || done === total) onProgress({ key: 'update.icons', params: { done, total }, pct: 15 + Math.round((done / total) * 83) });
  });

  await io.writeText('champions.json', JSON.stringify(champions));
  await io.writeText('items.json', JSON.stringify(items));
  await io.writeText('runes.json', JSON.stringify(runes));
  await io.writeText('summoners.json', JSON.stringify(summoners));
  const meta: DbMeta = { schema: SCHEMA, version, languages: Object.keys(DATA_LOCALES), builtAt: new Date().toISOString(), champions: champions.length, items: items.length, failures: failures.length };
  await io.writeText('meta.json', JSON.stringify(meta, null, 2));
  onProgress({ key: 'update.done', pct: 100 });
  return meta;
}

export { DDRAGON };
