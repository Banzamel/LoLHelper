// Ability levels with the next skill-up, and a nudge when a skill point is waiting.
import type { Build } from '../../../core/engine/types.ts';
import type { PlayingGame } from '../../../core/live/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { useGameData } from '../../database/index.ts';
import { nextSkill } from '../gameModel.ts';

const KEYS = ['Q', 'W', 'E', 'R'];

export function SkillCard({ build, game }: { build: Build; game: PlayingGame }) {
  const t = useT();
  const data = useGameData();
  const next = nextSkill(build, game.me.level);
  const c = data.champ(game.me.championId);
  const levels = game.me.abilities || {};
  const pending = game.me.level - KEYS.reduce((s, k) => s + (levels[k] || 0), 0);
  return (
    <div className="card">
      <div className="card-kicker">{t('live.nextSkill')}</div>
      <div className="skill-now">
        {KEYS.map((k) => {
          const spell = c ? c.spells.find((s) => s.key === k) : null;
          return (
            <div key={k} className={`skill-now-key ${next && next.key === k ? 'next' : ''}`}>
              {spell ? <img src={data.asset(spell.icon)} alt={k} /> : null}
              <span className="skill-now-letter">{k}</span>
              <span className="skill-now-level">{String(levels[k] || 0)}</span>
            </div>
          );
        })}
      </div>
      {next ? (
        <p className="small">{pending > 0 ? <span className="chip plus">{t('live.skillPoint')}</span> : null}{' '}{t('live.nextSkillAt', { key: next.key, level: next.level })}</p>
      ) : <p className="muted small">{t('live.skillsDone')}</p>}
    </div>
  );
}
