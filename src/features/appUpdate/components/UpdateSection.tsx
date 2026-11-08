// The update status and buttons in Settings → About.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { AppUpdateService } from '../AppUpdateService.ts';
import { UpdateActions, useUpdateText } from './UpdateActions.tsx';

export function UpdateSection({ version }: { version: string }) {
  const t = useT();
  const service = useService(AppUpdateService);
  const update = useStore(service.store);
  const text = useUpdateText();
  const busy = update.state === 'dev' || update.state === 'checking' || update.state === 'downloading';
  return (
    <div>
      <p>{text(update, version)}</p>
      <div className="row-actions">
        <button className="btn" disabled={busy} onClick={() => { void service.check(); }}>{t('appUpdate.check')}</button>
        <UpdateActions update={update} />
      </div>
    </div>
  );
}
