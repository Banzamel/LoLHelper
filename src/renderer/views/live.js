// In-game view: data from the running match (Live Client Data API) laid out like a phone
// app — a scoreboard on top (kills, objectives, item gold lead) and tabs: what to do now
// (next item, skill, lane duel), the enemies in detail, both teams as a table, charts of the
// match so far and the rune page. Every player opens a sheet with their profile and history.
// On the loading screen, before the game reports any data, both teams from the client's
// roster with champion briefs and the tips on playing with each ally.
import { t } from '../js/i18n.js';
import { state, champ, item, asset, subscribe, isSupported } from '../js/store.js';
import { el, champIcon, itemIcon, roleIcon, rankBadge, runeIcon, summonerIcon, buildOrder, ROLES } from '../js/ui.js';
import { loadoutPanels, skillsPanel } from './loadout.js';
import { recordChip } from './history.js';
import { openPlayer, statTile, itemList, kdaText, kdaRatio } from './player.js';
import { bought, buildForGame, needsStarters, startersCost, nextSkill } from '../js/game.js';
import { lineChart, barList, versusBar, fmtMinutes, fmtGold, COLORS } from '../js/charts.js';
import { setDemo } from '../js/app.js';
import { loadTeamNotes, briefLine, teamTipsPanel } from './team.js';

const TABS = ['now', 'enemies', 'teams', 'charts', 'runes'];
// View state that survives the redraws of a running match.
const ui = { tab: 'now', focus: null, sort: 'role' };

const DRAGON_COLORS = { Fire: '#e8613a', Water: '#4aa3df', Earth: '#a5784b', Air: '#d7e3ea', Hextech: '#3fd0e0', Chemtech: '#7fd35b', Elder: '#b77ee8' };
const csPerMin = (p, game) => ((p.scores.creepScore || 0) / Math.max(1, game.gameTime / 60)).toFixed(1);
const teamSum = (list, f) => list.reduce((s, p) => s + (f(p) || 0), 0);

// ---- Scoreboard -------------------------------------------------------------------------

function objectives(o, side) {
  const chip = (key, n) => el('span', { class: 'obj', title: t(`obj.${key}`) }, el('span', { class: 'obj-name' }, t(`obj.${key}Short`)), el('strong', {}, String(n)));
  return el('div', { class: `sb-objectives ${side}` },
    el('span', { class: 'obj dragons', title: o.dragons.map((d) => t(`dragon.${d}`)).join(', ') || t('obj.dragons') },
      el('span', { class: 'obj-name' }, t('obj.dragonsShort')),
      o.dragons.length ? o.dragons.map((d) => el('i', { class: 'dragon-dot', style: `background:${DRAGON_COLORS[d] || COLORS.gold}` })) : el('strong', {}, '0')),
    chip('towers', o.towers),
    o.grubs ? chip('grubs', o.grubs) : null,
    o.heralds ? chip('heralds', o.heralds) : null,
    o.barons ? chip('barons', o.barons) : null,
    o.atakhan ? chip('atakhan', o.atakhan) : null,
    o.inhibs ? chip('inhibs', o.inhibs) : null);
}

function scoreboard(game) {
  const { ally, enemy } = game.objectives;
  const allyGold = teamSum(game.allies, (p) => p.itemGold);
  const enemyGold = teamSum(game.enemies, (p) => p.itemGold);
  const diff = allyGold - enemyGold;
  return el('section', { class: 'scoreboard' },
    el('div', { class: 'sb-row' },
      el('div', { class: 'sb-side ally' }, el('span', { class: 'sb-label' }, t('draft.allies')), el('strong', { class: 'sb-kills' }, String(ally.kills))),
      el('div', { class: 'sb-center' }, el('span', { class: 'sb-time' }, fmtMinutes(game.gameTime)),
        el('span', { class: `sb-diff ${diff > 0 ? 'plus' : diff < 0 ? 'minus' : ''}`, title: t('live.goldLeadHint') }, `${diff > 0 ? '+' : ''}${fmtGold(diff)}`),
        el('span', { class: 'sb-caption' }, t(diff >= 0 ? 'live.goldLead' : 'live.goldBehind'))),
      el('div', { class: 'sb-side enemy' }, el('strong', { class: 'sb-kills' }, String(enemy.kills)), el('span', { class: 'sb-label' }, t('draft.enemies')))),
    versusBar(allyGold, enemyGold, { fmt: fmtGold, labelA: t('live.itemGoldShort'), labelB: t('live.itemGoldShort') }),
    el('div', { class: 'sb-row objectives' }, objectives(ally, 'ally'), objectives(enemy, 'enemy')));
}

