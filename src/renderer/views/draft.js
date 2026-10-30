// Draft view: both teams (live from champion select or set manually), the lane opponent
// and counter-pick recommendations for the player's role; once the player has a champion,
// the runes, spells and starting items for it (compared with what is set in the client), with
// how to use the keystone and what to watch out for in the lane opponent's typical keystone.
// Every picked champion carries a short brief, allies get tips on how to play with them, and
// from three picks on a team plan says what the composition wants to do.
import { t } from '../js/i18n.js';
import { state, champ, subscribe, isSupported } from '../js/store.js';
import { el, champIcon, itemIcon, roleIcon, ROLES, scoreRing, reasonChip, pickChampion } from '../js/ui.js';
import { loadoutPanels } from './loadout.js';
import { recordChip } from './history.js';
import { loadTeamNotes, briefLine, teamTipsPanel, compositionPanel } from './team.js';
import { loadRuneGuide } from './runes.js';
import { navigate } from '../js/app.js';

let lastQuery = '';
let lastResults = [];
let lastSetupQuery = '';
let lastSetup = null;

// Without assigned roles (Practice Tool, custom games) the player plays the role chosen here
// and the other champions get inferred roles.
function liveModel(d) {
  const me = d.myTeam.find((m) => m.isMe);
  const allyRole = (m) => m.role || (m.isMe ? state.manual.myRole : d.allyRoles[m.cellId]);
  return {
    live: true,
    allies: d.myTeam.map((m) => ({ ...m, championId: m.championId || m.hoverId, hovering: !m.championId && !!m.hoverId, role: allyRole(m) })),
    enemies: d.theirTeam.map((m) => ({ ...m, role: d.enemyRoles[m.cellId] || null, inferred: true })),
    bans: d.bans,
    myRole: (me && me.role) || state.manual.myRole,
    roleFixed: !!(me && me.role),
  };
}

async function manualModel() {
  const m = state.manual;
  const picks = m.theirTeam.map((id, i) => ({ cellId: i, championId: id, role: null }));
  const roles = picks.some((p) => p.championId) ? await window.api.inferRoles(picks) : {};
  return {
    live: false,
    allies: m.myTeam.map((id, i) => ({ cellId: i, championId: id, role: ROLES[i], isMe: ROLES[i] === m.myRole })),
    enemies: m.theirTeam.map((id, i) => ({ cellId: i, championId: id, role: roles[i] || null, inferred: true })),
    bans: [],
    myRole: m.myRole,
    roleFixed: false,
  };
}

function opponentOf(model) {
  const override = state.manual.opponent;
  if (override && model.enemies.some((e) => e.championId === override)) return override;
  const e = model.enemies.find((x) => x.championId && x.role === model.myRole);
  if (!e) return null;
  // While enemies are still picking, an off-role guess (Teemo jungle) is not shown as the opponent.
  const rates = champ(e.championId) && champ(e.championId).positionRates;
  const complete = model.enemies.filter((x) => x.championId).length === 5;
  return complete || !rates || rates[model.myRole] > 0 ? e.championId : null;
}

function slot(member, { enemy, opponent, brief, onClick, onOpponent }) {
  const c = champ(member.championId);
  const isOpp = enemy && member.championId && member.championId === opponent;
  const vsBtn = enemy && c && !isOpp ? el('button', {
    class: 'btn small ghost vs-btn', title: t('draft.setOpponent'),
    onClick: (e) => { e.stopPropagation(); onOpponent(); },
  }, 'VS') : null;
  return el('div', { class: `slot ${member.isMe ? 'me' : ''} ${isOpp ? 'opponent' : ''} ${member.hovering ? 'hovering' : ''} ${onClick ? 'clickable' : ''}`, onClick },
    champIcon(member.championId, { size: '' }),
    el('div', { class: 'slot-info' },
      el('div', { class: 'slot-name' }, c ? c.name : t('draft.empty')),
      el('div', { class: 'role-badge', title: member.inferred ? t('draft.roleInferred') : null }, member.role ? roleIcon(member.role) : null,
        member.role ? t(`role.${member.role}`) : '', member.inferred && member.role ? '*' : ''),
      briefLine(brief, { compact: true })),
    member.isMe ? el('span', { class: 'chip teal' }, t('draft.you')) : null,
    isOpp ? el('span', { class: 'chip minus' }, 'VS') : vsBtn);
}

