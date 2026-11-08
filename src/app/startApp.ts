// Start-up of the main window: settings, language and database first, then the last played
// account, the League client, the widget and the update check; settings changes are wired to
// their side effects here.
import { devOptions, mainWindow, UpdaterAdapter } from '../platform/index.ts';
import type { ServiceRegistry } from '../shared/hooks/services.tsx';
import { I18nService } from '../shared/i18n/I18nService.ts';
import { AccountService } from '../features/account/index.ts';
import { AppUpdateService } from '../features/appUpdate/index.ts';
import { ChampSelectService } from '../features/champSelect/index.ts';
import { ClientService } from '../features/client/index.ts';
import { DatabaseService } from '../features/database/index.ts';
import { LiveGameService } from '../features/liveGame/index.ts';
import { SettingsService } from '../features/settings/index.ts';
import { OverlayService } from '../features/widget/index.ts';
import { createServices } from './services.ts';

export interface StartedApp { registry: ServiceRegistry; version: string }

export async function startApp(): Promise<StartedApp> {
  const dev = await devOptions();
  const r = createServices(dev);
  const settings = r.get(SettingsService);
  const i18n = r.get(I18nService);
  const database = r.get(DatabaseService);
  const client = r.get(ClientService);
  const account = r.get(AccountService);
  const overlay = r.get(OverlayService);

  await settings.load();
  const { language, leagueDir, alwaysOnTop } = settings.value;
  i18n.setLanguage(language);
  await database.load(language);
  // Until the client reports the logged-in account, the last one played is shown.
  await account.restoreLastPlayed();

  client.onConnected(() => { void account.loadAccount(); });
  settings.onChange((patch, next) => {
    if ('alwaysOnTop' in patch) void mainWindow.setAlwaysOnTop(!!next.alwaysOnTop);
    if ('leagueDir' in patch) client.start(next.leagueDir);
    if ('language' in patch) {
      i18n.setLanguage(next.language);
      void database.load(next.language);
      overlay.reload();
    }
  });

  r.get(ChampSelectService).init();
  await overlay.init();
  r.get(AppUpdateService).start();
  client.start(leagueDir);
  // Development: LOLHELPER_LIVE=1 polls the game without waiting for the client's game phase.
  if (dev.live) r.get(LiveGameService).start();
  if (alwaysOnTop) await mainWindow.setAlwaysOnTop(true);
  const version = await new UpdaterAdapter().appVersion();
  return { registry: r, version };
}
