// Play-style traits from Summoner's Rift games (aggressive, farmer, team player…) measured
// against typical values; tone says whether it is a strength or a habit to work on.
import { average, groupBy, round, type GameRow } from './gameRows.ts';

export interface StyleTrait {
  key: string;
  tone: 'plus' | 'minus' | 'neutral';
  value: number | string | null;
}

export function playStyle(rows: GameRow[]): StyleTrait[] {
  const rift = rows.filter((r) => r.rift);
  if (rift.length < 5) return [];
  const out: StyleTrait[] = [];
  const add = (key: string, tone: StyleTrait['tone'], value: StyleTrait['value']) => out.push({ key, tone, value });
  const laners = rift.filter((r) => r.pos !== null && ['TOP', 'MIDDLE', 'BOTTOM'].includes(r.pos));
  const perMin = (k: 'k' | 'd') => average(rift, (r) => r[k] / (r.duration / 60)) || 0;
  const fights = perMin('k') + perMin('d');
  const deaths = average(rift, (r) => r.d) || 0;
  const kp = average(rift, (r) => r.kp);
  const share = average(rift, (r) => r.share);
  const vpm = average(rift, (r) => r.vpm);
  if (fights >= 0.42) add('style.aggressive', 'neutral', round(fights * 10, 1));
  else if (fights <= 0.25) add('style.passive', 'neutral', round(fights * 10, 1));
  if (deaths >= 7) add('style.manyDeaths', 'minus', round(deaths, 1));
  else if (deaths <= 4) add('style.safe', 'plus', round(deaths, 1));
  if (laners.length >= 3) {
    const csm = average(laners, (r) => r.csm) || 0;
    if (csm >= 7) add('style.farmer', 'plus', round(csm, 1));
    else if (csm < 5.5) add('style.lowFarm', 'minus', round(csm, 1));
  }
  if (kp !== null && kp >= 0.6) add('style.teamplayer', 'plus', Math.round(kp * 100));
  else if (kp !== null && kp < 0.4) add('style.lonely', 'minus', Math.round(kp * 100));
  if (share !== null && share >= 0.27) add('style.carry', 'plus', Math.round(share * 100));
  if (vpm !== null && vpm >= 1.1) add('style.vision', 'plus', round(vpm, 2));
  else if (vpm !== null && vpm < 0.5) add('style.lowVision', 'minus', round(vpm, 2));
  const champs = groupBy(rift, (r) => r.champ);
  if (rift.length >= 10 && champs[0] && champs[0].games / rift.length >= 0.4) add('style.oneTrick', 'neutral', champs[0].key);
  else if (rift.length >= 15 && champs.length / rift.length >= 0.6) add('style.widePool', 'neutral', champs.length);
  return out;
}
