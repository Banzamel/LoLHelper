// A champion's square icon ('+' for an empty slot).
import { cx } from '../../../shared/lib/format.ts';
import { useGameData } from '../hooks/useGameData.ts';

interface Props {
  id: string | null | undefined;
  size?: '' | 'xs' | 'sm' | 'lg';
  round?: boolean;
  banned?: boolean;
  title?: string;
  onClick?: () => void;
}

export function ChampIcon({ id, size = '', round = false, banned = false, title, onClick }: Props) {
  const data = useGameData();
  const c = data.champ(id);
  return (
    <div className={cx('champ-icon', size, round && 'round', banned && 'banned', !c && 'empty')} title={title || (c ? c.name : undefined)}
      onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {c ? <img src={data.asset(c.icon)} alt={c.name} loading="lazy" /> : '+'}
    </div>
  );
}
