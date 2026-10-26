// Overlay widget renderer: next item, build progress, next skill and the lane opponent's
// items, refreshed from the live match. In move mode the widget can be dragged.
import { loadLanguage, setChampionResolver, t } from './i18n.js';
import { state, setDatabase, champ, item, asset } from './store.js';
import { el, itemIcon, champIcon, rankBadge } from './ui.js';
import { bought, buildForGame, nextSkill } from './game.js';

const widget = document.getElementById('widget');
let ov = { moveMode: false, preview: false, opacity: 0.92 };
let lastKey = null;

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
  const it = item(build.next);
  const missing = it ? it.gold.total - game.me.gold : 0;
  const oppItems = opp ? bought(opp.items) : [];

  widget.replaceChildren(
    el('div', { class: 'w-head' }, el('span', {}, t('live.nextItem')), el('div', { class: 'spacer' }),
      el('span', { class: 'gold-text' }, t('common.gold', { n: game.me.gold }))),
    it ? el('div', { class: `w-next ${missing <= 0 ? 'afford' : ''}` }, itemIcon(it.id),
      el('div', {}, el('div', { class: 'w-next-name' }, it.name), el('div', { class: 'gold-text w-next-cost' }, t('common.gold', { n: it.gold.total })),
        el('span', { class: `chip ${missing <= 0 ? 'plus' : ''}` }, missing <= 0 ? t('overlay.canAfford') : t('live.missingGold', { n: missing }))))
      : el('div', { class: 'w-muted' }, t('live.buildDone')),
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
