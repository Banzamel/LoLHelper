// What the player has in this game: score, CS, level, item gold, vision and items.
import { kdaRatio, kdaText } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ItemList } from './ItemList.tsx';
import type { SheetPlayer } from './PlayerSheet.tsx';
import { StatTile } from './StatTile.tsx';

export function PlayerThisGame({ player: p }: { player: SheetPlayer }) {
  const t = useT();
  const s = p.scores || {};
  const [k, d, a] = [s.kills || 0, s.deaths || 0, s.assists || 0];
  return (
    <section>
      <h3 className="sub">{t('player.thisGame')}</h3>
      <div className="stat-tiles">
        <StatTile label="KDA" value={kdaText(k, d, a)} sub={kdaRatio(k, d, a)} />
        <StatTile label="CS" value={String(s.creepScore || 0)} />
        {p.level ? <StatTile label={t('live.level')} value={String(p.level)} /> : null}
        {typeof p.itemGold === 'number' ? <StatTile label={t('live.itemGold')} value={String(p.itemGold)} /> : null}
        {typeof s.wardScore === 'number' ? <StatTile label={t('live.vision')} value={String(Math.round(s.wardScore))} /> : null}
      </div>
      <ItemList ids={p.items || []} />
    </section>
  );
}
