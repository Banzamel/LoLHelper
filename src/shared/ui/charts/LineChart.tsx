// Line chart drawn at the container's real pixel width (redrawn on resize), with a crosshair
// tooltip listing every series. Series colours carry identity only; values use text colours.
import { useId, useState, type ReactNode } from 'react';
import { ChartTip } from './ChartTip.tsx';
import { Crosshair } from './Crosshair.tsx';
import { COLORS, directLabels, layout, nearestX, type ChartOptions, type Series } from './chartLayout.ts';
import { Legend } from './Legend.tsx';
import { useWidth } from './useWidth.ts';

interface Props extends ChartOptions { series: Series[]; title?: string; empty?: ReactNode }

export function LineChart({ series, title, empty, ...opts }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const clip = useId().replace(/:/g, '');
  if (series.flatMap((s) => s.points).length < 2) return <div className="chart-empty muted small">{empty || '—'}</div>;
  const height = opts.height ?? 180;
  const xFmt = opts.xFmt ?? String;
  const yFmt = opts.yFmt ?? String;
  const l = width ? layout(series, opts, width) : null;
  const div = opts.diverging;
  return (
    <figure className="chart-figure">
      {title ? <figcaption>{title}</figcaption> : null}
      <Legend series={series} />
      <div className="chart" ref={ref}>
        {l ? (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
            {l.yTicks.map((v) => (
              <g key={`y${v}`}>
                <line x1={l.pad.l} x2={width - l.pad.r} y1={l.Y(v)} y2={l.Y(v)} stroke={COLORS.grid} strokeWidth={v === 0 && (opts.zeroLine || div) ? 1.5 : 1} />
                <text x={l.pad.l - 6} y={l.Y(v) + 4} textAnchor="end" className="chart-axis">{yFmt(v)}</text>
              </g>
            ))}
            {l.xTicks.map((v) => <text key={`x${v}`} x={l.X(v)} y={height - 6} textAnchor="middle" className="chart-axis">{xFmt(v)}</text>)}
            {(opts.markers || []).filter((m) => m.x >= l.x0 && m.x <= l.x1).map((m, i) => (
              <line key={`m${i}`} x1={l.X(m.x)} x2={l.X(m.x)} y1={l.pad.t} y2={height - l.pad.b} stroke={m.color} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
            ))}
            {div ? (
              <>
                <defs>
                  <clipPath id={`${clip}a`}><rect x={0} y={0} width={width} height={l.Y(0)} /></clipPath>
                  <clipPath id={`${clip}b`}><rect x={0} y={l.Y(0)} width={width} height={height - l.Y(0)} /></clipPath>
                </defs>
                {(() => {
                  const s = series[0].points;
                  const area = `${l.path(s)}L${l.X(s[s.length - 1][0])},${l.Y(0)}L${l.X(s[0][0])},${l.Y(0)}Z`;
                  return [
                    <path key="a" d={area} fill={div.pos} fillOpacity={0.28} clipPath={`url(#${clip}a)`} />,
                    <path key="b" d={area} fill={div.neg} fillOpacity={0.28} clipPath={`url(#${clip}b)`} />,
                    <path key="c" d={l.path(s)} fill="none" stroke={div.pos} strokeWidth={2} clipPath={`url(#${clip}a)`} />,
                    <path key="d" d={l.path(s)} fill="none" stroke={div.neg} strokeWidth={2} clipPath={`url(#${clip}b)`} />,
                  ];
                })()}
              </>
            ) : series.map((s) => <path key={s.label} d={l.path(s.points, s.step)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeDasharray={s.dashed ? '4 4' : undefined} />)}
            {!div && series.length > 1 ? directLabels(series, l, yFmt).map((lab, i) => <text key={`l${i}`} x={lab.x} y={lab.y} className="chart-direct">{lab.text}</text>) : null}
            {hoverX !== null ? <Crosshair layout={l} series={series} x={hoverX} diverging={!!div} /> : null}
            <rect x={l.pad.l} y={0} width={Math.max(0, width - l.pad.l - l.pad.r)} height={height} fill="transparent"
              onPointerMove={(e) => setHoverX(nearestX(l, e.clientX - e.currentTarget.ownerSVGElement!.getBoundingClientRect().left))}
              onPointerLeave={() => setHoverX(null)} />
          </svg>
        ) : null}
        <ChartTip layout={l} series={series} x={hoverX} xFmt={xFmt} yFmt={yFmt} markers={opts.markers || []} diverging={div || null} />
      </div>
    </figure>
  );
}
