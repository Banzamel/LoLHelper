// Client games as learning entries for the engine (engine/history), merged with the matches
// the app recorded itself.
import type { Db } from '../data/types.ts';
import type { LearningEntry } from '../engine/types.ts';
import type { CompactGame } from './types.ts';

// Role-based Summoner's Rift queues teach the engine; other modes play differently.
const LEARN_QUEUES = [400, 420, 440, 480, 490, 700];
const REMAKE_SECONDS = 300;

// A full client game as a learning entry, or null when it does not teach anything (not a
// role-based Summoner's Rift game, remake, unknown champion).
export function fromMatch(db: Db, game: CompactGame, puuid: string): LearningEntry | null {
  if (!game.full || !LEARN_QUEUES.includes(game.queueId) || game.duration < REMAKE_SECONDS) return null;
  const me = game.players.find((p) => p.puuid === puuid);
  if (!me || !me.champ) return null;
  const keep = (id: number) => !!db.itemById[id] && ['legendary', 'boots', 'boots-upgrade'].includes(db.itemById[id].category);
  const enemies = game.players.filter((p) => p.team !== me.team);
  const opponent = me.pos ? enemies.find((p) => p.pos === me.pos) : null;
  return {
    id: String(game.id),
    championId: me.champ,
    role: me.pos,
    opponentId: opponent ? opponent.champ : null,
    enemies: enemies.map((e) => ({ championId: e.champ, position: e.pos, items: e.items.filter(keep) })),
    items: me.items.filter(keep),
    win: me.win,
  };
}

// The app's own records plus the client's games it has not recorded (same game id).
export function learningHistory(db: Db, local: LearningEntry[] | null, games: CompactGame[] | null, puuid: string): LearningEntry[] {
  const known = new Set((local || []).map((g) => String(g.id)));
  const extra = (games || []).filter((g) => !known.has(String(g.id))).map((g) => fromMatch(db, g, puuid)).filter((e): e is LearningEntry => !!e);
  return [...(local || []), ...extra];
}
