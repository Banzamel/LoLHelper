// The player's account from the client (name, level, ranks) above their match history.
import { useT } from '../../../shared/i18n/useT.ts';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import type { PlayerSheetData } from '../MatchHistoryService.ts';
import { PlayerHistory } from './PlayerHistory.tsx';
import type { SheetPlayer } from './PlayerSheet.tsx';
import { ProfileIcon } from './ProfileIcon.tsx';

export function PlayerRemote({ data, player }: { data: PlayerSheetData; player: SheetPlayer }) {
  const t = useT();
  return (
    <>
      <div className="sheet-account">
        <ProfileIcon id={data.icon} size="sm" />
        <strong>{data.name ? `${data.name}#${data.tag}` : player.name || ''}</strong>
        {data.level ? <span className="muted">{t('player.accountLevel', { n: data.level })}</span> : null}
        <RankBadge rank={data.ranks.solo} />
        {data.ranks.flex && data.ranks.flex.tier ? <span className="muted small">{t('queue.flex')} <RankBadge rank={data.ranks.flex} compact /></span> : null}
      </div>
      <PlayerHistory data={data} championId={player.championId} />
    </>
  );
}
