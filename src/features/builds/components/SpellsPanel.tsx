// Recommended summoner spells with the export (champion select only) and the player's own
// spells compared with them.
import type { Build } from '../../../core/engine/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { SummonerIcon } from '../../database/index.ts';
import { useExports } from '../hooks/useExports.ts';
import { spellVerdict, VERDICT_CHIP } from '../verdicts.ts';

interface Props { build: Build; inChampSelect: boolean; current?: (number | null)[] | null }

export function SpellsPanel({ build, inChampSelect, current }: Props) {
  const t = useT();
  const exports = useExports();
  const v = current !== undefined ? spellVerdict(build.spells.ids, current) : null;
  return (
    <section className="panel build-section">
      <div className="panel-title">
        <h2>{t('loadout.spells')}</h2>
        <div className="spacer" />
        <button className="btn small" disabled={!inChampSelect} title={inChampSelect ? undefined : t('loadout.needChampSelect')} onClick={() => { void exports.spells(build); }}>
          {t('loadout.exportSpells')}
        </button>
      </div>
      {v && current ? (
        <div className={`loadout-current ${v}`}>
          <span className="muted">{t('loadout.yourSpells')}</span>
          {current.map((id, i) => <span key={i} className="spell-slot"><SummonerIcon id={id} /><kbd>{i ? 'F' : 'D'}</kbd></span>)}
          <span className={`chip ${VERDICT_CHIP[v]}`}>{t(`loadout.${v}`)}</span>
        </div>
      ) : null}
      <div className="build-strip">
        {build.spells.ids.map((id) => <SummonerIcon key={id} id={id} />)}
        <span className="chip">{t(build.spells.reason)}</span>
      </div>
    </section>
  );
}
