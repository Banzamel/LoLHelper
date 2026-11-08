// Charts of the match so far: gold lead with objectives marked, team gold, kills, item gold
// per player and the kill/objective feed.
import type { FeedEvent, PlayingGame } from '../../../core/live/types.ts';
import { fmtGold, fmtMinutes } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { BarList } from '../../../shared/ui/charts/BarList.tsx';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { LineChart } from '../../../shared/ui/charts/LineChart.tsx';
import { ChampIcon, useGameData } from '../../database/index.ts';

function FeedRow({ e }: { e: FeedEvent }) {
  const t = useT();
  const icon = (id: string | null) => (id ? <ChampIcon id={id} size="xs" /> : <span className="feed-blank" />);
  return (
    <div className={`feed-row ${e.team || ''}`}>
      <span className="muted feed-time">{fmtMinutes(e.t)}</span>
      {e.type === 'kills' ? <>{icon(e.killer)}<span className="feed-arrow">→</span>{icon(e.victim)}</> : (
        <>{icon(e.killer)}<span>{e.type === 'dragons' ? t(`dragon.${e.dragon}`) : t(`obj.${e.type}`)}</span>{e.stolen ? <span className="chip minus">{t('live.stolen')}</span> : null}</>
      )}
    </div>
  );
}

export function ChartsTab({ game }: { game: PlayingGame }) {
  const t = useT();
  const data = useGameData();
  const tl = game.timeline || [];
  const markers = (game.feed || []).filter((e) => ['dragons', 'barons', 'heralds', 'atakhan', 'inhibs'].includes(e.type)).map((e) => ({
    x: e.t, color: e.team === 'enemy' ? COLORS.enemy : COLORS.ally,
    label: `${fmtMinutes(e.t)} ${e.type === 'dragons' ? t(`dragon.${e.dragon}`) : t(`obj.${e.type}`)} · ${t(e.team === 'enemy' ? 'draft.enemies' : 'draft.allies')}`,
  }));
  const empty = t('live.chartWait');
  const players = [...game.allies.map((p) => ({ p, ally: true })), ...game.enemies.map((p) => ({ p, ally: false }))].sort((a, b) => b.p.itemGold - a.p.itemGold);
  return (
    <div className="tab-body">
      <div className="card">
        <div className="card-kicker">{t('live.chartLead')}</div>
        <LineChart series={[{ label: t('live.goldLeadAxis'), color: COLORS.ally, points: tl.map((x) => [x.t, x.ally - x.enemy]) }]}
          diverging={{ pos: COLORS.ally, neg: COLORS.enemy }} xFmt={fmtMinutes} yFmt={(v) => `${v > 0 ? '+' : ''}${fmtGold(v)}`} markers={markers} height={200} empty={empty} />
        <p className="muted small">{t('live.chartLeadHint')}</p>
      </div>
      <div className="chart-grid">
        <div className="card"><div className="card-kicker">{t('live.chartTeamGold')}</div>
          <LineChart series={[{ label: t('draft.allies'), color: COLORS.ally, points: tl.map((x) => [x.t, x.ally]) }, { label: t('draft.enemies'), color: COLORS.enemy, points: tl.map((x) => [x.t, x.enemy]) }]}
            xFmt={fmtMinutes} yFmt={fmtGold} yMin={0} empty={empty} /></div>
        <div className="card"><div className="card-kicker">{t('live.chartKills')}</div>
          <LineChart series={[{ label: t('draft.allies'), color: COLORS.ally, step: true, points: tl.map((x) => [x.t, x.allyKills]) }, { label: t('draft.enemies'), color: COLORS.enemy, step: true, points: tl.map((x) => [x.t, x.enemyKills]) }]}
            xFmt={fmtMinutes} yMin={0} empty={empty} /></div>
      </div>
      <div className="chart-grid">
        <div className="card">
          <div className="card-kicker">{t('live.chartPlayers')}</div>
          <BarList rows={players.map(({ p, ally }) => ({ label: <span className="bar-champ"><ChampIcon id={p.championId} size="xs" />{data.champ(p.championId) ? data.champName(p.championId) : ''}</span>, value: p.itemGold, color: ally ? COLORS.ally : COLORS.enemy, text: fmtGold(p.itemGold) }))} />
          <div className="chart-legend"><span><i style={{ background: COLORS.ally }} />{t('draft.allies')}</span><span><i style={{ background: COLORS.enemy }} />{t('draft.enemies')}</span></div>
        </div>
        <div className="card">
          <div className="card-kicker">{t('live.feed')}</div>
          {(game.feed || []).length ? <div className="feed">{game.feed.slice(0, 25).map((e, i) => <FeedRow key={i} e={e} />)}</div> : <p className="muted small">{t('live.feedEmpty')}</p>}
        </div>
      </div>
    </div>
  );
}
