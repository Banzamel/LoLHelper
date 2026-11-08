// The recommended rune page with its export button, the player's own page compared with it,
// the keystone guide and the enemies' keystones.
import type { RuneGuide } from '../../../core/engine/runes.ts';
import type { Build } from '../../../core/engine/types.ts';
import type { ClientRunePage } from '../../../core/lcu/types.ts';
import type { LiveRunePage } from '../../../core/live/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RuneIcon, useGameData } from '../../database/index.ts';
import { useExports } from '../hooks/useExports.ts';
import { runeVerdict, VERDICT_CHIP } from '../verdicts.ts';
import { RunePageView } from './RunePageView.tsx';
import { WatchList } from './WatchList.tsx';

interface Props {
  build: Build;
  connected: boolean;
  current?: ClientRunePage | LiveRunePage | null;
  guide?: RuneGuide | null;
}

function CurrentPage({ build, current }: { build: Build; current: ClientRunePage | LiveRunePage | null | undefined }) {
  const t = useT();
  const data = useGameData();
  const v = build.runes ? runeVerdict(build.runes, current) : null;
  if (!v || !current) return null;
  const ks = data.rune(current.selectedPerkIds[0]);
  const sub = data.rune(current.subStyleId);
  return (
    <div className={`loadout-current ${v}`}>
      <span className="muted">{t('loadout.yourPage')}</span>
      <RuneIcon id={current.selectedPerkIds[0]} size="sm" />
      <strong>{ks ? ks.name : ''}</strong>
      {sub ? <span className="muted">{`+ ${sub.name}`}</span> : null}
      <span className={`chip ${VERDICT_CHIP[v]}`}>{t(`loadout.${v}`)}</span>
    </div>
  );
}

export function RunesPanel({ build, connected, current, guide }: Props) {
  const t = useT();
  const exports = useExports();
  if (!build.runes) return null;
  return (
    <section className="panel build-section">
      <div className="panel-title">
        <h2>{t('loadout.runes')}</h2>
        <div className="spacer" />
        <button className="btn small primary" disabled={!connected} title={connected ? undefined : t('build.needClient')} onClick={() => { void exports.runes(build); }}>
          {t('loadout.exportRunes')}
        </button>
      </div>
      {current !== undefined ? <CurrentPage build={build} current={current} /> : null}
      <RunePageView runes={build.runes} tip={guide ? guide.tips[build.runes.selectedPerkIds[0]] : null} />
      {guide ? <WatchList entries={guide.enemies} /> : null}
      {build.runes.reasons.length ? <div className="chips">{build.runes.reasons.map((k) => <span key={k} className="chip">{t(k)}</span>)}</div> : null}
    </section>
  );
}
