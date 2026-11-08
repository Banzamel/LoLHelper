// A player's recent results, champions and roles from their client match history.
import { pct, kdaText } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { BarList } from '../../../shared/ui/charts/BarList.tsx';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { ResultStrip } from '../../../shared/ui/charts/ResultStrip.tsx';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, useGameData } from '../../database/index.ts';
import { mine } from '../historyModel.ts';
import type { PlayerSheetData } from '../MatchHistoryService.ts';
import { StatTile } from './StatTile.tsx';
import { TraitChips } from './TraitChips.tsx';

export function PlayerHistory({ data: p, championId }: { data: PlayerSheetData; championId: string | null }) {
  const t = useT();
  const data = useGameData();
  const a = p.analysis;
  if (!a || !a.games) return <p className="muted">{t(p.historyHidden ? 'player.historyHidden' : 'player.noGames')}</p>;
  const onChamp = a.byChampion.find((c) => c.key === championId);
  const results = p.games.map((g) => mine(g, p.puuid)).filter((x) => !!x).map((x) => x.win);
  return (
    <div className="sheet-history">
      <div className="stat-tiles">
        <StatTile label={t('player.winrate')} value={pct(a.winrate)} sub={t('player.games', { n: a.games })} tone={(a.winrate || 0) >= 0.5 ? 'plus' : 'minus'} />
        <StatTile label="KDA" value={String(a.kda ?? '—')} sub={`${a.k} / ${a.d} / ${a.a}`} />
        <StatTile label={t('player.csm')} value={String(a.csm ?? '—')} />
        {onChamp ? <StatTile label={t('player.onChampion', { champ: championId })} value={pct(onChamp.winrate)} sub={t('player.games', { n: onChamp.games })} />
          : championId ? <StatTile label={t('player.onChampion', { champ: championId })} value="—" sub={t('player.firstTime')} /> : null}
        {a.streak && a.streak.n >= 3 ? <StatTile label={t('player.streak')} value={t(a.streak.win ? 'player.winStreak' : 'player.lossStreak', { n: a.streak.n })} tone={a.streak.win ? 'plus' : 'minus'} /> : null}
      </div>
      <h3 className="sub">{t('player.recent')}</h3>
      <ResultStrip results={results.slice(0, 20)} />
      {a.traits.length ? <><h3 className="sub">{t('history.style')}</h3><TraitChips traits={a.traits} /></> : null}
      <div className="sheet-cols">
        <div>
          <h3 className="sub">{t('player.champions')}</h3>
          <BarList rows={a.byChampion.slice(0, 5).map((c) => ({
            label: <span className="bar-champ"><ChampIcon id={c.key} size="xs" />{data.champName(c.key)}</span>,
            value: c.games, color: (c.winrate || 0) >= 0.5 ? COLORS.ally : COLORS.enemy, text: `${c.games} · ${pct(c.winrate)}`,
          }))} />
        </div>
        {a.byRole.length ? (
          <div>
            <h3 className="sub">{t('player.roles')}</h3>
            <BarList rows={a.byRole.map((r) => ({ label: <span className="role-badge"><RoleIcon role={r.key} />{t(`role.${r.key}`)}</span>, value: r.games, color: COLORS.gold, text: `${r.games} · ${pct(r.winrate)}` }))} />
          </div>
        ) : null}
      </div>
      <h3 className="sub">{t('player.lastGames')}</h3>
      <div className="mini-games">
        {p.games.slice(0, 10).map((g) => {
          const me = mine(g, p.puuid);
          if (!me) return null;
          return (
            <div key={g.id} className={`mini-game ${me.win ? 'win' : 'loss'}`}>
              <ChampIcon id={me.champ} size="xs" /><span>{t(`queue.${g.type}`)}</span><span className="live-kda">{kdaText(me.k, me.d, me.a)}</span>
              <span className="muted">{`${me.cs} CS`}</span><span className="muted">{new Date(g.created).toLocaleDateString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
