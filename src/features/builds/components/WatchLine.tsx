// One enemy's keystone and what to watch out for; predicted keystones are marked as typical.
import type { EnemyKeystone } from '../../../core/engine/runes.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ChampIcon, RuneIcon, useGameData } from '../../database/index.ts';

export function WatchLine({ entry, withChampion = false }: { entry: EnemyKeystone | null | undefined; withChampion?: boolean }) {
  const t = useT();
  const data = useGameData();
  if (!entry || !entry.keystone) return null;
  const c = data.champ(entry.championId);
  const keystone = data.rune(entry.keystone);
  return (
    <div className="rune-watch">
      {withChampion ? <ChampIcon id={entry.championId} size="xs" /> : null}
      <RuneIcon id={entry.keystone} size="sm" />
      <div className="rune-watch-main">
        <div className="rune-watch-name">
          {withChampion && c ? <strong>{c.name}</strong> : null}
          <span>{keystone ? keystone.name : ''}</span>
          {entry.predicted ? <span className="chip" title={t('rune.typicalHint')}>{t('rune.typical')}</span> : null}
        </div>
        {entry.watch ? <span className="rune-watch-text">{t(entry.watch)}</span> : null}
      </div>
    </div>
  );
}
