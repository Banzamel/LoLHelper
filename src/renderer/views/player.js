// Player sheet: one player of a live or past match — what they have in this game and, from
// the League client, their rank, recent results, champions, roles and play style.
import { t } from '../js/i18n.js';
import { state, champ, item } from '../js/store.js';
import { el, champIcon, itemIcon, roleIcon, rankBadge, runeIcon, summonerIcon, openModal } from '../js/ui.js';
import { barList, resultStrip, COLORS } from '../js/charts.js';
import { bought } from '../js/game.js';

export const QUEUE_TYPES = ['solo', 'flex', 'normal', 'clash', 'aram', 'arena', 'bots', 'rotating', 'custom'];
export const kdaText = (k, d, a) => `${k} / ${d} / ${a}`;
export const kdaRatio = (k, d, a) => ((k + a) / Math.max(1, d)).toFixed(2);
export const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
export const champName = (id) => (champ(id) ? champ(id).name : id || '?');

// The account's (or `puuid`'s) participant of a compact game.
export function mine(game, puuid) {
  return game.players.find((p) => p.puuid && p.puuid === puuid) || (game.players.length === 1 ? game.players[0] : null);
}

export function profileIcon(id, size = '') {
  const v = state.db && state.db.meta ? state.db.meta.version : null;
  return el('div', { class: `profile-icon ${size}` }, id && v ? el('img', { src: `https://ddragon.leagueoflegends.com/cdn/${v}/img/profileicon/${id}.png`, alt: '' }) : null);
}

export function statTile(label, value, { sub = null, tone = '' } = {}) {
  return el('div', { class: `stat-tile ${tone}` }, el('span', { class: 'stat-label' }, label), el('strong', {}, value), sub ? el('span', { class: 'stat-sub' }, sub) : null);
}

export function traitChips(traits) {
  return el('div', { class: 'chips' }, traits.map((x) => el('span', { class: `chip ${x.tone === 'plus' ? 'plus' : x.tone === 'minus' ? 'minus' : 'teal'}`, title: t(`${x.key}Hint`, { v: x.value, champ: x.value }) },
    t(x.key, { v: x.value, champ: x.value }))));
}

// Items with names and prices, for "what exactly does this player have".
export function itemList(ids) {
  const list = bought(ids || []);
  if (!list.length) return el('p', { class: 'muted small' }, t('player.noItems'));
  return el('div', { class: 'item-list' }, list.map((id) => el('div', { class: 'item-line' }, itemIcon(id, { size: 'sm' }),
    el('span', {}, item(id).name), el('span', { class: 'gold-text' }, String(item(id).gold.total)))));
}

// Recent results, champions and roles of the player from their client match history.
function historyBlock(data, championId) {
  const a = data.analysis;
  if (!a || !a.games) return el('p', { class: 'muted' }, t(data.historyHidden ? 'player.historyHidden' : 'player.noGames'));
  const onChamp = a.byChampion.find((c) => c.key === championId);
  const results = data.games.map((g) => mine(g, data.puuid)).filter(Boolean).map((p) => p.win);
  return el('div', { class: 'sheet-history' },
    el('div', { class: 'stat-tiles' },
      statTile(t('player.winrate'), pct(a.winrate), { sub: t('player.games', { n: a.games }), tone: a.winrate >= 0.5 ? 'plus' : 'minus' }),
      statTile('KDA', String(a.kda ?? '—'), { sub: `${a.k} / ${a.d} / ${a.a}` }),
      statTile(t('player.csm'), String(a.csm ?? '—')),
      onChamp ? statTile(t('player.onChampion', { champ: championId }), pct(onChamp.winrate), { sub: t('player.games', { n: onChamp.games }) })
        : championId ? statTile(t('player.onChampion', { champ: championId }), '—', { sub: t('player.firstTime') }) : null,
      a.streak && a.streak.n >= 3 ? statTile(t('player.streak'), t(a.streak.win ? 'player.winStreak' : 'player.lossStreak', { n: a.streak.n }), { tone: a.streak.win ? 'plus' : 'minus' }) : null),
    el('h3', { class: 'sub' }, t('player.recent')), resultStrip(results.slice(0, 20)),
    a.traits.length ? [el('h3', { class: 'sub' }, t('history.style')), traitChips(a.traits)] : null,
    el('div', { class: 'sheet-cols' },
      el('div', {}, el('h3', { class: 'sub' }, t('player.champions')),
        barList(a.byChampion.slice(0, 5).map((c) => ({ label: el('span', { class: 'bar-champ' }, champIcon(c.key, { size: 'xs' }), champName(c.key)), value: c.games, color: c.winrate >= 0.5 ? COLORS.ally : COLORS.enemy, text: `${c.games} · ${pct(c.winrate)}` })))),
      a.byRole.length ? el('div', {}, el('h3', { class: 'sub' }, t('player.roles')),
        barList(a.byRole.map((r) => ({ label: el('span', { class: 'role-badge' }, roleIcon(r.key), t(`role.${r.key}`)), value: r.games, color: COLORS.gold, text: `${r.games} · ${pct(r.winrate)}` })))) : null),
    el('h3', { class: 'sub' }, t('player.lastGames')),
    el('div', { class: 'mini-games' }, data.games.slice(0, 10).map((g) => {
      const p = mine(g, data.puuid);
      if (!p) return null;
      return el('div', { class: `mini-game ${p.win ? 'win' : 'loss'}` }, champIcon(p.champ, { size: 'xs' }),
        el('span', {}, t(`queue.${g.type}`)), el('span', { class: 'live-kda' }, kdaText(p.k, p.d, p.a)), el('span', { class: 'muted' }, `${p.cs} CS`),
        el('span', { class: 'muted' }, new Date(g.created).toLocaleDateString()));
    })));
}

