// One game of the list; clicking it opens the details below.
import type { CompactGame, CompactPlayer } from '../../../core/matches/types.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { fmtDate, fmtMinutes, kdaRatio, kdaText } from '../../../shared/lib/format.ts';
import { useT, useTranslator } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, ItemIcon, useGameData } from '../../database/index.ts';
import { REMAKE_SECONDS } from '../historyModel.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';
import { MatchDetail } from './MatchDetail.tsx';

interface Props { game: CompactGame; player: CompactPlayer; open: boolean; onToggle: () => void }

export function MatchRow({ game: g, player: p, open, onToggle }: Props) {
  const t = useT();
  const { locale } = useTranslator();
  const data = useGameData();
  const { history } = useStore(useService(MatchHistoryService).store);
  const remake = g.duration < REMAKE_SECONDS;
  const recorded = history.some((h) => String(h.id) === String(g.id));
  return (
    <div className={`hist-row ${p.win ? 'win' : 'loss'} ${remake ? 'remake' : ''}`}>
      <button className="match-main" onClick={onToggle}>
        <span className="match-result"><strong>{t(remake ? 'history.remake' : p.win ? 'history.win' : 'history.loss')}</strong><span className="muted">{t(`queue.${g.type}`)}</span></span>
        <ChampIcon id={p.champ} size="sm" />
        <span className="mname"><strong>{data.champName(p.champ)}</strong><span className="muted">{`${fmtDate(g.created, locale)} · ${fmtMinutes(g.duration)}`}</span></span>
        <span className="role-badge">{p.pos ? <RoleIcon role={p.pos} /> : null}</span>
        <span className="mkda"><span className="live-kda">{kdaText(p.k, p.d, p.a)}</span><span className="muted small">{`${kdaRatio(p.k, p.d, p.a)} KDA`}</span></span>
        <span className="muted">{`${p.cs} CS · ${(p.cs / Math.max(1, g.duration / 60)).toFixed(1)}/min`}</span>
        <span className="pitems">{p.items.map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} size="xs" />)}</span>
        {recorded ? <span className="chip teal" title={t('history.recordedHint')}>{t('history.recorded')}</span> : <span />}
      </button>
      <div className="match-details" hidden={!open}>{open ? <MatchDetail game={g} /> : null}</div>
    </div>
  );
}
