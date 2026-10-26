// DOM helpers and shared components: icons, tooltips, modal, champion picker, toast.
import { t } from './i18n.js';
import { state, champ, item, rune, summoner, asset } from './store.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) node.append(c.nodeType ? c : document.createTextNode(c));
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(paths, viewBox = '0 0 24 24') {
  const node = document.createElementNS(SVG_NS, 'svg');
  node.setAttribute('viewBox', viewBox);
  node.innerHTML = paths;
  return node;
}

const ICONS = {
  draft: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"/>',
  live: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 20L14 10M14 10l2-6 4 4-6 2M6 14l4 4M3 21l2-2"/><circle cx="18" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  build: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z M9 12l2 2 4-4"/>',
  champions: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  history: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 7v5l3 2"/>',
  items: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M5 8h14l-1.5 12h-11zM9 8V6a3 3 0 016 0v2"/>',
  settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
};
export const navIcon = (name) => svg(ICONS[name]);

// Position icons drawn as simple map glyphs (lane highlighted on a 3-lane map square).
const ROLE_PATHS = {
  TOP: '<path fill="currentColor" d="M3 3h13l-4 4H7v5l-4 4z" opacity=".95"/><path fill="currentColor" opacity=".3" d="M21 21H8l4-4h5v-5l4-4z"/>',
  JUNGLE: '<path fill="currentColor" d="M12 2c-1 4-4 6-4 10 0 3 2 5 4 8 2-3 4-5 4-8 0-4-3-6-4-10zM5 7c0 4 1 7 4 9-1-3-1-6 0-8zM19 7c0 4-1 7-4 9 1-3 1-6 0-8z"/>',
  MIDDLE: '<path fill="currentColor" opacity=".3" d="M3 3h9l-9 9zM21 21h-9l9-9z"/><path fill="currentColor" d="M17 3h4v4L7 21H3v-4z"/>',
  BOTTOM: '<path fill="currentColor" d="M21 21H8l4-4h5v-5l4-4z" opacity=".95"/><path fill="currentColor" opacity=".3" d="M3 3h13l-4 4H7v5l-4 4z"/>',
  SUPPORT: '<path fill="currentColor" d="M9 4h6l-1 3h-4zM4 7h5l2 3-2 2-5-3zM20 7h-5l-2 3 2 2 5-3zM10 11h4l-1 9h-2z"/>',
};
export const roleIcon = (role) => svg(ROLE_PATHS[role] || '<circle cx="12" cy="12" r="6" fill="currentColor" opacity=".4"/>');
export const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'SUPPORT'];

// Ranked tier badge: "Gold II · 45 LP" plus the season winrate; compact = tier and division only.
export function rankBadge(rank, { compact = false } = {}) {
  if (!rank) return null;
  const tierName = (r) => `${t(`rank.${r.tier}`)}${r.division ? ` ${r.division}` : ''}`;
  if (!rank.tier) {
    const prev = rank.previous;
    return el('span', { class: `rank-badge unranked ${prev ? `tier-${prev.tier.toLowerCase()}` : ''}`, title: prev ? t('rank.previousHint') : null },
      t('rank.unranked'), prev ? el('span', { class: 'rank-prev' }, t('rank.previous', { rank: tierName(prev) })) : null);
  }
  const name = tierName(rank);
  const games = rank.wins + rank.losses;
  const title = games ? t('rank.record', { wins: rank.wins, losses: rank.losses }) : null;
  return el('span', { class: `rank-badge tier-${rank.tier.toLowerCase()}`, title },
    el('strong', {}, name), compact ? null : el('span', {}, `${rank.lp} LP`),
    !compact && games ? el('span', { class: 'rank-wr' }, t('rank.winrate', { pct: Math.round((rank.wins / games) * 100), games })) : null);
}

export function champIcon(id, { size = '', round = false, banned = false, onClick, title } = {}) {
  const c = champ(id);
  const cls = ['champ-icon', size, round && 'round', banned && 'banned', !c && 'empty'].filter(Boolean).join(' ');
  const node = el('div', { class: cls, title: title || (c ? c.name : null), onClick }, c ? el('img', { src: asset(c.icon), alt: c.name, loading: 'lazy' }) : '+');
  if (onClick) node.style.cursor = 'pointer';
  return node;
}

// Items in buy order, numbered, each with its direct parts below (what to buy towards it).
// owned: item ids the player has (finished items and parts are ticked).
export function buildOrder(ids, { owned = [], names = false } = {}) {
  const have = new Set(owned);
  return el('div', { class: 'buy-order' }, ids.map((id, i) => {
    const it = item(id);
    if (!it) return null;
    return el('div', { class: `buy-step ${have.has(id) ? 'owned' : ''}` },
      el('div', { class: 'buy-main' }, el('span', { class: 'buy-n' }, String(i + 1)), itemIcon(id, { size: names ? 'lg' : '' })),
      names ? el('div', { class: 'buy-name' }, it.name, el('span', { class: 'gold-text' }, ` ${it.gold.total}`)) : null,
      (it.from || []).length && !have.has(id)
        ? el('div', { class: 'buy-parts' }, it.from.map((c) => el('div', { class: have.has(c) ? 'owned' : '' }, itemIcon(c, { size: 'xs' }))))
        : null);
  }));
}

export function itemIcon(id, { size = '', count, onClick } = {}) {
  const it = item(id);
  const node = el('div', { class: `item-icon ${size}`, onClick }, it ? el('img', { src: asset(it.icon), alt: it.name, loading: 'lazy' }) : null,
    count > 1 ? el('span', { class: 'count' }, String(count)) : null);
  if (it) attachTooltip(node, () => itemTooltip(it));
  if (onClick) node.style.cursor = 'pointer';
  return node;
}

