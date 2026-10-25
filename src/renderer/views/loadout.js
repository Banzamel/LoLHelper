// Rune page, summoner spells and skill order panels, with export to the client.
// Shared by the Build view and the in-game view.
import { t } from '../js/i18n.js';
import { state, champ, rune, asset } from '../js/store.js';
import { el, runeIcon, summonerIcon, toast, confirmDialog } from '../js/ui.js';

const cleanError = (err) => err.message.replace(/^Error invoking remote method '[^']+': /, '');

async function exportRunes(build) {
  const name = champ(build.championId).name;
  try {
    let res = await window.api.exportRunes({ runes: build.runes, name });
    if (res.status === 'noSlot') {
      const ok = await confirmDialog(t('loadout.noSlotTitle'), t('loadout.noSlot'), t('loadout.overwrite'));
      if (!ok) return;
      res = await window.api.exportRunes({ runes: build.runes, name, overwriteCurrent: true });
    }
    toast(t('loadout.runesExported'));
  } catch (err) {
    toast(t('loadout.exportFailed', { error: cleanError(err) }), { error: true });
  }
}

async function exportSpells(build) {
  try {
    await window.api.exportSpells(build.spells.ids);
    toast(t('loadout.spellsExported'));
  } catch (err) {
    toast(t('loadout.exportFailed', { error: cleanError(err) }), { error: true });
  }
}

function runePage(runes) {
  const ids = runes.selectedPerkIds;
  const primary = rune(runes.primaryStyleId);
  const sub = rune(runes.subStyleId);
  const keystone = rune(ids[0]);
  const treeHead = (tree) => el('div', { class: 'tree-head' }, tree ? el('img', { src: asset(tree.icon), alt: '' }) : null, el('span', {}, tree ? tree.name : ''));
  return el('div', { class: 'rune-page' },
    el('div', { class: 'rune-col' }, treeHead(primary),
      el('div', { class: 'keystone' }, runeIcon(ids[0], { size: 'lg' }), el('strong', {}, keystone ? keystone.name : '')),
      el('div', { class: 'rune-row' }, ids.slice(1, 4).map((id) => el('div', { class: 'rune-cell' }, runeIcon(id), el('span', {}, (rune(id) || {}).name || ''))))),
    el('div', { class: 'rune-col' }, treeHead(sub),
      el('div', { class: 'rune-row' }, ids.slice(4, 6).map((id) => el('div', { class: 'rune-cell' }, runeIcon(id), el('span', {}, (rune(id) || {}).name || '')))),
      el('div', { class: 'shards' }, ids.slice(6).map((id) => el('div', { class: 'rune-cell' }, runeIcon(id, { size: 'sm' }), el('span', {}, t(`shard.${id}`)))))));
}

function skillTable(skills, champion) {
  const icons = Object.fromEntries(champion.spells.map((s) => [s.key, s]));
  const maxRow = el('div', { class: 'skill-max' }, skills.max.map((k, i) => [
    i ? el('span', { class: 'arrow' }, '›') : null,
    el('div', { class: 'skill-key' }, icons[k] ? el('img', { src: asset(icons[k].icon), alt: k }) : null, el('span', {}, k)),
  ]));
  if (!skills.levels) return el('div', {}, maxRow, el('p', { class: 'muted small' }, t('loadout.noTable')));
  const rows = ['Q', 'W', 'E', 'R'].map((k) => el('div', { class: 'skill-row' }, el('span', { class: 'skill-label' }, k),
    skills.levels.map((key, i) => el('span', { class: `skill-cell ${key === k ? `on ${k === 'R' ? 'ult' : ''}` : ''}`, title: t('champion.level', { n: i + 1 }) }, key === k ? String(i + 1) : ''))));
  return el('div', {}, maxRow, el('div', { class: 'skill-grid' }, rows),
    !skills.known ? el('p', { class: 'muted small' }, t('loadout.heuristic')) : null);
}

export function loadoutPanels(build, { inChampSelect = state.lcu.connected && !!state.draft } = {}) {
  const c = champ(build.championId);
  const connected = state.lcu.connected;
  const runesPanel = build.runes ? el('section', { class: 'panel build-section' },
    el('div', { class: 'panel-title' }, el('h2', {}, t('loadout.runes')), el('div', { class: 'spacer' }),
      el('button', { class: 'btn small primary', disabled: connected ? null : true, title: connected ? null : t('build.needClient'), onClick: () => exportRunes(build) }, t('loadout.exportRunes'))),
    runePage(build.runes),
    build.runes.reasons.length ? el('div', { class: 'chips' }, build.runes.reasons.map((k) => el('span', { class: 'chip' }, t(k)))) : null) : '';
  const spellsPanel = el('section', { class: 'panel build-section' },
    el('div', { class: 'panel-title' }, el('h2', {}, t('loadout.spells')), el('div', { class: 'spacer' }),
      el('button', { class: 'btn small', disabled: inChampSelect ? null : true, title: inChampSelect ? null : t('loadout.needChampSelect'), onClick: () => exportSpells(build) }, t('loadout.exportSpells'))),
    el('div', { class: 'build-strip' }, build.spells.ids.map((id) => summonerIcon(id)), el('span', { class: 'chip' }, t(build.spells.reason))));
  const skillsPanel = el('section', { class: 'panel build-section' }, el('h2', {}, t('loadout.skills')), skillTable(build.skills, c));
  return el('div', { class: 'loadout' }, runesPanel, el('div', { class: 'loadout-side' }, spellsPanel, skillsPanel));
}
