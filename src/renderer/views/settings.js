// Settings: language, League folder, window behaviour, champion pool, database update, about.
import { t } from '../js/i18n.js';
import { state, subscribe } from '../js/store.js';
import { appUpdateSection } from '../js/update.js';
import { el, champIcon, roleIcon, ROLES, pickChampion, toast } from '../js/ui.js';
import { applyLanguage, reloadDatabase, navigate } from '../js/app.js';

const LANGUAGE_NAMES = { pl: 'Polski', en: 'English' };

async function save(patch) {
  state.settings = await window.api.setSettings(patch);
  toast(t('settings.saved'), { ms: 1500 });
}

function row(label, control, hint) {
  return el('label', { class: 'setting' }, el('div', {}, el('div', {}, label), hint ? el('div', { class: 'muted small' }, hint) : null), control);
}

// In-game overlay widget: on/off, opacity, hotkeys and a preview to position it before a match.
function overlaySection() {
  const o = state.settings.overlay;
  const saveOverlay = async (patch) => {
    await save({ overlay: { ...state.settings.overlay, ...patch } });
    const failed = await window.api.overlayApply();
    if (failed.length) toast(t('overlay.shortcutFailed', { keys: failed.join(', ') }), { error: true });
  };
  const enabled = el('input', { type: 'checkbox', class: 'toggle', checked: o.enabled ? true : null, onChange: (e) => saveOverlay({ enabled: e.target.checked }) });
  const opacityLabel = el('span', { class: 'gold-text' }, `${Math.round(o.opacity * 100)}%`);
  const opacity = el('input', {
    type: 'range', min: 40, max: 100, value: Math.round(o.opacity * 100), class: 'level-slider opacity-slider',
    onInput: (e) => { opacityLabel.textContent = `${e.target.value}%`; },
    onChange: (e) => saveOverlay({ opacity: Number(e.target.value) / 100 }),
  });
  const key = (name) => el('input', { class: 'input hotkey', value: o[name], onChange: (e) => saveOverlay({ [name]: e.target.value.trim() }) });
  let previewOn = false;
  const previewBtn = el('button', { class: 'btn', onClick: async () => {
    previewOn = !previewOn;
    await window.api.overlayPreview(previewOn);
    previewBtn.textContent = t(previewOn ? 'overlay.previewStop' : 'overlay.previewStart');
  } }, t('overlay.previewStart'));
  return el('section', { class: 'panel' }, el('h2', {}, t('overlay.title')),
    el('p', { class: 'muted small' }, t('overlay.borderless')),
    row(t('overlay.enabled'), enabled),
    row(t('overlay.opacity'), el('div', { class: 'opacity-row' }, opacity, opacityLabel)),
    row(t('overlay.toggleKey'), key('toggleKey'), t('overlay.keyHint')),
    row(t('overlay.moveKey'), key('moveKey')),
    el('div', { class: 'row-actions' }, previewBtn),
    el('p', { class: 'muted small' }, t('overlay.previewHint')));
}

function poolSection() {
  const box = el('div', { class: 'pool' });
  const draw = () => box.replaceChildren(...ROLES.map((r) => {
    const ids = state.settings.pool[r] || [];
    const remove = (id) => save({ pool: { ...state.settings.pool, [r]: ids.filter((x) => x !== id) } }).then(draw);
    const add = async () => {
      const id = await pickChampion({ role: r, exclude: ids, allowClear: false });
      if (id) save({ pool: { ...state.settings.pool, [r]: [...ids, id] } }).then(draw);
    };
    return el('div', { class: 'pool-row' }, el('div', { class: 'role-badge' }, roleIcon(r), t(`role.${r}`)),
      el('div', { class: 'pool-champs' }, ids.map((id) => champIcon(id, { size: 'sm', onClick: () => remove(id) })),
        el('button', { class: 'btn small ghost', onClick: add }, `+ ${t('settings.add')}`)));
  }));
  draw();
  return box;
}

