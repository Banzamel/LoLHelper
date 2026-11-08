// Short "your history" chip for the Draft and Match views (nothing without games).
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { recordOf } from '../historyModel.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';

export function RecordChip({ championId, enemyId }: { championId: string | null; enemyId: string | null }) {
  const t = useT();
  const { history } = useStore(useService(MatchHistoryService).store);
  const r = recordOf(history, championId, enemyId);
  if (!r.games) return null;
  const text = r.vsGames
    ? t('history.recordVs', { wins: r.wins, losses: r.games - r.wins, vsWins: r.vsWins, vsLosses: r.vsGames - r.vsWins, enemy: enemyId })
    : t('history.record', { wins: r.wins, losses: r.games - r.wins });
  return <span className={`chip ${r.wins * 2 >= r.games ? 'plus' : 'minus'}`} title={t('history.recordHint')}>{text}</span>;
}
