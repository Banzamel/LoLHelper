// Builds the local champion/item database from Riot's Data Dragon (official, public CDN)
// and Meraki Analytics (champion positions and archetypes). Icons are downloaded locally
// so the app works offline once the database exists.
//
// Output: champions.json / items.json hold language-independent data (stats, traits, icons);
// texts/<lang>.json holds the translated names and descriptions for each app language.
import { extractChampionTraits, extractItemFeatures, sanitizeHtml, plain } from './parse.ts';
import { DATA_LOCALES } from '../i18n.ts';
import { SCHEMA } from './store.ts';
import type { DbMeta } from '../types.ts';

// Network and file access of the builder, so the same code runs in the app (Rust commands
// limited to the app data folder) and in scripts/fetch-data.ts (Node fetch + fs).
export interface BuilderIo {
  getJson(url: string): Promise<any>;
  // Writes a text file of the output folder (path relative to it).
  writeText(rel: string, text: string): Promise<void>;
  // Downloads the files into the output folder; onTick(done, total) after each one. Resolves
  // with the error messages of the downloads that failed.
  download(files: { url: string; rel: string }[], onTick: (done: number, total: number) => void): Promise<string[]>;
}

export interface Progress { key: string; params?: Record<string, unknown>; pct: number }

export const DDRAGON = 'https://ddragon.leagueoflegends.com';
export const MERAKI_HOST = 'https://cdn.merakianalytics.com';
const MERAKI = `${MERAKI_HOST}/riot/lol/resources/latest/en-US/champions.json`;
// Play rate per position (% of games), keyed by champion key.
const MERAKI_RATES = `${MERAKI_HOST}/riot/lol/resources/latest/en-US/championrates.json`;
const SPELL_KEYS = ['Q', 'W', 'E', 'R'];
const SR_MAP = '11';
const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1);

function fallbackPositions(tags) {
  const map = { Marksman: 'BOTTOM', Support: 'SUPPORT', Mage: 'MIDDLE', Assassin: 'MIDDLE', Fighter: 'TOP', Tank: 'TOP' };
  return [...new Set(tags.map((t) => map[t]).filter(Boolean))];
}

// Positions ordered by how often the champion is played there (most popular first).
function positionsOf(en, meraki, rates) {
  const base = meraki && meraki.positions.length ? meraki.positions : fallbackPositions(en.tags);
  if (!rates) return { positions: base, positionRates: null };
  const positionRates: Record<string, any> = {};
  for (const [pos, v] of Object.entries<any>(rates)) positionRates[pos === 'UTILITY' ? 'SUPPORT' : pos] = Math.round((v.playRate || 0) * 100) / 100;
  const rated = Object.keys(positionRates).filter((p) => positionRates[p] > 0);
  const positions = [...new Set([...rated, ...base])].sort((a, b) => (positionRates[b] || 0) - (positionRates[a] || 0));
  return { positions, positionRates };
}

function buildChampion(en, meraki, rates) {
  const r = (meraki && meraki.attributeRatings) || {};
  return {
    id: en.id,
    key: Number(en.key),
    tags: en.tags,
    resource: meraki ? meraki.resource : (en.partype === 'Mana' ? 'MANA' : 'NONE'),
    info: en.info,
    stats: en.stats,
    ...positionsOf(en, meraki, rates),
    archetypes: meraki ? meraki.roles : en.tags.map((t) => t.toUpperCase()),
    attackType: meraki ? meraki.attackType : (en.stats.attackrange > 300 ? 'RANGED' : 'MELEE'),
    damageType: meraki && meraki.adaptiveType ? (meraki.adaptiveType === 'MAGIC_DAMAGE' ? 'AP' : 'AD') : (en.info.magic > en.info.attack ? 'AP' : 'AD'),
    ratings: {
      damage: r.damage || Math.ceil(Math.max(en.info.attack, en.info.magic) / 3.4),
      toughness: r.toughness || Math.ceil(en.info.defense / 3.4),
      control: r.control || 2,
      mobility: r.mobility || 2,
      utility: r.utility || 2,
      difficulty: r.difficulty || Math.ceil(en.info.difficulty / 3.4),
    },
    passiveIcon: `img/passive/${en.passive.image.full}`,
    spells: en.spells.map((s, idx) => ({
      key: SPELL_KEYS[idx], cooldown: s.cooldownBurn, cost: s.costBurn, range: s.rangeBurn, maxrank: s.maxrank, icon: `img/spell/${s.image.full}`,
      labels: ((s.leveltip && s.leveltip.label) || []).map((l) => l.replace(/@[^@]+@\s*/g, '').trim()),
    })),
    traits: extractChampionTraits(en),
    icon: `img/champion/${en.id}.png`,
  };
}

