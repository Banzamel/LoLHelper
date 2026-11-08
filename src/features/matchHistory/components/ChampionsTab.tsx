// Results per champion; a champion opens its games in the Matches tab.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { pct } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { ChampIcon, useGameData } from '../../database/index.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';

export function ChampionsTab({ onChampion }: { onChampion: (id: string) => void }) {
  const t = useT();
  const data = useGameData();
  const a = useStore(useService(MatchHistoryService).store).matches.analysis;
  if (!a || !a.games) return <div className="card empty-state"><p>{t('history.noGames')}</p></div>;
  const max = Math.max(...a.byChampion.map((c) => c.games));
  return (
    <div className="tab-body">
      <div className="card">
        <div className="ctable">
          <div className="crow chead">
            <span>{t('history.champion')}</span><span>{t('history.games')}</span><span>{t('player.winrate')}</span><span>KDA</span>
            <span>{t('player.csm')}</span><span>{t('history.dpm')}</span><span>{t('history.kp')}</span>
          </div>
          {a.byChampion.map((c) => (
            <button key={c.key} className="crow" title={t('history.showMatches')} onClick={() => onChampion(c.key)}>
              <span className="bar-champ"><ChampIcon id={c.key} size="sm" /><strong>{data.champName(c.key)}</strong></span>
              <span className="pgold"><span>{String(c.games)}</span><i style={{ width: `${(c.games / max) * 100}%`, background: COLORS.gold }} /></span>
              <span className={(c.winrate || 0) >= 0.5 ? 'plus-text' : 'minus-text'}>{pct(c.winrate)}<span className="muted small">{` ${c.wins}W ${c.games - c.wins}L`}</span></span>
              <span>{String(c.kda)}<span className="muted small">{` ${c.k}/${c.d}/${c.a}`}</span></span>
              <span>{String(c.csm ?? '—')}</span><span>{String(c.dpm ?? '—')}</span><span>{pct(c.kp)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
