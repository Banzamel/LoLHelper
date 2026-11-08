// The League account the data belongs to: each account logged in on this computer has its own
// profile folder (account.json, settings, history, match cache). At launch the account last
// played is shown until the client reports who is logged in.
import { rankFrom } from '../../core/lcu/roster.ts';
import { lastPlayedAccount, profileDir, type Account } from '../../core/profiles/lastPlayedAccount.ts';
import type { RawJson } from '../../core/shared/json.ts';
import { queueWrite, readJson, type Storage } from '../../core/shared/storage.ts';
import { Store } from '../../shared/lib/Store.ts';
import type { ClientService } from '../client/index.ts';
import type { MatchHistoryService } from '../matchHistory/index.ts';
import type { SettingsService } from '../settings/index.ts';

const RETRY_MS = 5000;

export class AccountService {
  readonly store = new Store<{ profile: Account | null }>({ profile: null });

  constructor(
    private readonly storage: Storage,
    private readonly settings: SettingsService,
    private readonly history: MatchHistoryService,
    private readonly client: ClientService,
  ) {}

  get puuid(): string | null { return this.store.get().profile?.puuid ?? null; }

  async restoreLastPlayed() {
    const account = await lastPlayedAccount(this.storage);
    if (account) await this.switchTo(account);
  }

  // Switches settings, history and the match cache to the account's own folder.
  private async switchTo(account: Account) {
    const dir = profileDir(account.puuid);
    const current = this.store.get().profile;
    const changed = !current || current.puuid !== account.puuid;
    const saved = changed ? await readJson<Partial<Account>>(this.storage, `${dir}/account.json`, {}) : current;
    this.store.set({ profile: { ...saved, ...account } });
    if (!changed) return;
    await this.settings.useProfile(dir);
    await this.history.useProfile(dir, account.puuid);
  }

  // The account logged in to the client, saved with the time it was seen.
  private async activate(account: Account) {
    await this.switchTo({ ...account, lastSeenAt: new Date().toISOString() });
    const profile = this.store.get().profile;
    if (profile) await queueWrite(this.storage, `${profileDir(profile.puuid)}/account.json`, JSON.stringify(profile));
  }

  // Name, level, icon and ranks of the logged-in account; then its match history is refreshed.
  async loadAccount(): Promise<void> {
    let me: RawJson = null;
    try { me = await this.client.lcu.get('/lol-summoner/v1/current-summoner'); } catch { /* client still starting */ }
    if (!me || !me.puuid) {
      setTimeout(() => { if (this.client.connected) void this.loadAccount(); }, RETRY_MS);
      return;
    }
    let ranked: RawJson = null;
    try { ranked = await this.client.lcu.get('/lol-ranked/v1/current-ranked-stats'); } catch { /* unranked or unavailable */ }
    await this.activate({
      puuid: me.puuid, gameName: me.gameName || me.displayName || '', tagLine: me.tagLine || '',
      level: me.summonerLevel || null, icon: me.profileIconId || null,
      ranks: ranked ? { solo: rankFrom(ranked, 'RANKED_SOLO_5x5'), flex: rankFrom(ranked, 'RANKED_FLEX_SR') } : null,
    });
    void this.history.refresh();
  }
}
