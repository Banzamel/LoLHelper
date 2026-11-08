// Me against the lane opponent: gold in items, CS, level and kills side by side; opens the
// opponent in the Enemies tab.
import type { LivePlayer, PlayingGame } from '../../../core/live/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import { ChampIcon, useGameData } from '../../database/index.ts';
import { DuelRow } from './DuelRow.tsx';

export function DuelCard({ game, opp, onOpen }: { game: PlayingGame; opp: LivePlayer | null; onOpen: () => void }) {
  const t = useT();
  const data = useGameData();
  if (!opp) return null;
  const me = game.me;
  return (
    <button className="card duel" onClick={onOpen}>
      <div className="card-kicker">{t('live.laneDuel')}</div>
      <div className="duel-head">
        <ChampIcon id={me.championId} size="sm" /><span className="vs">vs</span><ChampIcon id={opp.championId} size="sm" />
        <strong className="opp-name">{data.champ(opp.championId) ? data.champName(opp.championId) : ''}</strong>
        <RankBadge rank={opp.rank} compact />
      </div>
      <DuelRow label={t('live.itemGoldShort')} a={me.itemGold} b={opp.itemGold} />
      <DuelRow label="CS" a={me.scores.creepScore || 0} b={opp.scores.creepScore || 0} />
      <DuelRow label={t('live.level')} a={me.level} b={opp.level} />
      <DuelRow label={t('live.kills')} a={me.scores.kills || 0} b={opp.scores.kills || 0} />
    </button>
  );
}
