// History of the logged-in account: its profile and ranks, an overview with charts (win-rate
// trend, results per game type and role, play style), every game from the League client
// filtered by type and sorted, per-champion results, and the matches the app recorded itself
// (purchase timelines the engine learns from). Each account on the computer has its own.
import { t } from '../js/i18n.js';
import { state, champ, subscribe } from '../js/store.js';
import { el, champIcon, itemIcon, roleIcon, rankBadge, confirmDialog, toast } from '../js/ui.js';
import { lineChart, barList, resultStrip, fmtGold, COLORS } from '../js/charts.js';
import { openPlayer, mine, statTile, traitChips, profileIcon, kdaText, kdaRatio, pct, champName, QUEUE_TYPES } from './player.js';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const percent = (wins, games) => (games ? Math.round((wins / games) * 100) : 0);
const locale = () => (state.settings.language === 'pl' ? 'pl-PL' : 'en-GB');
const fmtDate = (ms) => new Date(ms).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' });

// Wins and games of the player with a champion, overall and against one lane opponent.
export function recordOf(history, championId, enemyId = null) {
  const games = (history || []).filter((g) => g.championId === championId);
  const vs = enemyId ? games.filter((g) => g.opponentId === enemyId) : [];
  return { wins: games.filter((g) => g.win).length, games: games.length, vsWins: vs.filter((g) => g.win).length, vsGames: vs.length };
}

// Short "your history" chip for the Draft and Match views (null without games).
export function recordChip(history, championId, enemyId) {
  const r = recordOf(history, championId, enemyId);
  if (!r.games) return null;
  const text = r.vsGames
    ? t('history.recordVs', { wins: r.wins, losses: r.games - r.wins, vsWins: r.vsWins, vsLosses: r.vsGames - r.vsWins, enemy: enemyId })
    : t('history.record', { wins: r.wins, losses: r.games - r.wins });
  return el('span', { class: `chip ${r.wins * 2 >= r.games ? 'plus' : 'minus'}`, title: t('history.recordHint') }, text);
}

// View state kept while navigating away and back.
const ui = { tab: 'overview', type: 'all', champ: null, sort: 'new', open: new Set() };
const TABS = ['overview', 'matches', 'champions', 'learning'];
const SORTS = {
  new: (a, b) => b.g.created - a.g.created,
  old: (a, b) => a.g.created - b.g.created,
  kda: (a, b) => (b.p.k + b.p.a) / Math.max(1, b.p.d) - (a.p.k + a.p.a) / Math.max(1, a.p.d),
  long: (a, b) => b.g.duration - a.g.duration,
  champion: (a, b) => champName(a.p.champ).localeCompare(champName(b.p.champ)) || b.g.created - a.g.created,
  type: (a, b) => QUEUE_TYPES.indexOf(a.g.type) - QUEUE_TYPES.indexOf(b.g.type) || b.g.created - a.g.created,
};

// ---- Header -----------------------------------------------------------------------------

function profileCard() {
  const p = state.profile;
  const m = state.matches || {};
  const sync = async (btn) => {
    btn.disabled = true;
    try { state.matches = await window.api.syncMatches(); } catch (e) { toast(e.message, { error: true }); }
    btn.disabled = false;
  };
  if (!p) return el('div', { class: 'card profile-card' }, el('p', {}, t('history.noProfile')), el('p', { class: 'muted small' }, t('history.noProfileHint')));
  const ranks = p.ranks || {};
  return el('div', { class: 'card profile-card' }, profileIcon(p.icon, 'lg'),
    el('div', { class: 'profile-text' }, el('h2', {}, p.gameName ? `${p.gameName}` : '—', el('span', { class: 'muted' }, p.tagLine ? ` #${p.tagLine}` : '')),
      el('div', { class: 'chips' }, p.level ? el('span', { class: 'chip' }, t('player.accountLevel', { n: p.level })) : null,
        ranks.solo ? el('span', { class: 'rank-pair' }, el('span', { class: 'muted small' }, t('queue.solo')), rankBadge(ranks.solo)) : null,
        ranks.flex ? el('span', { class: 'rank-pair' }, el('span', { class: 'muted small' }, t('queue.flex')), rankBadge(ranks.flex)) : null),
      el('div', { class: 'muted small' }, m.syncing ? t('history.syncing') : m.lastSync ? t('history.lastSync', { date: fmtDate(Date.parse(m.lastSync)), n: (m.games || []).length }) : t('history.neverSynced'))),
    el('div', { class: 'spacer' }),
    el('button', { class: 'btn small', disabled: !state.lcu.connected || m.syncing ? true : null, title: state.lcu.connected ? t('history.syncHint') : t('build.needClient'), onClick: (e) => sync(e.currentTarget) }, t('history.sync')));
}

