// Every enemy: a picker row and the chosen one in detail (the lane opponent by default).
import type { RuneGuide } from '../../../core/engine/runes.ts';
import type { PlayingGame } from '../../../core/live/types.ts';
import { fmtGold } from '../../../shared/lib/format.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, useGameData } from '../../database/index.ts';
import type { GameBuild } from '../gameModel.ts';
import { EnemyDetail } from './EnemyDetail.tsx';

interface Props { game: PlayingGame; data: GameBuild & { guide: RuneGuide }; focus: string | null; onFocus: (name: string) => void }

export function EnemiesTab({ game, data: model, focus: focusName, onFocus }: Props) {
  const data = useGameData();
  const focus = game.enemies.find((e) => e.name === focusName) || model.opp || game.enemies[0];
  return (
    <div className="tab-body">
      <div className="enemy-picker">
        {game.enemies.map((e) => (
          <button key={e.name} className={`enemy-pick ${e === focus ? 'active' : ''} ${e.dead ? 'dead' : ''}`} onClick={() => onFocus(e.name)}>
            <ChampIcon id={e.championId} size="sm" />
            <span>{e.position ? <RoleIcon role={e.position} /> : null}{data.champ(e.championId) ? data.champName(e.championId) : ''}</span>
            <span className="muted small">{fmtGold(e.itemGold)}</span>
          </button>
        ))}
      </div>
      {focus ? <EnemyDetail player={focus} game={game} opp={model.opp} keystone={model.guide.enemies.find((e) => e.championId === focus.championId)} /> : null}
    </div>
  );
}
