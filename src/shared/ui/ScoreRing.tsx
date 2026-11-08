// A 0–100 score as a ring, and a reason chip with its score delta.
import type { TextKey } from '../../core/shared/json.ts';
import { useT } from '../i18n/useT.ts';

export function ScoreRing({ score }: { score: number }) {
  const t = useT();
  const r = 20;
  const len = 2 * Math.PI * r;
  const color = score >= 75 ? 'var(--teal)' : score >= 55 ? 'var(--gold)' : 'var(--red)';
  return (
    <div className="score" title={t('draft.score')}>
      <svg viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="#15263f" strokeWidth="4" />
        <circle cx="23" cy="23" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${(score / 100) * len} ${len}`} strokeLinecap="round" />
      </svg>
      <span>{String(score)}</span>
    </div>
  );
}

export function ReasonChip({ reason }: { reason: TextKey & { delta?: number } }) {
  const t = useT();
  const d = reason.delta;
  const cls = d !== undefined && d > 0 ? 'plus' : d !== undefined && d < 0 ? 'minus' : '';
  return <span className={`chip ${cls}`}>{`${d !== undefined && d > 0 ? '+' : ''}${d ?? ''} ${t(reason.key, reason.params)}`.trim()}</span>;
}