// ---- Now --------------------------------------------------------------------------------

function startersCard(build, gold) {
  const cost = startersCost(build);
  return el('div', { class: 'card hero-card' }, el('div', { class: 'card-kicker' }, t('live.starters')),
    el('p', { class: 'muted small' }, t('live.startersHint')),
    el('div', { class: 'build-strip starters' }, build.starters.map((s) => itemIcon(s.id, { size: 'lg', count: s.count }))),
    el('div', { class: 'gold-text' }, t('live.startersCost', { n: cost })),
    cost > gold ? el('span', { class: 'chip' }, t('live.missingGold', { n: cost - gold })) : null);
}

// The next item, what to buy for it right now and its parts (owned ones ticked).
function nextItemCard(build, gold) {
  const next = build.next;
  const it = next && item(next.id);
  if (!it) return el('div', { class: 'card hero-card' }, el('div', { class: 'card-kicker' }, t('live.nextItem')), el('p', { class: 'muted' }, t('live.buildDone')));
  const missing = next.cost - gold;
  const buy = next.buy && next.buy.id !== it.id ? item(next.buy.id) : null;
  const progress = Math.max(0, Math.min(1, gold / Math.max(1, next.cost)));
  return el('div', { class: `card hero-card ${missing <= 0 ? 'ready' : ''}` }, el('div', { class: 'card-kicker' }, t('live.nextItem')),
    el('div', { class: 'next-body' }, itemIcon(it.id, { size: 'lg' }),
      el('div', { class: 'next-text' }, el('h3', {}, it.name), el('div', { class: 'gold-text' }, t('live.remaining', { n: next.cost })),
        el('div', { class: 'bar gold next-bar' }, el('i', { style: `width:${progress * 100}%` })),
        el('span', { class: `chip ${missing <= 0 ? 'plus' : ''}` }, missing <= 0 ? t('live.canAfford') : t('live.missingGold', { n: missing })))),
    next.parts.length ? el('div', { class: 'next-parts' }, next.parts.map((p) => el('div', { class: `next-part ${p.owned ? 'owned' : ''}` }, itemIcon(p.id, { size: 'sm' })))) : null,
    buy ? el('div', { class: 'buy-now' }, el('span', { class: 'muted' }, t('live.buyNow')), itemIcon(buy.id, { size: 'sm' }),
      el('strong', {}, buy.name), el('span', { class: 'gold-text' }, ` ${next.buy.cost}`)) : null);
}

function skillCard(build, game) {
  const next = nextSkill(build, game.me.level);
  const c = champ(game.me.championId);
  const spell = (k) => c && c.spells.find((s) => s.key === k);
  const levels = game.me.abilities || {};
  const pending = game.me.level - ['Q', 'W', 'E', 'R'].reduce((s, k) => s + (levels[k] || 0), 0);
  return el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.nextSkill')),
    el('div', { class: 'skill-now' },
      ['Q', 'W', 'E', 'R'].map((k) => el('div', { class: `skill-now-key ${next && next.key === k ? 'next' : ''}` },
        spell(k) ? el('img', { src: asset(spell(k).icon), alt: k }) : null, el('span', { class: 'skill-now-letter' }, k),
        el('span', { class: 'skill-now-level' }, String(levels[k] || 0))))),
    next ? el('p', { class: 'small' }, pending > 0 ? el('span', { class: 'chip plus' }, t('live.skillPoint')) : null, ' ',
      t('live.nextSkillAt', { key: next.key, level: next.level })) : el('p', { class: 'muted small' }, t('live.skillsDone')));
}

