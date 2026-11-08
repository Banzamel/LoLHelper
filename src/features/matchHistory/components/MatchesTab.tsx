// Every game of the account, filtered by type (and champion), sorted and grouped.
import type { CompactGame, CompactPlayer } from '../../../core/matches/types.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { percent } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { AccountService } from '../../account/index.ts';
import { ChampIcon, useGameData } from '../../database/index.ts';
import { mine, QUEUE_TYPES } from '../historyModel.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';
import { MatchRow } from './MatchRow.tsx';

export interface MatchFilters { type: string; champ: string | null; sort: string; open: number[] }
interface Row { g: CompactGame; p: CompactPlayer }

export function MatchesTab({ ui, setUi }: { ui: MatchFilters; setUi: (ui: MatchFilters) => void }) {
  const t = useT();
  const data = useGameData();
  const { matches } = useStore(useService(MatchHistoryService).store);
  const { profile } = useStore(useService(AccountService).store);
  const sorts: Record<string, (a: Row, b: Row) => number> = {
    new: (a, b) => b.g.created - a.g.created,
    old: (a, b) => a.g.created - b.g.created,
    kda: (a, b) => (b.p.k + b.p.a) / Math.max(1, b.p.d) - (a.p.k + a.p.a) / Math.max(1, a.p.d),
    long: (a, b) => b.g.duration - a.g.duration,
    champion: (a, b) => data.champName(a.p.champ).localeCompare(data.champName(b.p.champ)) || b.g.created - a.g.created,
    type: (a, b) => QUEUE_TYPES.indexOf(a.g.type) - QUEUE_TYPES.indexOf(b.g.type) || b.g.created - a.g.created,
  };
  const rows = matches.games.map((g) => ({ g, p: mine(g, profile?.puuid) })).filter((r): r is Row => !!r.p);
  if (!rows.length) return <div className="card empty-state"><p>{t('history.noGames')}</p><p className="muted small">{t('history.noGamesHint')}</p></div>;
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.g.type] = (counts[r.g.type] || 0) + 1;
  const list = rows.filter((r) => (ui.type === 'all' || r.g.type === ui.type) && (!ui.champ || r.p.champ === ui.champ)).sort(sorts[ui.sort] || sorts.new);
  const wins = list.filter((r) => r.p.win).length;
  const groups: { key: string | null; rows: Row[] }[] = [];
  for (const r of list) {
    const key = ui.sort === 'type' ? r.g.type : ui.sort === 'champion' ? r.p.champ : null;
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, rows: [] });
    groups[groups.length - 1].rows.push(r);
  }
  const toggle = (id: number) => setUi({ ...ui, open: ui.open.includes(id) ? ui.open.filter((x) => x !== id) : [...ui.open, id] });
  return (
    <div className="tab-body">
      <div className="filters">
        <div className="chips">
          {['all', ...QUEUE_TYPES.filter((k) => counts[k])].map((k) => (
            <button key={k} className={`chip filter ${ui.type === k ? 'active' : ''}`} onClick={() => setUi({ ...ui, type: k })}>
              {k === 'all' ? t('history.allTypes') : t(`queue.${k}`)}<span className="muted">{String(k === 'all' ? rows.length : counts[k])}</span>
            </button>
          ))}
        </div>
        <div className="spacer" />
        {ui.champ ? <button className="chip filter active" onClick={() => setUi({ ...ui, champ: null })}><ChampIcon id={ui.champ} size="xs" />{data.champName(ui.champ)}{' ×'}</button> : null}
        <label className="muted small sort-label">{t('history.sortBy')}
          <select className="select" value={ui.sort} onChange={(e) => setUi({ ...ui, sort: e.target.value })}>
            {Object.keys(sorts).map((k) => <option key={k} value={k}>{t(`history.sort.${k}`)}</option>)}
          </select>
        </label>
      </div>
      <p className="muted small">{t('history.listSummary', { games: list.length, wins, losses: list.length - wins, pct: percent(wins, list.length) })}</p>
      {groups.map((gr, i) => (
        <div className="match-group" key={gr.key || i}>
          {gr.key ? <h3 className="sub">{ui.sort === 'type' ? t(`queue.${gr.key}`) : data.champName(gr.key)}<span className="muted">{` · ${gr.rows.length} · ${percent(gr.rows.filter((r) => r.p.win).length, gr.rows.length)}%`}</span></h3> : null}
          <div className="hist-list">{gr.rows.map((r) => <MatchRow key={r.g.id} game={r.g} player={r.p} open={ui.open.includes(r.g.id)} onToggle={() => toggle(r.g.id)} />)}</div>
        </div>
      ))}
    </div>
  );
}
