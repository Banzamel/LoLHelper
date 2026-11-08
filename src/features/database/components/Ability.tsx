// One ability (or the passive) with its icon, cooldown, cost, range and description.
import { useT } from '../../../shared/i18n/useT.ts';
import { useGameData } from '../hooks/useGameData.ts';

interface AbilityData { name: string; description: string; icon: string; cooldown?: string; cost?: string; range?: string }

export function Ability({ hotkey, ability: a }: { hotkey: string; ability: AbilityData }) {
  const t = useT();
  const data = useGameData();
  const meta: string[] = [];
  if (a.cooldown && a.cooldown !== '0') meta.push(`${t('champion.cooldown')}: ${a.cooldown}s`);
  if (a.cost && a.cost !== '0') meta.push(`${t('champion.cost')}: ${a.cost}`);
  if (a.range && a.range !== '25000' && a.range !== '0') meta.push(`${t('champion.range')}: ${a.range}`);
  return (
    <div className="ability">
      <div className="ability-icon"><img src={data.asset(a.icon)} alt={a.name} /><span>{hotkey}</span></div>
      <div>
        <h3>{a.name}</h3>
        {meta.length ? <div className="muted ability-meta">{meta.join(' · ')}</div> : null}
        <p className="ability-desc">{a.description}</p>
      </div>
    </div>
  );
}
