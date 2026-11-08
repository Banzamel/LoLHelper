// The banner under the title bar while an update is available, downloading or ready.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { AppUpdateService } from '../AppUpdateService.ts';
import { UpdateActions, useUpdateText } from './UpdateActions.tsx';

export function UpdateBanner({ version }: { version: string }) {
  const update = useStore(useService(AppUpdateService).store);
  const text = useUpdateText();
  const show = ['available', 'downloading', 'downloaded'].includes(update.state);
  return (
    <div id="update-banner" className="update-banner" hidden={!show}>
      {show ? <><span>{text(update, version)}</span><UpdateActions update={update} /></> : null}
    </div>
  );
}
