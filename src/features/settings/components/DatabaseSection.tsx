// Database info, update check and download of a new patch with progress.
import { useState } from 'react';
import { errorMessage } from '../../../platform/index.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useT, useTranslator } from '../../../shared/i18n/useT.ts';
import { DatabaseService } from '../../database/index.ts';

export function DatabaseSection() {
  const t = useT();
  const { lang } = useTranslator();
  const database = useService(DatabaseService);
  const { data, progress } = useStore(database.store);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const meta = data ? data.meta : null;
  const check = async () => {
    try {
      const r = await database.checkUpdate();
      setStatus(r.outdated ? t('settings.outdated', { latest: r.latest, current: r.current || '—' }) : t('settings.upToDate', { version: r.current }));
    } catch (e) { setStatus(t('update.failed', { error: errorMessage(e) })); }
  };
  const update = async () => {
    setBusy(true);
    try { await database.update(lang); setStatus(''); } catch (e) { setStatus(t('update.failed', { error: errorMessage(e) })); } finally { setBusy(false); }
  };
  return (
    <section className="panel">
      <h2>{t('settings.database')}</h2>
      <p>{meta ? t('settings.dbInfo', { version: meta.version, champions: meta.champions, items: meta.items, date: new Date(meta.builtAt).toLocaleDateString() }) : t('settings.noDb')}</p>
      <div className="row-actions">
        <button className="btn" onClick={() => { void check(); }}>{t('settings.checkUpdate')}</button>
        <button className="btn primary" disabled={busy} onClick={() => { void update(); }}>{t('settings.update')}</button>
      </div>
      <div className={`progress ${progress ? '' : 'hidden'}`}><i style={{ width: `${progress ? progress.pct : 0}%` }} /></div>
      <p className="muted">{progress ? t(progress.key, progress.params) : status}</p>
    </section>
  );
}