function myTiles(game) {
  const s = game.me.scores;
  return el('div', { class: 'stat-tiles' },
    statTile('KDA', kdaText(s.kills || 0, s.deaths || 0, s.assists || 0), { sub: kdaRatio(s.kills || 0, s.deaths || 0, s.assists || 0) }),
    statTile('CS', String(s.creepScore || 0), { sub: t('live.perMin', { n: csPerMin(game.me, game) }) }),
    statTile(t('live.gold'), String(game.me.gold), { sub: t('live.inItems', { n: game.me.itemGold }) }),
    statTile(t('live.vision'), String(Math.round(s.wardScore || 0))));
}

// Me against the lane opponent: gold in items, CS, level and kills side by side.
function duelCard(game, opp) {
  if (!opp) return null;
  const me = game.me;
  const row = (label, a, b) => el('div', { class: 'duel-row' }, el('span', { class: 'duel-label' }, label), versusBar(a, b, { fmt: (v) => (v >= 1000 ? fmtGold(v) : String(v)) }));
  return el('button', { class: 'card duel', onClick: () => { ui.tab = 'enemies'; ui.focus = opp.name; repaint(); } },
    el('div', { class: 'card-kicker' }, t('live.laneDuel')),
    el('div', { class: 'duel-head' }, champIcon(me.championId, { size: 'sm' }), el('span', { class: 'vs' }, 'vs'), champIcon(opp.championId, { size: 'sm' }),
      el('strong', { class: 'opp-name' }, champ(opp.championId) ? champ(opp.championId).name : ''), rankBadge(opp.rank, { compact: true })),
    row(t('live.itemGoldShort'), me.itemGold, opp.itemGold),
    row('CS', me.scores.creepScore || 0, opp.scores.creepScore || 0),
    row(t('live.level'), me.level, opp.level),
    row(t('live.kills'), me.scores.kills || 0, opp.scores.kills || 0));
}

function nowTab(game, data) {
  const { build, fullIds, opp } = data;
  return el('div', { class: 'tab-body' },
    el('div', { class: 'now-grid' },
      el('div', { class: 'now-col' },
        needsStarters(game) ? startersCard(build, game.me.gold) : nextItemCard(build, game.me.gold),
        el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.recommended')),
          buildOrder(fullIds, { owned: game.me.items }),
          build.threats.length ? el('div', { class: 'chips live-threats' }, build.threats.map((x) => el('span', { class: 'chip minus' }, t(x.key, x.params)))) : null)),
      el('div', { class: 'now-col' }, skillCard(build, game), myTiles(game), duelCard(game, opp))),
    build.situational.length ? el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('build.situational')),
      el('div', { class: 'chips' }, build.situational.map((s) => el('span', { class: 'sit-item' }, itemIcon(s.id, { size: 'sm' }),
        el('span', {}, item(s.id).name), s.reasons.map((r) => el('span', { class: 'chip' }, t(r.key))))))) : null,
    skillsPanel(build, { level: game.me.level }));
}

// ---- Enemies ----------------------------------------------------------------------------

// Stats the enemy's items give, and what that means for the player's build.
const STAT_ROWS = [['ad', 'AD'], ['ap', 'AP'], ['lethality', 'stat.lethality'], ['armorPen', 'stat.armorPen'], ['magicPen', 'stat.magicPen'], ['crit', 'stat.crit'],
  ['as', 'stat.as'], ['hp', 'stat.hp'], ['armor', 'stat.armor'], ['mr', 'stat.mr'], ['lifesteal', 'stat.lifesteal'], ['omnivamp', 'stat.omnivamp'], ['hsp', 'stat.hsp']];

