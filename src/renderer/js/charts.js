// Small SVG charts drawn at the container's real pixel width (redrawn on resize): line
// charts with a crosshair tooltip, a diverging "advantage" chart and HTML bar lists.
// Series colours carry identity only; values and labels use text colours.
import { el } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
export const COLORS = { ally: '#0fa496', enemy: '#e84057', gold: '#c8aa6e', grid: '#1e2d42', axis: '#8a8f9c' };

function node(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) n.setAttribute(k, v);
  return n;
}

// Rounded "nice" axis ticks covering [min, max].
function ticks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const out = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) out.push(Math.round(v * 1000) / 1000);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

export const fmtMinutes = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtGold = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace('.0', '')}k` : String(Math.round(v)));

// Draws `draw(svg, width)` into a responsive wrapper; returns the wrapper.
function responsive(height, draw, cls = '') {
  const wrap = el('div', { class: `chart ${cls}` });
  const tip = el('div', { class: 'chart-tip', hidden: true });
  let lastWidth = 0;
  const render = () => {
    const width = Math.floor(wrap.clientWidth);
    if (!width || width === lastWidth) return;
    lastWidth = width;
    const svg = node('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img' });
    wrap.querySelectorAll('svg').forEach((s) => s.remove());
    wrap.prepend(svg);
    draw(svg, width, tip);
  };
  wrap.append(tip);
  new ResizeObserver(() => requestAnimationFrame(render)).observe(wrap);
  return wrap;
}

function legend(series) {
  if (series.length < 2) return null;
  return el('div', { class: 'chart-legend' }, series.map((s) => el('span', {}, el('i', { style: `background:${s.color}` }), s.label)));
}

/**
 * Line chart. series: [{ label, color, points: [[x, y]], step }]; x is shared (seconds or
 * index). opts: height, xFmt, yFmt, zeroLine, yMin, yMax, markers: [{ x, color, label }],
 * diverging: { pos, neg } fills the area of a single series above/below zero.
 */
export function lineChart(series, opts = {}) {
  const { height = 180, xFmt = String, yFmt = String, zeroLine = false, markers = [], diverging = null, title = '' } = opts;
  const pts = series.flatMap((s) => s.points);
  if (pts.length < 2) return el('div', { class: 'chart-empty muted small' }, opts.empty || '—');
  const draw = (svg, width, tip) => {
    const pad = { l: 44, r: series.length > 1 ? 56 : 14, t: 10, b: 22 };
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    let y0 = opts.yMin ?? Math.min(...ys);
    let y1 = opts.yMax ?? Math.max(...ys);
    if (zeroLine || diverging) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
    if (diverging) { const m = Math.max(Math.abs(y0), Math.abs(y1)); y0 = -m; y1 = m; }
    const yt = ticks(y0, y1);
    y0 = Math.min(y0, yt[0]);
    y1 = Math.max(y1, yt[yt.length - 1]);
    const X = (x) => pad.l + ((x - x0) / Math.max(1e-9, x1 - x0)) * (width - pad.l - pad.r);
    const Y = (y) => pad.t + (1 - (y - y0) / Math.max(1e-9, y1 - y0)) * (height - pad.t - pad.b);
    for (const v of yt) {
      if (v < y0 || v > y1) continue;
      svg.append(node('line', { x1: pad.l, x2: width - pad.r, y1: Y(v), y2: Y(v), stroke: COLORS.grid, 'stroke-width': v === 0 && (zeroLine || diverging) ? 1.5 : 1 }));
      const label = node('text', { x: pad.l - 6, y: Y(v) + 4, 'text-anchor': 'end', class: 'chart-axis' });
      label.textContent = yFmt(v);
      svg.append(label);
    }
    const xt = ticks(x0, x1, Math.max(2, Math.floor((width - pad.l - pad.r) / 90))).filter((v) => v >= x0 && v <= x1);
    for (const v of xt) {
      const label = node('text', { x: X(v), y: height - 6, 'text-anchor': 'middle', class: 'chart-axis' });
      label.textContent = xFmt(v);
      svg.append(label);
    }
    for (const m of markers) {
      if (m.x < x0 || m.x > x1) continue;
      svg.append(node('line', { x1: X(m.x), x2: X(m.x), y1: pad.t, y2: height - pad.b, stroke: m.color, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.7 }));
    }
    const path = (points, step) => points.map((p, i) => {
      if (!i) return `M${X(p[0])},${Y(p[1])}`;
      return step ? `H${X(p[0])}V${Y(p[1])}` : `L${X(p[0])},${Y(p[1])}`;
    }).join('');
    if (diverging) {
      const s = series[0].points;
      const area = `${path(s)}L${X(s[s.length - 1][0])},${Y(0)}L${X(s[0][0])},${Y(0)}Z`;
      const id = `c${Math.random().toString(36).slice(2, 8)}`;
      const defs = node('defs');
      const above = node('clipPath', { id: `${id}a` });
      above.append(node('rect', { x: 0, y: 0, width, height: Y(0) }));
      const below = node('clipPath', { id: `${id}b` });
      below.append(node('rect', { x: 0, y: Y(0), width, height: height - Y(0) }));
      defs.append(above, below);
      svg.append(defs);
      svg.append(node('path', { d: area, fill: diverging.pos, 'fill-opacity': 0.28, 'clip-path': `url(#${id}a)` }));
      svg.append(node('path', { d: area, fill: diverging.neg, 'fill-opacity': 0.28, 'clip-path': `url(#${id}b)` }));
      svg.append(node('path', { d: path(s), fill: 'none', stroke: diverging.pos, 'stroke-width': 2, 'clip-path': `url(#${id}a)` }));
      svg.append(node('path', { d: path(s), fill: 'none', stroke: diverging.neg, 'stroke-width': 2, 'clip-path': `url(#${id}b)` }));
    } else {
      for (const s of series) svg.append(node('path', { d: path(s.points, s.step), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-dasharray': s.dashed ? '4 4' : null }));
      // Direct labels at the lines' ends, pushed apart so they never overlap.
      if (series.length > 1) {
        const labels = series.map((s) => { const last = s.points[s.points.length - 1]; return { x: X(last[0]) + 6, y: Y(last[1]) + 4, text: yFmt(last[1]) }; }).sort((a, b) => a.y - b.y);
        labels.forEach((l, i) => { if (i && l.y - labels[i - 1].y < 13) l.y = labels[i - 1].y + 13; });
        for (const l of labels) {
          const label = node('text', { x: l.x, y: l.y, class: 'chart-direct' });
          label.textContent = l.text;
          svg.append(label);
        }
      }
    }
    // Crosshair snapping to the nearest x, one tooltip listing every series.
    const hair = node('line', { y1: pad.t, y2: height - pad.b, stroke: COLORS.axis, 'stroke-width': 1, visibility: 'hidden' });
    const dots = series.map((s) => node('circle', { r: 4, fill: diverging ? COLORS.gold : s.color, stroke: '#010a13', 'stroke-width': 2, visibility: 'hidden' }));
    svg.append(hair, ...dots);
    const hit = node('rect', { x: pad.l, y: 0, width: Math.max(0, width - pad.l - pad.r), height, fill: 'transparent' });
    svg.append(hit);
    const allX = [...new Set(pts.map((p) => p[0]))].sort((a, b) => a - b);
    const valueAt = (s, x) => { let v = null; for (const p of s.points) { if (p[0] <= x) v = p[1]; else break; } return v; };
    hit.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const x = allX.reduce((best, v) => (Math.abs(X(v) - px) < Math.abs(X(best) - px) ? v : best), allX[0]);
      hair.setAttribute('x1', X(x));
      hair.setAttribute('x2', X(x));
      hair.setAttribute('visibility', 'visible');
      const rows = series.map((s, i) => {
        const v = valueAt(s, x);
        dots[i].setAttribute('cx', X(x));
        dots[i].setAttribute('cy', Y(v ?? 0));
        dots[i].setAttribute('visibility', v === null ? 'hidden' : 'visible');
        return el('div', { class: 'chart-tip-row' }, el('i', { style: `background:${diverging ? (v >= 0 ? diverging.pos : diverging.neg) : s.color}` }),
          el('strong', {}, v === null ? '—' : yFmt(v)), el('span', {}, s.label));
      });
      const extra = markers.filter((m) => Math.abs(m.x - x) <= (x1 - x0) / 60).map((m) => el('div', { class: 'chart-tip-note' }, m.label));
      tip.replaceChildren(el('div', { class: 'chart-tip-x' }, xFmt(x)), ...rows, ...extra);
      tip.hidden = false;
      const left = Math.min(X(x) + 12, width - tip.offsetWidth - 4);
      tip.style.left = `${left < X(x) && X(x) - tip.offsetWidth - 12 > 0 ? X(x) - tip.offsetWidth - 12 : left}px`;
      tip.style.top = `${pad.t}px`;
    });
    hit.addEventListener('pointerleave', () => {
      tip.hidden = true;
      hair.setAttribute('visibility', 'hidden');
      dots.forEach((d) => d.setAttribute('visibility', 'hidden'));
    });
  };
  return el('figure', { class: 'chart-figure' }, title ? el('figcaption', {}, title) : null, legend(series), responsive(height, draw));
}

