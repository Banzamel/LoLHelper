// Translated texts per app language and the list of icons to download for a database.
import type { RawJson } from '../../shared/json.ts';
import { plain, sanitizeHtml } from '../parse.ts';
import type { Champion, DbTexts, Item, RuneData, SummonerSpell } from '../types.ts';
import { championTexts } from './champions.ts';

export const DDRAGON = 'https://ddragon.leagueoflegends.com';
const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1);

// raw: one locale's championFull / item / runesReforged / summoner data; en: the en_US ones
// (fallback when a locale lacks an entry).
export function textsOf(raw: RawJson, en: RawJson, championIds: string[], items: Item[]): DbTexts {
  const texts: DbTexts = { champions: {}, items: {}, runes: {}, summoners: {} };
  for (const tree of raw.runes) {
    texts.runes[tree.id] = { name: tree.name };
    for (const r of tree.slots.flatMap((s: RawJson) => s.runes)) texts.runes[r.id] = { name: r.name, description: sanitizeHtml(r.shortDesc || '') };
  }
  for (const s of Object.values<RawJson>(raw.summoners)) texts.summoners[s.key] = { name: s.name, description: plain(s.description || '') };
  for (const id of championIds) texts.champions[id] = championTexts(raw.champs[id] || en.champs[id]);
  for (const it of items) {
    const src = raw.items[it.id] || en.items[it.id];
    texts.items[it.id] = { name: src.name, plaintext: plain(src.plaintext || ''), description: sanitizeHtml(src.description || '') };
  }
  return texts;
}

export interface Download { url: string; rel: string }

// Every icon the database refers to, with the Data Dragon URL it comes from.
export function iconDownloads(version: string, champions: Champion[], items: Item[], runes: RuneData, summoners: SummonerSpell[]): Download[] {
  const cdn = `${DDRAGON}/cdn/${version}`;
  const files: Download[] = [];
  const fetchFrom = (base: string, rel: string) => files.push({ url: `${base}/${rel}`, rel });
  // Rune and shard icons are not versioned: they live under /cdn/img/perk-images/...
  for (const tree of runes.trees) {
    fetchFrom(`${DDRAGON}/cdn`, tree.icon);
    tree.slots.flat().forEach((r) => fetchFrom(`${DDRAGON}/cdn`, r.icon));
  }
  runes.shards.forEach((s) => fetchFrom(`${DDRAGON}/cdn`, s.icon));
  summoners.forEach((s) => files.push({ url: `${cdn}/img/spell/${basename(s.icon)}`, rel: s.icon }));
  for (const c of champions) {
    fetchFrom(cdn, c.icon);
    fetchFrom(cdn, c.passiveIcon);
    c.spells.forEach((s) => fetchFrom(cdn, s.icon));
  }
  items.forEach((it) => fetchFrom(cdn, it.icon));
  return files;
}
