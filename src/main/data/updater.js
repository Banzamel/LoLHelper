// Builds the local champion/item database from Riot's Data Dragon (official, public CDN)
// and Meraki Analytics (champion positions and archetypes). Icons are downloaded locally
// so the app works offline once the database exists.
//
// Output: champions.json / items.json hold language-independent data (stats, traits, icons);
// texts/<lang>.json holds the translated names and descriptions for each app language.
const fs = require('fs');
const path = require('path');
const { extractChampionTraits, extractItemFeatures, sanitizeHtml, plain } = require('./parse');
const { DATA_LOCALES } = require('../i18n');
const { SCHEMA } = require('./store');

const DDRAGON = 'https://ddragon.leagueoflegends.com';
const MERAKI = 'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json';
// Play rate per position (% of games), keyed by champion key.
const MERAKI_RATES = 'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json';
const SPELL_KEYS = ['Q', 'W', 'E', 'R'];
const SR_MAP = '11';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function downloadFile(url, dest) {
  if (fs.existsSync(dest)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function runPool(tasks, limit, onTick) {
  let i = 0;
  let done = 0;
  const failures = [];
  async function worker() {
    while (i < tasks.length) {
      const task = tasks[i++];
      try { await task(); } catch (e) { failures.push(e.message); }
      onTick(++done, tasks.length);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return failures;
}

function fallbackPositions(tags) {
  const map = { Marksman: 'BOTTOM', Support: 'SUPPORT', Mage: 'MIDDLE', Assassin: 'MIDDLE', Fighter: 'TOP', Tank: 'TOP' };
  return [...new Set(tags.map((t) => map[t]).filter(Boolean))];
}

// Positions ordered by how often the champion is played there (most popular first).
function positionsOf(en, meraki, rates) {
  const base = meraki && meraki.positions.length ? meraki.positions : fallbackPositions(en.tags);
  if (!rates) return { positions: base, positionRates: null };
  const positionRates = {};
  for (const [pos, v] of Object.entries(rates)) positionRates[pos === 'UTILITY' ? 'SUPPORT' : pos] = Math.round((v.playRate || 0) * 100) / 100;
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
  return Object.entries(enItems).filter(([id, item]) => isShopItem(id, item)).map(([id, item]) => ({
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
  return Object.values(enSpells).filter((s) => s.modes.includes('CLASSIC')).map((s) => ({
    id: Number(s.key), key: s.id, nameEn: s.name, cooldown: s.cooldownBurn, icon: `img/summoner/${s.image.full}`,
  }));
}

async function buildDatabase({ outDir, onProgress = () => {} }) {
  onProgress({ key: 'update.versions', pct: 0 });
  const versions = await getJson(`${DDRAGON}/api/versions.json`);
  const version = versions[0];
  const cdn = `${DDRAGON}/cdn/${version}`;

  onProgress({ key: 'update.downloading', params: { version }, pct: 3 });
  const locales = [...new Set(['en_US', ...Object.values(DATA_LOCALES)])];
  const raw = {};
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

  fs.mkdirSync(path.join(outDir, 'texts'), { recursive: true });
  for (const [lang, loc] of Object.entries(DATA_LOCALES)) {
    const texts = { champions: {}, items: {}, runes: {}, summoners: {} };
    for (const tree of raw[loc].runes) {
      texts.runes[tree.id] = { name: tree.name };
      for (const r of tree.slots.flatMap((s) => s.runes)) texts.runes[r.id] = { name: r.name, description: sanitizeHtml(r.shortDesc || '') };
    }
    for (const s of Object.values(raw[loc].summoners)) texts.summoners[s.key] = { name: s.name, description: plain(s.description || '') };
    for (const id of ids) texts.champions[id] = championTexts(raw[loc].champs[id] || en.champs[id]);
    for (const it of items) {
      const src = raw[loc].items[it.id] || en.items[it.id];
      texts.items[it.id] = { name: src.name, plaintext: plain(src.plaintext || ''), description: sanitizeHtml(src.description || '') };
    }
    fs.writeFileSync(path.join(outDir, 'texts', `${lang}.json`), JSON.stringify(texts));
  }

  const tasks = [];
  const fetchFrom = (base, rel) => tasks.push(async () => {
    fs.mkdirSync(path.dirname(path.join(outDir, rel)), { recursive: true });
    await downloadFile(`${base}/${rel}`, path.join(outDir, rel));
  });
  const fetchImg = (rel) => fetchFrom(cdn, rel);
  // Rune and shard icons are not versioned: they live under /cdn/img/perk-images/...
  for (const tree of runes.trees) {
    fetchFrom(`${DDRAGON}/cdn`, tree.icon);
    tree.slots.flat().forEach((r) => fetchFrom(`${DDRAGON}/cdn`, r.icon));
  }
  runes.shards.forEach((s) => fetchFrom(`${DDRAGON}/cdn`, s.icon));
  summoners.forEach((s) => tasks.push(async () => {
    fs.mkdirSync(path.join(outDir, 'img', 'summoner'), { recursive: true });
    await downloadFile(`${cdn}/img/spell/${path.basename(s.icon)}`, path.join(outDir, s.icon));
  }));
  for (const c of champions) {
    fetchImg(c.icon);
    fetchImg(c.passiveIcon);
    c.spells.forEach((s) => fetchImg(s.icon));
  }
  items.forEach((it) => fetchImg(it.icon));

  const failures = await runPool(tasks, 16, (done, total) => {
    if (done % 20 === 0 || done === total) onProgress({ key: 'update.icons', params: { done, total }, pct: 15 + Math.round((done / total) * 83) });
  });

  fs.writeFileSync(path.join(outDir, 'champions.json'), JSON.stringify(champions));
  fs.writeFileSync(path.join(outDir, 'items.json'), JSON.stringify(items));
  fs.writeFileSync(path.join(outDir, 'runes.json'), JSON.stringify(runes));
  fs.writeFileSync(path.join(outDir, 'summoners.json'), JSON.stringify(summoners));
  const meta = { schema: SCHEMA, version, languages: Object.keys(DATA_LOCALES), builtAt: new Date().toISOString(), champions: champions.length, items: items.length, failures: failures.length };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
  onProgress({ key: 'update.done', pct: 100 });
  return meta;
}

async function latestVersion() {
  const versions = await getJson(`${DDRAGON}/api/versions.json`);
  return versions[0];
}

module.exports = { buildDatabase, latestVersion };
