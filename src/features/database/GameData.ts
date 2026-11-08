// The loaded database for the UI: champions, items, runes and summoner spells with the texts of
// one language, lookups by id, and icon URLs. The engine works on `db` (language independent).
import type { Db, DbMeta, DbTexts } from '../../core/data/types.ts';
import type { UiChampion, UiItem, UiRune, UiSummoner } from './types.ts';

export class GameData {
  readonly db: Db;
  readonly meta: DbMeta | null;
  readonly champions: UiChampion[];
  readonly items: UiItem[];
  readonly trees: UiRune[];
  private readonly byId: Record<string, UiChampion>;
  private readonly itemById: Record<number, UiItem>;
  private readonly runeById: Record<number, UiRune> = {};
  private readonly summonerById: Record<number, UiSummoner>;
  private readonly iconUrl: (rel: string) => string;

  constructor(db: Db, texts: DbTexts, iconUrl: (rel: string) => string) {
    this.db = db;
    this.meta = db.meta;
    this.iconUrl = iconUrl;
    // Texts may lack a record (a champion newer than the translation): the English name stays.
    const tx = { champions: texts.champions as Partial<DbTexts['champions']>, items: texts.items as Partial<DbTexts['items']>, runes: texts.runes as Partial<DbTexts['runes']>, summoners: texts.summoners as Partial<DbTexts['summoners']> };
    this.champions = db.champions.map((c): UiChampion => {
      const ct = tx.champions[c.id];
      return {
        ...c, name: c.id, title: '', blurb: '', allytips: [], enemytips: [], ...ct,
        passive: { name: '', description: '', ...(ct ? ct.passive : {}), icon: c.passiveIcon },
        spells: c.spells.map((s, i) => ({ name: s.key, description: '', costType: '', ...s, ...((ct && ct.spells[i]) || {}) })),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    this.items = db.items.map((i) => ({ ...i, name: i.nameEn, ...tx.items[i.id] }));
    this.trees = db.runes.trees.map((tree) => {
      const merged: UiRune = { ...tree, name: tx.runes[tree.id]?.name || tree.nameEn };
      merged.slots = tree.slots.map((row) => row.map((r) => {
        const rune: UiRune = { ...r, tree: tree.id, name: r.nameEn, ...tx.runes[r.id] };
        this.runeById[r.id] = rune;
        return rune;
      }));
      this.runeById[tree.id] = merged;
      return merged;
    });
    for (const s of db.runes.shards) this.runeById[s.id] = { ...s, shard: true };
    const summoners = db.summoners.map((s) => ({ ...s, name: s.nameEn, ...tx.summoners[s.id] }));
    this.byId = Object.fromEntries(this.champions.map((c) => [c.id, c]));
    this.itemById = Object.fromEntries(this.items.map((i) => [i.id, i]));
    this.summonerById = Object.fromEntries(summoners.map((s) => [s.id, s]));
  }

  champ(id: string | null | undefined): UiChampion | null { return id ? this.byId[id] || null : null; }
  item(id: number | null | undefined): UiItem | null { return id ? this.itemById[id] || null : null; }
  rune(id: number | null | undefined): UiRune | null { return id ? this.runeById[id] || null : null; }
  summoner(id: number | null | undefined): UiSummoner | null { return id ? this.summonerById[id] || null : null; }
  asset(rel: string): string { return this.iconUrl(rel); }

  champName(id: string | null | undefined): string {
    const c = this.champ(id);
    return c ? c.name : id || '?';
  }
}
