// Match history: results of the player's finished matches, a summary per champion and the
// purchase timeline of each match. The engine learns item and pick preferences from it.
import { t } from '../js/i18n.js';
import { state, champ, subscribe } from '../js/store.js';
import { el, champIcon, itemIcon, roleIcon, confirmDialog } from '../js/ui.js';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const pct = (wins, games) => (games ? Math.round((wins / games) * 100) : 0);
const kdaText = (k) => `${k.kills} / ${k.deaths} / ${k.assists}`;

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

function championSummary(history) {
  const by = {};
  for (const g of history) {
    const s = by[g.championId] || (by[g.championId] = { id: g.championId, games: 0, wins: 0, k: 0, d: 0, a: 0 });
    s.games += 1;
    s.wins += g.win ? 1 : 0;
    s.k += g.kda.kills; s.d += g.kda.deaths; s.a += g.kda.assists;
  }
  return Object.values(by).sort((a, b) => b.games - a.games);
}

function matchRow(g, onRemove) {
  const c = champ(g.championId);
  const details = el('div', { class: 'hist-details', hidden: true },
    el('span', { class: 'muted' }, t('history.timeline')),
    el('div', { class: 'hist-timeline' }, g.purchases.map((p) => el('div', { class: 'hist-buy' }, itemIcon(p.id, { size: 'sm' }), el('span', { class: 'muted' }, fmtTime(p.t))))),
    el('span', { class: 'muted' }, t('history.enemies')),
    el('div', { class: 'hist-enemies' }, g.enemies.map((e) => el('div', { class: 'hist-enemy' }, champIcon(e.championId, { size: 'xs' }),
      e.position ? roleIcon(e.position) : null, e.items.map((id) => itemIcon(id, { size: 'xs' }))))));
  return el('div', { class: `hist-row ${g.win ? 'win' : 'loss'}` },
    el('div', { class: 'hist-main', onClick: () => { details.hidden = !details.hidden; } },
      el('span', { class: 'hist-result' }, t(g.win ? 'history.win' : 'history.loss')),
      champIcon(g.championId, { size: 'sm' }),
      el('div', { class: 'hist-name' }, el('strong', {}, c ? c.name : g.championId),
        el('span', { class: 'muted' }, `${new Date(g.date).toLocaleString(state.settings.language === 'pl' ? 'pl-PL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })} · ${fmtTime(g.duration)}`)),
      el('div', { class: 'role-badge' }, g.role ? roleIcon(g.role) : null),
      g.opponentId ? el('div', { class: 'hist-vs' }, el('span', { class: 'muted' }, 'vs'), champIcon(g.opponentId, { size: 'xs' })) : el('div', {}),
      el('span', { class: 'live-kda' }, kdaText(g.kda)),
      el('span', { class: 'muted' }, `${g.cs} CS`),
      el('div', { class: 'build-strip' }, g.items.map((id) => itemIcon(id, { size: 'sm' }))),
      el('button', { class: 'btn small ghost', title: t('history.remove'), onClick: (e) => { e.stopPropagation(); onRemove(g); } }, '×')),
    details);
}

export async function renderHistory(root) {
  const container = el('div', { class: 'history' });
  root.append(container);
  state.history = await window.api.listHistory();

  const draw = () => {
    const list = state.history || [];
    const wins = list.filter((g) => g.win).length;
    const remove = async (g) => { state.history = await window.api.removeHistory(g.id); draw(); };
    const clear = async () => {
      if (!(await confirmDialog(t('history.clearTitle'), t('history.clearText'), t('history.clear')))) return;
      state.history = await window.api.clearHistory();
      draw();
    };
    const head = el('div', { class: 'view-head' }, el('h1', {}, t('history.title')),
      list.length ? el('span', { class: 'chip teal' }, t('history.summary', { games: list.length, wins, losses: list.length - wins, pct: pct(wins, list.length) })) : null,
      el('div', { class: 'spacer' }),
      list.length ? el('button', { class: 'btn small ghost', onClick: clear }, t('history.clear')) : null);
    if (!list.length) {
      container.replaceChildren(head, el('div', { class: 'panel empty-state' }, el('p', {}, t('history.empty')), el('p', { class: 'muted small' }, t('history.emptyHint'))));
      return;
    }
    const champs = el('section', { class: 'panel' }, el('h2', {}, t('history.byChampion')),
      el('div', { class: 'hist-champs' }, championSummary(list).map((s) => el('div', { class: 'hist-champ' }, champIcon(s.id, { size: 'sm' }),
        el('div', {}, el('strong', {}, champ(s.id) ? champ(s.id).name : s.id),
          el('div', { class: 'muted small' }, t('history.champLine', { games: s.games, pct: pct(s.wins, s.games), kda: `${(s.k / s.games).toFixed(1)} / ${(s.d / s.games).toFixed(1)} / ${(s.a / s.games).toFixed(1)}` })))))));
    const matches = el('section', { class: 'panel' }, el('h2', {}, t('history.matches')), el('p', { class: 'muted small' }, t('history.learnHint')),
      el('div', { class: 'hist-list' }, list.map((g) => matchRow(g, remove))));
    container.replaceChildren(head, champs, matches);
  };
  const unsub = subscribe((what) => { if (!container.isConnected) { unsub(); return; } if (what === 'history') draw(); });
  draw();
}
