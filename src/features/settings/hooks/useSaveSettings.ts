// Saves a settings change and says so.
import type { SettingsData } from '../../../core/settings/defaults.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { ToastController } from '../../../shared/ui/overlays/ToastController.ts';
import { SettingsService } from '../SettingsService.ts';

export function useSaveSettings() {
  const t = useT();
  const settings = useService(SettingsService);
  const toast = useService(ToastController);
  return (patch: Partial<SettingsData>) => {
    settings.set(patch);
    toast.show(t('settings.saved'), { ms: 1500 });
  };
}
