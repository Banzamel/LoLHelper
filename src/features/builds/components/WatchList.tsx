// The enemies' keystones under a 'Watch out for' heading (rune panel, Enemies tab, loading
// screen); nothing when none is known.
import type { EnemyKeystone } from '../../../core/engine/runes.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { WatchLine } from './WatchLine.tsx';

export function WatchList({ entries }: { entries: EnemyKeystone[] }) {
  const t = useT();
  const known = entries.filter((e) => e.keystone);
  if (!known.length) return null;
  return (
    <div className="rune-watch-list">
      <div className="card-kicker">{t('rune.watchOut')}</div>
      {known.map((e) => <WatchLine key={e.championId} entry={e} withChampion />)}
    </div>
  );
}
