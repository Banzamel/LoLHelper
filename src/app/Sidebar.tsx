// The navigation sidebar; the champion page belongs to Champions.
import { useService, useStore } from '../shared/hooks/services.tsx';
import { useT } from '../shared/i18n/useT.ts';
import { NAV_VIEWS, Navigator } from '../shared/lib/Navigator.ts';
import { NavIcon } from '../shared/ui/icons.tsx';

export function Sidebar() {
  const t = useT();
  const nav = useService(Navigator);
  const { name } = useStore(nav.store);
  const active = name === 'champion' ? 'champions' : name;
  return (
    <nav className="sidebar" id="nav">
      {NAV_VIEWS.map((v) => (
        <button key={v} className={`nav-btn ${active === v ? 'active' : ''}`} data-view={v} onClick={() => nav.navigate(v)}>
          <NavIcon name={v} /><span>{t(`nav.${v}`)}</span>
        </button>
      ))}
    </nav>
  );
}
