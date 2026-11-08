// The tooltip of the hovered x: every series' value and the markers (dragons, barons) near it,
// placed beside the crosshair and kept inside the chart.
import { useLayoutEffect, useRef, useState } from 'react';
import { valueAt, type Layout, type Marker, type Series } from './chartLayout.ts';

interface Props {
  layout: Layout | null;
  series: Series[];
  x: number | null;
  xFmt: (v: number) => string;
  yFmt: (v: number) => string;
  markers: Marker[];
  diverging: { pos: string; neg: string } | null;
}

export function ChartTip({ layout: l, series, x, xFmt, yFmt, markers, diverging }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(0);
  useLayoutEffect(() => {
    if (!l || x === null || !ref.current) return;
    const w = ref.current.offsetWidth;
    const right = Math.min(l.X(x) + 12, l.width - w - 4);
    setLeft(right < l.X(x) && l.X(x) - w - 12 > 0 ? l.X(x) - w - 12 : right);
  }, [l, x]);
  if (!l || x === null) return <div className="chart-tip" hidden />;
  const near = markers.filter((m) => Math.abs(m.x - x) <= (l.x1 - l.x0) / 60);
  return (
    <div className="chart-tip" ref={ref} style={{ left, top: l.pad.t }}>
      <div className="chart-tip-x">{xFmt(x)}</div>
      {series.map((s) => {
        const v = valueAt(s, x);
        const color = diverging ? (v !== null && v >= 0 ? diverging.pos : diverging.neg) : s.color;
        return (
          <div className="chart-tip-row" key={s.label}>
            <i style={{ background: color }} /><strong>{v === null ? '—' : yFmt(v)}</strong><span>{s.label}</span>
          </div>
        );
      })}
      {near.map((m, i) => <div className="chart-tip-note" key={i}>{m.label}</div>)}
    </div>
  );
}
