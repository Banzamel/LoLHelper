// Converts the raw /lol-champ-select/v1/session payload into a compact draft state
// (teams, positions, bans, current action) keyed by Data Dragon champion ids.
import type { Db, Role } from '../data/types.ts';
import type { RawJson } from '../shared/json.ts';
import type { Draft, DraftMember } from './types.ts';

const POSITION: Record<string, Role> = { top: 'TOP', jungle: 'JUNGLE', middle: 'MIDDLE', bottom: 'BOTTOM', utility: 'SUPPORT' };

// The draft without the inferred roles and rune page (LcuWatcher adds those).
export type SessionDraft = Omit<Draft, 'enemyRoles' | 'allyRoles' | 'myRunes'>;

export function normalizeSession(session: RawJson, db: Db): SessionDraft | null {
  if (!session || !session.myTeam) return null;
  const idOf = (key: number) => (key && db.byKey[key] ? db.byKey[key].id : null);
  const actions: RawJson[] = (session.actions || []).flat();

  const member = (m: RawJson, ally: boolean): DraftMember => ({
    cellId: m.cellId,
    championId: idOf(m.championId),
    hoverId: ally ? idOf(m.championPickIntent) : null,
    role: POSITION[m.assignedPosition] || null,
    isMe: ally && m.cellId === session.localPlayerCellId,
    spells: ally && m.cellId === session.localPlayerCellId ? [m.spell1Id, m.spell2Id] : null,
    locked: actions.some((a) => a.actorCellId === m.cellId && a.type === 'pick' && a.completed),
  });

  const bans = actions.filter((a) => a.type === 'ban' && a.completed && a.championId).map((a) => idOf(a.championId))
    .filter((id): id is string => !!id);
  for (const id of [...((session.bans || {}).myTeamBans || []), ...((session.bans || {}).theirTeamBans || [])]) {
    const champ = idOf(id);
    if (champ && !bans.includes(champ)) bans.push(champ);
  }
  const current = actions.find((a) => a.isInProgress && a.actorCellId === session.localPlayerCellId);

  return {
    gameId: session.gameId,
    phase: session.timer ? session.timer.phase : null,
    myTeam: session.myTeam.map((m: RawJson) => member(m, true)),
    theirTeam: (session.theirTeam || []).map((m: RawJson) => member(m, false)),
    bans,
    myAction: current ? { id: current.id, type: current.type } : null,
  };
}