function itemStats(ids) {
  const out = {};
  for (const id of bought(ids)) {
    const stats = (item(id).features || {}).stats || {};
    for (const [k, v] of Object.entries(stats)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function enemyTips(stats, game) {
  const mine = champ(game.me.championId);
  const ap = mine && mine.damageType === 'AP';
  const tips = [];
  if ((stats.armor || 0) >= 60 && !ap) tips.push('enemy.tipArmor');
  if ((stats.mr || 0) >= 50 && ap) tips.push('enemy.tipMr');
  if ((stats.lifesteal || 0) + (stats.omnivamp || 0) >= 8 || stats.hsp) tips.push('enemy.tipHeal');
  if ((stats.lethality || 0) >= 15) tips.push('enemy.tipLethality');
  if ((stats.ap || 0) >= 120) tips.push('enemy.tipAp');
  if ((stats.crit || 0) >= 40) tips.push('enemy.tipCrit');
  if ((stats.hp || 0) >= 1200) tips.push('enemy.tipHp');
  return tips;
}

function enemyDetail(p, game, opp) {
  const c = champ(p.championId);
  const s = p.scores || {};
  const stats = itemStats(p.items);
  const tips = enemyTips(stats, game);
  const me = game.me;
  const vs = (label, a, b) => el('div', { class: 'duel-row' }, el('span', { class: 'duel-label' }, label), versusBar(a, b, { fmt: (v) => (v >= 1000 ? fmtGold(v) : String(v)) }));
  return el('div', { class: 'enemy-detail' },
    el('div', { class: 'card enemy-head' }, champIcon(p.championId, { size: 'lg' }),
      el('div', { class: 'enemy-title' }, el('h2', {}, c ? c.name : p.championId),
        el('div', { class: 'muted' }, p.name || ''),
        el('div', { class: 'chips' }, p.position ? el('span', { class: 'role-badge' }, roleIcon(p.position), t(`role.${p.position}`)) : null,
          opp && opp.name === p.name ? el('span', { class: 'chip minus' }, t('draft.laneOpponent')) : null,
          rankBadge(p.rank), p.dead ? el('span', { class: 'chip minus' }, t('live.respawn', { n: p.respawn })) : null)),
      el('div', { class: 'enemy-loadout' }, (p.spells || []).map((id) => summonerIcon(id)), p.keystone ? runeIcon(p.keystone) : null),
      el('button', { class: 'btn small', onClick: () => openPlayer(p, { ally: false }) }, t('live.openProfile'))),
    el('div', { class: 'stat-tiles' },
      statTile('KDA', kdaText(s.kills || 0, s.deaths || 0, s.assists || 0), { sub: kdaRatio(s.kills || 0, s.deaths || 0, s.assists || 0) }),
      statTile('CS', String(s.creepScore || 0), { sub: t('live.perMin', { n: csPerMin(p, game) }) }),
      statTile(t('live.level'), String(p.level)),
      statTile(t('live.itemGold'), String(p.itemGold), { tone: p.itemGold > me.itemGold ? 'minus' : 'plus' }),
      statTile(t('live.vision'), String(Math.round(s.wardScore || 0)))),
    el('div', { class: 'enemy-grid' },
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.theirItems')), itemList(p.items)),
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.theirStats')),
        el('div', { class: 'chips' }, STAT_ROWS.filter(([k]) => stats[k]).map(([k, label]) => el('span', { class: 'chip' }, `${label.startsWith('stat.') ? t(label) : label} +${Math.round(stats[k])}`))),
        tips.length ? el('ul', { class: 'tips enemy-tips' }, tips.map((k) => el('li', {}, t(k)))) : el('p', { class: 'muted small' }, t('enemy.noTips'))),
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.youVsThem')),
        vs(t('live.itemGoldShort'), me.itemGold, p.itemGold), vs('CS', me.scores.creepScore || 0, s.creepScore || 0),
        vs(t('live.level'), me.level, p.level), vs(t('live.kills'), me.scores.kills || 0, s.kills || 0))));
}

function enemiesTab(game, data) {
  const focus = game.enemies.find((e) => e.name === ui.focus) || data.opp || game.enemies[0];
  return el('div', { class: 'tab-body' },
    el('div', { class: 'enemy-picker' }, game.enemies.map((e) => el('button', {
      class: `enemy-pick ${e === focus ? 'active' : ''} ${e.dead ? 'dead' : ''}`, onClick: () => { ui.focus = e.name; repaint(); },
    }, champIcon(e.championId, { size: 'sm' }), el('span', {}, e.position ? roleIcon(e.position) : null, champ(e.championId) ? champ(e.championId).name : ''),
      el('span', { class: 'muted small' }, fmtGold(e.itemGold))))),
    focus ? enemyDetail(focus, game, data.opp) : null);
}

// ---- Teams ------------------------------------------------------------------------------

const SORTS = {
  role: (a, b) => ROLES.indexOf(a.position) - ROLES.indexOf(b.position),
  gold: (a, b) => b.itemGold - a.itemGold,
  kda: (a, b) => (b.scores.kills + b.scores.assists) / Math.max(1, b.scores.deaths) - (a.scores.kills + a.scores.assists) / Math.max(1, a.scores.deaths),
  cs: (a, b) => (b.scores.creepScore || 0) - (a.scores.creepScore || 0),
};

function teamTable(list, game, { ally, opp, maxGold }) {
  const kills = teamSum(list, (p) => p.scores.kills);
  const deaths = teamSum(list, (p) => p.scores.deaths);
  const assists = teamSum(list, (p) => p.scores.assists);
  return el('section', { class: `card team-card ${ally ? 'ally' : 'enemy'}` },
    el('div', { class: 'team-head' }, el('h2', { class: ally ? 'ally-title' : 'enemy-title' }, t(ally ? 'draft.allies' : 'draft.enemies')),
      el('span', { class: 'muted' }, kdaText(kills, deaths, assists)), el('span', { class: 'gold-text' }, fmtGold(teamSum(list, (p) => p.itemGold))),
      el('span', { class: 'muted' }, `${teamSum(list, (p) => p.scores.creepScore)} CS`)),
    el('div', { class: 'ptable' },
      el('div', { class: 'prow phead' }, el('span', {}), el('span', {}, t('live.colPlayer')), el('span', {}, t('live.colRank')), el('span', {}, 'KDA'),
        el('span', {}, 'CS'), el('span', {}, t('live.itemGoldShort')), el('span', {}, t('live.colVision')), el('span', {}, t('live.colItems'))),
      list.slice().sort(SORTS[ui.sort]).map((p) => {
        const s = p.scores;
        const c = champ(p.championId);
        return el('button', { class: `prow ${p.name === game.me.name ? 'me' : ''} ${opp && p.name === opp.name ? 'opponent' : ''} ${p.dead ? 'dead' : ''}`, onClick: () => openPlayer(p, { ally }) },
          el('span', { class: 'role-badge' }, p.position ? roleIcon(p.position) : null),
          el('span', { class: 'pcell-player' }, el('span', { class: 'plevel-wrap' }, champIcon(p.championId, { size: 'sm' }), el('span', { class: 'plevel' }, String(p.level))),
            el('span', { class: 'pname' }, el('strong', {}, c ? c.name : p.championId), el('span', { class: 'muted' }, p.dead ? t('live.respawn', { n: p.respawn }) : p.name || ''))),
          el('span', {}, rankBadge(p.rank, { compact: true }) || el('span', { class: 'muted' }, '—')),
          el('span', { class: 'live-kda' }, kdaText(s.kills || 0, s.deaths || 0, s.assists || 0)),
          el('span', {}, String(s.creepScore || 0), el('span', { class: 'muted small' }, ` ${csPerMin(p, game)}`)),
          el('span', { class: 'pgold' }, el('span', { class: 'gold-text' }, fmtGold(p.itemGold)), el('i', { style: `width:${(p.itemGold / maxGold) * 100}%;background:${ally ? COLORS.ally : COLORS.enemy}` })),
          el('span', {}, String(Math.round(s.wardScore || 0))),
          el('span', { class: 'pitems' }, bought(p.items).map((id) => itemIcon(id, { size: 'xs' }))));
      })));
}

function teamsTab(game, data) {
  const maxGold = Math.max(1, ...[...game.allies, ...game.enemies].map((p) => p.itemGold));
  return el('div', { class: 'tab-body' },
    el('div', { class: 'tab-tools' }, el('span', { class: 'muted small' }, t('live.sortBy')),
      el('div', { class: 'tabs' }, Object.keys(SORTS).map((k) => el('button', { class: `tab ${ui.sort === k ? 'active' : ''}`, onClick: () => { ui.sort = k; repaint(); } }, t(`live.sort.${k}`)))),
      el('span', { class: 'muted small' }, t('live.clickPlayer'))),
    teamTable(game.enemies, game, { ally: false, opp: data.opp, maxGold }),
    teamTable(game.allies, game, { ally: true, opp: data.opp, maxGold }));
}

// ---- Charts -----------------------------------------------------------------------------

function feedRow(e) {
  const icon = (id) => (id ? champIcon(id, { size: 'xs' }) : el('span', { class: 'feed-blank' }));
  const what = e.type === 'kills' ? [icon(e.killer), el('span', { class: 'feed-arrow' }, '→'), icon(e.victim)]
    : [icon(e.killer), el('span', {}, e.type === 'dragons' ? t(`dragon.${e.dragon}`) : t(`obj.${e.type}`)), e.stolen ? el('span', { class: 'chip minus' }, t('live.stolen')) : null];
  return el('div', { class: `feed-row ${e.team || ''}` }, el('span', { class: 'muted feed-time' }, fmtMinutes(e.t)), ...what);
}

function chartsTab(game) {
  const tl = game.timeline || [];
  const markers = (game.feed || []).filter((e) => ['dragons', 'barons', 'heralds', 'atakhan', 'inhibs'].includes(e.type))
    .map((e) => ({ x: e.t, color: e.team === 'enemy' ? COLORS.enemy : COLORS.ally, label: `${fmtMinutes(e.t)} ${e.type === 'dragons' ? t(`dragon.${e.dragon}`) : t(`obj.${e.type}`)} · ${t(e.team === 'enemy' ? 'draft.enemies' : 'draft.allies')}` }));
  const empty = t('live.chartWait');
  const players = [...game.allies.map((p) => ({ p, ally: true })), ...game.enemies.map((p) => ({ p, ally: false }))].sort((a, b) => b.p.itemGold - a.p.itemGold);
  return el('div', { class: 'tab-body' },
    el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.chartLead')),
      lineChart([{ label: t('live.goldLeadAxis'), color: COLORS.ally, points: tl.map((x) => [x.t, x.ally - x.enemy]) }],
        { diverging: { pos: COLORS.ally, neg: COLORS.enemy }, xFmt: fmtMinutes, yFmt: (v) => `${v > 0 ? '+' : ''}${fmtGold(v)}`, markers, height: 200, empty }),
      el('p', { class: 'muted small' }, t('live.chartLeadHint'))),
    el('div', { class: 'chart-grid' },
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.chartTeamGold')),
        lineChart([
          { label: t('draft.allies'), color: COLORS.ally, points: tl.map((x) => [x.t, x.ally]) },
          { label: t('draft.enemies'), color: COLORS.enemy, points: tl.map((x) => [x.t, x.enemy]) },
        ], { xFmt: fmtMinutes, yFmt: fmtGold, yMin: 0, empty })),
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.chartKills')),
        lineChart([
          { label: t('draft.allies'), color: COLORS.ally, step: true, points: tl.map((x) => [x.t, x.allyKills]) },
          { label: t('draft.enemies'), color: COLORS.enemy, step: true, points: tl.map((x) => [x.t, x.enemyKills]) },
        ], { xFmt: fmtMinutes, yMin: 0, empty }))),
    el('div', { class: 'chart-grid' },
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.chartPlayers')),
        barList(players.map(({ p, ally }) => ({
          label: el('span', { class: 'bar-champ' }, champIcon(p.championId, { size: 'xs' }), champ(p.championId) ? champ(p.championId).name : ''),
          value: p.itemGold, color: ally ? COLORS.ally : COLORS.enemy, text: fmtGold(p.itemGold),
        }))),
        el('div', { class: 'chart-legend' }, el('span', {}, el('i', { style: `background:${COLORS.ally}` }), t('draft.allies')), el('span', {}, el('i', { style: `background:${COLORS.enemy}` }), t('draft.enemies')))),
      el('div', { class: 'card' }, el('div', { class: 'card-kicker' }, t('live.feed')),
        (game.feed || []).length ? el('div', { class: 'feed' }, game.feed.slice(0, 25).map(feedRow)) : el('p', { class: 'muted small' }, t('live.feedEmpty')))));
}

