// While the widget lets clicks through to the game it gets no mouse events; Rust sends the
// cursor position instead, and the item under it (data-tip) shows its name.
import { useEffect } from 'react';
import { nativeEvents } from '../../../platform/index.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { TooltipController } from '../../../shared/ui/overlays/TooltipController.ts';

export function useCursorTooltip() {
  const tooltip = useService(TooltipController);
  useEffect(() => {
    let current: Element | null = null;
    const off = nativeEvents.overlayCursor(({ inside, x, y }) => {
      const target = inside ? document.elementFromPoint(x, y)?.closest('[data-tip]') || null : null;
      if (!target) { current = null; tooltip.hide(); return; }
      if (target !== current) {
        current = target;
        const name = target.getAttribute('data-tip') || '';
        tooltip.show(<div className="tt-name">{name}</div>, x, y);
      } else tooltip.move(x, y);
    });
    return () => { void off.then((fn) => fn()); };
  }, [tooltip]);
}
