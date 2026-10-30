// Rune guide (engine/runes.js): the tip for the shown keystone and the enemies' keystones with
// what to watch out for, shared by the rune panel, the Enemies tab and the loading screen.
import { t } from '../js/i18n.js';
import { champ, rune } from '../js/store.js';
import { el, champIcon, runeIcon } from '../js/ui.js';

let lastQuery = '';
let lastGuide = null;

// { tips, enemies } for the query; the promise is cached, so overlapping redraws share one request.
export function loadRuneGuide(query) {
  const key = JSON.stringify(query);
  if (key !== lastQuery) { lastQuery = key; lastGuide = window.api.runes(query); }
  return lastGuide;
}

// How to use the keystone; null without a curated tip.
export function keystoneTip(tip) {
  if (!tip) return null;
  return el('p', { class: 'rune-tip' }, el('span', { class: 'rune-tip-label' }, t('rune.howTo')), t(tip.use));
}

// One enemy's keystone and what to watch out for; predicted keystones are marked as typical.
export function watchLine(entry, { withChampion = false } = {}) {
  if (!entry || !entry.keystone) return null;
  const c = champ(entry.championId);
  const keystone = rune(entry.keystone);
  return el('div', { class: 'rune-watch' },
    withChampion ? champIcon(entry.championId, { size: 'xs' }) : null,
    runeIcon(entry.keystone, { size: 'sm' }),
    el('div', { class: 'rune-watch-main' },
      el('div', { class: 'rune-watch-name' },
        withChampion && c ? el('strong', {}, c.name) : null,
        el('span', {}, keystone ? keystone.name : ''),
        entry.predicted ? el('span', { class: 'chip', title: t('rune.typicalHint') }, t('rune.typical')) : null),
      entry.watch ? el('span', { class: 'rune-watch-text' }, t(entry.watch)) : null));
}

// The enemies' keystones under a "Watch out for" heading; null when none is known.
export function watchList(entries) {
  const lines = (entries || []).map((e) => watchLine(e, { withChampion: true })).filter(Boolean);
  if (!lines.length) return null;
  return el('div', { class: 'rune-watch-list' }, el('div', { class: 'card-kicker' }, t('rune.watchOut')), lines);
}
