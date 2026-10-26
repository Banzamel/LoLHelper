// Renderer entry: boot, navigation, title bar status and live client events.
import { loadLanguage, setChampionResolver, t, translateDom } from './i18n.js';
import { state, emit, setDatabase, champ, isSupported } from './store.js';
import { el, navIcon } from './ui.js';
import { renderDraft } from '../views/draft.js';
import { renderBuild } from '../views/build.js';
import { renderChampions } from '../views/champions.js';
import { renderChampion } from '../views/champion.js';
import { renderItems } from '../views/items.js';
import { renderSettings } from '../views/settings.js';
import { renderLive } from '../views/live.js';
import { renderHistory } from '../views/history.js';
import { renderUpdateBanner } from './update.js';

const VIEWS = {
  draft: renderDraft, build: renderBuild, champions: renderChampions, champion: renderChampion, items: renderItems, settings: renderSettings, live: renderLive, history: renderHistory,
};
const NAV = ['draft', 'live', 'history', 'build', 'champions', 'items', 'settings'];
let current = { name: 'draft', params: {} };

export function navigate(name, params = {}) {
  current = { name, params };
  render();
}

function render() {
  const view = document.getElementById('view');
  document.getElementById('tooltip').hidden = true;
  const navName = current.name === 'champion' ? 'champions' : current.name;
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === navName));
  if (!state.db && current.name !== 'settings') current = { name: 'settings', params: {} };
  view.replaceChildren();
  view.scrollTop = 0;
  VIEWS[current.name](view, current.params);
}

function renderNav() {
  document.getElementById('nav').replaceChildren(...NAV.map((name) => el('button', {
    class: 'nav-btn', 'data-view': name, onClick: () => navigate(name),
  }, navIcon(name), el('span', {}, t(`nav.${name}`)))));
}

function renderStatus() {
  const pill = document.getElementById('lcu-status');
  pill.classList.toggle('on', !!state.lcu.connected);
  pill.querySelector('span').textContent = t(state.lcu.connected ? 'status.connected' : 'status.waiting');
  const phase = state.draft && state.draft.phase ? state.draft.phase : state.phase;
  const label = state.lcu.connected && phase && phase !== 'None' ? t(`phase.${phase}`) : '';
  document.getElementById('game-phase').textContent = label && !isSupported() ? `${label} · ${t('mode.unsupportedShort')}` : label;
  document.getElementById('patch').textContent = state.db && state.db.meta ? t('status.patch', { version: state.db.meta.version }) : '';
}

export async function applyLanguage(lang) {
  await loadLanguage(lang);
  setDatabase(await window.api.getDatabase(lang));
  translateDom();
  renderNav();
  renderStatus();
  render();
}

export async function reloadDatabase() {
  setDatabase(await window.api.getDatabase(state.settings.language));
  renderStatus();
}

async function boot() {
  const init = await window.api.init();
  state.settings = init.settings;
  state.languages = init.languages;
  state.version = init.version;
  state.lcu = init.status;
  state.phase = init.phase;
  state.mode = init.mode;
  state.draft = init.draft;
  state.game = init.game;
  state.appUpdate = init.update;
  state.history = await window.api.listHistory();
  setChampionResolver((id) => (champ(id) ? champ(id).name : id));
  document.querySelectorAll('[data-win]').forEach((b) => b.addEventListener('click', () => window.api.window(b.dataset.win)));

  window.api.onLcuStatus((s) => { state.lcu = s; renderStatus(); emit('lcu'); });
  window.api.onGamePhase((p) => {
    state.phase = p;
    renderStatus();
    if (p === 'ChampSelect' && isSupported() && state.settings.autoOpenDraft && current.name !== 'draft') navigate('draft');
  });
  window.api.onGameMode((m) => { state.mode = m; renderStatus(); emit('mode'); });
  window.api.onHistory((h) => { state.history = h; emit('history'); });
  window.api.onDraft((d) => { state.draft = d; renderStatus(); emit('draft'); });
  window.api.onGame((g) => {
    const started = !(state.game && state.game.me) && g && g.me;
    state.game = g;
    emit('game');
    if (started && state.settings.autoOpenLive && current.name !== 'live') navigate('live');
  });
  window.api.onAppUpdate((u) => { state.appUpdate = u; renderUpdateBanner(); emit('appUpdate'); });

  await applyLanguage(state.settings.language);
  renderUpdateBanner();
  if (state.game && state.game.me && state.settings.autoOpenLive) navigate('live');
  else if (state.draft && state.settings.autoOpenDraft) navigate('draft');
}

// Debug handle (DevTools console / scripts/capture): inspect state or navigate.
window.lolhelper = { state, navigate };

boot();