// ---- Overview ---------------------------------------------------------------------------

function overviewTab() {
  const a = state.matches && state.matches.analysis;
  if (!a || !a.games) return el('div', { class: 'card empty-state' }, el('p', {}, t('history.noGames')), el('p', { class: 'muted small' }, t('history.noGamesHint')));
  const games = state.matches.games;
  const results = games.map((g) => mine(g, state.profile.puuid)).filter((p) => p).map((p) => p.win);
  const recent = a.recent;
  const form = recent.games >= 5 && a.winrate !== null ? recent.winrate - a.winrate : null;
  const trend = a.trend.map((x, i) => [i + 1, Math.round(x.winrate * 100)]);
  const kda = a.trend.map((x, i) => [i + 1, x.kda]);
  return el('div', { class: 'tab-body' },
    el('div', { class: 'stat-tiles big' },
      statTile(t('history.games'), String(a.games), { sub: `${a.wins}W / ${a.games - a.wins}L` }),
      statTile(t('player.winrate'), pct(a.winrate), { tone: a.winrate >= 0.5 ? 'plus' : 'minus' }),
      statTile('KDA', String(a.kda ?? '—'), { sub: `${a.k} / ${a.d} / ${a.a}` }),
      statTile(t('player.csm'), String(a.csm ?? '—')),
      statTile(t('history.kp'), pct(a.kp)),
      statTile(t('history.dmgShare'), pct(a.share)),
      statTile(t('history.vpm'), String(a.vpm ?? '—')),
      form !== null ? statTile(t('history.form'), pct(recent.winrate), { sub: t(form >= 0 ? 'history.formUp' : 'history.formDown', { n: Math.abs(Math.round(form * 100)) }), tone: form >= 0 ? 'plus' : 'minus' }) : null),
    el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('player.recent')), resultStrip(results.slice(0, 30)),
      a.streak && a.streak.n >= 2 ? el('p', { class: 'small' }, t(a.streak.win ? 'player.winStreak' : 'player.lossStreak', { n: a.streak.n })) : null),
    el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('history.style')),
      a.traits.length ? [traitChips(a.traits), el('ul', { class: 'tips style-tips' }, a.traits.map((x) => el('li', {}, t(`${x.key}Hint`, { v: x.value, champ: x.value }))))]
        : el('p', { class: 'muted small' }, t('history.styleNeedsGames'))),
    el('div', { class: 'chart-grid' },
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('history.chartWinrate')),
        lineChart([{ label: t('history.rolling'), color: COLORS.gold, points: trend }], { yMin: 0, yMax: 100, yFmt: (v) => `${v}%`, xFmt: (v) => `#${v}`, markers: [] }),
        el('p', { class: 'muted small' }, t('history.chartWinrateHint'))),
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('history.chartKda')),
        lineChart([{ label: 'KDA', color: COLORS.ally, points: kda }], { yMin: 0, xFmt: (v) => `#${v}`, yFmt: (v) => String(v) }))),
    el('div', { class: 'chart-grid' },
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('history.byType')),
        barList(a.byType.map((x) => ({ label: t(`queue.${x.key}`), value: x.games, color: COLORS.gold, text: `${x.games} · ${pct(x.winrate)}` })))),
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('player.roles')),
        a.byRole.length ? barList(a.byRole.map((x) => ({ label: el('span', { class: 'role-badge' }, roleIcon(x.key), t(`role.${x.key}`)), value: x.games, color: COLORS.gold, text: `${x.games} · ${pct(x.winrate)}` })))
          : el('p', { class: 'muted small' }, '—'))));
}

