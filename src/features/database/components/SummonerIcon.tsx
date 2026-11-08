// A summoner spell icon with its tooltip (name, cooldown, description).
import { useTooltip } from '../../../shared/ui/overlays/useTooltip.ts';
import { useGameData } from '../hooks/useGameData.ts';

export function SummonerIcon({ id }: { id: number | null | undefined }) {
  const data = useGameData();
  const s = data.summoner(id);
  const tooltip = useTooltip(s ? () => (
    <div><h4>{s.name}</h4><div className="tt-cost">{s.cooldown}s</div><div>{s.description}</div></div>
  ) : null);
  return <div className="item-icon" {...tooltip}>{s ? <img src={data.asset(s.icon)} alt={s.name} /> : null}</div>;
}
