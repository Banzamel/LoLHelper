// Draft view: both teams (live from champion select or set by hand), the lane opponent and
// counter-picks for the player's role; the player's setup, the team plan and ally tips.
import { ROLES } from '../../../core/data/types.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { ChampIcon, useChampionPicker, useGameData } from '../../database/index.ts';
import { ChampSelectService } from '../ChampSelectService.ts';
import { CompositionPanel } from '../components/CompositionPanel.tsx';
import { DraftHeader } from '../components/DraftHeader.tsx';
import { DraftSetup } from '../components/DraftSetup.tsx';
import { RecCard } from '../components/RecCard.tsx';
import { TeamSlot } from '../components/TeamSlot.tsx';
import { TeamTipsPanel } from '../components/TeamTipsPanel.tsx';
import { useDraft } from '../hooks/useDraft.ts';

export function DraftView({ unsupported }: { unsupported: boolean }) {
  const t = useT();
  const data = useGameData();
  const service = useService(ChampSelectService);
  const pick = useChampionPicker();
  const { model, opponent, recs, notes, me, setup, client, manual } = useDraft();
  const setAlly = async (i: number) => {
    const id = await pick({ role: ROLES[i] });
    if (id !== null) service.setAlly(i, id || null);
  };
  const setEnemy = async (i: number) => {
    const id = await pick({ exclude: manual.theirTeam.filter(Boolean) });
    if (id !== null) service.setEnemy(i, id || null);
  };
  const opp = data.champ(opponent);
  // Runes and spells go first, so they are visible without scrolling; the team plan and the
  // ally tips are short and appear only once enough champions are picked.
  return (
    <div className="draft">
      <DraftHeader model={model} />
      {unsupported ? <div className="panel mode-notice"><strong>{t('mode.unsupported')}</strong><span className="muted">{t('mode.unsupportedHint')}</span></div> : null}
      {setup && me ? <DraftSetup build={setup.build} guide={setup.guide} model={model} me={me} draft={client.draft} /> : null}
      {!model.live ? <p className="muted draft-hint">{t('draft.manualHint')}</p> : null}
      {model.bans.length ? <div className="bans"><span className="muted">{t('draft.bans')}</span>{model.bans.map((id) => <ChampIcon key={id} id={id} size="xs" banned />)}</div> : null}
      <CompositionPanel notes={notes} />
      <TeamTipsPanel notes={notes} />
      <div className="draft-grid">
        <section className="panel team allies">
          <h2>{t('draft.allies')}</h2>
          {model.allies.map((m, i) => <TeamSlot key={m.cellId} member={m} enemy={false} brief={m.championId ? notes.briefs[m.championId] : null} onClick={model.live ? undefined : () => { void setAlly(i); }} />)}
        </section>
        <section className="panel gold recs">
          <div className="panel-title">
            <h2>{t(opponent ? 'draft.recommendations' : 'draft.blindPicks')}</h2>
            <div className="spacer" />
            <span className="muted">{t('draft.laneOpponent')}</span>
            {opp ? <ChampIcon id={opponent} size="sm" /> : null}
            <strong className={opp ? 'opp-name' : 'muted'}>{opp ? opp.name : t('draft.noOpponent')}</strong>
          </div>
          {recs.length ? <div className="rec-list">{recs.map((r) => <RecCard key={r.id} rec={r} model={model} opponent={opponent} />)}</div> : <p className="muted">{t('draft.noResults')}</p>}
        </section>
        <section className="panel team enemies">
          <h2>{t('draft.enemies')}</h2>
          {model.enemies.map((m, i) => (
            <TeamSlot key={m.cellId} member={m} enemy opponent={opponent} brief={m.championId ? notes.briefs[m.championId] : null}
              onClick={model.live ? undefined : () => { void setEnemy(i); }} onOpponent={() => service.setOpponent(m.championId)} />
          ))}
        </section>
      </div>
    </div>
  );
}
