// Renders the tooltip next to the cursor, kept inside the window.
import { useLayoutEffect, useRef, useState } from 'react';
import { useService, useStore } from '../../hooks/services.tsx';
import { TooltipController } from './TooltipController.ts';

export function TooltipHost() {
  const { content, x, y } = useStore(useService(TooltipController).store);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    const tip = ref.current;
    if (!tip || !content) return;
    setPos({
      left: Math.min(x + 16, window.innerWidth - tip.offsetWidth - 10),
      top: Math.min(y + 16, window.innerHeight - tip.offsetHeight - 10),
    });
  }, [content, x, y]);
  return <div id="tooltip" className="tooltip" ref={ref} hidden={!content} style={{ left: pos.left, top: pos.top }}>{content}</div>;
}
