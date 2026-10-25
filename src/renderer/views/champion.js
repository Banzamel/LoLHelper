// Champion detail: profile, stats by level, abilities, tips and matchups.
import { t } from '../js/i18n.js';
import { state, champ, asset } from '../js/store.js';
import { el, champIcon, roleIcon } from '../js/ui.js';
import { navigate } from '../js/app.js';

const TRAITS = ['hardCC', 'slow', 'dash', 'heal', 'shield', 'stealth', 'untargetable', 'percentHp', 'trueDamage', 'execute', 'longRange'];

// League stat growth: base + growth * (n - 1) * (0.7025 + 0.0175 * (n - 1)).
const grow = (base, per, n) => base + per * (n - 1) * (0.7025 + 0.0175 * (n - 1));

function statRows(s, level) {
  const asGrowth = grow(0, s.attackspeedperlevel, level) / 100;
  return [
    ['stat.hp', grow(s.hp, s.hpperlevel, level).toFixed(0)],
    ['stat.mp', grow(s.mp, s.mpperlevel, level).toFixed(0)],
    ['stat.ad', grow(s.attackdamage, s.attackdamageperlevel, level).toFixed(1)],
    ['stat.as', (s.attackspeed * (1 + asGrowth)).toFixed(3)],
    ['stat.armor', grow(s.armor, s.armorperlevel, level).toFixed(1)],
    ['stat.mr', grow(s.spellblock, s.spellblockperlevel, level).toFixed(1)],
    ['stat.ms', s.movespeed],
    ['stat.range', s.attackrange],
    ['stat.hpRegen', grow(s.hpregen, s.hpregenperlevel, level).toFixed(1)],
    ['stat.mpRegen', grow(s.mpregen, s.mpregenperlevel, level).toFixed(1)],
  ];
}

function ability(key, a) {
  const meta = [];
  if (a.cooldown && a.cooldown !== '0') meta.push(`${t('champion.cooldown')}: ${a.cooldown}s`);
  if (a.cost && a.cost !== '0') meta.push(`${t('champion.cost')}: ${a.cost}`);
  if (a.range && a.range !== '25000' && a.range !== '0') meta.push(`${t('champion.range')}: ${a.range}`);
  return el('div', { class: 'ability' },
    el('div', { class: 'ability-icon' }, el('img', { src: asset(a.icon), alt: a.name }), el('span', {}, key)),
    el('div', {}, el('h3', {}, a.name), meta.length ? el('div', { class: 'muted ability-meta' }, meta.join(' · ')) : null,
      el('p', { class: 'ability-desc' }, a.description)));
}

function matchupList(title, ids) {
  return el('div', {}, el('h3', { class: 'sub' }, title),
    el('div', { class: 'matchups' }, ids.map((id) => el('button', { class: 'matchup', onClick: () => navigate('champion', { id }) },
      champIcon(id, { size: 'sm' }), el('span', {}, champ(id).name)))));
}

export async function renderChampion(root, { id }) {
  const c = champ(id);
  if (!c) return;
  let level = 1;
  const splash = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${c.id}_0.jpg`;

  const hero = el('div', { class: 'hero' },
    el('div', { class: 'hero-bg', style: `background-image:url('${splash}')` }),
    el('div', { class: 'hero-content' },
      el('button', { class: 'btn small ghost', onClick: () => navigate('champions') }, `‹ ${t('champion.back')}`),
      el('div', { class: 'hero-main' }, champIcon(c.id, { size: 'lg' }),
        el('div', {}, el('h1', {}, c.name), el('div', { class: 'hero-title' }, c.title),
          el('div', { class: 'chips' },
            c.tags.map((g) => el('span', { class: 'chip' }, t(`tag.${g}`))),
            el('span', { class: `chip ${c.damageType === 'AP' ? 'ap' : 'ad'}` }, c.damageType),
            el('span', { class: 'chip' }, t(`attack.${c.attackType}`)),
            c.positions.map((p) => el('span', { class: 'chip teal' }, roleIcon(p), t(`role.${p}`))))),
        el('div', { class: 'spacer' }),
        el('button', { class: 'btn primary', onClick: () => { state.buildTarget = { championId: c.id, enemyId: null, role: c.positions[0] }; navigate('build'); } }, t('champion.showBuild'))),
      el('p', { class: 'hero-blurb' }, c.blurb)));

  const statsBody = el('div', { class: 'stats-table' });
  const levelLabel = el('span', { class: 'gold-text' });
  const drawStats = () => {
    levelLabel.textContent = t('champion.level', { n: level });
    statsBody.replaceChildren(...statRows(c.stats, level).map(([k, v]) => el('div', { class: 'stat-row' }, el('span', { class: 'muted' }, t(k)), el('strong', {}, String(v)))));
  };
  const slider = el('input', { type: 'range', min: 1, max: 18, value: 1, class: 'level-slider', onInput: (e) => { level = Number(e.target.value); drawStats(); } });
  drawStats();

  const ratings = el('div', { class: 'ratings' }, Object.entries(c.ratings).map(([k, v]) => el('div', { class: 'rating' },
    el('span', { class: 'muted' }, t(`rating.${k}`)), el('div', { class: 'bar gold' }, el('i', { style: `width:${(v / 3) * 100}%` })))));
  const traits = el('div', { class: 'chips' }, TRAITS.filter((k) => c.traits[k] > 0).map((k) => el('span', { class: 'chip' }, `${t(`trait.${k}`)}${c.traits[k] > 1 ? ` ×${c.traits[k]}` : ''}`)));

  const abilities = el('div', { class: 'abilities' }, ability('P', c.passive), c.spells.map((s) => ability(s.key, s)));
  const tips = (title, list) => (list && list.length ? el('div', {}, el('h3', { class: 'sub' }, title), el('ul', { class: 'tips' }, list.map((x) => el('li', {}, x)))) : '');

  const matchupsBox = el('section', { class: 'panel' }, el('p', { class: 'muted' }, t('common.loading')));
  root.append(hero, el('div', { class: 'champ-layout' },
    el('div', { class: 'champ-col' },
      el('section', { class: 'panel' }, el('div', { class: 'panel-title' }, el('h2', {}, t('champion.stats')), el('div', { class: 'spacer' }), levelLabel), slider, statsBody),
      el('section', { class: 'panel' }, el('h2', {}, t('champion.ratings')), ratings, el('h3', { class: 'sub' }, t('champion.traits')), traits),
      matchupsBox),
    el('div', { class: 'champ-col wide' },
      el('section', { class: 'panel' }, el('h2', {}, t('champion.abilities')), abilities),
      el('section', { class: 'panel' }, tips(t('champion.allyTips'), c.allytips), tips(t('champion.enemyTips'), c.enemytips)))));

  const m = await window.api.matchups(c.id);
  matchupsBox.replaceChildren(matchupList(t('champion.strongAgainst'), m.strong), matchupList(t('champion.weakAgainst'), m.weak));
}
