// Horizontal bars in HTML; the bar length is value / max, the text (default: value) after it.
import type { ReactNode } from 'react';
import { COLORS } from './chartLayout.ts';

export interface BarRow { label: ReactNode; value: number; color?: string; text?: string; title?: string }

export function BarList({ rows, max = null, fmt = String }: { rows: BarRow[]; max?: number | null; fmt?: (v: number) => string }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bar-list">
      {rows.map((r, i) => (
        <div className="bar-row" title={r.title} key={i}>
          <div className="bar-label">{r.label}</div>
          <div className="bar-track"><i style={{ width: `${Math.max(0, Math.min(100, (r.value / top) * 100))}%`, background: r.color || COLORS.gold }} /></div>
          <div className="bar-value">{r.text ?? fmt(r.value)}</div>
        </div>
      ))}
    </div>
  );
}