function championTexts(loc) {
  return {
    name: loc.name,
    title: loc.title,
    blurb: plain(loc.blurb),
    allytips: loc.allytips || [],
    enemytips: loc.enemytips || [],
    passive: { name: loc.passive.name, description: plain(loc.passive.description) },
    spells: loc.spells.map((s) => ({ name: s.name, description: plain(s.description), costType: plain(s.costType || '') })),
  };
}

function itemCategory(item) {
  const tags = item.tags || [];
  const name = item.name;
  if (tags.includes('Trinket')) return 'trinket';
  if (tags.includes('Consumable')) return 'consumable';
  if (tags.includes('Boots')) return item.into ? (item.from ? 'boots' : 'component') : (item.from ? 'boots-upgrade' : 'component');
  if (/Pup|Hatchling|Seedling/.test(name)) return 'jungle';
  if (tags.includes('GoldPer') && item.gold.total <= 400) return 'support';
  if (tags.includes('Lane') || /^Doran's|^Cull$/.test(name)) return 'starter';
  if (/^Guardian's /.test(name)) return 'other';
  if (!item.into && item.gold.total >= 2000) return 'legendary';
  if (!item.into && item.gold.total >= 900) return 'epic';
  return 'component';
}

function isShopItem(id, item) {
  return Number(id) < 10000 && item.maps && item.maps[SR_MAP] && item.gold.purchasable
    && !item.requiredChampion && !item.requiredAlly && !item.hideFromAll;
}

function buildItems(enItems) {
  return Object.entries<any>(enItems).filter(([id, item]) => isShopItem(id, item)).map(([id, item]) => ({
    id: Number(id),
    nameEn: item.name,
    gold: item.gold,
    tags: item.tags || [],
    from: (item.from || []).map(Number),
    into: (item.into || []).map(Number),
    category: itemCategory(item),
    features: extractItemFeatures(item),
    icon: `img/item/${id}.png`,
  })).sort((a, b) => a.gold.total - b.gold.total);
}

// Rune trees (language independent part) and the stat shards, which Data Dragon does not list.
const SHARDS = [
  { id: 5008, icon: 'StatModsAdaptiveForceIcon' }, { id: 5005, icon: 'StatModsAttackSpeedIcon' },
  { id: 5007, icon: 'StatModsCDRScalingIcon' }, { id: 5010, icon: 'StatModsMovementSpeedIcon' },
  { id: 5001, icon: 'StatModsHealthScalingIcon' }, { id: 5011, icon: 'StatModsHealthPlusIcon' },
  { id: 5013, icon: 'StatModsTenacityIcon' },
];

function buildRunes(enTrees) {
  return {
    trees: enTrees.map((t) => ({
      id: t.id, key: t.key, nameEn: t.name, icon: `img/${t.icon}`,
      slots: t.slots.map((s) => s.runes.map((r) => ({ id: r.id, key: r.key, nameEn: r.name, icon: `img/${r.icon}` }))),
    })),
    shards: SHARDS.map((s) => ({ id: s.id, icon: `img/perk-images/StatMods/${s.icon}.png` })),
  };
}

function buildSummoners(enSpells) {
  return Object.values<any>(enSpells).filter((s) => s.modes.includes('CLASSIC')).map((s) => ({
    id: Number(s.key), key: s.id, nameEn: s.name, cooldown: s.cooldownBurn, icon: `img/summoner/${s.image.full}`,
  }));
}

async function buildDatabase({ io, onProgress = () => {} }: { io: BuilderIo; onProgress?: (p: Progress) => void }): Promise<DbMeta> {
  const getJson = (url: string) => io.getJson(url);
  onProgress({ key: 'update.versions', pct: 0 });
  const versions = await getJson(`${DDRAGON}/api/versions.json`);
  const version = versions[0];
  const cdn = `${DDRAGON}/cdn/${version}`;

  onProgress({ key: 'update.downloading', params: { version }, pct: 3 });
  const locales = [...new Set(['en_US', ...Object.values(DATA_LOCALES)])];
  const raw: Record<string, any> = {};
  await Promise.all(locales.map(async (loc) => {
    const [champs, items, runes, summoners] = await Promise.all([
      getJson(`${cdn}/data/${loc}/championFull.json`), getJson(`${cdn}/data/${loc}/item.json`),
      getJson(`${cdn}/data/${loc}/runesReforged.json`), getJson(`${cdn}/data/${loc}/summoner.json`),
    ]);
    raw[loc] = { champs: champs.data, items: items.data, runes, summoners: summoners.data };
  }));
  const meraki = await getJson(MERAKI).catch(() => ({}));
  const rates = (await getJson(MERAKI_RATES).catch(() => ({}))).data || {};

  onProgress({ key: 'update.analyzing', pct: 15 });
  const en = raw.en_US;
  const ids = Object.keys(en.champs).sort();
  const champions = ids.map((id) => buildChampion(en.champs[id], meraki[id], rates[en.champs[id].key]));
  const items = buildItems(en.items);
  const runes = buildRunes(en.runes);
  const summoners = buildSummoners(en.summoners);

  for (const [lang, loc] of Object.entries(DATA_LOCALES)) {
    const texts: Record<string, Record<string, any>> = { champions: {}, items: {}, runes: {}, summoners: {} };
    for (const tree of raw[loc].runes) {
      texts.runes[tree.id] = { name: tree.name };
      for (const r of tree.slots.flatMap((s: any) => s.runes)) texts.runes[r.id] = { name: r.name, description: sanitizeHtml(r.shortDesc || '') };
    }
    for (const s of Object.values<any>(raw[loc].summoners)) texts.summoners[s.key] = { name: s.name, description: plain(s.description || '') };
    for (const id of ids) texts.champions[id] = championTexts(raw[loc].champs[id] || en.champs[id]);
    for (const it of items) {
      const src = raw[loc].items[it.id] || en.items[it.id];
      texts.items[it.id] = { name: src.name, plaintext: plain(src.plaintext || ''), description: sanitizeHtml(src.description || '') };
    }
    await io.writeText(`texts/${lang}.json`, JSON.stringify(texts));
  }

  const files: { url: string; rel: string }[] = [];
  const fetchFrom = (base: string, rel: string) => files.push({ url: `${base}/${rel}`, rel });
  const fetchImg = (rel: string) => fetchFrom(cdn, rel);
  // Rune and shard icons are not versioned: they live under /cdn/img/perk-images/...
  for (const tree of runes.trees) {
    fetchFrom(`${DDRAGON}/cdn`, tree.icon);
    tree.slots.flat().forEach((r: any) => fetchFrom(`${DDRAGON}/cdn`, r.icon));
  }
  runes.shards.forEach((s) => fetchFrom(`${DDRAGON}/cdn`, s.icon));
  summoners.forEach((s) => files.push({ url: `${cdn}/img/spell/${basename(s.icon)}`, rel: s.icon }));
  for (const c of champions) {
    fetchImg(c.icon);
    fetchImg(c.passiveIcon);
    c.spells.forEach((s: any) => fetchImg(s.icon));
  }
  items.forEach((it) => fetchImg(it.icon));

  const failures = await io.download(files, (done, total) => {
    if (done % 20 === 0 || done === total) onProgress({ key: 'update.icons', params: { done, total }, pct: 15 + Math.round((done / total) * 83) });
  });

  await io.writeText('champions.json', JSON.stringify(champions));
  await io.writeText('items.json', JSON.stringify(items));
  await io.writeText('runes.json', JSON.stringify(runes));
  await io.writeText('summoners.json', JSON.stringify(summoners));
  const meta = { schema: SCHEMA, version, languages: Object.keys(DATA_LOCALES), builtAt: new Date().toISOString(), champions: champions.length, items: items.length, failures: failures.length };
  await io.writeText('meta.json', JSON.stringify(meta, null, 2));
  onProgress({ key: 'update.done', pct: 100 });
  return meta;
}

async function latestVersion(getJson: (url: string) => Promise<any>): Promise<string> {
  const versions = await getJson(`${DDRAGON}/api/versions.json`);
  return versions[0];
}

export { buildDatabase, latestVersion };
