// A past game's team gold lead per minute and, with a lane opponent, the gold of both.
import type { CompactGame, CompactPlayer } from '../../../core/matches/types.ts';
import { fmtGold } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { LineChart } from '../../../shared/ui/charts/LineChart.tsx';
import { useGameData } from '../../database/index.ts';

export function GoldChart({ game, me }: { game: CompactGame; me: CompactPlayer }) {
  const t = useT();
  const data = useGameData();
  const gold = game.gold;
  if (!gold || !gold.teams || gold.teams.length < 2) return <p className="muted small">{t('history.noTimeline')}</p>;
  const mineFirst = me.team === 100;
  const opp = game.players.find((p) => p.team !== me.team && p.pos && p.pos === me.pos);
  const minutes = (v: number) => `${v}'`;
  const duel = opp && gold.players[me.pid] && gold.players[opp.pid];
  return (
    <div className="chart-grid">
      <div>
        <div className="card-kicker">{t('history.chartLead')}</div>
        <LineChart series={[{ label: t('live.goldLeadAxis'), color: COLORS.ally, points: gold.teams.map(([m, b, r]) => [m, mineFirst ? b - r : r - b]) }]}
          diverging={{ pos: COLORS.ally, neg: COLORS.enemy }} xFmt={minutes} yFmt={(v) => `${v > 0 ? '+' : ''}${fmtGold(v)}`} height={170} />
      </div>
      {duel && opp ? (
        <div>
          <div className="card-kicker">{t('history.chartDuel')}</div>
          <LineChart series={[
            { label: data.champName(me.champ), color: COLORS.ally, points: gold.players[me.pid].map((v, i) => [i, v]) },
            { label: data.champName(opp.champ), color: COLORS.enemy, points: gold.players[opp.pid].map((v, i) => [i, v]) },
          ]} xFmt={minutes} yFmt={fmtGold} yMin={0} height={170} />
        </div>
      ) : null}
    </div>
  );
}