// ---- Matches ----------------------------------------------------------------------------

function goldChart(game, me) {
  const gold = game.gold;
  if (!gold || !gold.teams || gold.teams.length < 2) return el('p', { class: 'muted small' }, t('history.noTimeline'));
  const mineFirst = me.team === 100;
  const opp = game.players.find((p) => p.team !== me.team && p.pos && p.pos === me.pos);
  const lead = lineChart([{ label: t('live.goldLeadAxis'), color: COLORS.ally, points: gold.teams.map(([m, b, r]) => [m, mineFirst ? b - r : r - b]) }],
    { diverging: { pos: COLORS.ally, neg: COLORS.enemy }, xFmt: (v) => `${v}'`, yFmt: (v) => `${v > 0 ? '+' : ''}${fmtGold(v)}`, height: 170 });
  const duel = opp && gold.players[me.pid] && gold.players[opp.pid] ? lineChart([
    { label: champName(me.champ), color: COLORS.ally, points: gold.players[me.pid].map((v, i) => [i, v]) },
    { label: champName(opp.champ), color: COLORS.enemy, points: gold.players[opp.pid].map((v, i) => [i, v]) },
  ], { xFmt: (v) => `${v}'`, yFmt: fmtGold, yMin: 0, height: 170 }) : null;
  return el('div', { class: 'chart-grid' },
    el('div', {}, el('div', { class: 'card-kicker' }, t('history.chartLead')), lead),
    duel ? el('div', {}, el('div', { class: 'card-kicker' }, t('history.chartDuel')), duel) : null);
}

function teamBlock(game, teamId, me) {
  const team = game.teams.find((x) => x.id === teamId) || {};
  const players = game.players.filter((p) => p.team === teamId);
  const ally = teamId === me.team;
  const maxDmg = Math.max(1, ...game.players.map((p) => p.dmg));
  return el('div', { class: `match-team ${ally ? 'ally' : 'enemy'}` },
    el('div', { class: 'team-head' }, el('h3', { class: ally ? 'ally-title' : 'enemy-title' }, t(team.win ? 'history.win' : 'history.loss'), ' · ', t(ally ? 'draft.allies' : 'draft.enemies')),
      el('span', { class: 'muted small' }, t('history.teamObjectives', { kills: team.kills || 0, dragons: team.dragons || 0, barons: team.barons || 0, towers: team.towers || 0 }))),
    players.map((p) => el('button', { class: `mrow ${p.puuid === me.puuid ? 'me' : ''}`, onClick: () => openPlayer({
      puuid: p.puuid, name: p.name ? `${p.name}#${p.tag}` : '', championId: p.champ, position: p.pos, items: p.items, spells: p.spells, keystone: p.keystone, level: p.level,
      scores: { kills: p.k, deaths: p.d, assists: p.a, creepScore: p.cs, wardScore: p.vision },
    }, { ally }) },
      el('span', { class: 'role-badge' }, p.pos ? roleIcon(p.pos) : null), champIcon(p.champ, { size: 'xs' }),
      el('span', { class: 'mname' }, el('strong', {}, champName(p.champ)), el('span', { class: 'muted' }, p.name || '')),
      el('span', { class: 'live-kda' }, kdaText(p.k, p.d, p.a)), el('span', { class: 'muted' }, `${p.cs} CS`),
      el('span', { class: 'pgold' }, el('span', {}, fmtGold(p.dmg)), el('i', { style: `width:${(p.dmg / maxDmg) * 100}%;background:${ally ? COLORS.ally : COLORS.enemy}` })),
      el('span', { class: 'gold-text' }, fmtGold(p.gold)),
      el('span', { class: 'pitems' }, p.items.map((id) => itemIcon(id, { size: 'xs' }))))));
}

