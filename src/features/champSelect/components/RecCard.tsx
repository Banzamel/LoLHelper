// One counter-pick recommendation: champion, score, the main reasons and the way to its build.
import type { CounterPick } from '../../../core/engine/types.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { Navigator } from '../../../shared/lib/Navigator.ts';
import { ReasonChip, ScoreRing } from '../../../shared/ui/ScoreRing.tsx';
import { BuildService } from '../../builds/index.ts';
import { ChampIcon, useGameData } from '../../database/index.ts';
import type { DraftModel } from '../draftModel.ts';

export function RecCard({ rec, model, opponent }: { rec: CounterPick; model: DraftModel; opponent: string | null }) {
  const t = useT();
  const data = useGameData();
  const nav = useService(Navigator);
  const builds = useService(BuildService);
  const c = data.champ(rec.id);
  if (!c) return null;
  const shown = rec.reasons.slice(0, 4);
  const showBuild = () => {
    builds.setTarget({ championId: rec.id, enemyId: opponent, role: model.myRole, enemyIds: model.enemies.map((e) => e.championId).filter((id): id is string => !!id) });
    nav.navigate('build');
  };
  return (
    <div className="rec-card">
      <ChampIcon id={rec.id} size="lg" onClick={() => nav.navigate('champion', { id: rec.id })} />
      <div className="rec-main">
        <div className="rec-title"><h3>{c.name}</h3><span className={`chip ${c.damageType === 'AP' ? 'ap' : 'ad'}`}>{c.damageType}</span><span className="muted rec-sub">{c.title}</span></div>
        <div className="chips">{shown.map((r, i) => <ReasonChip key={i} reason={r} />)}</div>
        {rec.reasons.length > shown.length ? (
          <div className="muted rec-more" title={rec.reasons.slice(4).map((x) => t(x.key, x.params)).join('\n')}>{`+${rec.reasons.length - shown.length}…`}</div>
        ) : null}
      </div>
      <div className="rec-side"><ScoreRing score={rec.score} /><button className="btn small" onClick={showBuild}>{t('draft.showBuild')}</button></div>
    </div>
  );
}
