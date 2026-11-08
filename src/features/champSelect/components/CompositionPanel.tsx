// The team's style, how to play it and its gaps, plus one line on what the enemies want;
// nothing while neither team has enough known champions.
import type { TeamNotes } from '../../../core/engine/team/teamNotes.ts';
import { useT } from '../../../shared/i18n/useT.ts';

export function CompositionPanel({ notes }: { notes: TeamNotes | null | undefined }) {
  const t = useT();
  const comp = notes && notes.composition;
  if (!comp || (!comp.allies && !comp.enemies)) return null;
  const { allies, enemies } = comp;
  return (
    <section className="panel team-comp">
      <div className="panel-title">
        <h2>{t('comp.title')}</h2>
        {allies ? <span className="chip teal">{t(`comp.style.${allies.style}`)}</span> : null}
        <span className="muted small">{t('comp.hint')}</span>
      </div>
      {allies ? <ul className="tips comp-plan">{allies.plan.map((line) => <li key={line.key}>{t(line.key, line.params)}</li>)}</ul> : null}
      {allies && allies.warnings.length ? <ul className="tips comp-warnings" aria-label={t('comp.warnings')}>{allies.warnings.map((w) => <li key={w.key}>{t(w.key)}</li>)}</ul> : null}
      {enemies ? (
        <p className="comp-enemy">
          <span className="chip minus">{`${t('comp.enemyLabel')}: ${t(`comp.style.${enemies.style}`)}`}</span>
          <span>{t(enemies.enemyLine.key, enemies.enemyLine.params)}</span>
        </p>
      ) : null}
    </section>
  );
}
