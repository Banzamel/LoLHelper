// No match running (or an unsupported mode): what the view is for and the simulated match.
import { useT } from '../../../shared/i18n/useT.ts';

export function EmptyState({ unsupported, onDemo }: { unsupported: boolean; onDemo: () => void }) {
  const t = useT();
  return (
    <>
      <div className="view-head"><h1>{t('live.title')}</h1></div>
      <div className="panel empty-state">
        <p>{t(unsupported ? 'mode.unsupported' : 'live.noGame')}</p>
        <p className="muted small">{t(unsupported ? 'mode.unsupportedHint' : 'live.noGameHint')}</p>
        <div className="demo-cta"><button className="btn primary" onClick={onDemo}>{t('demo.start')}</button><p className="muted small">{t('demo.startHint')}</p></div>
      </div>
    </>
  );
}