async function loadDetail(box, g) {
  box.replaceChildren(el('p', { class: 'muted small' }, t('player.loading')));
  let game = g;
  try { game = (await window.api.matchDetail(g.id)) || g; } catch { /* offline: show what is cached */ }
  const me = mine(game, state.profile && state.profile.puuid);
  if (!me) { box.replaceChildren(el('p', { class: 'muted small' }, t('history.noDetail'))); return; }
  const local = (state.history || []).find((h) => String(h.id) === String(game.id));
  box.replaceChildren(
    game.full ? el('div', { class: 'match-teams' }, teamBlock(game, me.team, me), teamBlock(game, me.team === 100 ? 200 : 100, me))
      : el('p', { class: 'muted small' }, t(state.lcu.connected ? 'history.noDetail' : 'player.offline')),
    el('div', { class: 'muted small match-cols' }, t('history.colsHint')),
    goldChart(game, me),
    local && local.purchases.length ? el('div', { class: 'match-buys' }, el('div', { class: 'card-kicker' }, t('history.timeline')),
      el('div', { class: 'hist-timeline' }, local.purchases.map((p) => el('div', { class: 'hist-buy' }, itemIcon(p.id, { size: 'sm' }), el('span', { class: 'muted' }, fmtTime(p.t)))))) : '');
}

function matchRow(g, p) {
  const details = el('div', { class: 'match-details', hidden: !ui.open.has(g.id) });
  if (ui.open.has(g.id)) loadDetail(details, g);
  const recorded = (state.history || []).some((h) => String(h.id) === String(g.id));
  const toggle = () => {
    if (ui.open.has(g.id)) { ui.open.delete(g.id); details.hidden = true; return; }
    ui.open.add(g.id);
    details.hidden = false;
    loadDetail(details, g);
  };
  return el('div', { class: `hist-row ${p.win ? 'win' : 'loss'} ${g.duration < 300 ? 'remake' : ''}` },
    el('button', { class: 'match-main', onClick: toggle },
      el('span', { class: 'match-result' }, el('strong', {}, t(g.duration < 300 ? 'history.remake' : p.win ? 'history.win' : 'history.loss')), el('span', { class: 'muted' }, t(`queue.${g.type}`))),
      champIcon(p.champ, { size: 'sm' }),
      el('span', { class: 'mname' }, el('strong', {}, champName(p.champ)), el('span', { class: 'muted' }, `${fmtDate(g.created)} · ${fmtTime(g.duration)}`)),
      el('span', { class: 'role-badge' }, p.pos ? roleIcon(p.pos) : null),
      el('span', { class: 'mkda' }, el('span', { class: 'live-kda' }, kdaText(p.k, p.d, p.a)), el('span', { class: 'muted small' }, `${kdaRatio(p.k, p.d, p.a)} KDA`)),
      el('span', { class: 'muted' }, `${p.cs} CS · ${(p.cs / Math.max(1, g.duration / 60)).toFixed(1)}/min`),
      el('span', { class: 'pitems' }, p.items.map((id) => itemIcon(id, { size: 'xs' }))),
      recorded ? el('span', { class: 'chip teal', title: t('history.recordedHint') }, t('history.recorded')) : el('span', {})),
    details);
}

