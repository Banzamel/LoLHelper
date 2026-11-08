// The update text of the current state and its action button (download, install).
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { AppUpdateService, type UpdateState } from '../AppUpdateService.ts';

export function useUpdateText(): (u: UpdateState, version: string) => string {
  const t = useT();
  return (u, version) => {
    switch (u.state) {
      case 'dev': return t('appUpdate.dev');
      case 'checking': return t('appUpdate.checking');
      case 'available': return t('appUpdate.available', { version: u.version });
      case 'downloading': return t('appUpdate.downloading', { pct: u.pct || 0 });
      case 'downloaded': return t('appUpdate.downloaded', { version: u.version });
      case 'latest': return t('appUpdate.latest', { version });
      case 'error': return t('appUpdate.error', { error: u.error });
      default: return t('settings.version', { version });
    }
  };
}

export function UpdateActions({ update }: { update: UpdateState }) {
  const t = useT();
  const service = useService(AppUpdateService);
  if (update.state === 'available') return <button className="btn small primary" onClick={() => { void service.download(); }}>{t('appUpdate.download')}</button>;
  if (update.state === 'downloaded') return <button className="btn small primary" onClick={() => { void service.install(); }}>{t('appUpdate.install')}</button>;
  return null;
}
