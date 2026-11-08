// Exports to the League client: the build as an item set in the shop, the rune page and the
// summoner spells (champion select only).
import type { Build, RunePage } from '../../core/engine/types.ts';
import { exportItemSet, type BlockNames } from '../../core/lcu/itemsets.ts';
import { exportRunePage, exportSummonerSpells, type ExportResult } from '../../core/lcu/perks.ts';
import type { ClientService } from '../client/index.ts';
import type { DatabaseService } from '../database/index.ts';
import type { SettingsService } from '../settings/index.ts';

export class ExportService {
  constructor(
    private readonly client: ClientService,
    private readonly database: DatabaseService,
    private readonly settings: SettingsService,
  ) {}

  itemSet(build: Build, title: string, blockNames: BlockNames): Promise<string> {
    const champ = this.database.data?.db.byId[build.championId];
    if (!champ) return Promise.reject(new Error(`Unknown champion ${build.championId}`));
    return exportItemSet(this.client.lcu, build, champ.key, title, blockNames);
  }

  runePage(runes: RunePage, name: string, overwriteCurrent = false): Promise<ExportResult> {
    return exportRunePage(this.client.lcu, runes, name, { overwriteCurrent });
  }

  spells(ids: number[]): Promise<ExportResult> {
    return exportSummonerSpells(this.client.lcu, ids, { flashOnD: this.settings.value.flashOnD });
  }
}
