// An opened game: both teams, the gold charts and, when the app recorded it, the purchase
// timeline. Details come from the client once and are cached.
import type { CompactGame } from '../../../core/matches/types.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useAsync } from '../../../shared/hooks/useAsync.ts';
import { fmtMinutes } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { AccountService } from '../../account/index.ts';
import { ClientService } from '../../client/index.ts';
import { ItemIcon } from '../../database/index.ts';
import { mine } from '../historyModel.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';
import { GoldChart } from './GoldChart.tsx';
import { TeamBlock } from './TeamBlock.tsx';

export function MatchDetail({ game: g }: { game: CompactGame }) {
  const t = useT();
  const service = useService(MatchHistoryService);
  const { history } = useStore(service.store);
  const { profile } = useStore(useService(AccountService).store);
  const connected = useStore(useService(ClientService).store).lcu.connected;
  const { value, error } = useAsync(() => service.detail(g.id), [g.id]);
  if (value === undefined && !error) return <p className="muted small">{t('player.loading')}</p>;
  const game = value || g;
  const me = mine(game, profile?.puuid);
  if (!me) return <p className="muted small">{t('history.noDetail')}</p>;
  const local = history.find((h) => String(h.id) === String(game.id));
  return (
    <>
      {game.full ? (
        <div className="match-teams"><TeamBlock game={game} teamId={me.team} me={me} /><TeamBlock game={game} teamId={me.team === 100 ? 200 : 100} me={me} /></div>
      ) : <p className="muted small">{t(connected ? 'history.noDetail' : 'player.offline')}</p>}
      <div className="muted small match-cols">{t('history.colsHint')}</div>
      <GoldChart game={game} me={me} />
      {local && local.purchases.length ? (
        <div className="match-buys">
          <div className="card-kicker">{t('history.timeline')}</div>
          <div className="hist-timeline">{local.purchases.map((p, i) => <div key={i} className="hist-buy"><ItemIcon id={p.id} size="sm" /><span className="muted">{fmtMinutes(p.t)}</span></div>)}</div>
        </div>
      ) : null}
    </>
  );
}
