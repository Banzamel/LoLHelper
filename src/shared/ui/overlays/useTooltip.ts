// Mouse handlers that show `build()` as the tooltip while the cursor is over the element.
import type { MouseEvent, ReactNode } from 'react';
import { useService } from '../../hooks/services.tsx';
import { TooltipController } from './TooltipController.ts';

export function useTooltip(build: (() => ReactNode) | null) {
  const tooltip = useService(TooltipController);
  if (!build) return {};
  return {
    onMouseEnter: (e: MouseEvent) => tooltip.show(build(), e.clientX, e.clientY),
    onMouseMove: (e: MouseEvent) => tooltip.move(e.clientX, e.clientY),
    onMouseLeave: () => tooltip.hide(),
  };
}
