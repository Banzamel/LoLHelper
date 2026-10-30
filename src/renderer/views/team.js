// Champion briefs and "Playing with your team" (engine/team.js), shared by the Draft view
// and the loading screen of the Match view.
import { t } from '../js/i18n.js';
import { champ } from '../js/store.js';
import { el, champIcon, roleIcon } from '../js/ui.js';

let lastQuery = '';
let lastNotes = null;

// { briefs, allyTips } for the players; the promise is cached, so overlapping redraws share one request.
export function loadTeamNotes(query) {
  const key = JSON.stringify(query);
  if (key !== lastQuery) { lastQuery = key; lastNotes = window.api.team(query); }
  return lastNotes;
}

// The class line and the standout traits; compact (team slots) shows the class line only,
// with the traits in its title.
export function briefLine(brief, { compact = false } = {}) {
  if (!brief) return null;
  const text = t(brief.key);
  const traits = brief.traits.map((k) => t(k)).join(' · ');
  return el('div', { class: `brief ${compact ? 'compact' : ''}`, title: compact ? [text, traits].filter(Boolean).join('\n') : null },
    el('span', { class: 'brief-class' }, text),
    !compact && traits ? el('span', { class: 'brief-traits' }, traits) : null);
}

function allyTipRow(a) {
  const c = champ(a.championId);
  return el('div', { class: 'ally-tip' }, champIcon(a.championId, { size: 'sm' }),
    el('div', { class: 'ally-tip-main' },
      el('div', { class: 'ally-tip-name' }, el('strong', {}, c ? c.name : a.championId),
        a.role ? el('span', { class: 'role-badge' }, roleIcon(a.role), t(`role.${a.role}`)) : null),
      el('ul', { class: 'tips' }, a.tips.map((tip) => el('li', {}, t(tip.key, tip.params))))));
}

// How the player plays with each ally; null when no rule applies to anyone.
export function teamTipsPanel(notes) {
  if (!notes || !notes.allyTips.length) return null;
  return el('section', { class: 'panel team-tips' },
    el('div', { class: 'panel-title' }, el('h2', {}, t('team.title')), el('span', { class: 'muted small' }, t('team.hint'))),
    el('div', { class: 'ally-tips' }, notes.allyTips.map(allyTipRow)));
}
