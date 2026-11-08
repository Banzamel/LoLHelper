// The Match view's header: the simulation banner, the player's champion, role, level, record
// against the opponent and gold.
import type { PlayingGame } from '../../../core/live/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, useGameData } from '../../database/index.ts';
import { RecordChip } from '../../matchHistory/index.ts';
import type { LiveData } from '../hooks/useLiveMatch.ts';

export function LiveHead({ game, data: model, onStopDemo }: { game: PlayingGame; data: LiveData; onStopDemo: () => void }) {
  const t = useT();
  const data = useGameData();
  return (
    <>
      {game.demo ? (
        <div className="demo-banner">
          <strong>{t('demo.banner')}</strong><span className="muted small">{t('demo.bannerHint')}</span>
          <div className="spacer" /><button className="btn small" onClick={onStopDemo}>{t('demo.stop')}</button>
        </div>
      ) : null}
      <div className="live-head">
        <ChampIcon id={game.me.championId} size="sm" />
        <div className="live-head-text">
          <strong>{data.champ(game.me.championId) ? data.champName(game.me.championId) : game.me.championId}</strong>
          <span className="role-badge"><RoleIcon role={model.role} />{t(`role.${model.role}`)}{' · '}{t('live.level')}{` ${game.me.level}`}</span>
        </div>
        <RecordChip championId={game.me.championId} enemyId={model.opp ? model.opp.championId : null} />
        <div className="spacer" />
        <span className="gold-text live-gold">{t('common.gold', { n: game.me.gold })}</span>
      </div>
    </>
  );
}
