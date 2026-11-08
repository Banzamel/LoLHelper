// The draft as the view shows it: live from champion select or set by hand, the lane
// opponent, and the queries for counter-picks, team notes and the player's setup.
import { ROLES, type Role } from '../../core/data/types.ts';
import type { RolePick } from '../../core/engine/roles.ts';
import type { RuneGuideQuery } from '../../core/engine/runes.ts';
import type { TeamQuery } from '../../core/engine/team/teamNotes.ts';
import type { Build } from '../../core/engine/types.ts';
import type { Draft } from '../../core/lcu/types.ts';
import type { GameData } from '../database/index.ts';
import type { ManualDraft } from './ChampSelectService.ts';

export interface Member {
  cellId: number;
  championId: string | null;
  role: Role | null;
  isMe?: boolean;
  hovering?: boolean;
  inferred?: boolean;
  spells?: [number, number] | null;
}

export interface DraftModel { live: boolean; allies: Member[]; enemies: Member[]; bans: string[]; myRole: Role; roleFixed: boolean }

// Without assigned roles (Practice Tool, custom games) the player plays the role chosen here
// and the other champions get inferred roles.
export function liveModel(d: Draft, manual: ManualDraft): DraftModel {
  const me = d.myTeam.find((m) => m.isMe);
  const allyRole = (m: Draft['myTeam'][number]) => m.role || (m.isMe ? manual.myRole : d.allyRoles[m.cellId]) || null;
  return {
    live: true,
    allies: d.myTeam.map((m) => ({ ...m, championId: m.championId || m.hoverId, hovering: !m.championId && !!m.hoverId, role: allyRole(m) })),
    enemies: d.theirTeam.map((m) => ({ ...m, role: d.enemyRoles[m.cellId] || null, inferred: true })),
    bans: d.bans,
    myRole: (me && me.role) || manual.myRole,
    roleFixed: !!(me && me.role),
  };
}

export function manualModel(m: ManualDraft, inferRoles: (picks: RolePick[]) => Record<number, Role>): DraftModel {
  const picks = m.theirTeam.map((id, i) => ({ cellId: i, championId: id, role: null }));
  const roles = picks.some((p) => p.championId) ? inferRoles(picks) : {};
  return {
    live: false,
    allies: m.myTeam.map((id, i) => ({ cellId: i, championId: id, role: ROLES[i], isMe: ROLES[i] === m.myRole })),
    enemies: m.theirTeam.map((id, i) => ({ cellId: i, championId: id, role: roles[i] || null, inferred: true })),
    bans: [],
    myRole: m.myRole,
    roleFixed: false,
  };
}

export function opponentOf(data: GameData, model: DraftModel, override: string | null): string | null {
  if (override && model.enemies.some((e) => e.championId === override)) return override;
  const e = model.enemies.find((x) => x.championId && x.role === model.myRole);
  if (!e || !e.championId) return null;
  // While enemies are still picking, an off-role guess (Teemo jungle) is not shown as the opponent.
  const rates = data.champ(e.championId)?.positionRates;
  const complete = model.enemies.filter((x) => x.championId).length === 5;
  return complete || !rates || (rates[model.myRole] || 0) > 0 ? e.championId : null;
}

const ids = (list: Member[]) => list.map((m) => m.championId).filter((id): id is string => !!id);

export function counterQuery(model: DraftModel, opponent: string | null) {
  const picked = [...ids(model.allies), ...ids(model.enemies)];
  return {
    role: model.myRole,
    enemyId: opponent,
    allyIds: ids(model.allies.filter((a) => !a.isMe && !a.hovering)),
    enemyIds: ids(model.enemies),
    excludeIds: [...picked.filter((id) => !model.allies.some((a) => a.isMe && a.championId === id)), ...model.bans],
    useClient: model.live,
    limit: 12,
  };
}

export function teamQuery(model: DraftModel): TeamQuery {
  const me = model.allies.find((a) => a.isMe);
  const pick = (m: Member) => ({ championId: m.championId || null, role: m.role || null });
  return { me: { championId: me ? me.championId || null : null, role: model.myRole }, allies: model.allies.filter((a) => !a.isMe).map(pick), enemies: model.enemies.map(pick) };
}

// The tip for the recommended keystone and the lane opponent's typical keystone (no enemy runes in Draft).
export function draftGuideQuery(build: Build, model: DraftModel, opponent: string | null): RuneGuideQuery {
  return { keystones: build.runes ? [build.runes.selectedPerkIds[0]] : [], enemies: opponent ? [{ championId: opponent, role: model.myRole }] : [] };
}
