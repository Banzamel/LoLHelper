// Skill order: the max order and the level 1–18 table; in a match the next skill-up column
// is highlighted (level: the champion's current level).
import type { Build } from '../../../core/engine/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { useGameData } from '../../database/index.ts';

export function SkillsPanel({ build, level = null }: { build: Build; level?: number | null }) {
  const t = useT();
  const data = useGameData();
  const champ = data.champ(build.championId);
  const skills = build.skills;
  const icons = Object.fromEntries((champ ? champ.spells : []).map((s) => [s.key, s]));
  const maxRow = (
    <div className="skill-max">
      {skills.max.map((k, i) => (
        <span key={k} style={{ display: 'contents' }}>
          {i ? <span className="arrow">›</span> : null}
          <div className="skill-key">{icons[k] ? <img src={data.asset(icons[k].icon)} alt={k} /> : null}<span>{k}</span></div>
        </span>
      ))}
    </div>
  );
  const levels = skills.levels;
  return (
    <section className="panel build-section">
      <h2>{t('loadout.skills')}</h2>
      {!levels ? <div>{maxRow}<p className="muted small">{t('loadout.noTable')}</p></div> : (
        <div>
          {maxRow}
          <div className="skill-grid">
            {['Q', 'W', 'E', 'R'].map((k) => (
              <div className="skill-row" key={k}>
                <span className="skill-label">{k}</span>
                {levels.map((key, i) => (
                  <span key={i} title={t('champion.level', { n: i + 1 })}
                    className={`skill-cell ${key === k ? `on ${k === 'R' ? 'ult' : ''}` : ''} ${level !== null && i < level ? 'done' : ''} ${i === level ? 'next' : ''}`}>
                    {key === k ? String(i + 1) : ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {!skills.known ? <p className="muted small">{t('loadout.heuristic')}</p> : null}
        </div>
      )}
    </section>
  );
}