// ---- View -------------------------------------------------------------------------------

let current = null;
let repaint = () => {};

function paint(container) {
  const { game, data } = current;
  const me = champ(game.me.championId);
  const body = { now: nowTab, enemies: enemiesTab, teams: teamsTab, charts: chartsTab, runes: () => el('div', { class: 'tab-body' },
    loadoutPanels(data.build, { inChampSelect: false, current: { runes: game.me.runes, spells: game.me.spells }, parts: ['runes', 'spells'] })) }[ui.tab](game, data);
  container.replaceChildren(
    game.demo ? el('div', { class: 'demo-banner' }, el('strong', {}, t('demo.banner')), el('span', { class: 'muted small' }, t('demo.bannerHint')),
      el('div', { class: 'spacer' }), el('button', { class: 'btn small', onClick: () => setDemo(false) }, t('demo.stop'))) : null,
    el('div', { class: 'live-head' }, champIcon(game.me.championId, { size: 'sm' }),
      el('div', { class: 'live-head-text' }, el('strong', {}, me ? me.name : game.me.championId),
        el('span', { class: 'role-badge' }, roleIcon(data.role), t(`role.${data.role}`), ' · ', t('live.level'), ` ${game.me.level}`)),
      recordChip(state.history, game.me.championId, data.opp ? data.opp.championId : null),
      el('div', { class: 'spacer' }), el('span', { class: 'gold-text live-gold' }, t('common.gold', { n: game.me.gold }))),
    scoreboard(game),
    el('nav', { class: 'segmented' }, TABS.map((k) => el('button', { class: `seg ${ui.tab === k ? 'active' : ''}`, onClick: () => { ui.tab = k; repaint(); } }, t(`live.tab.${k}`)))),
    body);
}

