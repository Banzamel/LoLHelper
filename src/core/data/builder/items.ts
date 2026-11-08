// Data Dragon items, rune trees and summoner spells as the app's language-independent records.
import type { RawJson } from '../../shared/json.ts';
import { extractItemFeatures } from '../parse.ts';
import type { Item, RuneData, SummonerSpell } from '../types.ts';

const SR_MAP = '11';

function itemCategory(item: RawJson): string {
  const tags: string[] = item.tags || [];
  const name: string = item.name;
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

function isShopItem(id: string, item: RawJson): boolean {
  return Number(id) < 10000 && item.maps && item.maps[SR_MAP] && item.gold.purchasable
    && !item.requiredChampion && !item.requiredAlly && !item.hideFromAll;
}

export function buildItems(enItems: RawJson): Item[] {
  return Object.entries<RawJson>(enItems).filter(([id, item]) => isShopItem(id, item)).map(([id, item]) => ({
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

// The stat shards, which Data Dragon does not list.
const SHARDS = [
  { id: 5008, icon: 'StatModsAdaptiveForceIcon' }, { id: 5005, icon: 'StatModsAttackSpeedIcon' },
  { id: 5007, icon: 'StatModsCDRScalingIcon' }, { id: 5010, icon: 'StatModsMovementSpeedIcon' },
  { id: 5001, icon: 'StatModsHealthScalingIcon' }, { id: 5011, icon: 'StatModsHealthPlusIcon' },
  { id: 5013, icon: 'StatModsTenacityIcon' },
];

export function buildRunes(enTrees: RawJson[]): RuneData {
  return {
    trees: enTrees.map((t) => ({
      id: t.id, key: t.key, nameEn: t.name, icon: `img/${t.icon}`,
      slots: t.slots.map((s: RawJson) => s.runes.map((r: RawJson) => ({ id: r.id, key: r.key, nameEn: r.name, icon: `img/${r.icon}` }))),
    })),
    shards: SHARDS.map((s) => ({ id: s.id, icon: `img/perk-images/StatMods/${s.icon}.png` })),
  };
}

export function buildSummoners(enSpells: RawJson): SummonerSpell[] {
  return Object.values<RawJson>(enSpells).filter((s) => s.modes.includes('CLASSIC')).map((s) => ({
    id: Number(s.key), key: s.id, nameEn: s.name, cooldown: s.cooldownBurn, icon: `img/summoner/${s.image.full}`,
  }));
}