function databaseSection() {
  const info = el('p', {});
  const status = el('p', { class: 'muted' });
  const bar = el('div', { class: 'progress hidden' }, el('i'));
  const meta = state.db && state.db.meta;
  info.textContent = meta ? t('settings.dbInfo', { version: meta.version, champions: meta.champions, items: meta.items, date: new Date(meta.builtAt).toLocaleDateString() }) : t('settings.noDb');

  const check = async () => {
    try {
      const r = await window.api.checkUpdate();
      status.textContent = r.outdated ? t('settings.outdated', { latest: r.latest, current: r.current || '—' }) : t('settings.upToDate', { version: r.current });
    } catch (e) { status.textContent = t('update.failed', { error: e.message }); }
  };
  const update = async (btn) => {
    btn.disabled = true;
    bar.classList.remove('hidden');
    const off = window.api.onUpdateProgress((p) => { bar.firstChild.style.width = `${p.pct}%`; status.textContent = t(p.key, p.params); });
    try {
      await window.api.updateDatabase();
      await reloadDatabase();
      navigate('settings');
    } catch (e) {
      status.textContent = t('update.failed', { error: e.message });
    } finally { off(); btn.disabled = false; }
  };
  const updateBtn = el('button', { class: 'btn primary', onClick: (e) => update(e.currentTarget) }, t('settings.update'));
  return el('section', { class: 'panel' }, el('h2', {}, t('settings.database')), info,
    el('div', { class: 'row-actions' }, el('button', { class: 'btn', onClick: check }, t('settings.checkUpdate')), updateBtn), bar, status);
}

export function renderSettings(root) {
  const s = state.settings;
  const lang = el('select', { class: 'select', onChange: async (e) => { await save({ language: e.target.value }); applyLanguage(e.target.value); } },
    state.languages.map((l) => el('option', { value: l, selected: l === s.language ? true : null }, LANGUAGE_NAMES[l] || l)));
  const dir = el('input', { class: 'input wide', value: s.leagueDir, placeholder: 'T:\\Riot Games\\League of Legends', onChange: (e) => save({ leagueDir: e.target.value.trim() }) });
  const toggle = (key) => el('input', { type: 'checkbox', class: 'toggle', checked: s[key] ? true : null, onChange: (e) => save({ [key]: e.target.checked }) });

  const appUpdate = appUpdateSection();
  const unsub = subscribe((what) => { if (!appUpdate.node.isConnected) { unsub(); return; } if (what === 'appUpdate') appUpdate.draw(); });

  root.append(
    el('div', { class: 'view-head' }, el('h1', {}, t('settings.title'))),
    el('div', { class: 'settings-grid' },
      el('div', { class: 'champ-col' },
        el('section', { class: 'panel' }, el('h2', {}, t('settings.general')),
          row(t('settings.language'), lang),
          row(t('settings.leagueDir'), dir, t('settings.leagueDirHint')),
          row(t('settings.alwaysOnTop'), toggle('alwaysOnTop')),
          row(t('settings.autoOpenDraft'), toggle('autoOpenDraft')),
          row(t('settings.autoOpenLive'), toggle('autoOpenLive')),
          row(t('settings.flashOnD'), toggle('flashOnD'), t('settings.flashOnDHint'))),
        overlaySection(),
        databaseSection(),
        el('section', { class: 'panel' }, el('h2', {}, t('settings.about')),
          el('p', {}, `${t('app.name')} — ${t('settings.version', { version: state.version })}`),
          el('h3', { class: 'sub' }, t('appUpdate.title')), appUpdate.node,
          el('p', { class: 'muted small disclaimer' }, t('settings.disclaimer')))),
      el('div', { class: 'champ-col' },
        el('section', { class: 'panel' }, el('h2', {}, t('settings.pool')), el('p', { class: 'muted small' }, t('settings.poolHint')), poolSection()))));
}