// ---- Loading screen ---------------------------------------------------------------------

// The roster as both teams seen from the player, or as blue and red side when the player is
// not in it (no account known yet).
function rosterSides(roster) {
  const mine = roster.find((p) => state.profile && p.puuid === state.profile.puuid);
  const team = (side) => roster.filter((p) => p.team === side).sort((a, b) => ROLES.indexOf(a.position) - ROLES.indexOf(b.position));
  // Without the player, the sides keep the ally / enemy colours: blue and red as in the client.
  if (!mine) return { me: null, first: { players: team('ORDER'), title: t('live.blueSide'), ally: true }, second: { players: team('CHAOS'), title: t('live.redSide'), ally: false } };
  return {
    me: mine,
    first: { players: team(mine.team), title: t('draft.allies'), ally: true },
    second: { players: team(mine.team === 'ORDER' ? 'CHAOS' : 'ORDER'), title: t('draft.enemies'), ally: false },
  };
}

function rosterQuery({ me, first, second }) {
  const pick = (p) => ({ championId: p.championId, role: p.position });
  if (!me) return { me: {}, allies: [], enemies: [...first.players, ...second.players].map(pick) };
  return { me: pick(me), allies: first.players.filter((p) => p !== me).map(pick), enemies: second.players.map(pick) };
}

