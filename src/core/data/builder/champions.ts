// Data Dragon champions (championFull.json) plus Meraki positions, archetypes and ratings, as
// the app's language-independent champion records and their translated texts.
import type { RawJson } from '../../shared/json.ts';
import { extractChampionTraits, plain } from '../parse.ts';
import type { Champion, ChampionTexts, Role } from '../types.ts';

const SPELL_KEYS = ['Q', 'W', 'E', 'R'];
const TAG_POSITION: Record<string, Role> = { Marksman: 'BOTTOM', Support: 'SUPPORT', Mage: 'MIDDLE', Assassin: 'MIDDLE', Fighter: 'TOP', Tank: 'TOP' };

function fallbackPositions(tags: string[]): Role[] {
  return [...new Set(tags.map((t) => TAG_POSITION[t]).filter(Boolean))];
}

// Positions ordered by how often the champion is played there (most popular first).
function positionsOf(en: RawJson, meraki: RawJson, rates: RawJson): Pick<Champion, 'positions' | 'positionRates'> {
  const base: Role[] = meraki && meraki.positions.length ? meraki.positions : fallbackPositions(en.tags);
  if (!rates) return { positions: base, positionRates: null };
  const positionRates: Partial<Record<Role, number>> = {};
  for (const [pos, v] of Object.entries<RawJson>(rates)) positionRates[(pos === 'UTILITY' ? 'SUPPORT' : pos) as Role] = Math.round((v.playRate || 0) * 100) / 100;
  const rated = (Object.keys(positionRates) as Role[]).filter((p) => (positionRates[p] || 0) > 0);
  const positions = [...new Set([...rated, ...base])].sort((a, b) => (positionRates[b] || 0) - (positionRates[a] || 0));
  return { positions, positionRates };
}

export function buildChampion(en: RawJson, meraki: RawJson, rates: RawJson): Champion {
  const r = (meraki && meraki.attributeRatings) || {};
  return {
    id: en.id,
    key: Number(en.key),
    tags: en.tags,
    resource: meraki ? meraki.resource : (en.partype === 'Mana' ? 'MANA' : 'NONE'),
    info: en.info,
    stats: en.stats,
    ...positionsOf(en, meraki, rates),
    archetypes: meraki ? meraki.roles : en.tags.map((t: string) => t.toUpperCase()),
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
    spells: en.spells.map((s: RawJson, idx: number) => ({
      key: SPELL_KEYS[idx], cooldown: s.cooldownBurn, cost: s.costBurn, range: s.rangeBurn, maxrank: s.maxrank, icon: `img/spell/${s.image.full}`,
      labels: ((s.leveltip && s.leveltip.label) || []).map((l: string) => l.replace(/@[^@]+@\s*/g, '').trim()),
    })),
    traits: extractChampionTraits(en),
    icon: `img/champion/${en.id}.png`,
  };
}

export function championTexts(loc: RawJson): ChampionTexts {
  return {
    name: loc.name,
    title: loc.title,
    blurb: plain(loc.blurb),
    allytips: loc.allytips || [],
    enemytips: loc.enemytips || [],
    passive: { name: loc.passive.name, description: plain(loc.passive.description) },
    spells: loc.spells.map((s: RawJson) => ({ name: s.name, description: plain(s.description), costType: plain(s.costType || '') })),
  };
}
