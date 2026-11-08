// The element's width in whole pixels, updated on resize (charts are drawn at their real size).
import { useCallback, useState } from 'react';

export function useWidth<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const measure = () => setWidth(Math.floor(node.clientWidth));
    measure();
    new ResizeObserver(() => requestAnimationFrame(measure)).observe(node);
  }, []);
  return [ref, width];
}
