// Build view: recommended items for a champion against the lane opponent and enemy team,
// with an export to the in-game shop as an item set.
import { t } from '../js/i18n.js';
import { state, champ, item } from '../js/store.js';
import { el, champIcon, itemIcon, roleIcon, ROLES, pickChampion, toast } from '../js/ui.js';

function itemRow(entry) {
  const it = item(entry.id);
  if (!it) return null;
  const reasons = [];
  if (entry.stats && entry.stats.length) reasons.push(t('build.keyStats', { stats: entry.stats.map((s) => t(`stat.${s}`)).join(', ') }));
  for (const r of entry.reasons || []) reasons.push(t(r.key, r.params));
  return el('div', { class: 'build-item' }, itemIcon(entry.id),
    el('div', {}, el('div', { class: 'build-item-name' }, it.name, el('span', { class: 'gold-text' }, ` ${it.gold.total}`)),
      el('div', { class: 'chips' }, reasons.map((r) => el('span', { class: 'chip' }, r)))));
}

function section(title, ...content) {
  return el('section', { class: 'panel build-section' }, el('h2', {}, title), ...content);
}

async function exportBuild(build) {
  const c = champ(build.championId);
  const e = champ(build.enemyId);
  const title = e ? t('build.setTitle', { champ: c.id, enemy: e.id }) : t('build.setTitleBlind', { champ: c.id });
  const blockNames = { start: t('build.start'), boots: t('build.boots'), core: t('build.core'), situational: t('build.situational'), full: t('build.full') };
  try {
    await window.api.exportBuild({ build, title, blockNames });
    toast(t('build.exported'));
  } catch (err) {
    toast(t('build.exportFailed', { error: err.message.replace(/^Error invoking remote method '[^']+': /, '') }), { error: true });
  }
}

export async function renderBuild(root) {
  const target = state.buildTarget;
  const me = champ(target.championId);
  const enemy = champ(target.enemyId);
  const role = target.role || (me ? me.positions[0] : null);

  const choose = async (key) => {
    const id = await pickChampion({ role: key === 'championId' ? role : null, allowClear: key === 'enemyId' });
    if (id === null) return;
    state.buildTarget = { ...target, [key]: id || null };
    root.replaceChildren();
    renderBuild(root);
  };
  const setRole = (r) => { state.buildTarget = { ...target, role: r }; root.replaceChildren(); renderBuild(root); };

  const picker = (id, key, label) => el('button', { class: 'build-picker', onClick: () => choose(key) },
    champIcon(id, { size: 'lg' }),
    el('div', {}, el('div', { class: 'muted' }, label), el('h3', {}, champ(id) ? champ(id).name : t('build.choose'))));

  const head = el('div', { class: 'view-head' }, el('h1', {}, t('build.title')), el('div', { class: 'spacer' }),
    el('div', { class: 'tabs' }, ROLES.map((r) => el('button', { class: `tab ${role === r ? 'active' : ''}`, title: t(`role.${r}`), onClick: () => setRole(r) }, roleIcon(r)))));
  const versus = el('div', { class: 'panel gold versus' },
    picker(target.championId, 'championId', t('build.champion')), el('div', { class: 'vs' }, t('build.vs')),
    picker(target.enemyId, 'enemyId', t('build.enemy')));
  root.append(head, versus);

  if (!me) { root.append(el('p', { class: 'muted' }, t('build.pickChampion'))); return; }

  const enemyIds = [...new Set([...(target.enemyIds || []), ...(enemy ? [enemy.id] : [])])];
  const build = await window.api.build({ championId: me.id, enemyId: enemy ? enemy.id : null, enemyIds, role });

  const exportBtn = el('button', { class: 'btn primary', disabled: state.lcu.connected ? null : true, title: state.lcu.connected ? null : t('build.needClient'), onClick: () => exportBuild(build) }, t('build.export'));
  versus.append(el('div', { class: 'spacer' }), el('div', { class: 'versus-side' },
    el('span', { class: 'chip teal' }, t('build.class', { cls: t(`class.${build.cls}`) })), exportBtn));

  const boots = build.boots && item(build.boots.id);
  const upgrade = build.boots && item(build.boots.upgrade);
  root.append(
    build.threats.length ? el('div', { class: 'threats' }, el('span', { class: 'muted' }, t('build.threats')),
      build.threats.map((x) => el('span', { class: 'chip minus' }, t(x.key, x.params)))) : '',
    el('div', { class: 'build-full panel gold' }, el('h2', {}, t('build.full')),
      el('div', { class: 'build-strip' }, [...build.full.slice(0, 5), build.boots && build.boots.id].filter(Boolean).map((id) => itemIcon(id, { size: 'lg' })))),
    el('div', { class: 'build-grid' },
      section(t('build.start'), el('div', { class: 'build-strip' }, build.starters.map((s) => itemIcon(s.id, { count: s.count })))),
      section(t('build.boots'), boots ? el('div', { class: 'build-item' }, itemIcon(boots.id),
        el('div', {}, el('div', { class: 'build-item-name' }, boots.name),
          el('div', { class: 'chips' }, el('span', { class: 'chip' }, t(build.boots.reason)),
            upgrade ? el('span', { class: 'chip teal' }, t('build.upgrade', { name: upgrade.name })) : null)))
        : ''),
      section(t('build.core'), ...build.core.map(itemRow)),
      section(t('build.situational'), ...build.situational.map(itemRow))));
}
