// The account the history belongs to: name, level, ranks, last sync and the sync button.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { fmtDate } from '../../../shared/lib/format.ts';
import { useT, useTranslator } from '../../../shared/i18n/useT.ts';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import { AccountService } from '../../account/index.ts';
import { ClientService } from '../../client/index.ts';
import { MatchHistoryService } from '../MatchHistoryService.ts';
import { ProfileIcon } from './ProfileIcon.tsx';

export function ProfileCard() {
  const t = useT();
  const { locale } = useTranslator();
  const service = useService(MatchHistoryService);
  const { matches: m } = useStore(service.store);
  const { profile: p } = useStore(useService(AccountService).store);
  const connected = useStore(useService(ClientService).store).lcu.connected;
  if (!p) return <div className="card profile-card"><p>{t('history.noProfile')}</p><p className="muted small">{t('history.noProfileHint')}</p></div>;
  const ranks = p.ranks || { solo: null, flex: null };
  const syncLine = m.syncing ? t('history.syncing') : m.lastSync ? t('history.lastSync', { date: fmtDate(Date.parse(m.lastSync), locale), n: m.games.length }) : t('history.neverSynced');
  return (
    <div className="card profile-card">
      <ProfileIcon id={p.icon} size="lg" />
      <div className="profile-text">
        <h2>{p.gameName || '—'}<span className="muted">{p.tagLine ? ` #${p.tagLine}` : ''}</span></h2>
        <div className="chips">
          {/* Without the client this is the account last played on this computer, as saved. */}
          {connected ? null : <span className="chip" title={t('history.lastPlayedHint')}>{t('history.lastPlayed')}</span>}
          {p.level ? <span className="chip">{t('player.accountLevel', { n: p.level })}</span> : null}
          {ranks.solo ? <span className="rank-pair"><span className="muted small">{t('queue.solo')}</span><RankBadge rank={ranks.solo} /></span> : null}
          {ranks.flex ? <span className="rank-pair"><span className="muted small">{t('queue.flex')}</span><RankBadge rank={ranks.flex} /></span> : null}
        </div>
        <div className="muted small">{syncLine}</div>
      </div>
      <div className="spacer" />
      <button className="btn small" disabled={!connected || m.syncing} title={connected ? t('history.syncHint') : t('build.needClient')}
        onClick={() => { void service.refresh({ deep: true }); }}>{t('history.sync')}</button>
    </div>
  );
}
