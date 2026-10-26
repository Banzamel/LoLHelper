// In-game view: data from the running match (Live Client Data API) — both teams with their
// roles and ranks, enemy items and the player's gold — with a build that adapts to what
// enemies bought and the next item to buy.
import { t } from '../js/i18n.js';
import { state, champ, item, subscribe, isSupported } from '../js/store.js';
import { el, champIcon, itemIcon, roleIcon, rankBadge, runeIcon, summonerIcon } from '../js/ui.js';
import { loadoutPanels, skillsPanel } from './loadout.js';
import { bought, buildForGame, needsStarters, startersCost } from '../js/game.js';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function playerRow(p, { highlight = false, me = false } = {}) {
  const s = p.scores || {};
  const c = champ(p.championId);
  return el('div', { class: `live-row ${highlight ? 'opponent' : ''} ${me ? 'me' : ''} ${p.dead ? 'dead' : ''}` },
    el('div', { class: 'role-badge' }, p.position ? roleIcon(p.position) : null),
    champIcon(p.championId, { size: 'sm' }),
    el('div', { class: 'live-name' }, el('strong', {}, c ? c.name : p.championId),
      el('span', { class: 'muted', title: p.name }, `${p.name || ''} · ${t('live.level')} ${p.level}`)),
    el('div', { class: 'live-rank' }, rankBadge(p.rank)),
    el('div', { class: 'live-loadout' }, (p.spells || []).map((id) => summonerIcon(id)), p.keystone ? runeIcon(p.keystone, { size: 'sm' }) : null),
    el('span', { class: 'live-kda' }, `${s.kills || 0} / ${s.deaths || 0} / ${s.assists || 0}`),
    el('span', { class: 'muted live-cs' }, `${s.creepScore || 0} CS`),
    el('div', { class: 'build-strip live-items' }, bought(p.items).map((id) => itemIcon(id, { size: 'sm' }))));
}

function startersCard(build, gold) {
  const cost = startersCost(build);
  return el('div', { class: 'panel gold next-item' }, el('h2', {}, t('live.starters')),
    el('p', { class: 'muted small' }, t('live.startersHint')),
    el('div', { class: 'build-strip starters' }, build.starters.map((s) => itemIcon(s.id, { size: 'lg', count: s.count }))),
    el('div', { class: 'gold-text' }, t('live.startersCost', { n: cost })),
    cost > gold ? el('span', { class: 'chip' }, t('live.missingGold', { n: cost - gold })) : null);
}

function nextItemCard(build, gold) {
  const it = item(build.next);
  if (!it) return el('div', { class: 'panel next-item' }, el('h2', {}, t('live.nextItem')), el('p', { class: 'muted' }, t('live.buildDone')));
  const missing = it.gold.total - gold;
  return el('div', { class: 'panel gold next-item' }, el('h2', {}, t('live.nextItem')),
    el('div', { class: 'next-body' }, itemIcon(it.id, { size: 'lg' }),
      el('div', {}, el('h3', {}, it.name), el('div', { class: 'gold-text' }, t('common.gold', { n: it.gold.total })),
        el('span', { class: `chip ${missing <= 0 ? 'plus' : ''}` }, missing <= 0 ? t('live.canAfford') : t('live.missingGold', { n: missing })))));
}

async function draw(container, game) {
  if (!game || !game.me) {
    const unsupported = !isSupported() && state.phase !== 'None';
    container.replaceChildren(el('div', { class: 'view-head' }, el('h1', {}, t('live.title'))),
      el('div', { class: 'panel empty-state' }, el('p', {}, t(unsupported ? 'mode.unsupported' : 'live.noGame')),
        el('p', { class: 'muted small' }, t(unsupported ? 'mode.unsupportedHint' : 'live.noGameHint'))));
    return;
  }
  const { role, opp, owned, build, fullIds } = await buildForGame(game);
  const ownedSet = new Set(owned);
  const me = champ(game.me.championId);

  container.replaceChildren(
    el('div', { class: 'view-head' }, el('h1', {}, t('live.title')), el('span', { class: 'chip teal' }, fmtTime(game.gameTime)),
      game.gameMode ? el('span', { class: 'chip' }, game.gameMode) : null, el('div', { class: 'spacer' }),
      el('span', { class: 'gold-text live-gold' }, t('common.gold', { n: game.me.gold }))),
    el('div', { class: 'live-top' },
      el('div', { class: 'panel live-me' },
        el('div', { class: 'live-me-head' }, champIcon(game.me.championId, { size: 'lg' }),
          el('div', {}, el('h2', {}, me ? me.name : game.me.championId), el('div', { class: 'role-badge' }, roleIcon(role), t(`role.${role}`)),
            opp ? el('div', { class: 'muted' }, `${t('draft.laneOpponent')}: `, el('strong', { class: 'opp-name' }, champ(opp.championId) ? champ(opp.championId).name : '')) : null)),
        el('h3', { class: 'sub' }, t('live.recommended')),
        el('div', { class: 'build-strip' }, fullIds.map((id) => el('div', { class: `owned-wrap ${ownedSet.has(id) ? 'owned' : ''}` }, itemIcon(id)))),
        build.threats.length ? el('div', { class: 'chips live-threats' }, build.threats.map((x) => el('span', { class: 'chip minus' }, t(x.key, x.params)))) : null),
      needsStarters(game) ? startersCard(build, game.me.gold) : nextItemCard(build, game.me.gold)),
    skillsPanel(build, { level: game.me.level }),
    el('section', { class: 'panel live-team' }, el('h2', { class: 'enemy-title' }, t('draft.enemies')),
      game.enemies.map((p) => playerRow(p, { highlight: opp && p.championId === opp.championId }))),
    el('section', { class: 'panel live-team' }, el('h2', { class: 'ally-title' }, t('draft.allies')),
      game.allies.map((p) => playerRow(p, { me: p.name === game.me.name }))),
    build.situational.length ? el('section', { class: 'panel' }, el('h2', {}, t('build.situational')),
      el('div', { class: 'chips' }, build.situational.map((s) => el('span', { class: 'sit-item' }, itemIcon(s.id, { size: 'sm' }),
        el('span', {}, item(s.id).name), s.reasons.map((r) => el('span', { class: 'chip' }, t(r.key))))))) : '',
    loadoutPanels(build, { inChampSelect: false, current: { runes: game.me.runes, spells: game.me.spells }, parts: ['runes', 'spells'] }));
}

export function renderLive(root) {
  const container = el('div', { class: 'live' });
  root.append(container);
  let lastKey = null;
  const update = () => {
    const g = state.game;
    const key = g && g.me ? JSON.stringify([g.me.items, g.me.level, Math.floor(g.me.gold / 100), [...g.enemies, ...g.allies].map((e) => [e.items, e.level, e.scores, e.dead, e.position, e.rank]), Math.floor(g.gameTime / 15)]) : `none-${isSupported()}-${state.phase}`;
    if (key === lastKey) return;
    lastKey = key;
    draw(container, g);
  };
  const unsub = subscribe((what) => { if (!container.isConnected) { unsub(); return; } if (what === 'game' || what === 'mode') update(); });
  update();
}
