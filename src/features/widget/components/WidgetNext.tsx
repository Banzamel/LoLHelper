// The widget's main block: the starting items before the first purchase, then the next item
// with the gold still missing, or "build done".
import type { PlayingGame } from '../../../core/live/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ItemIcon, useGameData } from '../../database/index.ts';
import { needsStarters, startersCost, type GameBuild } from '../../liveGame/index.ts';

export function WidgetNext({ game, model }: { game: PlayingGame; model: GameBuild }) {
  const t = useT();
  const data = useGameData();
  const { build } = model;
  if (needsStarters(data, game)) {
    const cost = startersCost(data, build);
    return (
      <div className={`w-next ${cost <= game.me.gold ? 'afford' : ''}`}>
        {build.starters.map((s) => <ItemIcon key={s.id} id={s.id} count={s.count} nameOnly />)}
        <div><div className="gold-text w-next-cost">{t('common.gold', { n: cost })}</div></div>
      </div>
    );
  }
  const next = build.next;
  const it = next ? data.item(next.id) : null;
  if (!next || !it) return <div className="w-muted">{t('live.buildDone')}</div>;
  const missing = next.cost - game.me.gold;
  return (
    <div className={`w-next ${missing <= 0 ? 'afford' : ''}`}>
      <ItemIcon id={it.id} nameOnly />
      <div>
        <div className="w-next-name">{it.name}</div>
        <div className="gold-text w-next-cost">{t('live.remaining', { n: next.cost })}</div>
        <span className={`chip ${missing <= 0 ? 'plus' : ''}`}>{missing <= 0 ? t('overlay.canAfford') : t('live.missingGold', { n: missing })}</span>
      </div>
    </div>
  );
}

// Whether the next purchase is affordable now (the widget pulses when it becomes so).
export function canAfford(data: ReturnType<typeof useGameData>, game: PlayingGame, model: GameBuild): boolean {
  if (needsStarters(data, game)) return startersCost(data, model.build) <= game.me.gold;
  const next = model.build.next;
  if (!next || !data.item(next.id)) return false;
  return next.cost - game.me.gold <= 0 || !!(next.buy && next.buy.id !== next.id);
}
