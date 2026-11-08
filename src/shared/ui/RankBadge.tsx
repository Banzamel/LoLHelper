// Ranked tier badge: "Gold II · 45 LP" plus the season winrate; compact = tier and division only.
import type { Rank } from '../../core/lcu/types.ts';
import { useT } from '../i18n/useT.ts';

export function RankBadge({ rank, compact = false }: { rank: Rank | null | undefined; compact?: boolean }) {
  const t = useT();
  if (!rank) return null;
  const tierName = (r: { tier: string | null; division?: string | null }) => `${t(`rank.${r.tier}`)}${r.division ? ` ${r.division}` : ''}`;
  if (!rank.tier) {
    const prev = rank.previous;
    if (compact) {
      return <span className="rank-badge unranked" title={prev ? t('rank.previous', { rank: tierName(prev) }) : undefined}>{t('rank.unranked')}</span>;
    }
    return (
      <span className={`rank-badge unranked ${prev ? `tier-${prev.tier.toLowerCase()}` : ''}`} title={prev ? t('rank.previousHint') : undefined}>
        {t('rank.unranked')}{prev ? <span className="rank-prev">{t('rank.previous', { rank: tierName(prev) })}</span> : null}
      </span>
    );
  }
  const games = rank.wins + rank.losses;
  return (
    <span className={`rank-badge tier-${rank.tier.toLowerCase()}`} title={games ? t('rank.record', { wins: rank.wins, losses: rank.losses }) : undefined}>
      <strong>{tierName(rank)}</strong>
      {compact ? null : <span>{rank.lp} LP</span>}
      {!compact && games ? <span className="rank-wr">{t('rank.winrate', { pct: Math.round((rank.wins / games) * 100), games })}</span> : null}
    </span>
  );
}
