// A champion's brief: the class line and the standout traits; compact (team slots) shows the
// class line only, with the traits in its title.
import type { Brief } from '../../../core/engine/team/briefs.ts';
import { useT } from '../../../shared/i18n/useT.ts';

export function BriefLine({ brief, compact = false }: { brief: Brief | null | undefined; compact?: boolean }) {
  const t = useT();
  if (!brief) return null;
  const text = t(brief.key);
  const traits = brief.traits.map((k) => t(k)).join(' · ');
  return (
    <div className={`brief ${compact ? 'compact' : ''}`} title={compact ? [text, traits].filter(Boolean).join('\n') : undefined}>
      <span className="brief-class">{text}</span>
      {!compact && traits ? <span className="brief-traits">{traits}</span> : null}
    </div>
  );
}
