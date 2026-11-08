// Once the player has a champion: its starting items, runes and spells (compared with what is
// set in the client), the keystone tip and the lane opponent's typical keystone.
import type { RuneGuide } from '../../../core/engine/runes.ts';
import type { Build } from '../../../core/engine/types.ts';
import type { Draft } from '../../../core/lcu/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { LoadoutPanels } from '../../builds/index.ts';
import { ChampIcon, ItemIcon, useGameData } from '../../database/index.ts';
import { RecordChip } from '../../matchHistory/index.ts';
import type { DraftModel, Member } from '../draftModel.ts';

interface Props { build: Build; guide: RuneGuide; model: DraftModel; me: Member; draft: Draft | null }

export function DraftSetup({ build, guide, model, me, draft }: Props) {
  const t = useT();
  const data = useGameData();
  const current = model.live && draft ? { runes: draft.myRunes, spells: me.spells || null } : null;
  return (
    <section className="panel gold draft-setup">
      <div className="panel-title">
        <ChampIcon id={build.championId} size="sm" />
        <h2>{t('draft.setup')}</h2>
        <RecordChip championId={build.championId} enemyId={build.enemyId} />
        <div className="spacer" />
        <span className="muted">{t('build.start')}</span>
        <div className="build-strip">{build.starters.map((s) => <ItemIcon key={s.id} id={s.id} size="sm" count={s.count} />)}</div>
      </div>
      <p className="muted small">{t('draft.setupHint', { champion: data.champName(build.championId) })}</p>
      <LoadoutPanels build={build} current={current} parts={['runes', 'spells']} guide={guide} />
    </section>
  );
}
