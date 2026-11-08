// The hover line and one dot per series at the hovered x.
import { COLORS, valueAt, type Layout, type Series } from './chartLayout.ts';

export function Crosshair({ layout: l, series, x, diverging }: { layout: Layout; series: Series[]; x: number; diverging: boolean }) {
  return (
    <>
      <line x1={l.X(x)} x2={l.X(x)} y1={l.pad.t} y2={l.height - l.pad.b} stroke={COLORS.axis} strokeWidth={1} />
      {series.map((s) => {
        const v = valueAt(s, x);
        return v === null ? null
          : <circle key={s.label} cx={l.X(x)} cy={l.Y(v)} r={4} fill={diverging ? COLORS.gold : s.color} stroke="#010a13" strokeWidth={2} />;
      })}
    </>
  );
}
