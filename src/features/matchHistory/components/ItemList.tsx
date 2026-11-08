// Items with names and prices, for "what exactly does this player have".
import { useT } from '../../../shared/i18n/useT.ts';
import { ItemIcon, useGameData } from '../../database/index.ts';

export function ItemList({ ids }: { ids: number[] }) {
  const t = useT();
  const data = useGameData();
  const list = (ids || []).filter((id) => { const it = data.item(id); return !!it && !['consumable', 'trinket'].includes(it.category); });
  if (!list.length) return <p className="muted small">{t('player.noItems')}</p>;
  return (
    <div className="item-list">
      {list.map((id, i) => (
        <div className="item-line" key={`${id}-${i}`}><ItemIcon id={id} size="sm" /><span>{data.item(id)?.name}</span><span className="gold-text">{String(data.item(id)?.gold.total)}</span></div>
      ))}
    </div>
  );
}
