// Champion database: searchable grid filtered by position and class.
import { ROLES } from '../../../core/data/types.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useViewState } from '../../../shared/hooks/useViewState.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { Navigator } from '../../../shared/lib/Navigator.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon } from '../components/ChampIcon.tsx';
import { useGameData } from '../hooks/useGameData.ts';

const TAGS = ['Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support'];

export function ChampionsView() {
  const t = useT();
  const data = useGameData();
  const nav = useService(Navigator);
  const [filters, setFilters] = useViewState('champions.filters', { query: '', role: null as string | null, tag: null as string | null });
  const q = filters.query.toLowerCase();
  const list = data.champions.filter((c) => (!filters.role || (c.positions as string[]).includes(filters.role))
    && (!filters.tag || c.tags.includes(filters.tag)) && (!q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)));
  return (
    <>
      <div className="view-head">
        <h1>{t('champions.title')}</h1>
        <span className="muted">{t('champions.count', { n: list.length })}</span>
        <div className="spacer" />
        <input className="input search" placeholder={t('champions.search')} value={filters.query} autoFocus
          onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
      </div>
      <div className="filters">
        <div className="tabs">
          {[null, ...ROLES].map((r) => (
            <button key={r || 'any'} className={`tab ${filters.role === r ? 'active' : ''}`} title={t(r ? `role.${r}` : 'role.any')} onClick={() => setFilters({ ...filters, role: r })}>
              {r ? <RoleIcon role={r} /> : t('role.any')}
            </button>
          ))}
        </div>
        <div className="tabs">
          {[null, ...TAGS].map((g) => (
            <button key={g || 'all'} className={`tab ${filters.tag === g ? 'active' : ''}`} onClick={() => setFilters({ ...filters, tag: g })}>{t(g ? `tag.${g}` : 'tag.all')}</button>
          ))}
        </div>
      </div>
      <div className="champ-grid">
        {list.map((c) => (
          <button key={c.id} className="champ-card" onClick={() => nav.navigate('champion', { id: c.id })}>
            <ChampIcon id={c.id} size="lg" />
            <div className="champ-card-name">{c.name}</div>
            <div className="champ-card-roles">{c.positions.map((p) => <RoleIcon key={p} role={p} />)}</div>
          </button>
        ))}
      </div>
    </>
  );
}
