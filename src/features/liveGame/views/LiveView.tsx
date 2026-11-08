// In-game view laid out like a phone app: a scoreboard and tabs — what to do now, the enemies
// in detail, both teams as a table, charts and runes. Before the game reports data it shows
// the loading screen; without a match, the way to a simulated one.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useViewState } from '../../../shared/hooks/useViewState.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { Navigator } from '../../../shared/lib/Navigator.ts';
import { AccountService } from '../../account/index.ts';
import { LoadoutPanels } from '../../builds/index.ts';
import { ClientService } from '../../client/index.ts';
import { ChartsTab } from '../components/ChartsTab.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { EnemiesTab } from '../components/EnemiesTab.tsx';
import { LiveHead } from '../components/LiveHead.tsx';
import { LoadingScreen } from '../components/LoadingScreen.tsx';
import { NowTab } from '../components/NowTab.tsx';
import { Scoreboard } from '../components/Scoreboard.tsx';
import { TeamsTab } from '../components/TeamsTab.tsx';
import { useLiveMatch } from '../hooks/useLiveMatch.ts';
import { LiveGameService } from '../LiveGameService.ts';

const TABS = ['now', 'enemies', 'teams', 'charts', 'runes'];

export function LiveView({ unsupported }: { unsupported: boolean }) {
  const t = useT();
  const live = useService(LiveGameService);
  const nav = useService(Navigator);
  const { game, demo } = useStore(live.store);
  const client = useStore(useService(ClientService).store);
  const { profile } = useStore(useService(AccountService).store);
  const [ui, setUi] = useViewState('live.ui', { tab: 'now', focus: null as string | null, sort: 'role' });
  const shown = useLiveMatch(game, ui.tab === 'charts');

  if (!shown) {
    const loading = client.phase === 'InProgress' && !unsupported && !demo && !!(client.roster && client.roster.length);
    if (loading && client.roster) return <LoadingScreen roster={client.roster} puuid={profile ? profile.puuid : null} />;
    return <EmptyState unsupported={unsupported} onDemo={() => { if (live.startDemo()) nav.navigate('live'); }} />;
  }
  const { game: g, data } = shown;
  const tab = {
    now: <NowTab game={g} data={data} onOpponent={() => data.opp && setUi({ ...ui, tab: 'enemies', focus: data.opp.name })} />,
    enemies: <EnemiesTab game={g} data={data} focus={ui.focus} onFocus={(focus) => setUi({ ...ui, focus })} />,
    teams: <TeamsTab game={g} data={data} sort={ui.sort} onSort={(sort) => setUi({ ...ui, sort })} />,
    charts: <ChartsTab game={g} />,
    runes: <div className="tab-body"><LoadoutPanels build={data.build} inChampSelect={false} current={{ runes: g.me.runes, spells: g.me.spells }} parts={['runes', 'spells']} guide={data.guide} /></div>,
  }[ui.tab];
  return (
    <div className="live">
      <LiveHead game={g} data={data} onStopDemo={() => live.stopDemo()} />
      <Scoreboard game={g} />
      <nav className="segmented">{TABS.map((k) => <button key={k} className={`seg ${ui.tab === k ? 'active' : ''}`} onClick={() => setUi({ ...ui, tab: k })}>{t(`live.tab.${k}`)}</button>)}</nav>
      {tab}
    </div>
  );
}
