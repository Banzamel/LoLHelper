// The recommendation engine with the app's context: the player's champion pool, overrides,
// mastery, history and — with the client connected — its recommended rune pages and the
// champions the player may pick. Also the build shown in the Build view.
import type { Role } from '../../core/data/types.ts';
import { recommendBuild } from '../../core/engine/builds/recommendBuild.ts';
import { championMatchups, suggestCounters, type CounterRequest } from '../../core/engine/counters/suggestCounters.ts';
import { closestPage } from '../../core/engine/loadout/runePages.ts';
import { inferRoles, type RolePick } from '../../core/engine/roles.ts';
import { runeGuide, type RuneGuide, type RuneGuideQuery } from '../../core/engine/runes.ts';
import { teamNotes, type TeamNotes, type TeamQuery } from '../../core/engine/team/teamNotes.ts';
import type { Build, BuildRequest, CounterPick } from '../../core/engine/types.ts';
import { recommendedPages, type ClientPage } from '../../core/lcu/perks.ts';
import { Store } from '../../shared/lib/Store.ts';
import type { ClientService } from '../client/index.ts';
import type { DatabaseService } from '../database/index.ts';
import type { MatchHistoryService } from '../matchHistory/index.ts';
import type { SettingsService } from '../settings/index.ts';

export interface BuildTarget { championId: string | null; enemyId: string | null; role: Role | null; enemyIds?: string[] }

export class BuildService {
  readonly store = new Store<{ target: BuildTarget }>({ target: { championId: null, enemyId: null, role: null } });
  private readonly pageCache = new Map<string, ClientPage[]>();

  constructor(
    private readonly database: DatabaseService,
    private readonly settings: SettingsService,
    private readonly client: ClientService,
    private readonly history: MatchHistoryService,
  ) {}

  private get db() {
    const data = this.database.data;
    if (!data) throw new Error('The database is not loaded');
    return data.db;
  }

  setTarget(target: BuildTarget) { this.store.set({ target }); }

  counters(req: CounterRequest & { useClient?: boolean }): CounterPick[] {
    const s = this.settings.value;
    return suggestCounters(this.db, {
      ...req, pool: s.pool, overrides: s.counterOverrides, mastery: this.client.mastery, history: this.history.learnFrom(),
      pickableIds: req.useClient ? this.client.pickable : null,
    });
  }

  matchups(id: string) { return championMatchups(this.db, id, this.settings.value.counterOverrides); }
  inferRoles(picks: RolePick[]) { return inferRoles(this.db, picks); }
  team(query: TeamQuery): TeamNotes { return teamNotes(this.db, query); }
  runes(query: RuneGuideQuery): RuneGuide { return runeGuide(this.db, query); }

  async build(req: BuildRequest): Promise<Build> {
    return this.withClientRunes(recommendBuild(this.db, { ...req, history: this.history.learnFrom() }));
  }

  // With the client connected, the rune page is the client-recommended page closest to ours,
  // so it is one the player is also offered in champion select.
  private async withClientRunes(build: Build): Promise<Build> {
    if (!this.client.connected || !build.runes) return build;
    const champ = this.db.byId[build.championId];
    const key = `${champ.key}:${build.role}`;
    try {
      if (!this.pageCache.has(key)) this.pageCache.set(key, await recommendedPages(this.client.lcu, champ.key, build.role));
    } catch { return build; }
    const page = closestPage(this.pageCache.get(key) || [], build.runes);
    if (!page) return build;
    const { primaryStyleId, subStyleId, selectedPerkIds } = page;
    return { ...build, runes: { primaryStyleId, subStyleId, selectedPerkIds, reasons: ['loadout.riotPage'] } };
  }
}
