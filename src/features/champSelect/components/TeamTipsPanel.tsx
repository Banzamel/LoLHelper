// How the player plays with each ally; nothing when no rule applies to anyone.
import type { TeamNotes } from '../../../core/engine/team/teamNotes.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, useGameData } from '../../database/index.ts';

export function TeamTipsPanel({ notes }: { notes: TeamNotes | null | undefined }) {
  const t = useT();
  const data = useGameData();
  if (!notes || !notes.allyTips.length) return null;
  return (
    <section className="panel team-tips">
      <div className="panel-title"><h2>{t('team.title')}</h2><span className="muted small">{t('team.hint')}</span></div>
      <div className="ally-tips">
        {notes.allyTips.map((a) => (
          <div className="ally-tip" key={a.championId}>
            <ChampIcon id={a.championId} size="sm" />
            <div className="ally-tip-main">
              <div className="ally-tip-name"><strong>{data.champName(a.championId)}</strong>{a.role ? <span className="role-badge"><RoleIcon role={a.role} />{t(`role.${a.role}`)}</span> : null}</div>
              <ul className="tips">{a.tips.map((tip) => <li key={tip.key}>{t(tip.key, tip.params)}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
