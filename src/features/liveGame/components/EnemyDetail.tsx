// One enemy in detail: profile line, keystone to watch out for, figures, items, the stats their
// items give with what to do about it, and a comparison with the player.
import type { EnemyKeystone } from '../../../core/engine/runes.ts';
import type { LivePlayer, PlayingGame } from '../../../core/live/types.ts';
import { kdaRatio, kdaText } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import { WatchLine } from '../../builds/index.ts';
import { ChampIcon, RuneIcon, SummonerIcon, useGameData } from '../../database/index.ts';
import { ItemList, StatTile, usePlayerSheet } from '../../matchHistory/index.ts';
import { enemyTips, itemStats, STAT_ROWS } from '../enemyStats.ts';
import { csPerMin } from '../gameModel.ts';
import { DuelRow } from './DuelRow.tsx';

interface Props { player: LivePlayer; game: PlayingGame; opp: LivePlayer | null; keystone: EnemyKeystone | undefined }

export function EnemyDetail({ player: p, game, opp, keystone }: Props) {
  const t = useT();
  const data = useGameData();
  const openPlayer = usePlayerSheet();
  const s = p.scores || {};
  const stats = itemStats(data, p.items);
  const tips = enemyTips(data, stats, game);
  const me = game.me;
  return (
    <div className="enemy-detail">
      <div className="card enemy-head">
        <ChampIcon id={p.championId} size="lg" />
        <div className="enemy-title">
          <h2>{data.champ(p.championId) ? data.champName(p.championId) : p.championId}</h2>
          <div className="muted">{p.name || ''}</div>
          <div className="chips">
            {p.position ? <span className="role-badge"><RoleIcon role={p.position} />{t(`role.${p.position}`)}</span> : null}
            {opp && opp.name === p.name ? <span className="chip minus">{t('draft.laneOpponent')}</span> : null}
            <RankBadge rank={p.rank} />
            {p.dead ? <span className="chip minus">{t('live.respawn', { n: p.respawn })}</span> : null}
          </div>
        </div>
        <div className="enemy-loadout">{(p.spells || []).map((id, i) => <SummonerIcon key={i} id={id} />)}{p.keystone ? <RuneIcon id={p.keystone} /> : null}</div>
        <button className="btn small" onClick={() => openPlayer(p, { ally: false })}>{t('live.openProfile')}</button>
      </div>
      {keystone && keystone.watch ? <div className="card enemy-keystone"><div className="card-kicker">{t('rune.watchOut')}</div><WatchLine entry={keystone} /></div> : null}
      <div className="stat-tiles">
        <StatTile label="KDA" value={kdaText(s.kills || 0, s.deaths || 0, s.assists || 0)} sub={kdaRatio(s.kills || 0, s.deaths || 0, s.assists || 0)} />
        <StatTile label="CS" value={String(s.creepScore || 0)} sub={t('live.perMin', { n: csPerMin(s.creepScore, game) })} />
        <StatTile label={t('live.level')} value={String(p.level)} />
        <StatTile label={t('live.itemGold')} value={String(p.itemGold)} tone={p.itemGold > me.itemGold ? 'minus' : 'plus'} />
        <StatTile label={t('live.vision')} value={String(Math.round(s.wardScore || 0))} />
      </div>
      <div className="enemy-grid">
        <div className="card"><div className="card-kicker">{t('live.theirItems')}</div><ItemList ids={p.items} /></div>
        <div className="card">
          <div className="card-kicker">{t('live.theirStats')}</div>
          <div className="chips">{STAT_ROWS.filter(([k]) => stats[k]).map(([k, label]) => <span key={k} className="chip">{`${label.startsWith('stat.') ? t(label) : label} +${Math.round(stats[k])}`}</span>)}</div>
          {tips.length ? <ul className="tips enemy-tips">{tips.map((k) => <li key={k}>{t(k)}</li>)}</ul> : <p className="muted small">{t('enemy.noTips')}</p>}
        </div>
        <div className="card">
          <div className="card-kicker">{t('live.youVsThem')}</div>
          <DuelRow label={t('live.itemGoldShort')} a={me.itemGold} b={p.itemGold} />
          <DuelRow label="CS" a={me.scores.creepScore || 0} b={s.creepScore || 0} />
          <DuelRow label={t('live.level')} a={me.level} b={p.level} />
          <DuelRow label={t('live.kills')} a={me.scores.kills || 0} b={s.kills || 0} />
        </div>
      </div>
    </div>
  );
}
