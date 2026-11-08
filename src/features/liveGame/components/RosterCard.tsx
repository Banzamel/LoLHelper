// One team on the loading screen: roles, ranks, champion briefs and, for enemies, the keystone
// to watch out for.
import type { RuneGuide } from '../../../core/engine/runes.ts';
import type { TeamNotes } from '../../../core/engine/team/teamNotes.ts';
import type { RosterEntry } from '../../../core/lcu/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import { WatchLine } from '../../builds/index.ts';
import { BriefLine } from '../../champSelect/index.ts';
import { ChampIcon, useGameData } from '../../database/index.ts';

export interface RosterSide { players: RosterEntry[]; title: string; ally: boolean }

export function RosterCard({ side, notes, me, guide }: { side: RosterSide; notes: TeamNotes; me: RosterEntry | null; guide: RuneGuide }) {
  const t = useT();
  const data = useGameData();
  return (
    <section className={`card team-card ${side.ally ? 'ally' : 'enemy'}`}>
      <div className="team-head"><h2 className={side.ally ? 'ally-title' : 'enemy-title'}>{side.title}</h2></div>
      <div className="roster-list">
        {side.players.map((p, i) => (
          <div key={p.puuid || i} className={`roster-row ${p === me ? 'me' : ''}`}>
            <ChampIcon id={p.championId} size="sm" />
            <div className="roster-main">
              <div className="roster-name">
                <strong>{data.champ(p.championId) ? data.champName(p.championId) : t('draft.empty')}</strong>
                {p.position ? <span className="role-badge"><RoleIcon role={p.position} />{t(`role.${p.position}`)}</span> : null}
                {p === me ? <span className="chip teal">{t('draft.you')}</span> : null}
                <RankBadge rank={p.rank} compact />
              </div>
              <BriefLine brief={p.championId ? notes.briefs[p.championId] : null} />
              {side.ally ? null : <WatchLine entry={guide.enemies.find((e) => e.championId === p.championId)} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
