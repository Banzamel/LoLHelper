// One team as a table: rank, level, KDA, CS and CS/min, item gold, vision and items; a player
// opens the player sheet.
import type { LivePlayer, PlayingGame } from '../../../core/live/types.ts';
import { fmtGold, kdaText } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import { ChampIcon, ItemIcon, useGameData } from '../../database/index.ts';
import { usePlayerSheet } from '../../matchHistory/index.ts';
import { bought, csPerMin } from '../gameModel.ts';

interface Props { list: LivePlayer[]; game: PlayingGame; ally: boolean; opp: LivePlayer | null; maxGold: number; sort: (a: LivePlayer, b: LivePlayer) => number }

const sum = (list: LivePlayer[], f: (p: LivePlayer) => number | undefined) => list.reduce((s, p) => s + (f(p) || 0), 0);

export function TeamTable({ list, game, ally, opp, maxGold, sort }: Props) {
  const t = useT();
  const data = useGameData();
  const openPlayer = usePlayerSheet();
  return (
    <section className={`card team-card ${ally ? 'ally' : 'enemy'}`}>
      <div className="team-head">
        <h2 className={ally ? 'ally-title' : 'enemy-title'}>{t(ally ? 'draft.allies' : 'draft.enemies')}</h2>
        <span className="muted">{kdaText(sum(list, (p) => p.scores.kills), sum(list, (p) => p.scores.deaths), sum(list, (p) => p.scores.assists))}</span>
        <span className="gold-text">{fmtGold(sum(list, (p) => p.itemGold))}</span>
        <span className="muted">{`${sum(list, (p) => p.scores.creepScore)} CS`}</span>
      </div>
      <div className="ptable">
        <div className="prow phead">
          <span /><span>{t('live.colPlayer')}</span><span>{t('live.colRank')}</span><span>KDA</span>
          <span>CS</span><span>{t('live.itemGoldShort')}</span><span>{t('live.colVision')}</span><span>{t('live.colItems')}</span>
        </div>
        {list.slice().sort(sort).map((p) => {
          const s = p.scores;
          return (
            <button key={p.name} className={`prow ${p.name === game.me.name ? 'me' : ''} ${opp && p.name === opp.name ? 'opponent' : ''} ${p.dead ? 'dead' : ''}`} onClick={() => openPlayer(p, { ally })}>
              <span className="role-badge">{p.position ? <RoleIcon role={p.position} /> : null}</span>
              <span className="pcell-player">
                <span className="plevel-wrap"><ChampIcon id={p.championId} size="sm" /><span className="plevel">{String(p.level)}</span></span>
                <span className="pname"><strong>{data.champ(p.championId) ? data.champName(p.championId) : p.championId}</strong><span className="muted">{p.dead ? t('live.respawn', { n: p.respawn }) : p.name || ''}</span></span>
              </span>
              <span><RankBadge rank={p.rank} compact />{p.rank ? null : <span className="muted">—</span>}</span>
              <span className="live-kda">{kdaText(s.kills || 0, s.deaths || 0, s.assists || 0)}</span>
              <span>{String(s.creepScore || 0)}<span className="muted small">{` ${csPerMin(s.creepScore, game)}`}</span></span>
              <span className="pgold"><span className="gold-text">{fmtGold(p.itemGold)}</span><i style={{ width: `${(p.itemGold / maxGold) * 100}%`, background: ally ? COLORS.ally : COLORS.enemy }} /></span>
              <span>{String(Math.round(s.wardScore || 0))}</span>
              <span className="pitems">{bought(data, p.items).map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} size="xs" />)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
