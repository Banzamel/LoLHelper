// History of the logged-in account: profile and ranks, an overview with charts, every game
// from the League client, per-champion results and the matches the app recorded itself.
import { useViewState } from '../../../shared/hooks/useViewState.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ChampionsTab } from '../components/ChampionsTab.tsx';
import { LearningTab } from '../components/LearningTab.tsx';
import { MatchesTab, type MatchFilters } from '../components/MatchesTab.tsx';
import { OverviewTab } from '../components/OverviewTab.tsx';
import { ProfileCard } from '../components/ProfileCard.tsx';

const TABS = ['overview', 'matches', 'champions', 'learning'];

export function HistoryView() {
  const t = useT();
  const [tab, setTab] = useViewState('history.tab', 'overview');
  const [filters, setFilters] = useViewState<MatchFilters>('history.filters', { type: 'all', champ: null, sort: 'new', open: [] });
  return (
    <div className="history">
      <div className="view-head"><h1>{t('history.title')}</h1></div>
      <ProfileCard />
      <nav className="segmented">
        {TABS.map((k) => <button key={k} className={`seg ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{t(`history.tab.${k}`)}</button>)}
      </nav>
      {tab === 'overview' ? <OverviewTab /> : null}
      {tab === 'matches' ? <MatchesTab ui={filters} setUi={setFilters} /> : null}
      {tab === 'champions' ? <ChampionsTab onChampion={(id) => { setFilters({ ...filters, champ: id }); setTab('matches'); }} /> : null}
      {tab === 'learning' ? <LearningTab /> : null}
    </div>
  );
}