function matchesTab() {
  const games = (state.matches && state.matches.games) || [];
  const puuid = state.profile && state.profile.puuid;
  const rows = games.map((g) => ({ g, p: mine(g, puuid) })).filter((r) => r.p);
  if (!rows.length) return el('div', { class: 'card empty-state' }, el('p', {}, t('history.noGames')), el('p', { class: 'muted small' }, t('history.noGamesHint')));
  const counts = {};
  for (const r of rows) counts[r.g.type] = (counts[r.g.type] || 0) + 1;
  const list = rows.filter((r) => (ui.type === 'all' || r.g.type === ui.type) && (!ui.champ || r.p.champ === ui.champ)).sort(SORTS[ui.sort]);
  const wins = list.filter((r) => r.p.win).length;
  const groups = [];
  for (const r of list) {
    const key = ui.sort === 'type' ? r.g.type : ui.sort === 'champion' ? r.p.champ : null;
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, rows: [] });
    groups[groups.length - 1].rows.push(r);
  }
  const groupTitle = (key) => (ui.sort === 'type' ? t(`queue.${key}`) : champName(key));
  return el('div', { class: 'tab-body' },
    el('div', { class: 'filters' },
      el('div', { class: 'chips' }, ['all', ...QUEUE_TYPES.filter((k) => counts[k])].map((k) => el('button', {
        class: `chip filter ${ui.type === k ? 'active' : ''}`, onClick: () => { ui.type = k; redraw(); },
      }, k === 'all' ? t('history.allTypes') : t(`queue.${k}`), el('span', { class: 'muted' }, String(k === 'all' ? rows.length : counts[k]))))),
      el('div', { class: 'spacer' }),
      ui.champ ? el('button', { class: 'chip filter active', onClick: () => { ui.champ = null; redraw(); } }, champIcon(ui.champ, { size: 'xs' }), champName(ui.champ), ' ×') : null,
      el('label', { class: 'muted small sort-label' }, t('history.sortBy'),
        el('select', { class: 'select', onChange: (e) => { ui.sort = e.target.value; redraw(); } },
          Object.keys(SORTS).map((k) => el('option', { value: k, selected: ui.sort === k ? true : null }, t(`history.sort.${k}`)))))),
    el('p', { class: 'muted small' }, t('history.listSummary', { games: list.length, wins, losses: list.length - wins, pct: percent(wins, list.length) })),
    groups.map((gr) => el('div', { class: 'match-group' },
      gr.key ? el('h3', { class: 'sub' }, groupTitle(gr.key), el('span', { class: 'muted' }, ` · ${gr.rows.length} · ${percent(gr.rows.filter((r) => r.p.win).length, gr.rows.length)}%`)) : null,
      el('div', { class: 'hist-list' }, gr.rows.map((r) => matchRow(r.g, r.p))))));
}

// ---- Champions --------------------------------------------------------------------------

function championsTab() {
  const a = state.matches && state.matches.analysis;
  if (!a || !a.games) return el('div', { class: 'card empty-state' }, el('p', {}, t('history.noGames')));
  const max = Math.max(...a.byChampion.map((c) => c.games));
  return el('div', { class: 'tab-body' }, el('div', { class: 'card' },
    el('div', { class: 'ctable' },
      el('div', { class: 'crow chead' }, el('span', {}, t('history.champion')), el('span', {}, t('history.games')), el('span', {}, t('player.winrate')),
        el('span', {}, 'KDA'), el('span', {}, t('player.csm')), el('span', {}, t('history.dpm')), el('span', {}, t('history.kp'))),
      a.byChampion.map((c) => el('button', { class: 'crow', title: t('history.showMatches'), onClick: () => { ui.champ = c.key; ui.tab = 'matches'; redraw(); } },
        el('span', { class: 'bar-champ' }, champIcon(c.key, { size: 'sm' }), el('strong', {}, champName(c.key))),
        el('span', { class: 'pgold' }, el('span', {}, String(c.games)), el('i', { style: `width:${(c.games / max) * 100}%;background:${COLORS.gold}` })),
        el('span', { class: c.winrate >= 0.5 ? 'plus-text' : 'minus-text' }, pct(c.winrate), el('span', { class: 'muted small' }, ` ${c.wins}W ${c.games - c.wins}L`)),
        el('span', {}, String(c.kda), el('span', { class: 'muted small' }, ` ${c.k}/${c.d}/${c.a}`)),
        el('span', {}, String(c.csm ?? '—')), el('span', {}, String(c.dpm ?? '—')), el('span', {}, pct(c.kp)))))));
}

// ---- Learning (matches recorded by the app) ----------------------------------------------

