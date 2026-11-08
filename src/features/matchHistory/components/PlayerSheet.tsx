// Player sheet: one player of a live or past match — what they have in this game and, from the
// League client, their rank, recent results, champions, roles and play style.
import type { Role } from '../../../core/data/types.ts';
import type { Rank } from '../../../core/lcu/types.ts';
import type { Scores } from '../../../core/live/types.ts';
import { isDemoPuuid } from '../../../core/demo/players.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useAsync } from '../../../shared/hooks/useAsync.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import { ClientService } from '../../client/index.ts';
import { ChampIcon, RuneIcon, SummonerIcon, useGameData } from '../../database/index.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';
import { PlayerRemote } from './PlayerRemote.tsx';
import { PlayerThisGame } from './PlayerThisGame.tsx';

export interface SheetPlayer {
  puuid: string | null;
  name: string;
  championId: string | null;
  position?: Role | null;
  rank?: Rank | null;
  level?: number;
  items?: number[];
  scores?: Scores;
  spells?: (number | null)[];
  keystone?: number | null;
  itemGold?: number;
}

export function PlayerSheet({ player: p, ally }: { player: SheetPlayer; ally: boolean | null }) {
  const t = useT();
  const data = useGameData();
  const history = useService(MatchHistoryService);
  const connected = useStore(useService(ClientService).store).lcu.connected;
  const reachable = !!p.puuid && (connected || isDemoPuuid(p.puuid));
  const remote = useAsync(() => (reachable && p.puuid ? history.player(p.puuid) : Promise.resolve(null)), [p.puuid, reachable]);
  const c = data.champ(p.championId);
  const status = !p.puuid ? t('player.noPuuid') : !reachable ? t('player.offline') : remote.error ? t('player.failed') : null;
  return (
    <div className="sheet">
      <div className="sheet-head">
        <ChampIcon id={p.championId} size="lg" />
        <div className="sheet-title">
          <h2>{c ? c.name : p.championId || '?'}</h2>
          <div className="muted">{p.name || t('player.hiddenName')}</div>
          <div className="chips">
            {p.position ? <span className="role-badge"><RoleIcon role={p.position} />{t(`role.${p.position}`)}</span> : null}
            {ally === null ? null : <span className={`chip ${ally ? 'teal' : 'minus'}`}>{t(ally ? 'player.ally' : 'player.enemy')}</span>}
            <RankBadge rank={p.rank} />
          </div>
        </div>
        <div className="sheet-loadout">{(p.spells || []).filter(Boolean).map((id, i) => <SummonerIcon key={i} id={id} />)}{p.keystone ? <RuneIcon id={p.keystone} /> : null}</div>
      </div>
      {p.items ? <PlayerThisGame player={p} /> : null}
      <section>
        <h3 className="sub">{t('player.history')}</h3>
        <div className="sheet-remote">
          {status ? <p className="muted">{status}</p> : remote.value ? <PlayerRemote data={remote.value} player={p} /> : <p className="muted">{t('player.loading')}</p>}
        </div>
      </section>
    </div>
  );
}
