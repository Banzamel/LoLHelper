// A team composition: the team's style (engage, protect the carry, poke, pick, split push),
// how to play it and its gaps (no frontline, one damage type…).
import type { Champion } from '../../data/types.ts';
import type { TextKey } from '../../shared/json.ts';
import { has, hasCC, isEngager, isFrontline, isHyperCarry, isPicker, isPoker, isProtector, isSplitPusher } from './predicates.ts';

// Fewer known champions say nothing about the team's style; from three on even the gaps are
// worth knowing mid-draft ("still no frontline").
export const MIN_KNOWN = 3;
const MIN_STYLE_MEMBERS = 2;
// Below this share of the team's damage ratings the other damage type is too little to make the
// enemies buy both resists (an AP enchanter next to four AD champions).
const MIN_DAMAGE_SHARE = 0.25;
const MAX_LOW_CC = 1;

export const MIXED = 'MIXED';

export interface Composition {
  style: string;
  plan: TextKey[];
  warnings: TextKey[];
  enemyLine: TextKey;
}

// A carry is protected only when someone protects it: both must be there. The team plays
// around one carry, so a second marksman does not make it more of a protect team.
function protectMembers(team: Champion[]): Champion[] {
  const carry = team.find(isHyperCarry);
  const protectors = team.filter(isProtector);
  return carry && protectors.length ? [carry, ...protectors] : [];
}

// Style -> the champions that play it, in tie-break order (first wins a tie).
export const STYLES: [string, (team: Champion[]) => Champion[]][] = [
  ['ENGAGE', (team) => team.filter(isEngager)],
  ['PROTECT', protectMembers],
  ['POKE', (team) => team.filter(isPoker)],
  ['PICK', (team) => team.filter(isPicker)],
  ['SPLIT', (team) => team.filter(isSplitPusher)],
];

export const PLANS: Record<string, string[]> = {
  ENGAGE: ['comp.plan.ENGAGE.1', 'comp.plan.ENGAGE.2', 'comp.plan.ENGAGE.3'],
  PROTECT: ['comp.plan.PROTECT.1', 'comp.plan.PROTECT.2', 'comp.plan.PROTECT.3'],
  POKE: ['comp.plan.POKE.1', 'comp.plan.POKE.2', 'comp.plan.POKE.3'],
  PICK: ['comp.plan.PICK.1', 'comp.plan.PICK.2', 'comp.plan.PICK.3'],
  SPLIT: ['comp.plan.SPLIT.1', 'comp.plan.SPLIT.2', 'comp.plan.SPLIT.3'],
  [MIXED]: ['comp.plan.MIXED.1', 'comp.plan.MIXED.2'],
};

function damageShare(team: Champion[], type: string): number {
  const total = team.reduce((s, c) => s + c.ratings.damage, 0);
  const part = team.filter((c) => c.damageType === type).reduce((s, c) => s + c.ratings.damage, 0);
  return total ? part / total : 0;
}

// The gaps of a team, all that apply, in this order.
export const WARNINGS: [string, (team: Champion[]) => boolean][] = [
  ['comp.warn.noFrontline', (team) => !team.some(isFrontline)],
  ['comp.warn.physicalOnly', (team) => damageShare(team, 'AP') < MIN_DAMAGE_SHARE],
  ['comp.warn.magicOnly', (team) => damageShare(team, 'AD') < MIN_DAMAGE_SHARE],
  ['comp.warn.noEngage', (team) => !team.some((c) => isEngager(c) || has(c, ['CATCHER']))],
  ['comp.warn.lowCC', (team) => team.filter(hasCC).length <= MAX_LOW_CC],
];

// The style with most members (at least MIN_STYLE_MEMBERS), else MIXED.
function styleOf(team: Champion[]): { style: string; members: Champion[] } {
  const best = STYLES.map(([style, membersOf]) => ({ style, members: membersOf(team) }))
    .reduce((top, s) => (s.members.length > top.members.length ? s : top));
  return best.members.length >= MIN_STYLE_MEMBERS ? best : { style: MIXED, members: [] };
}

// The composition of the known champions of one team, or null when fewer than MIN_KNOWN are
// known. The plan and enemy line name the style's first member as {champ}.
export function teamComposition(team: Champion[]): Composition | null {
  if (team.length < MIN_KNOWN) return null;
  const { style, members } = styleOf(team);
  const params: Record<string, string> = members.length ? { champ: members[0].id } : {};
  return {
    style,
    plan: PLANS[style].map((key) => ({ key, params })),
    warnings: WARNINGS.filter(([, applies]) => applies(team)).map(([key]) => ({ key })),
    enemyLine: { key: `comp.enemy.${style}`, params },
  };
}
