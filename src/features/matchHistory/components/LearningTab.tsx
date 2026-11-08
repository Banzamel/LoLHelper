// The matches the app recorded itself (purchase timelines the engine learns from).
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { percent } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ModalController } from '../../../shared/ui/overlays/ModalController.tsx';
import { MatchHistoryService } from '../MatchHistoryService.ts';
import { LearningRow } from './LearningRow.tsx';

export function LearningTab() {
  const t = useT();
  const service = useService(MatchHistoryService);
  const modal = useService(ModalController);
  const { history: list } = useStore(service.store);
  const clear = async () => {
    if (await modal.confirm(t('history.clearTitle'), t('history.clearText'), t('history.clear'))) service.clear();
  };
  if (!list.length) return <div className="card empty-state"><p>{t('history.empty')}</p><p className="muted small">{t('history.emptyHint')}</p></div>;
  const wins = list.filter((g) => g.win).length;
  return (
    <div className="tab-body">
      <div className="card">
        <div className="panel-title">
          <div className="card-kicker">{t('history.learnTitle')}</div>
          <span className="chip teal">{t('history.summary', { games: list.length, wins, losses: list.length - wins, pct: percent(wins, list.length) })}</span>
          <div className="spacer" />
          <button className="btn small ghost" onClick={() => { void clear(); }}>{t('history.clear')}</button>
        </div>
        <p className="muted small">{t('history.learnHint')}</p>
        <div className="hist-list">{list.map((g) => <LearningRow key={g.id} game={g} onRemove={() => service.remove(g.id)} />)}</div>
      </div>
    </div>
  );
}