function rosterCard({ players, title, ally }, notes, me) {
  return el('section', { class: `card team-card ${ally ? 'ally' : 'enemy'}` },
    el('div', { class: 'team-head' }, el('h2', { class: ally ? 'ally-title' : 'enemy-title' }, title)),
    el('div', { class: 'roster-list' }, players.map((p) => {
      const c = champ(p.championId);
      return el('div', { class: `roster-row ${p === me ? 'me' : ''}` }, champIcon(p.championId, { size: 'sm' }),
        el('div', { class: 'roster-main' },
          el('div', { class: 'roster-name' }, el('strong', {}, c ? c.name : t('draft.empty')),
            p.position ? el('span', { class: 'role-badge' }, roleIcon(p.position), t(`role.${p.position}`)) : null,
            p === me ? el('span', { class: 'chip teal' }, t('draft.you')) : null,
            rankBadge(p.rank, { compact: true })),
          briefLine(notes.briefs[p.championId])));
    })));
}

function loadingState(container, sides, notes) {
  container.replaceChildren(
    el('div', { class: 'view-head' }, el('h1', {}, t('live.title')), el('span', { class: 'chip teal' }, t('live.loading')),
      el('span', { class: 'muted small' }, t('live.loadingHint'))),
    teamTipsPanel(notes) || '',
    el('div', { class: 'roster-grid' }, rosterCard(sides.first, notes, sides.me), rosterCard(sides.second, notes, sides.me)));
}

