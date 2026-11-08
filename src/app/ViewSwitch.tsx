// The current view inside the scrolling main area. Without a database only Settings works (it
// can download one).
import { useEffect, useRef } from 'react';
import { useService, useStore } from '../shared/hooks/services.tsx';
import { Navigator } from '../shared/lib/Navigator.ts';
import { TooltipController } from '../shared/ui/overlays/TooltipController.ts';
import { BuildView } from '../features/builds/index.ts';
import { DraftView } from '../features/champSelect/index.ts';
import { ClientService } from '../features/client/index.ts';
import { ChampionsView, ChampionView, ItemsView, useMaybeGameData } from '../features/database/index.ts';
import { LiveView } from '../features/liveGame/index.ts';
import { HistoryView } from '../features/matchHistory/index.ts';
import { SettingsView } from '../features/settings/index.ts';

export function ViewSwitch({ version }: { version: string }) {
  const route = useStore(useService(Navigator).store);
  const tooltip = useService(TooltipController);
  const client = useStore(useService(ClientService).store);
  const data = useMaybeGameData();
  const ref = useRef<HTMLElement>(null);
  const name = data ? route.name : 'settings';
  const unsupported = !!client.mode && !client.mode.supported && client.phase !== 'None';
  useEffect(() => {
    tooltip.hide();
    if (ref.current) ref.current.scrollTop = 0;
  }, [route, tooltip]);
  return (
    <main id="view" className="view" ref={ref}>
      {name === 'draft' ? <DraftView unsupported={unsupported} /> : null}
      {name === 'live' ? <LiveView unsupported={unsupported} /> : null}
      {name === 'history' ? <HistoryView /> : null}
      {name === 'build' ? <BuildView /> : null}
      {name === 'champions' ? <ChampionsView /> : null}
      {name === 'champion' ? <ChampionView id={route.params.id} /> : null}
      {name === 'items' ? <ItemsView /> : null}
      {name === 'settings' ? <SettingsView version={version} /> : null}
    </main>
  );
}
