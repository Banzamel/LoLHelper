// App self-update UI: the banner under the title bar and the section in Settings.
import { t } from './i18n.js';
import { state } from './store.js';
import { el } from './ui.js';

function actions(u) {
  if (u.state === 'available') return [el('button', { class: 'btn small primary', onClick: () => window.api.downloadAppUpdate() }, t('appUpdate.download'))];
  if (u.state === 'downloaded') return [el('button', { class: 'btn small primary', onClick: () => window.api.installAppUpdate() }, t('appUpdate.install'))];
  return [];
}

export function updateText(u) {
  switch (u.state) {
    case 'dev': return t('appUpdate.dev');
    case 'checking': return t('appUpdate.checking');
    case 'available': return t('appUpdate.available', { version: u.version });
    case 'downloading': return t('appUpdate.downloading', { pct: u.pct || 0 });
    case 'downloaded': return t('appUpdate.downloaded', { version: u.version });
    case 'latest': return t('appUpdate.latest', { version: state.version });
    case 'error': return t('appUpdate.error', { error: u.error });
    default: return t('settings.version', { version: state.version });
  }
}

export function renderUpdateBanner() {
  const banner = document.getElementById('update-banner');
  const u = state.appUpdate || {};
  const show = ['available', 'downloading', 'downloaded'].includes(u.state);
  banner.hidden = !show;
  if (show) banner.replaceChildren(el('span', {}, updateText(u)), ...actions(u));
}

export function appUpdateSection() {
  const status = el('p', {});
  const buttons = el('div', { class: 'row-actions' });
  const draw = () => {
    const u = state.appUpdate || {};
    status.textContent = updateText(u);
    buttons.replaceChildren(
      el('button', { class: 'btn', disabled: u.state === 'dev' || u.state === 'checking' || u.state === 'downloading' ? true : null, onClick: () => window.api.checkAppUpdate() }, t('appUpdate.check')),
      ...actions(u));
  };
  draw();
  return { node: el('div', {}, status, buttons), draw };
}
