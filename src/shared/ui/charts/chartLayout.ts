// Geometry of a line chart at a given pixel size: scales, axis ticks, paths and direct labels.
// Kept apart from the component so the maths is plain and testable.

export const COLORS = { ally: '#0fa496', enemy: '#e84057', gold: '#c8aa6e', grid: '#1e2d42', axis: '#8a8f9c' };

export interface Series { label: string; color: string; points: [number, number][]; step?: boolean; dashed?: boolean }
export interface Marker { x: number; color: string; label: string }

export interface ChartOptions {
  height?: number;
  xFmt?: (v: number) => string;
  yFmt?: (v: number) => string;
  zeroLine?: boolean;
  yMin?: number;
  yMax?: number;
  markers?: Marker[];
  // Fills the area of a single series above / below zero.
  diverging?: { pos: string; neg: string } | null;
}

// Rounded "nice" axis ticks covering [min, max].
export function ticks(min: number, max: number, count = 4): number[] {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) out.push(Math.round(v * 1000) / 1000);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

export function layout(series: Series[], opts: ChartOptions, width: number) {
  const height = opts.height ?? 180;
  const pts = series.flatMap((s) => s.points);
  const pad = { l: 44, r: series.length > 1 ? 56 : 14, t: 10, b: 22 };
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  let y0 = opts.yMin ?? Math.min(...ys);
  let y1 = opts.yMax ?? Math.max(...ys);
  if (opts.zeroLine || opts.diverging) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
  if (opts.diverging) { const m = Math.max(Math.abs(y0), Math.abs(y1)); y0 = -m; y1 = m; }
  const yt = ticks(y0, y1);
  y0 = Math.min(y0, yt[0]);
  y1 = Math.max(y1, yt[yt.length - 1]);
  const X = (x: number) => pad.l + ((x - x0) / Math.max(1e-9, x1 - x0)) * (width - pad.l - pad.r);
  const Y = (y: number) => pad.t + (1 - (y - y0) / Math.max(1e-9, y1 - y0)) * (height - pad.t - pad.b);
  const xt = ticks(x0, x1, Math.max(2, Math.floor((width - pad.l - pad.r) / 90))).filter((v) => v >= x0 && v <= x1);
  const path = (points: [number, number][], step = false) => points.map((p, i) => {
    if (!i) return `M${X(p[0])},${Y(p[1])}`;
    return step ? `H${X(p[0])}V${Y(p[1])}` : `L${X(p[0])},${Y(p[1])}`;
  }).join('');
  return { width, height, pad, x0, x1, y0, y1, X, Y, yTicks: yt.filter((v) => v >= y0 && v <= y1), xTicks: xt, path, allX: [...new Set(xs)].sort((a, b) => a - b) };
}

export type Layout = ReturnType<typeof layout>;

// End-of-line labels pushed apart so they never overlap.
export function directLabels(series: Series[], l: Layout, yFmt: (v: number) => string) {
  const labels = series.map((s) => { const last = s.points[s.points.length - 1]; return { x: l.X(last[0]) + 6, y: l.Y(last[1]) + 4, text: yFmt(last[1]) }; })
    .sort((a, b) => a.y - b.y);
  labels.forEach((lab, i) => { if (i && lab.y - labels[i - 1].y < 13) lab.y = labels[i - 1].y + 13; });
  return labels;
}

// The value of a step series at x (the last point at or before x).
export function valueAt(s: Series, x: number): number | null {
  let v: number | null = null;
  for (const p of s.points) { if (p[0] <= x) v = p[1]; else break; }
  return v;
}

export const nearestX = (l: Layout, px: number) => l.allX.reduce((best, v) => (Math.abs(l.X(v) - px) < Math.abs(l.X(best) - px) ? v : best), l.allX[0]);
