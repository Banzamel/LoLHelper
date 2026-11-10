// What to do now: next item and buy order, skills, the player's figures, the lane duel,
// situational items and the skill table.
import type { PlayingGame } from '../../../core/live/types.ts';
import { kdaRatio, kdaText } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { BuildOrder, SkillsPanel } from '../../builds/index.ts';
import { ItemIcon, useGameData } from '../../database/index.ts';
import { StatTile } from '../../matchHistory/index.ts';
import { csPerMin, needsStarters, type GameBuild } from '../gameModel.ts';
import { DuelCard } from './DuelCard.tsx';
import { NextItemCard } from './NextItemCard.tsx';
import { SkillCard } from './SkillCard.tsx';


export function NowTab({ game, data: model, onOpponent }: { game: PlayingGame; data: GameBuild; onOpponent: () => void }) {
  const t = useT();
  const data = useGameData();
  const { build, fullIds, opp } = model;
  const s = game.me.scores;
  const [k, d, a] = [s.kills || 0, s.deaths || 0, s.assists || 0];
  return (
    <div className="tab-body">
      <div className="now-grid">
        <div className="now-col">
          <NextItemCard build={build} gold={game.me.gold} starting={needsStarters(data, game)} />
          <div className="card">
            <div className="card-kicker">{t('live.recommended')}</div>
            <BuildOrder ids={fullIds} owned={game.me.items} />
            {build.threats.length ? <div className="chips live-threats">{build.threats.map((x, i) => <span key={i} className="chip minus">{t(x.key, x.params)}</span>)}</div> : null}
          </div>
        </div>
        <div className="now-col">
          <SkillCard build={build} game={game} />
          <div className="stat-tiles">
            <StatTile label="KDA" value={kdaText(k, d, a)} sub={kdaRatio(k, d, a)} />
            <StatTile label="CS" value={String(s.creepScore || 0)} sub={t('live.perMin', { n: csPerMin(s.creepScore, game) })} />
            <StatTile label={t('live.gold')} value={String(game.me.gold)} sub={t('live.inItems', { n: game.me.itemGold })} />
            <StatTile label={t('live.vision')} value={String(Math.round(s.wardScore || 0))} />
          </div>
          <DuelCard game={game} opp={opp} onOpen={onOpponent} />
        </div>
      </div>
      {build.situational.length ? (
        <div className="card">
          <div className="card-kicker">{t('build.situational')}</div>
          <div className="chips">
            {build.situational.map((it) => (
              <span key={it.id} className="sit-item"><ItemIcon id={it.id} size="sm" /><span>{data.item(it.id)?.name}</span>{it.reasons.map((r) => <span key={r.key} className="chip">{t(r.key, r.params)}</span>)}</span>
            ))}
          </div>
        </div>
      ) : null}
      <SkillsPanel build={build} level={game.me.level} />
    </div>
  );
}
