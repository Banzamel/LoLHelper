// Champions a champion is strong or weak against; each opens its own page.
import { useService } from '../../../shared/hooks/services.tsx';
import { Navigator } from '../../../shared/lib/Navigator.ts';
import { useGameData } from '../hooks/useGameData.ts';
import { ChampIcon } from './ChampIcon.tsx';

export function MatchupList({ title, ids }: { title: string; ids: string[] }) {
  const nav = useService(Navigator);
  const data = useGameData();
  return (
    <div>
      <h3 className="sub">{title}</h3>
      <div className="matchups">
        {ids.map((id) => (
          <button key={id} className="matchup" onClick={() => nav.navigate('champion', { id })}><ChampIcon id={id} size="sm" /><span>{data.champName(id)}</span></button>
        ))}
      </div>
    </div>
  );
}
