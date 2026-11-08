// A rune or stat shard icon with its tooltip (sanitized Data Dragon markup for runes).
import { useT } from '../../../shared/i18n/useT.ts';
import { useTooltip } from '../../../shared/ui/overlays/useTooltip.ts';
import { useGameData } from '../hooks/useGameData.ts';

export function RuneIcon({ id, size = '' }: { id: number | null | undefined; size?: '' | 'sm' | 'lg' }) {
  const data = useGameData();
  const t = useT();
  const r = data.rune(id);
  const tooltip = useTooltip(!r ? null : r.shard ? () => <div>{t(`shard.${r.id}`)}</div> : () => (
    <div>
      <h4>{r.name}</h4>
      {r.description ? <div className="item-desc" dangerouslySetInnerHTML={{ __html: r.description }} /> : null}
    </div>
  ));
  return (
    <div className={`rune-icon ${size} ${r && r.shard ? 'shard' : ''}`} {...tooltip}>
      {r ? <img src={data.asset(r.icon)} alt={r.name || ''} /> : null}
    </div>
  );
}
