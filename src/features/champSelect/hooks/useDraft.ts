// Everything the Draft view shows, derived from the live draft (or the manual one): the model,
// the lane opponent, counter-picks, team notes and — once the player has a champion — the
// build and rune guide for it.
import type { RuneGuide } from '../../../core/engine/runes.ts';
import type { Build } from '../../../core/engine/types.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useAsync } from '../../../shared/hooks/useAsync.ts';
import { BuildService } from '../../builds/index.ts';
import { ClientService } from '../../client/index.ts';
import { useGameData } from '../../database/index.ts';
import { MatchHistoryService } from '../../matchHistory/index.ts';
import { SettingsService } from '../../settings/index.ts';
import { ChampSelectService } from '../ChampSelectService.ts';
import { counterQuery, draftGuideQuery, liveModel, manualModel, opponentOf, teamQuery } from '../draftModel.ts';

export function useDraft() {
  const data = useGameData();
  const builds = useService(BuildService);
  const client = useStore(useService(ClientService).store);
  const manual = useStore(useService(ChampSelectService).store);
  // The history and pool change the recommendations too.
  const { history } = useStore(useService(MatchHistoryService).store);
  const { settings } = useStore(useService(SettingsService).store);
  const model = client.draft ? liveModel(client.draft, manual) : manualModel(manual, (picks) => builds.inferRoles(picks));
  const opponent = opponentOf(data, model, manual.opponent);
  const recs = builds.counters(counterQuery(model, opponent));
  const notes = builds.team(teamQuery(model));
  const me = model.allies.find((a) => a.isMe);
  const myChamp = me && data.champ(me.championId) ? me.championId : null;
  const query = myChamp ? { championId: myChamp, enemyId: opponent, role: model.myRole, enemyIds: model.enemies.map((e) => e.championId).filter((id): id is string => !!id) } : null;
  const { value } = useAsync<{ build: Build; guide: RuneGuide } | null>(async () => {
    if (!query) return null;
    const build = await builds.build(query);
    return { build, guide: builds.runes(draftGuideQuery(build, model, opponent)) };
  }, [query, client.lcu.connected, history.length, settings.pool]);
  const setup = value && query && value.build.championId === query.championId ? value : null;
  return { model, opponent, recs, notes, me, setup, client, manual };
}
