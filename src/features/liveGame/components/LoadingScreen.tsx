// The loading screen, before the game reports any data: both teams from the client's roster
// with briefs, the team plan, the ally tips and the lane opponent's typical keystone.
import { ROLES } from '../../../core/data/types.ts';
import type { RosterEntry } from '../../../core/lcu/types.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { BuildService } from '../../builds/index.ts';
import { CompositionPanel, TeamTipsPanel } from '../../champSelect/index.ts';
import { RosterCard, type RosterSide } from './RosterCard.tsx';

const pick = (p: RosterEntry) => ({ championId: p.championId, role: p.position });

export function LoadingScreen({ roster, puuid }: { roster: RosterEntry[]; puuid: string | null }) {
  const t = useT();
  const builds = useService(BuildService);
  const me = roster.find((p) => puuid && p.puuid === puuid) || null;
  const team = (side: string) => roster.filter((p) => p.team === side).sort((a, b) => ROLES.indexOf(a.position as never) - ROLES.indexOf(b.position as never));
  // Without the player (no account known yet) the sides are blue and red, as in the client.
  const first: RosterSide = me ? { players: team(me.team), title: t('draft.allies'), ally: true } : { players: team('ORDER'), title: t('live.blueSide'), ally: true };
  const second: RosterSide = me ? { players: team(me.team === 'ORDER' ? 'CHAOS' : 'ORDER'), title: t('draft.enemies'), ally: false } : { players: team('CHAOS'), title: t('live.redSide'), ally: false };
  const notes = builds.team(me
    ? { me: pick(me), allies: first.players.filter((p) => p !== me).map(pick), enemies: second.players.map(pick) }
    : { me: {}, allies: [], enemies: [...first.players, ...second.players].map(pick) });
  const opponent = me && me.position ? second.players.find((p) => p.position === me.position) : null;
  const guide = builds.runes({ keystones: [], enemies: opponent ? [{ championId: opponent.championId, role: opponent.position }] : [] });
  return (
    <>
      <div className="view-head"><h1>{t('live.title')}</h1><span className="chip teal">{t('live.loading')}</span><span className="muted small">{t('live.loadingHint')}</span></div>
      {/* Without the player both sides count as enemies, so there is no own plan. */}
      {me ? <CompositionPanel notes={notes} /> : null}
      <TeamTipsPanel notes={notes} />
      <div className="roster-grid"><RosterCard side={first} notes={notes} me={me} guide={guide} /><RosterCard side={second} notes={notes} me={me} guide={guide} /></div>
    </>
  );
}
