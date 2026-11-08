// What an enemy's items give and what that means for the player's build.
import type { PlayingGame } from '../../core/live/types.ts';
import type { GameData } from '../database/index.ts';
import { bought } from './gameModel.ts';

export const STAT_ROWS: [string, string][] = [['ad', 'AD'], ['ap', 'AP'], ['lethality', 'stat.lethality'], ['armorPen', 'stat.armorPen'], ['magicPen', 'stat.magicPen'],
  ['crit', 'stat.crit'], ['as', 'stat.as'], ['hp', 'stat.hp'], ['armor', 'stat.armor'], ['mr', 'stat.mr'], ['lifesteal', 'stat.lifesteal'], ['omnivamp', 'stat.omnivamp'], ['hsp', 'stat.hsp']];

export function itemStats(data: GameData, ids: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of bought(data, ids)) {
    const stats = data.item(id)?.features.stats || {};
    for (const [k, v] of Object.entries(stats)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

export function enemyTips(data: GameData, stats: Record<string, number>, game: PlayingGame): string[] {
  const mine = data.champ(game.me.championId);
  const ap = !!mine && mine.damageType === 'AP';
  const tips: string[] = [];
  if ((stats.armor || 0) >= 60 && !ap) tips.push('enemy.tipArmor');
  if ((stats.mr || 0) >= 50 && ap) tips.push('enemy.tipMr');
  if ((stats.lifesteal || 0) + (stats.omnivamp || 0) >= 8 || stats.hsp) tips.push('enemy.tipHeal');
  if ((stats.lethality || 0) >= 15) tips.push('enemy.tipLethality');
  if ((stats.ap || 0) >= 120) tips.push('enemy.tipAp');
  if ((stats.crit || 0) >= 40) tips.push('enemy.tipCrit');
  if ((stats.hp || 0) >= 1200) tips.push('enemy.tipHp');
  return tips;
}
