// Briefs for every champion in the game, the ally tips and both teams' compositions, for the
// Draft view and the loading screen.
import type { Champion, Db } from '../../data/types.ts';
import { allyTips, type AllyTip, type Pick } from './allyTips.ts';
import { championBrief, type Brief } from './briefs.ts';
import { teamComposition, type Composition } from './composition.ts';

export interface TeamQuery {
  me?: Pick;
  // Without the player.
  allies?: Pick[];
  enemies?: Pick[];
}

export interface TeamNotes {
  briefs: Record<string, Brief | null>;
  allyTips: AllyTip[];
  composition: { allies: Composition | null; enemies: Composition | null };
}

const knownChampions = (db: Db, picks: Pick[]) => [...new Set(picks.map((p) => p.championId))]
  .map((id) => (id ? db.byId[id] : undefined)).filter((c): c is Champion => !!c);

export function teamNotes(db: Db, { me = {}, allies = [], enemies = [] }: TeamQuery = {}): TeamNotes {
  const ids = [me.championId, ...allies.map((a) => a.championId), ...enemies.map((e) => e.championId)]
    .filter((id): id is string => !!id && !!db.byId[id]);
  const briefs = Object.fromEntries(ids.map((id) => [id, championBrief(db.byId[id])]));
  const composition = {
    allies: teamComposition(knownChampions(db, [me, ...allies])),
    enemies: teamComposition(knownChampions(db, enemies)),
  };
  return { briefs, allyTips: allyTips(db, me, allies), composition };
}
