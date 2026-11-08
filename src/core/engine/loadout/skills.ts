// Summoner spells by role and ability max order by class.
import type { Champion, ChampionSpell } from '../../data/types.ts';
import type { BuildClass, SkillOrder, Threats } from '../types.ts';

// Well-known ability max orders; everything else uses the level-tip heuristic below.
const MAX_ORDER: Record<string, string> = {
  Jinx: 'QWE', Ezreal: 'QEW', Caitlyn: 'QWE', Kaisa: 'QEW', Vayne: 'QWE', Lucian: 'QEW', Ashe: 'WQE', MissFortune: 'QEW',
  Draven: 'QWE', KogMaw: 'WQE', Tristana: 'EQW', Jhin: 'QWE', Yasuo: 'QEW', Yone: 'QWE', Riven: 'QEW', Irelia: 'QEW',
  Darius: 'QEW', Garen: 'EQW', Ahri: 'QWE', Zed: 'QEW', Lux: 'EQW', Syndra: 'QWE', Annie: 'QWE', Lulu: 'EQW',
  Janna: 'EWQ', Soraka: 'WQE', Nami: 'WEQ', Sona: 'QWE', Yuumi: 'EQW',
};

// [Flash's partner spell key, loadout.* reason]
function secondSpell(cls: BuildClass, role: string | null, laner: Champion | null, t: Threats): [string, string] {
  const squishy = ['marksman', 'mage-burst', 'mage-artillery', 'mage-battle', 'enchanter'].includes(cls);
  if (role === 'JUNGLE') return ['SummonerSmite', 'loadout.smite'];
  if (role === 'BOTTOM') return t.cc >= 2.2 ? ['SummonerBoost', 'loadout.cleanse'] : ['SummonerHeal', 'loadout.heal'];
  if (role === 'SUPPORT') return cls === 'enchanter' && t.burstAD + t.burstAP >= 0.25 ? ['SummonerExhaust', 'loadout.exhaust'] : ['SummonerDot', 'loadout.ignite'];
  if (role === 'MIDDLE') {
    if (['assassin-ad', 'mage-burst'].includes(cls)) return ['SummonerDot', 'loadout.ignite'];
    if (squishy && laner && laner.archetypes.includes('ASSASSIN')) return ['SummonerBarrier', 'loadout.barrier'];
  }
  return ['SummonerTeleport', 'loadout.teleport'];
}

export function pickSpells(cls: BuildClass, role: string | null, laner: Champion | null, t: Threats): { spells: string[]; reason: string } {
  const [other, reason] = secondSpell(cls, role, laner, t);
  return { spells: ['SummonerFlash', other], reason };
}

function abilityPriority(spell: ChampionSpell, cls: BuildClass): number {
  const labels = (spell.labels || []).join(' ').toLowerCase();
  let score = (labels.match(/damage/g) || []).length * 2;
  if (['enchanter', 'support-tank'].includes(cls)) score += (labels.match(/heal|shield/g) || []).length * 2.5;
  if (/cooldown/.test(labels)) score += 0.5;
  return score;
}

export function skillOrder(champ: Champion, cls: BuildClass): SkillOrder {
  const basics = champ.spells.slice(0, 3);
  const r = champ.spells[3];
  const fixed = MAX_ORDER[champ.id];
  const order = fixed ? fixed.split('') : basics.map((s, i) => ({ key: s.key, score: abilityPriority(s, cls) - i * 0.01 }))
    .sort((a, b) => b.score - a.score).map((x) => x.key);
  const standard = r && r.maxrank === 3 && basics.every((s) => s.maxrank === 5);
  if (!standard) return { max: order, levels: null, known: !!fixed };
  const ranks: Record<string, number> = { Q: 0, W: 0, E: 0, R: 0 };
  const levels: string[] = [];
  for (let lvl = 1; lvl <= 18; lvl++) {
    let key: string;
    if ([6, 11, 16].includes(lvl)) key = 'R';
    else if (lvl <= 3) key = order[lvl - 1];
    else key = order.find((k) => ranks[k] < 5 && ranks[k] < Math.ceil(lvl / 2)) || order.find((k) => ranks[k] < 5) || order[0];
    ranks[key] += 1;
    levels.push(key);
  }
  return { max: order, levels, known: !!fixed };
}
