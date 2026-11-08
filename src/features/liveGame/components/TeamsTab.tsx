// Both teams as tables, sortable by role, item gold, KDA or CS.
import { ROLES } from '../../../core/data/types.ts';
import type { LivePlayer, PlayingGame } from '../../../core/live/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import type { GameBuild } from '../gameModel.ts';
import { TeamTable } from './TeamTable.tsx';

const kdaOf = (p: LivePlayer) => ((p.scores.kills || 0) + (p.scores.assists || 0)) / Math.max(1, p.scores.deaths || 0);
export const SORTS: Record<string, (a: LivePlayer, b: LivePlayer) => number> = {
  role: (a, b) => ROLES.indexOf(a.position as never) - ROLES.indexOf(b.position as never),
  gold: (a, b) => b.itemGold - a.itemGold,
  kda: (a, b) => kdaOf(b) - kdaOf(a),
  cs: (a, b) => (b.scores.creepScore || 0) - (a.scores.creepScore || 0),
};

export function TeamsTab({ game, data, sort, onSort }: { game: PlayingGame; data: GameBuild; sort: string; onSort: (k: string) => void }) {
  const t = useT();
  const maxGold = Math.max(1, ...[...game.allies, ...game.enemies].map((p) => p.itemGold));
  const order = SORTS[sort] || SORTS.role;
  return (
    <div className="tab-body">
      <div className="tab-tools">
        <span className="muted small">{t('live.sortBy')}</span>
        <div className="tabs">{Object.keys(SORTS).map((k) => <button key={k} className={`tab ${sort === k ? 'active' : ''}`} onClick={() => onSort(k)}>{t(`live.sort.${k}`)}</button>)}</div>
        <span className="muted small">{t('live.clickPlayer')}</span>
      </div>
      <TeamTable list={game.enemies} game={game} ally={false} opp={data.opp} maxGold={maxGold} sort={order} />
      <TeamTable list={game.allies} game={game} ally opp={data.opp} maxGold={maxGold} sort={order} />
    </div>
  );
}
