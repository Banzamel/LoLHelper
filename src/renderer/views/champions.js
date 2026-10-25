// Champion database: searchable grid filtered by position and class.
import { t } from '../js/i18n.js';
import { state } from '../js/store.js';
import { el, champIcon, roleIcon, ROLES } from '../js/ui.js';
import { navigate } from '../js/app.js';

const TAGS = ['Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support'];
const filters = { query: '', role: null, tag: null };

export function renderChampions(root) {
  const grid = el('div', { class: 'champ-grid' });
  const count = el('span', { class: 'muted' });
  const roleTabs = el('div', { class: 'tabs' });
  const tagTabs = el('div', { class: 'tabs' });

  const draw = () => {
    roleTabs.replaceChildren(...[null, ...ROLES].map((r) => el('button', {
      class: `tab ${filters.role === r ? 'active' : ''}`, title: t(r ? `role.${r}` : 'role.any'), onClick: () => { filters.role = r; draw(); },
    }, r ? roleIcon(r) : t('role.any'))));
    tagTabs.replaceChildren(...[null, ...TAGS].map((g) => el('button', {
      class: `tab ${filters.tag === g ? 'active' : ''}`, onClick: () => { filters.tag = g; draw(); },
    }, t(g ? `tag.${g}` : 'tag.all'))));
    const q = filters.query.toLowerCase();
    const list = state.db.champions.filter((c) => (!filters.role || c.positions.includes(filters.role))
      && (!filters.tag || c.tags.includes(filters.tag)) && (!q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)));
    count.textContent = t('champions.count', { n: list.length });
    grid.replaceChildren(...list.map((c) => el('button', { class: 'champ-card', onClick: () => navigate('champion', { id: c.id }) },
      champIcon(c.id, { size: 'lg' }),
      el('div', { class: 'champ-card-name' }, c.name),
      el('div', { class: 'champ-card-roles' }, c.positions.map((p) => roleIcon(p))))));
  };

  const search = el('input', { class: 'input search', placeholder: t('champions.search'), value: filters.query, onInput: (e) => { filters.query = e.target.value; draw(); } });
  root.append(el('div', { class: 'view-head' }, el('h1', {}, t('champions.title')), count, el('div', { class: 'spacer' }), search),
    el('div', { class: 'filters' }, roleTabs, tagTabs), grid);
  draw();
  search.focus();
}
