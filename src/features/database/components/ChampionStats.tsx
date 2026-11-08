// Champion stats at a level chosen with a slider (League's growth formula).
import { useState } from 'react';
import { useT } from '../../../shared/i18n/useT.ts';

// base + growth * (n - 1) * (0.7025 + 0.0175 * (n - 1))
const grow = (base: number, per: number, n: number) => base + per * (n - 1) * (0.7025 + 0.0175 * (n - 1));

function statRows(s: Record<string, number>, level: number): [string, string | number][] {
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

export function ChampionStats({ stats }: { stats: Record<string, number> }) {
  const t = useT();
  const [level, setLevel] = useState(1);
  return (
    <section className="panel">
      <div className="panel-title"><h2>{t('champion.stats')}</h2><div className="spacer" /><span className="gold-text">{t('champion.level', { n: level })}</span></div>
      <input type="range" min={1} max={18} value={level} className="level-slider" onChange={(e) => setLevel(Number(e.target.value))} />
      <div className="stats-table">
        {statRows(stats, level).map(([k, v]) => <div className="stat-row" key={k}><span className="muted">{t(k)}</span><strong>{String(v)}</strong></div>)}
      </div>
    </section>
  );
}
