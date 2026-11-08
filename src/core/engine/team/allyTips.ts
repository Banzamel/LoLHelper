// How the player, from their role and champion, plays with each ally.
import type { Champion, Db } from '../../data/types.ts';
import type { TextKey } from '../../shared/json.ts';
import { DIVE, ENGAGE, GANKABLE, has, hasCC, isFrontline, isSquishyCarry, SIDE_LANES, type MaybeChampion } from './predicates.ts';

const MAX_TIPS = 2;

export interface Pick { championId?: string | null; role?: string | null }
interface Seat { c: MaybeChampion; role: string | null }
interface AllySeat { c: Champion; role: string | null }
export interface AllyTip { championId: string; role: string | null; tips: TextKey[] }

const lane = (role: string | null) => role || '';

// In priority order: duo lane first, then the jungler's lanes, then teamfight roles. me.c may
// be null (not picked yet) and roles may be null; a rule that needs a missing value does not apply.
export const ALLY_RULES: [string, (me: Seat, ally: AllySeat) => boolean][] = [
  ['tip.stayWithEnchanter', (me, ally) => me.role === 'BOTTOM' && has(ally.c, ['ENCHANTER'])],
  ['tip.followCatch', (me, ally) => me.role === 'BOTTOM' && has(ally.c, ['CATCHER'])],
  ['tip.peelForCarry', (me, ally) => me.role === 'SUPPORT' && has(me.c, ['ENCHANTER', 'WARDEN']) && (ally.role === 'BOTTOM' || has(ally.c, ['MARKSMAN']))],
  ['tip.engageForCarry', (me, ally) => has(me.c, ENGAGE) && isSquishyCarry(ally.c)],
  ['tip.waitForEngage', (me, ally) => (me.role === 'BOTTOM' || isSquishyCarry(me.c)) && has(ally.c, ['VANGUARD'])],
  ['tip.gankCc', (me, ally) => me.role === 'JUNGLE' && GANKABLE.includes(lane(ally.role)) && hasCC(ally.c)],
  ['tip.coverImmobile', (me, ally) => me.role === 'JUNGLE' && SIDE_LANES.includes(lane(ally.role)) && ally.c.ratings.mobility <= 1],
  ['tip.skirmishMid', (me, ally) => me.role === 'JUNGLE' && ally.role === 'MIDDLE' && has(ally.c, DIVE)],
  ['tip.playForGanks', (me, ally) => SIDE_LANES.includes(lane(me.role)) && ally.role === 'JUNGLE' && (hasCC(ally.c) || has(ally.c, ['DIVER', 'ASSASSIN', 'VANGUARD']))],
  ['tip.behindFrontline', (me, ally) => isSquishyCarry(me.c) && isFrontline(ally.c)],
  ['tip.setUpDive', (me, ally) => hasCC(me.c) && has(ally.c, ['ASSASSIN', 'DIVER'])],
  ['tip.pokeFirst', (me, ally) => !!me.c && me.c.attackType === 'MELEE' && (ally.c.traits.longRange >= 2 || has(ally.c, ['ARTILLERY']))],
  ['tip.fightNearEnchanter', (me, ally) => !!me.c && me.role !== 'BOTTOM' && has(ally.c, ['ENCHANTER'])],
];

function tipsFor(me: Seat, ally: AllySeat): TextKey[] {
  return ALLY_RULES.filter(([, applies]) => applies(me, ally)).slice(0, MAX_TIPS)
    .map(([key]) => ({ key, params: { champ: ally.c.id } }));
}

// A known role, else the champion's most played one.
const roleOf = (c: MaybeChampion, role: string | null | undefined) => role || (c && c.positions[0]) || null;

// Every ally with at least one tip; empty slots, unknown champions and the player's own
// champion are skipped.
export function allyTips(db: Db, me: Pick, allies: Pick[]): AllyTip[] {
  const myChamp = (me.championId && db.byId[me.championId]) || null;
  const mine = { c: myChamp, role: roleOf(myChamp, me.role) };
  return allies
    .filter((a) => a.championId && db.byId[a.championId] && a.championId !== me.championId)
    .map((a) => {
      const c = db.byId[a.championId as string];
      const ally = { c, role: roleOf(c, a.role) };
      return { championId: c.id, role: ally.role, tips: tipsFor(mine, ally) };
    })
    .filter((a) => a.tips.length);
}