/**
 * Horizontal bars in HTML. rows: [{ label (text or node), value, color, text }]; the bar
 * length is value / max, the text (default: value) sits after the bar.
 */
export function barList(rows, { max = null, fmt = String } = {}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return el('div', { class: 'bar-list' }, rows.map((r) => el('div', { class: 'bar-row', title: r.title || null },
    el('div', { class: 'bar-label' }, r.label),
    el('div', { class: 'bar-track' }, el('i', { style: `width:${Math.max(0, Math.min(100, (r.value / top) * 100))}%;background:${r.color || COLORS.gold}` })),
    el('div', { class: 'bar-value' }, r.text ?? fmt(r.value)))));
}

// Two-sided comparison bar: share of `a` against `b` (e.g. team gold), labels on both ends.
export function versusBar(a, b, { fmt = String, labelA = '', labelB = '' } = {}) {
  const sum = a + b || 1;
  return el('div', { class: 'versus-bar' },
    el('span', { class: 'vb-a' }, labelA, el('strong', {}, fmt(a))),
    el('div', { class: 'vb-track' }, el('i', { class: 'vb-fill-a', style: `width:${(a / sum) * 100}%` }), el('i', { class: 'vb-fill-b', style: `width:${(b / sum) * 100}%` })),
    el('span', { class: 'vb-b' }, el('strong', {}, fmt(b)), labelB));
}

// Results as a strip of W/L squares, newest first.
export function resultStrip(results, { label } = {}) {
  return el('div', { class: 'result-strip', title: label || null }, results.map((w) => el('i', { class: w ? 'w' : 'l' }, w ? 'W' : 'L')));
}