const isLoading = () => state.phase === 'InProgress' && isSupported() && !state.demo && !!(state.roster && state.roster.length);

function emptyState(container) {
  const unsupported = !isSupported() && state.phase !== 'None';
  container.replaceChildren(el('div', { class: 'view-head' }, el('h1', {}, t('live.title'))),
    el('div', { class: 'panel empty-state' }, el('p', {}, t(unsupported ? 'mode.unsupported' : 'live.noGame')),
      el('p', { class: 'muted small' }, t(unsupported ? 'mode.unsupportedHint' : 'live.noGameHint')),
      el('div', { class: 'demo-cta' }, el('button', { class: 'btn primary', onClick: () => setDemo(true) }, t('demo.start')),
        el('p', { class: 'muted small' }, t('demo.startHint')))));
}

export function renderLive(root) {
  const container = el('div', { class: 'live' });
  root.append(container);
  repaint = () => { if (current && container.isConnected) paint(container); };
  let lastKey = null;
  let lastBuildKey = null;
  const update = async () => {
    const g = state.game;
    if (!g || !g.me) {
      if (isLoading()) {
        const key = JSON.stringify(['loading', state.roster, state.profile && state.profile.puuid]);
        if (key === lastKey) return;
        lastKey = key;
        current = null;
        const sides = rosterSides(state.roster);
        const notes = await loadTeamNotes(rosterQuery(sides));
        // The game may have started (or the screen changed) while the notes were loading.
        if (lastKey === key) loadingState(container, sides, notes);
        return;
      }
      const key = `none-${isSupported()}-${state.phase}-${state.demo}`;
      if (key !== lastKey) { lastKey = key; current = null; emptyState(container); }
      return;
    }
    const key = JSON.stringify([g.me.items, g.me.level, g.me.gold, g.me.abilities, [...g.enemies, ...g.allies].map((e) => [e.items, e.level, e.scores, e.dead, e.respawn, e.position, e.rank]),
      // The charts redraw less often, so hovering them is not interrupted every poll.
      g.objectives, (g.timeline || []).length, Math.floor(g.gameTime / (ui.tab === 'charts' ? 20 : 1))]);
    if (key === lastKey) return;
    lastKey = key;
    // The build only depends on items, gold (by 100), levels and scores.
    const buildKey = JSON.stringify([g.me.items, g.me.level, Math.floor(g.me.gold / 100), g.enemies.map((e) => [e.items, e.scores, e.position])]);
    let data = current && current.data;
    if (buildKey !== lastBuildKey || !data) {
      lastBuildKey = buildKey;
      data = await buildForGame(g);
    }
    current = { game: g, data };
    repaint();
  };
  const unsub = subscribe((what) => { if (!container.isConnected) { unsub(); return; } if (['game', 'mode', 'phase', 'roster', 'profile'].includes(what)) update(); });
  update();
}
