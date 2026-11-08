// Rune page, summoner spells and skill order, shared by the Build, Draft and Match views.
// `current` (the player's own runes and spells) adds a verdict to each panel; parts: which
// panels to show — Draft needs runes and spells only.
import type { RuneGuide } from '../../../core/engine/runes.ts';
import type { Build } from '../../../core/engine/types.ts';
import type { ClientRunePage } from '../../../core/lcu/types.ts';
import type { LiveRunePage } from '../../../core/live/types.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { ClientService } from '../../client/index.ts';
import { RunesPanel } from './RunesPanel.tsx';
import { SkillsPanel } from './SkillsPanel.tsx';
import { SpellsPanel } from './SpellsPanel.tsx';

interface Props {
  build: Build;
  inChampSelect?: boolean;
  current?: { runes: ClientRunePage | LiveRunePage | null; spells: (number | null)[] | null } | null;
  parts?: ('runes' | 'spells' | 'skills')[];
  guide?: RuneGuide | null;
}

export function LoadoutPanels({ build, inChampSelect, current = null, parts = ['runes', 'spells', 'skills'], guide = null }: Props) {
  const client = useStore(useService(ClientService).store);
  const connected = client.lcu.connected;
  const champSelect = inChampSelect ?? (connected && !!client.draft);
  return (
    <div className="loadout">
      {parts.includes('runes') ? <RunesPanel build={build} connected={connected} current={current ? current.runes : undefined} guide={guide} /> : null}
      <div className="loadout-side">
        {parts.includes('spells') ? <SpellsPanel build={build} inChampSelect={champSelect} current={current ? current.spells : undefined} /> : null}
        {parts.includes('skills') ? <SkillsPanel build={build} /> : null}
      </div>
    </div>
  );
}
