// Creates every service of the main window with its dependencies and registers it for the
// components (useService).
import { TauriLcuConnection, TauriStorage, UpdaterAdapter, isPackaged, type DevOptions } from '../platform/index.ts';
import { ServiceRegistry } from '../shared/hooks/services.tsx';
import { I18nService } from '../shared/i18n/I18nService.ts';
import { Navigator, ViewMemory } from '../shared/lib/Navigator.ts';
import { ModalController } from '../shared/ui/overlays/ModalController.tsx';
import { ToastController } from '../shared/ui/overlays/ToastController.ts';
import { TooltipController } from '../shared/ui/overlays/TooltipController.ts';
import { AccountService } from '../features/account/index.ts';
import { AppUpdateService } from '../features/appUpdate/index.ts';
import { BuildService, ExportService } from '../features/builds/index.ts';
import { ChampSelectService } from '../features/champSelect/index.ts';
import { ClientService } from '../features/client/index.ts';
import { DatabaseService } from '../features/database/index.ts';
import { LiveGameService } from '../features/liveGame/index.ts';
import { MatchHistoryService } from '../features/matchHistory/index.ts';
import { SettingsService } from '../features/settings/index.ts';
import { OverlayService } from '../features/widget/index.ts';

export function createServices(dev: DevOptions): ServiceRegistry {
  const r = new ServiceRegistry();
  const storage = new TauriStorage();
  const i18n = r.add(I18nService, new I18nService());
  r.add(Navigator, new Navigator());
  r.add(ViewMemory, new ViewMemory());
  r.add(TooltipController, new TooltipController());
  r.add(ModalController, new ModalController());
  r.add(ToastController, new ToastController());

  const settings = r.add(SettingsService, new SettingsService(storage));
  const database = r.add(DatabaseService, new DatabaseService(i18n));
  // The account is known later; the client asks for it when it needs it.
  let account: AccountService | null = null;
  const client = r.add(ClientService, new ClientService(new TauriLcuConnection(), () => database.data?.db ?? null, () => account?.puuid ?? null));
  const history = r.add(MatchHistoryService, new MatchHistoryService(storage, client, database));
  account = r.add(AccountService, new AccountService(storage, settings, history, client));
  const builds = r.add(BuildService, new BuildService(database, settings, client, history));
  r.add(ExportService, new ExportService(client, database, settings));
  r.add(ChampSelectService, new ChampSelectService(client));
  const live = r.add(LiveGameService, new LiveGameService(database, client, history, { live: dev.live, roster: dev.roster ? JSON.parse(dev.roster) : null }));
  r.add(OverlayService, new OverlayService(settings, live, builds, database));
  r.add(AppUpdateService, new AppUpdateService(new UpdaterAdapter(), isPackaged()));
  return r;
}
