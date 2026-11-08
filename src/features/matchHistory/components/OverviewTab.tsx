// Overview of the account's games: key figures, recent form, play style and charts.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { pct } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { BarList } from '../../../shared/ui/charts/BarList.tsx';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { LineChart } from '../../../shared/ui/charts/LineChart.tsx';
import { ResultStrip } from '../../../shared/ui/charts/ResultStrip.tsx';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { AccountService } from '../../account/index.ts';
import { mine } from '../historyModel.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';
import { StatTile } from './StatTile.tsx';
import { TraitChips } from './TraitChips.tsx';

export function OverviewTab() {
  const t = useT();
  const { matches } = useStore(useService(MatchHistoryService).store);
  const { profile } = useStore(useService(AccountService).store);
  const a = matches.analysis;
  if (!a || !a.games) return <div className="card empty-state"><p>{t('history.noGames')}</p><p className="muted small">{t('history.noGamesHint')}</p></div>;
  const results = matches.games.map((g) => mine(g, profile?.puuid)).filter((p) => !!p).map((p) => p.win);
  const form = a.recent.games >= 5 && a.winrate !== null && a.recent.winrate !== null ? a.recent.winrate - a.winrate : null;
  return (
    <div className="tab-body">
      <div className="stat-tiles big">
        <StatTile label={t('history.games')} value={String(a.games)} sub={`${a.wins}W / ${a.games - a.wins}L`} />
        <StatTile label={t('player.winrate')} value={pct(a.winrate)} tone={(a.winrate || 0) >= 0.5 ? 'plus' : 'minus'} />
        <StatTile label="KDA" value={String(a.kda ?? '—')} sub={`${a.k} / ${a.d} / ${a.a}`} />
        <StatTile label={t('player.csm')} value={String(a.csm ?? '—')} />
        <StatTile label={t('history.kp')} value={pct(a.kp)} />
        <StatTile label={t('history.dmgShare')} value={pct(a.share)} />
        <StatTile label={t('history.vpm')} value={String(a.vpm ?? '—')} />
        {form !== null ? <StatTile label={t('history.form')} value={pct(a.recent.winrate)} sub={t(form >= 0 ? 'history.formUp' : 'history.formDown', { n: Math.abs(Math.round(form * 100)) })} tone={form >= 0 ? 'plus' : 'minus'} /> : null}
      </div>
      <div className="card">
        <div className="card-kicker">{t('player.recent')}</div>
        <ResultStrip results={results.slice(0, 30)} />
        {a.streak && a.streak.n >= 2 ? <p className="small">{t(a.streak.win ? 'player.winStreak' : 'player.lossStreak', { n: a.streak.n })}</p> : null}
      </div>
      <div className="card">
        <div className="card-kicker">{t('history.style')}</div>
        {a.traits.length ? <><TraitChips traits={a.traits} /><ul className="tips style-tips">{a.traits.map((x) => <li key={x.key}>{t(`${x.key}Hint`, { v: x.value, champ: x.value })}</li>)}</ul></>
          : <p className="muted small">{t('history.styleNeedsGames')}</p>}
      </div>
      <div className="chart-grid">
        <div className="card">
          <div className="card-kicker">{t('history.chartWinrate')}</div>
          <LineChart series={[{ label: t('history.rolling'), color: COLORS.gold, points: a.trend.map((x, i) => [i + 1, Math.round((x.winrate || 0) * 100)]) }]}
            yMin={0} yMax={100} yFmt={(v) => `${v}%`} xFmt={(v) => `#${v}`} />
          <p className="muted small">{t('history.chartWinrateHint')}</p>
        </div>
        <div className="card">
          <div className="card-kicker">{t('history.chartKda')}</div>
          <LineChart series={[{ label: 'KDA', color: COLORS.ally, points: a.trend.map((x, i) => [i + 1, x.kda || 0]) }]} yMin={0} xFmt={(v) => `#${v}`} />
        </div>
      </div>
      <div className="chart-grid">
        <div className="card"><div className="card-kicker">{t('history.byType')}</div>
          <BarList rows={a.byType.map((x) => ({ label: t(`queue.${x.key}`), value: x.games, color: COLORS.gold, text: `${x.games} · ${pct(x.winrate)}` }))} /></div>
        <div className="card"><div className="card-kicker">{t('player.roles')}</div>
          {a.byRole.length ? <BarList rows={a.byRole.map((x) => ({ label: <span className="role-badge"><RoleIcon role={x.key} />{t(`role.${x.key}`)}</span>, value: x.games, color: COLORS.gold, text: `${x.games} · ${pct(x.winrate)}` }))} />
            : <p className="muted small">—</p>}</div>
      </div>
    </div>
  );
}