function recCard(r, model, opponent) {
  const c = champ(r.id);
  const shown = r.reasons.slice(0, 4);
  return el('div', { class: 'rec-card' },
    champIcon(r.id, { size: 'lg', onClick: () => navigate('champion', { id: r.id }) }),
    el('div', { class: 'rec-main' },
      el('div', { class: 'rec-title' }, el('h3', {}, c.name), el('span', { class: `chip ${c.damageType === 'AP' ? 'ap' : 'ad'}` }, c.damageType),
        el('span', { class: 'muted rec-sub' }, c.title)),
      el('div', { class: 'chips' }, shown.map(reasonChip)),
      r.reasons.length > shown.length ? el('div', { class: 'muted rec-more', title: r.reasons.slice(4).map((x) => t(x.key, x.params)).join('\n') }, `+${r.reasons.length - shown.length}…`) : null),
    el('div', { class: 'rec-side' }, scoreRing(r.score),
      el('button', { class: 'btn small', onClick: () => { state.buildTarget = { championId: r.id, enemyId: opponent, role: model.myRole, enemyIds: model.enemies.map((e) => e.championId).filter(Boolean) }; navigate('build'); } }, t('draft.showBuild'))));
}

async function loadRecommendations(model, opponent) {
  const picked = [...model.allies, ...model.enemies].map((m) => m.championId).filter(Boolean);
  const query = {
    role: model.myRole,
    enemyId: opponent,
    allyIds: model.allies.filter((a) => !a.isMe && a.championId && !a.hovering).map((a) => a.championId),
    enemyIds: model.enemies.map((e) => e.championId).filter(Boolean),
    excludeIds: [...picked.filter((id) => !model.allies.some((a) => a.isMe && a.championId === id)), ...model.bans],
    useClient: model.live,
    limit: 12,
  };
  const key = JSON.stringify(query);
  if (key !== lastQuery) { lastQuery = key; lastResults = await window.api.counters(query); }
  return lastResults;
}

function teamQuery(model) {
  const me = model.allies.find((a) => a.isMe);
  const pick = (m) => ({ championId: m.championId || null, role: m.role || null });
  return {
    me: { championId: me ? me.championId || null : null, role: model.myRole },
    allies: model.allies.filter((a) => !a.isMe).map(pick),
    enemies: model.enemies.map(pick),
  };
}

async function loadSetup(model, opponent, championId) {
  const query = { championId, enemyId: opponent, role: model.myRole, enemyIds: model.enemies.map((e) => e.championId).filter(Boolean) };
  const key = JSON.stringify(query);
  // Cache the promise, so overlapping redraws share one request.
  if (key !== lastSetupQuery) { lastSetupQuery = key; lastSetup = window.api.build(query); }
  return lastSetup;
}

// The tip for the recommended keystone and the lane opponent's typical keystone (no enemy runes in Draft).
function loadDraftGuide(build, model, opponent) {
  return loadRuneGuide({
    keystones: build.runes ? [build.runes.selectedPerkIds[0]] : [],
    enemies: opponent ? [{ championId: opponent, role: model.myRole }] : [],
  });
}

function setupSection(build, model, me, guide) {
  const current = model.live && state.draft ? { runes: state.draft.myRunes, spells: me.spells } : null;
  return el('section', { class: 'panel gold draft-setup' },
    el('div', { class: 'panel-title' }, champIcon(build.championId, { size: 'sm' }), el('h2', {}, t('draft.setup')),
      recordChip(state.history, build.championId, build.enemyId), el('div', { class: 'spacer' }),
      el('span', { class: 'muted' }, t('build.start')),
      el('div', { class: 'build-strip' }, build.starters.map((s) => itemIcon(s.id, { size: 'sm', count: s.count })))),
    el('p', { class: 'muted small' }, t('draft.setupHint', { champion: champ(build.championId).name })),
    loadoutPanels(build, { current, parts: ['runes', 'spells'], guide }));
}

export function renderDraft(root) {
  const container = el('div', { class: 'draft' });
  root.append(container);
  let busy = false;
  const draw = async () => {
    if (busy) return;
    busy = true;
    try { await drawInto(container); } finally { busy = false; }
  };
  const unsub = subscribe((what) => { if (!container.isConnected) { unsub(); return; } if (what === 'draft' || what === 'lcu' || what === 'mode') draw(); });
  draw();
}

