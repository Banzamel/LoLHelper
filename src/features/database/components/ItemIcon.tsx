// An item icon with its tooltip; nameOnly: just the name (the small in-game widget, where
// data-tip lets the widget find the item under the forwarded cursor).
import { useTooltip } from '../../../shared/ui/overlays/useTooltip.ts';
import { useGameData } from '../hooks/useGameData.ts';
import { ItemTooltip } from './ItemTooltip.tsx';

interface Props {
  id: number | null | undefined;
  size?: '' | 'xs' | 'sm' | 'lg';
  count?: number;
  nameOnly?: boolean;
  onClick?: () => void;
}

export function ItemIcon({ id, size = '', count, nameOnly = false, onClick }: Props) {
  const data = useGameData();
  const it = data.item(id);
  const tooltip = useTooltip(it ? () => (nameOnly ? <div className="tt-name">{it.name}</div> : <ItemTooltip item={it} />) : null);
  return (
    <div className={`item-icon ${size}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined} data-tip={it ? it.name : undefined} {...tooltip}>
      {it ? <img src={data.asset(it.icon)} alt={it.name} loading="lazy" /> : null}
      {count && count > 1 ? <span className="count">{String(count)}</span> : null}
    </div>
  );
}
