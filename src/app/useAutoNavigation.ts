// Opens the Draft view when champion select starts and the Match view when a match starts
// (both can be turned off in Settings); at launch, whichever is going on.
import { useEffect, useRef } from 'react';
import { useService, useStore } from '../shared/hooks/services.tsx';
import { Navigator } from '../shared/lib/Navigator.ts';
import { ClientService } from '../features/client/index.ts';
import { isPlaying, LiveGameService } from '../features/liveGame/index.ts';
import { SettingsService } from '../features/settings/index.ts';

export function useAutoNavigation() {
  const nav = useService(Navigator);
  const client = useStore(useService(ClientService).store);
  const { game } = useStore(useService(LiveGameService).store);
  const { settings } = useStore(useService(SettingsService).store);
  const prev = useRef({ phase: client.phase, playing: isPlaying(game), first: true });
  useEffect(() => {
    const playing = isPlaying(game);
    const p = prev.current;
    const supported = !client.mode || client.mode.supported;
    if (p.first) {
      if (playing && settings.autoOpenLive) nav.navigate('live');
      else if (client.draft && settings.autoOpenDraft) nav.navigate('draft');
    } else {
      if (client.phase !== p.phase && client.phase === 'ChampSelect' && supported && settings.autoOpenDraft && nav.current.name !== 'draft') nav.navigate('draft');
      if (playing && !p.playing && settings.autoOpenLive && nav.current.name !== 'live') nav.navigate('live');
    }
    prev.current = { phase: client.phase, playing, first: false };
  }, [client.phase, client.draft, client.mode, game, settings.autoOpenDraft, settings.autoOpenLive, nav]);
}
