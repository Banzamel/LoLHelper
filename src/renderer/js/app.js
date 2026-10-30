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

// Modes other than a regular queue are named next to the phase.
const NAMED_MODES = ['practice', 'custom'];

function modeSuffix() {
  if (!isSupported()) return t('mode.unsupportedShort');
  return state.mode && NAMED_MODES.includes(state.mode.key) ? t(`mode.${state.mode.key}`) : '';
}

function renderStatus() {
  const pill = document.getElementById('lcu-status');
  pill.classList.toggle('on', !!state.lcu.connected);
  pill.querySelector('span').textContent = t(state.lcu.connected ? 'status.connected' : 'status.waiting');
  const phase = state.draft && state.draft.phase ? state.draft.phase : state.phase;
  const label = state.demo ? t('demo.pill') : state.lcu.connected && phase && phase !== 'None' ? t(`phase.${phase}`) : '';
  const suffix = label && modeSuffix();
  document.getElementById('game-phase').textContent = suffix ? `${label} · ${suffix}` : label;
  document.getElementById('patch').textContent = state.db && state.db.meta ? t('status.patch', { version: state.db.meta.version }) : '';
  const p = state.profile;
  const account = document.getElementById('profile');
  account.textContent = p && p.gameName ? `${p.gameName}${p.tagLine ? `#${p.tagLine}` : ''}` : '';
  account.title = t('status.profile');
}

// Starts or stops the simulated match; starting it opens the Match view.
export async function setDemo(on) {
  if (on) {
    const started = await window.api.startDemo();
    if (started) navigate('live');
    return started;
  }
  return window.api.stopDemo();
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
  state.roster = init.roster;
  state.game = init.game;
  state.demo = init.demo;
  state.appUpdate = init.update;
  state.profile = init.profile;
  state.history = await window.api.listHistory();
  state.matches = await window.api.listMatches();
  setChampionResolver((id) => (champ(id) ? champ(id).name : id));
  // The player's position in modes without assigned roles comes from the role chosen in Draft.
  window.api.setMyRole(state.manual.myRole);
  document.querySelectorAll('[data-win]').forEach((b) => b.addEventListener('click', () => window.api.window(b.dataset.win)));

  window.api.onLcuStatus((s) => { state.lcu = s; renderStatus(); emit('lcu'); });
  window.api.onGamePhase((p) => {
    state.phase = p;
    renderStatus();
    emit('phase');
    if (p === 'ChampSelect' && isSupported() && state.settings.autoOpenDraft && current.name !== 'draft') navigate('draft');
  });
  window.api.onGameMode((m) => { state.mode = m; renderStatus(); emit('mode'); });
  window.api.onRoster((r) => { state.roster = r; emit('roster'); });
  window.api.onHistory((h) => { state.history = h; emit('history'); });
  // Another account logged in: its own settings, history and games.
  window.api.onProfile(async ({ profile, settings, history }) => {
    state.profile = profile;
    state.settings = settings;
    state.history = history;
    state.matches = await window.api.listMatches();
    renderStatus();
    emit('profile');
    if (current.name === 'settings') render();
  });
  window.api.onDemo((on) => { state.demo = on; renderStatus(); emit('demo'); if (current.name === 'settings') render(); });
  window.api.onMatches(async () => { state.matches = await window.api.listMatches(); emit('matches'); });
  window.api.onMatchSync((s) => { state.matches = { ...(state.matches || {}), ...s }; emit('matches'); });
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