async function drawInto(container) {
  const model = state.draft ? liveModel(state.draft) : await manualModel();
  const opponent = opponentOf(model);
  const recs = await loadRecommendations(model, opponent);
  const notes = await loadTeamNotes(teamQuery(model));
  const redraw = () => drawInto(container);

  const setAlly = async (i) => {
    if (model.live) return;
    const id = await pickChampion({ role: ROLES[i] });
    if (id === null) return;
    state.manual.myTeam[i] = id || null;
    redraw();
  };
  const setOpponent = (member) => { state.manual.opponent = member.championId; redraw(); };
  const setEnemy = async (i) => {
    const id = await pickChampion({ exclude: state.manual.theirTeam.filter(Boolean) });
    if (id === null) return;
    state.manual.theirTeam[i] = id || null;
    if (id) state.manual.opponent = null;
    redraw();
  };

  const head = el('div', { class: 'view-head' },
    el('h1', {}, t('draft.title')),
    el('span', { class: `chip ${model.live ? 'teal' : ''}` }, t(model.live ? 'draft.live' : 'draft.manual')),
    el('div', { class: 'spacer' }),
    el('span', { class: 'muted' }, t('draft.myRole')),
    el('div', { class: 'tabs' }, ROLES.map((r) => el('button', {
      class: `tab ${model.myRole === r ? 'active' : ''}`, disabled: model.roleFixed && model.myRole !== r ? true : null, title: t(`role.${r}`),
      onClick: () => { state.manual.myRole = r; state.manual.opponent = null; window.api.setMyRole(r); redraw(); },
    }, roleIcon(r), t(`role.${r}`)))),
    !model.live ? el('button', { class: 'btn small ghost', onClick: () => { Object.assign(state.manual, { myTeam: Array(5).fill(null), theirTeam: Array(5).fill(null), opponent: null }); redraw(); } }, t('draft.reset')) : null);

  const bans = model.bans.length ? el('div', { class: 'bans' }, el('span', { class: 'muted' }, t('draft.bans')), model.bans.map((id) => champIcon(id, { size: 'xs', banned: true }))) : null;
  const unsupported = !isSupported() && state.phase !== 'None'
    ? el('div', { class: 'panel mode-notice' }, el('strong', {}, t('mode.unsupported')), el('span', { class: 'muted' }, t('mode.unsupportedHint'))) : null;
  const hint = !model.live ? el('p', { class: 'muted draft-hint' }, t('draft.manualHint')) : null;

  const opp = champ(opponent);
  const center = el('section', { class: 'panel gold recs' },
    el('div', { class: 'panel-title' },
      el('h2', {}, t(opponent ? 'draft.recommendations' : 'draft.blindPicks')), el('div', { class: 'spacer' }),
      el('span', { class: 'muted' }, t('draft.laneOpponent')),
      opp ? champIcon(opponent, { size: 'sm' }) : null,
      el('strong', { class: opp ? 'opp-name' : 'muted' }, opp ? opp.name : t('draft.noOpponent'))),
    recs.length ? el('div', { class: 'rec-list' }, recs.map((r) => recCard(r, model, opponent))) : el('p', { class: 'muted' }, t('draft.noResults')));

  const allies = el('section', { class: 'panel team allies' }, el('h2', {}, t('draft.allies')),
    model.allies.map((m, i) => slot(m, { enemy: false, brief: notes.briefs[m.championId], onClick: model.live ? null : () => setAlly(i) })));
  const enemies = el('section', { class: 'panel team enemies' }, el('h2', {}, t('draft.enemies')),
    model.enemies.map((m, i) => slot(m, { enemy: true, opponent, brief: notes.briefs[m.championId], onClick: model.live ? null : () => setEnemy(i), onOpponent: () => setOpponent(m) })));

  const me = model.allies.find((a) => a.isMe);
  const myChamp = me && champ(me.championId) ? me.championId : null;
  const build = myChamp ? await loadSetup(model, opponent, myChamp) : null;
  const setup = build ? setupSection(build, model, me, await loadDraftGuide(build, model, opponent)) : null;
  const grid = el('div', { class: 'draft-grid' }, allies, center, enemies);
  // Runes and spells go first, so they are visible without scrolling; the team plan and the ally
  // tips are short and only appear once enough champions are picked or some rule applies, so
  // they sit above the teams.
  container.replaceChildren(head, unsupported || '', setup || '', hint || '', bans || '', compositionPanel(notes) || '', teamTipsPanel(notes) || '', grid);
}
