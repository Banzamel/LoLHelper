// Item database: grid filtered by category and stat, with a detail panel (stats, passives, build path).
import { t } from '../js/i18n.js';
import { state, item } from '../js/store.js';
import { el, itemIcon } from '../js/ui.js';

const CATEGORIES = ['legendary', 'boots', 'boots-upgrade', 'epic', 'component', 'starter', 'support', 'jungle', 'consumable', 'trinket'];
const STATS = ['ad', 'ap', 'as', 'crit', 'armor', 'mr', 'hp', 'haste', 'lethality', 'armorPen', 'magicPen', 'lifesteal', 'omnivamp', 'mana', 'hsp', 'msPct'];
const filters = { query: '', category: 'legendary', stat: null, selected: null };

function detail(it) {
  if (!it) return el('p', { class: 'muted' }, t('items.select'));
  const tree = (ids, title) => (ids.length ? el('div', {}, el('h3', { class: 'sub' }, title),
    el('div', { class: 'build-strip' }, ids.filter((id) => item(id)).map((id) => itemIcon(id, { onClick: () => { filters.selected = id; redraw(); } })))) : '');
  return el('div', {},
    el('div', { class: 'item-head' }, itemIcon(it.id, { size: 'lg' }),
      el('div', {}, el('h2', {}, it.name), el('div', { class: 'gold-text' }, `${t('items.cost')}: ${it.gold.total} (${it.gold.base})`),
        el('div', { class: 'muted' }, `${t('items.sell')}: ${it.gold.sell}`))),
    it.plaintext ? el('p', { class: 'muted item-plain' }, it.plaintext) : '',
    el('div', { class: 'item-desc', html: it.description }),
    tree(it.from, t('items.buildsFrom')),
    tree(it.into, t('items.buildsInto')));
}

let redraw = () => {};

export function renderItems(root) {
  const grid = el('div', { class: 'item-grid' });
  const side = el('aside', { class: 'panel gold item-detail' });
  const count = el('span', { class: 'muted' });
  const catTabs = el('div', { class: 'tabs wrap' });
  const statChips = el('div', { class: 'chips' });

  redraw = () => {
    catTabs.replaceChildren(...[null, ...CATEGORIES].map((c) => el('button', {
      class: `tab ${filters.category === c ? 'active' : ''}`, onClick: () => { filters.category = c; redraw(); },
    }, t(c ? `category.${c}` : 'category.all'))));
    statChips.replaceChildren(...STATS.map((s) => el('button', {
      class: `chip filter ${filters.stat === s ? 'teal' : ''}`, onClick: () => { filters.stat = filters.stat === s ? null : s; redraw(); },
    }, t(`stat.${s}`))));
    const q = filters.query.toLowerCase();
    const list = state.db.items.filter((i) => (!filters.category || i.category === filters.category)
      && (!filters.stat || i.features.stats[filters.stat] || (filters.stat === 'magicPen' && i.features.stats.magicPenFlat))
      && (!q || i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q)));
    count.textContent = t('items.count', { n: list.length });
    grid.replaceChildren(...list.map((i) => el('button', { class: `item-card ${filters.selected === i.id ? 'active' : ''}`, onClick: () => { filters.selected = i.id; redraw(); } },
      itemIcon(i.id), el('div', {}, el('div', { class: 'item-card-name' }, i.name), el('div', { class: 'gold-text' }, String(i.gold.total))))));
    side.replaceChildren(detail(item(filters.selected)));
  };

  const search = el('input', { class: 'input search', placeholder: t('items.search'), value: filters.query, onInput: (e) => { filters.query = e.target.value; redraw(); } });
  root.append(el('div', { class: 'view-head' }, el('h1', {}, t('items.title')), count, el('div', { class: 'spacer' }), search),
    el('div', { class: 'filters' }, catTabs), el('div', { class: 'filters' }, el('span', { class: 'muted' }, t('items.statFilter')), statChips),
    el('div', { class: 'items-layout' }, grid, side));
  redraw();
}