export function itemTooltip(it) {
  return el('div', {}, el('h4', {}, it.name), el('div', { class: 'tt-cost' }, t('common.gold', { n: it.gold.total })),
    el('div', { class: 'item-desc', html: it.description }));
}

const tooltip = () => document.getElementById('tooltip');
export function attachTooltip(node, build) {
  node.addEventListener('mouseenter', () => {
    const tip = tooltip();
    tip.replaceChildren(typeof build === 'function' ? build() : build);
    tip.hidden = false;
  });
  node.addEventListener('mousemove', (e) => {
    const tip = tooltip();
    const x = Math.min(e.clientX + 16, window.innerWidth - tip.offsetWidth - 10);
    const y = Math.min(e.clientY + 16, window.innerHeight - tip.offsetHeight - 10);
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  });
  node.addEventListener('mouseleave', () => { tooltip().hidden = true; });
}

export function scoreRing(score) {
  const r = 20;
  const len = 2 * Math.PI * r;
  const color = score >= 75 ? 'var(--teal)' : score >= 55 ? 'var(--gold)' : 'var(--red)';
  const ring = svg(`<circle cx="23" cy="23" r="${r}" fill="none" stroke="#15263f" stroke-width="4"/>
    <circle cx="23" cy="23" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="${(score / 100) * len} ${len}" stroke-linecap="round"/>`, '0 0 46 46');
  return el('div', { class: 'score', title: t('draft.score') }, ring, el('span', {}, String(score)));
}

export function reasonChip(r) {
  return el('span', { class: `chip ${r.delta > 0 ? 'plus' : r.delta < 0 ? 'minus' : ''}` },
    `${r.delta > 0 ? '+' : ''}${r.delta ?? ''} ${t(r.key, r.params)}`.trim());
}

export function toast(message, { error = false, ms = 3500 } = {}) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.className = `toast${error ? ' error' : ''}`;
  node.hidden = false;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => { node.hidden = true; }, ms);
}

// onClose runs once however the modal is closed (button, backdrop click, Escape or code).
export function openModal(title, body, { actions = [], onClose = () => {} } = {}) {
  const root = document.getElementById('modal-root');
  let open = true;
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => {
    if (!open) return;
    open = false;
    document.removeEventListener('keydown', onKey);
    root.replaceChildren();
    onClose();
  };
  document.addEventListener('keydown', onKey);
  const backdrop = el('div', { class: 'modal-backdrop', onClick: (e) => { if (e.target === backdrop) close(); } },
    el('div', { class: 'modal' },
      el('div', { class: 'modal-head' }, el('h2', {}, title), el('div', { class: 'spacer' }), ...actions,
        el('button', { class: 'btn small ghost', onClick: close }, t('common.close'))),
      el('div', { class: 'modal-body' }, body)));
  root.replaceChildren(backdrop);
  return close;
}

// Resolves with a champion id, '' when the slot was cleared, or null when dismissed.
export function pickChampion({ role = null, exclude = [], allowClear = true } = {}) {
  return new Promise((resolve) => {
    let filterRole = role;
    let query = '';
    const grid = el('div', { class: 'picker-grid' });
    const tabs = el('div', { class: 'tabs' });
    let close;
    let result = null;
    const done = (v) => { result = v; close(); };
    const render = () => {
      tabs.replaceChildren(...[null, ...ROLES].map((r) => el('button', {
        class: `tab ${filterRole === r ? 'active' : ''}`, title: t(r ? `role.${r}` : 'role.any'),
        onClick: () => { filterRole = r; render(); },
      }, r ? roleIcon(r) : t('role.any'))));
      const q = query.toLowerCase();
      const list = state.db.champions.filter((c) => !exclude.includes(c.id) && (!filterRole || c.positions.includes(filterRole))
        && (!q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)));
      grid.replaceChildren(...list.map((c) => el('button', { class: 'picker-cell', onClick: () => done(c.id) }, champIcon(c.id), el('span', {}, c.name))));
    };
    const search = el('input', { class: 'input search', placeholder: t('picker.search'), onInput: (e) => { query = e.target.value; render(); } });
    const actions = allowClear ? [el('button', { class: 'btn small ghost', onClick: () => done('') }, t('picker.clear'))] : [];
    close = openModal(t('picker.title'), el('div', {}, el('div', { class: 'picker-head' }, search, tabs), grid), { actions, onClose: () => resolve(result) });
    render();
    search.focus();
  });
}

// Resolves true when confirmed, false otherwise.
export function confirmDialog(title, message, confirmLabel) {
  return new Promise((resolve) => {
    let ok = false;
    let close;
    const yes = el('button', { class: 'btn primary small', onClick: () => { ok = true; close(); } }, confirmLabel);
    close = openModal(title, el('p', {}, message), { actions: [yes], onClose: () => resolve(ok) });
  });
}

export function runeIcon(id, { size = '' } = {}) {
  const r = rune(id);
  const node = el('div', { class: `rune-icon ${size} ${r && r.shard ? 'shard' : ''}` }, r ? el('img', { src: asset(r.icon), alt: r.name || '' }) : null);
  if (r && !r.shard) attachTooltip(node, () => el('div', {}, el('h4', {}, r.name), r.description ? el('div', { class: 'item-desc', html: r.description }) : null));
  if (r && r.shard) attachTooltip(node, () => el('div', {}, t(`shard.${r.id}`)));
  return node;
}

export function summonerIcon(id) {
  const s = summoner(id);
  const node = el('div', { class: 'item-icon' }, s ? el('img', { src: asset(s.icon), alt: s.name }) : null);
  if (s) attachTooltip(node, () => el('div', {}, el('h4', {}, s.name), el('div', { class: 'tt-cost' }, `${s.cooldown}s`), el('div', {}, s.description)));
  return node;
}
