// One player of a team in the draft: champion (or hover), role (inferred ones starred), brief,
// "you" and the lane-opponent marker; enemies can be marked as lane opponent.
import type { Brief } from '../../../core/engine/team/briefs.ts';
import { cx } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, useGameData } from '../../database/index.ts';
import type { Member } from '../draftModel.ts';
import { BriefLine } from './BriefLine.tsx';

interface Props { member: Member; enemy: boolean; opponent?: string | null; brief?: Brief | null; onClick?: () => void; onOpponent?: () => void }

export function TeamSlot({ member, enemy, opponent = null, brief, onClick, onOpponent }: Props) {
  const t = useT();
  const data = useGameData();
  const c = data.champ(member.championId);
  const isOpp = enemy && !!member.championId && member.championId === opponent;
  return (
    <div className={cx('slot', member.isMe && 'me', isOpp && 'opponent', member.hovering && 'hovering', onClick && 'clickable')} onClick={onClick}>
      <ChampIcon id={member.championId} />
      <div className="slot-info">
        <div className="slot-name">{c ? c.name : t('draft.empty')}</div>
        <div className="role-badge" title={member.inferred ? t('draft.roleInferred') : undefined}>
          {member.role ? <RoleIcon role={member.role} /> : null}{member.role ? t(`role.${member.role}`) : ''}{member.inferred && member.role ? '*' : ''}
        </div>
        <BriefLine brief={brief} compact />
      </div>
      {member.isMe ? <span className="chip teal">{t('draft.you')}</span> : null}
      {isOpp ? <span className="chip minus">VS</span> : enemy && c ? (
        <button className="btn small ghost vs-btn" title={t('draft.setOpponent')} onClick={(e) => { e.stopPropagation(); onOpponent?.(); }}>VS</button>
      ) : null}
    </div>
  );
}