function learningTab(redrawAll) {
  const list = state.history || [];
  const remove = async (g) => { state.history = await window.api.removeHistory(g.id); redrawAll(); };
  const clear = async () => {
    if (!(await confirmDialog(t('history.clearTitle'), t('history.clearText'), t('history.clear')))) return;
    state.history = await window.api.clearHistory();
    redrawAll();
  };
  if (!list.length) return el('div', { class: 'card empty-state' }, el('p', {}, t('history.empty')), el('p', { class: 'muted small' }, t('history.emptyHint')));
  const wins = list.filter((g) => g.win).length;
  return el('div', { class: 'tab-body' },
    el('div', { class: 'card' }, el('div', { class: 'panel-title' }, el('div', { class: 'card-kicker' }, t('history.learnTitle')),
      el('span', { class: 'chip teal' }, t('history.summary', { games: list.length, wins, losses: list.length - wins, pct: percent(wins, list.length) })),
      el('div', { class: 'spacer' }), el('button', { class: 'btn small ghost', onClick: clear }, t('history.clear'))),
    el('p', { class: 'muted small' }, t('history.learnHint')),
    el('div', { class: 'hist-list' }, list.map((g) => {
      const c = champ(g.championId);
      const details = el('div', { class: 'hist-details', hidden: true },
        el('span', { class: 'muted' }, t('history.timeline')),
        el('div', { class: 'hist-timeline' }, g.purchases.map((p) => el('div', { class: 'hist-buy' }, itemIcon(p.id, { size: 'sm' }), el('span', { class: 'muted' }, fmtTime(p.t))))),
        g.gold && g.gold.length > 1 ? lineChart([{ label: t('live.goldLeadAxis'), color: COLORS.ally, points: g.gold.map(([m, a, e]) => [m, a - e]) }],
          { diverging: { pos: COLORS.ally, neg: COLORS.enemy }, xFmt: (v) => `${v}'`, yFmt: (v) => `${v > 0 ? '+' : ''}${fmtGold(v)}`, height: 150 }) : null,
        el('span', { class: 'muted' }, t('history.enemies')),
        el('div', { class: 'hist-enemies' }, g.enemies.map((e) => el('div', { class: 'hist-enemy' }, champIcon(e.championId, { size: 'xs' }),
          e.position ? roleIcon(e.position) : null, e.items.map((id) => itemIcon(id, { size: 'xs' }))))));
      return el('div', { class: `hist-row ${g.win ? 'win' : 'loss'}` },
        el('div', { class: 'hist-main', onClick: () => { details.hidden = !details.hidden; } },
          el('span', { class: 'hist-result' }, t(g.win ? 'history.win' : 'history.loss')),
          champIcon(g.championId, { size: 'sm' }),
          el('div', { class: 'hist-name' }, el('strong', {}, c ? c.name : g.championId), el('span', { class: 'muted' }, `${fmtDate(g.date)} · ${fmtTime(g.duration)}`)),
          el('div', { class: 'role-badge' }, g.role ? roleIcon(g.role) : null),
          g.opponentId ? el('div', { class: 'hist-vs' }, el('span', { class: 'muted' }, 'vs'), champIcon(g.opponentId, { size: 'xs' })) : el('div', {}),
          el('span', { class: 'live-kda' }, kdaText(g.kda.kills, g.kda.deaths, g.kda.assists)),
          el('span', { class: 'muted' }, `${g.cs} CS`),
          el('div', { class: 'build-strip' }, g.items.map((id) => itemIcon(id, { size: 'sm' }))),
          el('button', { class: 'btn small ghost', title: t('history.remove'), onClick: (e) => { e.stopPropagation(); remove(g); } }, '×')),
        details);
    }))));
}

// ---- View -------------------------------------------------------------------------------

let redraw = () => {};

export async function renderHistory(root) {
  const container = el('div', { class: 'history' });
  root.append(container);
  const draw = () => {
    if (!container.isConnected) return;
    const body = { overview: overviewTab, matches: matchesTab, champions: championsTab, learning: () => learningTab(draw) }[ui.tab]();
    container.replaceChildren(
      el('div', { class: 'view-head' }, el('h1', {}, t('history.title'))),
      profileCard(),
      el('nav', { class: 'segmented' }, TABS.map((k) => el('button', { class: `seg ${ui.tab === k ? 'active' : ''}`, onClick: () => { ui.tab = k; draw(); } }, t(`history.tab.${k}`)))),
      body);
  };
  redraw = draw;
  const unsub = subscribe((what) => {
    if (!container.isConnected) { unsub(); return; }
    if (['history', 'matches', 'profile', 'lcu'].includes(what)) draw();
  });
  draw();
  state.history = await window.api.listHistory();
  state.matches = await window.api.listMatches();
  draw();
}