/**
 * Opens the sheet. p: { puuid, name, championId, position, rank, level, items, scores,
 * spells, keystone, itemGold } — a live player or a participant of a past game.
 */
export function openPlayer(p, { ally = null } = {}) {
  const c = champ(p.championId);
  const s = p.scores || {};
  const body = el('div', { class: 'sheet' });
  const remote = el('div', { class: 'sheet-remote' }, el('p', { class: 'muted' }, t('player.loading')));
  body.append(
    el('div', { class: 'sheet-head' }, champIcon(p.championId, { size: 'lg' }),
      el('div', { class: 'sheet-title' }, el('h2', {}, c ? c.name : p.championId || '?'),
        el('div', { class: 'muted' }, p.name || t('player.hiddenName')),
        el('div', { class: 'chips' }, p.position ? el('span', { class: 'role-badge' }, roleIcon(p.position), t(`role.${p.position}`)) : null,
          ally === null ? null : el('span', { class: `chip ${ally ? 'teal' : 'minus'}` }, t(ally ? 'player.ally' : 'player.enemy')), rankBadge(p.rank))),
      el('div', { class: 'sheet-loadout' }, (p.spells || []).filter(Boolean).map((id) => summonerIcon(id)), p.keystone ? runeIcon(p.keystone) : null)),
    p.items ? el('section', {}, el('h3', { class: 'sub' }, t('player.thisGame')),
      el('div', { class: 'stat-tiles' },
        statTile('KDA', kdaText(s.kills || 0, s.deaths || 0, s.assists || 0), { sub: kdaRatio(s.kills || 0, s.deaths || 0, s.assists || 0) }),
        statTile('CS', String(s.creepScore || 0)),
        p.level ? statTile(t('live.level'), String(p.level)) : null,
        typeof p.itemGold === 'number' ? statTile(t('live.itemGold'), String(p.itemGold)) : null,
        typeof s.wardScore === 'number' ? statTile(t('live.vision'), String(Math.round(s.wardScore))) : null),
      itemList(p.items)) : null,
    el('section', {}, el('h3', { class: 'sub' }, t('player.history')), remote));
  openModal(t('player.title'), body);
  if (!p.puuid) { remote.replaceChildren(el('p', { class: 'muted' }, t('player.noPuuid'))); return; }
  // Players of the simulated match have invented profiles that need no client.
  if (!state.lcu.connected && !p.puuid.startsWith('demo-')) { remote.replaceChildren(el('p', { class: 'muted' }, t('player.offline'))); return; }
  window.api.getPlayer(p.puuid).then((data) => {
    const head = el('div', { class: 'sheet-account' }, profileIcon(data.icon, 'sm'),
      el('strong', {}, data.name ? `${data.name}#${data.tag}` : p.name || ''), data.level ? el('span', { class: 'muted' }, t('player.accountLevel', { n: data.level })) : null,
      rankBadge(data.ranks.solo), data.ranks.flex && data.ranks.flex.tier ? el('span', { class: 'muted small' }, t('queue.flex'), ' ', rankBadge(data.ranks.flex, { compact: true })) : null);
    remote.replaceChildren(head, historyBlock(data, p.championId));
  }).catch(() => remote.replaceChildren(el('p', { class: 'muted' }, t('player.failed'))));
}
