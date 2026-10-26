// Overlay widget renderer: next item, build progress, next skill and the lane opponent's
// items, refreshed from the live match. In move mode the widget can be dragged.
import { loadLanguage, setChampionResolver, t } from './i18n.js';
import { state, setDatabase, champ, item, asset } from './store.js';
import { el, itemIcon, champIcon, rankBadge } from './ui.js';
import { bought, buildForGame, nextSkill, needsStarters, startersCost } from './game.js';

const widget = document.getElementById('widget');
let ov = { moveMode: false, preview: false, opacity: 0.92 };
let lastKey = null;
let couldAfford = false;

function hotkey(key) {
  return (key || '').replace('CommandOrControl', 'Ctrl');
}

function skillRow(build, level, championId) {
  const next = nextSkill(build, level);
  const c = champ(championId);
  if (!next || !c) return null;
  const spell = next.key === 'R' ? c.spells[3] : c.spells.find((s) => s.key === next.key);
  return el('div', { class: 'w-skill' },
    el('div', { class: 'skill-key' }, spell ? el('img', { src: asset(spell.icon), alt: next.key }) : null, el('span', {}, next.key)),
    el('span', {}, t('overlay.nextSkill', { level: next.level }), ' ', el('strong', {}, spell ? `${next.key} — ${spell.name}` : next.key)));
}

async function draw() {
  widget.style.opacity = String(ov.opacity || 0.92);
  widget.classList.toggle('move', !!ov.moveMode);
  const hint = ov.moveMode ? el('div', { class: 'w-hint' }, t('overlay.moveHint', { key: hotkey(state.settings.overlay.moveKey) })) : null;
  const game = state.game;
  if (!game || !game.me || !state.db) {
    widget.replaceChildren(el('div', { class: 'w-head' }, t('app.name')), el('div', { class: 'w-muted' }, t('overlay.preview')), hint || '');
    return;
  }
  const { opp, owned, build, fullIds } = await buildForGame(game);
  const ownedSet = new Set(owned);
  const next = build.next;
  const it = next && item(next.id);
  const missing = it ? next.cost - game.me.gold : 0;
  const buy = next && next.buy && next.buy.id !== next.id ? item(next.buy.id) : null;
  const oppItems = opp ? bought(opp.items) : [];

  const starting = needsStarters(game);
  const startCost = starting ? startersCost(build) : 0;
  const nextBlock = starting
    ? el('div', { class: `w-next ${startCost <= game.me.gold ? 'afford' : ''}` }, build.starters.map((s) => itemIcon(s.id, { count: s.count })),
      el('div', {}, el('div', { class: 'gold-text w-next-cost' }, t('common.gold', { n: startCost }))))
    : null;
  // Pulse once when the next purchase becomes affordable, so it catches the eye mid-fight.
  const canAfford = starting ? startCost <= game.me.gold : !!it && (missing <= 0 || !!buy);
  if (canAfford && !couldAfford) {
    widget.classList.remove('pulse');
    void widget.offsetWidth;
    widget.classList.add('pulse');
  }
  couldAfford = canAfford;
  widget.replaceChildren(
    el('div', { class: 'w-head' }, el('span', {}, t(starting ? 'live.starters' : 'live.nextItem')), el('div', { class: 'spacer' }),
      el('span', { class: 'gold-text' }, t('common.gold', { n: game.me.gold }))),
    nextBlock || (it ? el('div', { class: `w-next ${missing <= 0 ? 'afford' : ''}` }, itemIcon(it.id),
      el('div', {}, el('div', { class: 'w-next-name' }, it.name), el('div', { class: 'gold-text w-next-cost' }, t('live.remaining', { n: next.cost })),
        el('span', { class: `chip ${missing <= 0 ? 'plus' : ''}` }, missing <= 0 ? t('overlay.canAfford') : t('live.missingGold', { n: missing }))))
      : el('div', { class: 'w-muted' }, t('live.buildDone'))),
    !starting && buy ? el('div', { class: 'w-buy' }, el('span', {}, t('live.buyNow')), itemIcon(buy.id), el('strong', {}, buy.name),
      el('span', { class: 'gold-text' }, String(next.buy.cost))) : '',
    el('div', { class: 'w-strip' }, fullIds.map((id) => el('div', { class: ownedSet.has(id) ? 'owned' : '' }, itemIcon(id)))),
    skillRow(build, game.me.level, game.me.championId) || '',
    opp ? el('div', { class: 'w-opp' }, champIcon(opp.championId, { size: 'xs' }), el('span', {}, champ(opp.championId) ? champ(opp.championId).name : ''),
      rankBadge(opp.rank, { compact: true }), oppItems.map((id) => itemIcon(id))) : '',
    hint || '');
}

function fit() {
  requestAnimationFrame(() => window.api.overlayResize(widget.offsetHeight + 12));
}

function refresh(force = false) {
  const g = state.game;
  const key = JSON.stringify([ov, g && g.me ? [g.me.items, g.me.level, Math.floor(g.me.gold / 50), g.enemies.map((e) => [e.items, e.rank, e.position])] : null]);
  if (!force && key === lastKey) return;
  lastKey = key;
  draw().then(fit);
}

async function boot() {
  const init = await window.api.init();
  state.settings = init.settings;
  state.game = init.game;
  setChampionResolver((id) => (champ(id) ? champ(id).name : id));
  await loadLanguage(state.settings.language);
  setDatabase(await window.api.getDatabase(state.settings.language));
  ov = await window.api.overlayState();
  window.api.onGame((g) => { state.game = g; refresh(); });
  window.api.onOverlayState((s) => { ov = s; refresh(); });
  refresh(true);
}

boot();
