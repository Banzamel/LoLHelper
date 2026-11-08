// The in-game widget: next item, build progress, next skill and the lane opponent's items,
// refreshed from the live match. In move mode it can be dragged anywhere.
import { useEffect, useRef } from 'react';
import { widgetWindow } from '../../../platform/index.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { useMaybeGameData } from '../../database/index.ts';
import { needsStarters } from '../../liveGame/index.ts';
import type { WidgetUpdate } from '../types.ts';
import { canAfford, WidgetNext } from './WidgetNext.tsx';
import { WidgetDetails } from './WidgetDetails.tsx';

const hotkey = (key: string) => (key || '').replace('CommandOrControl', 'Ctrl');

export function Widget({ update }: { update: WidgetUpdate }) {
  const t = useT();
  const data = useMaybeGameData();
  const ref = useRef<HTMLDivElement>(null);
  const couldAfford = useRef(false);
  const { state, game, model } = update;
  const ready = !!(game && model && data);
  const affordable = ready ? canAfford(data, game, model) : false;

  // Pulse once when the next purchase becomes affordable, so it catches the eye mid-fight.
  useEffect(() => {
    const el = ref.current;
    if (el && affordable && !couldAfford.current) {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
    couldAfford.current = affordable;
  }, [affordable]);

  // The window is only as tall as the widget.
  useEffect(() => {
    requestAnimationFrame(() => { if (ref.current) void widgetWindow.resize(ref.current.offsetHeight + 12); });
  });

  const hint = state.moveMode ? <div className="w-hint">{t('overlay.moveHint', { key: hotkey(update.overlay.moveKey) })}</div> : null;
  const onMouseDown = state.moveMode ? () => { void widgetWindow.startDragging(); } : undefined;
  return (
    <div id="widget" ref={ref} className={`widget ${state.moveMode ? 'move' : ''}`} style={{ opacity: state.opacity || 0.92 }} onMouseDown={onMouseDown}>
      {ready ? (
        <>
          <div className="w-head">
            <span>{t(needsStarters(data, game) ? 'live.starters' : 'live.nextItem')}</span>
            <div className="spacer" />
            <span className="gold-text">{t('common.gold', { n: game.me.gold })}</span>
          </div>
          <WidgetNext game={game} model={model} />
          <WidgetDetails game={game} model={model} />
        </>
      ) : (
        <><div className="w-head">{t('app.name')}</div><div className="w-muted">{t('overlay.preview')}</div></>
      )}
      {hint}
    </div>
  );
}
