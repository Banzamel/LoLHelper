// Loads the active database (the downloaded copy when at least as new as the bundled one) with
// the texts of the current language, and downloads a new one from Data Dragon on request.
import { buildDatabase, latestVersion, type Progress } from '../../core/data/builder/buildDatabase.ts';
import { chooseDatabase, compareVersions, loadDatabase, readMeta } from '../../core/data/store.ts';
import type { DbMeta, DbTexts } from '../../core/data/types.ts';
import { assetUrl, builderIo, commitDatabase, databaseReader, dataFolders, fetchJson, startDatabaseBuild, type DatabaseSource } from '../../platform/index.ts';
import { I18nService } from '../../shared/i18n/I18nService.ts';
import { Store } from '../../shared/lib/Store.ts';
import { GameData } from './GameData.ts';

export interface DatabaseState { data: GameData | null; loaded: boolean; progress: Progress | null }

export class DatabaseService {
  readonly store = new Store<DatabaseState>({ data: null, loaded: false, progress: null });
  private readonly i18n: I18nService;
  private source: DatabaseSource | null = null;

  constructor(i18n: I18nService) {
    this.i18n = i18n;
  }

  get data(): GameData | null { return this.store.get().data; }

  private async activeSource(): Promise<DatabaseSource | null> {
    const [user, bundled] = await Promise.all([readMeta(databaseReader('user')), readMeta(databaseReader('bundled'))]);
    return chooseDatabase(user, bundled);
  }

  // Loads (or reloads in another language) the active database.
  async load(lang: string): Promise<GameData | null> {
    this.source = await this.activeSource();
    if (!this.source) {
      this.store.set({ data: null, loaded: true });
      return null;
    }
    const read = databaseReader(this.source);
    const [db, folders, textsJson] = await Promise.all([loadDatabase(read), dataFolders(), read(`texts/${lang}.json`)]);
    const texts: DbTexts = JSON.parse(textsJson || (await read('texts/en.json')) || '{"champions":{},"items":{},"runes":{},"summoners":{}}');
    const source = this.source;
    const data = new GameData(db, texts, (rel) => assetUrl(folders, source, rel));
    this.store.set({ data, loaded: true });
    this.i18n.setChampionNames((id) => data.champName(id));
    return data;
  }

  async checkUpdate(): Promise<{ current: string | null; latest: string; outdated: boolean }> {
    const latest = await latestVersion(fetchJson);
    const meta: DbMeta | null = this.data ? this.data.meta : null;
    const current = meta ? meta.version : null;
    return { current, latest, outdated: !current || compareVersions(latest, current) > 0 };
  }

  // Downloads a new database next to the current one and switches to it once complete.
  async update(lang: string): Promise<DbMeta> {
    await startDatabaseBuild();
    try {
      const meta = await buildDatabase({ io: builderIo(), onProgress: (progress) => this.store.set({ progress }) });
      await commitDatabase();
      await this.load(lang);
      return meta;
    } finally {
      this.store.set({ progress: null });
    }
  }
}
