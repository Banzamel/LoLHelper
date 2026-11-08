// Match history from the League client (/lol-match-history): the account's games of every
// mode, other players' recent games, and the per-minute gold of a game.
import type { Db } from '../data/types.ts';
import { rankFrom } from '../lcu/roster.ts';
import type { Lcu } from '../lcu/types.ts';
import type { RawJson } from '../shared/json.ts';
import { compactGame, compactTimeline } from './compactGame.ts';
import type { MatchStore } from './MatchStore.ts';
import type { CompactGame, PlayerProfile } from './types.ts';

const LIST_PAGE = 20;
const PLAYER_TTL = 5 * 60 * 1000;
const listUrl = (puuid: string, beg: number, end: number) => `/lol-match-history/v1/products/lol/${puuid}/matches?begIndex=${beg}&endIndex=${end}`;
const gamesOf = (res: RawJson): RawJson[] => (res && res.games && res.games.games) || [];

// Downloads the account's recent games (all pages when `deep`, else until nothing is new)
// and the details of the latest games known only from the list.
export async function syncMatches(lcu: Lcu, db: Db, store: MatchStore, puuid: string, { deep = false, details = 40 } = {}): Promise<void> {
  const max = deep ? 200 : 60;
  for (let beg = 0; beg < max; beg += LIST_PAGE) {
    const games = gamesOf(await lcu.get(listUrl(puuid, beg, beg + LIST_PAGE)));
    if (!games.length) break;
    const added = store.upsert(games.map((g) => compactGame(g, db)));
    if (!added && !deep) break;
  }
  for (const g of store.list().filter((x) => !x.full).slice(0, details)) {
    try { store.upsert([compactGame(await lcu.get(`/lol-match-history/v1/games/${g.id}`), db)]); } catch { /* removed or unavailable */ }
  }
  store.lastSync = new Date().toISOString();
  await store.save();
}

// A game with all players and its per-minute gold, from the cache when there; lcu null
// (client not connected) returns what is cached.
export async function matchDetail(lcu: Lcu | null, db: Db, store: MatchStore, id: number | string): Promise<CompactGame | null> {
  let game = store.get(id);
  if (!lcu) return game;
  if (!game || !game.full) {
    const full = compactGame(await lcu.get(`/lol-match-history/v1/games/${id}`), db);
    if (game) store.upsert([full]);
    game = store.get(id) || full;
  }
  if (game.gold === undefined) {
    try { game.gold = compactTimeline(await lcu.get(`/lol-match-history/v1/game-timelines/${id}`), game); } catch { game.gold = null; }
    await store.save();
  }
  return game;
}

// Any player's profile: name, level, ranks and the last games (cached for a few minutes).
export class PlayerLookup {
  private readonly cache = new Map<string, { at: number; data: PlayerProfile }>();

  async fetch(lcu: Lcu, db: Db, puuid: string): Promise<PlayerProfile> {
    const hit = this.cache.get(puuid);
    if (hit && Date.now() - hit.at < PLAYER_TTL) return hit.data;
    const [summoner, ranked, history] = await Promise.allSettled([
      lcu.get(`/lol-summoner/v2/summoners/puuid/${puuid}`),
      lcu.get(`/lol-ranked/v1/ranked-stats/${puuid}`),
      lcu.get(listUrl(puuid, 0, LIST_PAGE)),
    ]);
    const s = summoner.status === 'fulfilled' ? summoner.value || {} : {};
    const r = ranked.status === 'fulfilled' ? ranked.value : null;
    const data: PlayerProfile = {
      puuid,
      name: s.gameName || s.displayName || '',
      tag: s.tagLine || '',
      level: s.summonerLevel || null,
      icon: s.profileIconId || null,
      ranks: { solo: rankFrom(r, 'RANKED_SOLO_5x5'), flex: rankFrom(r, 'RANKED_FLEX_SR') },
      games: history.status === 'fulfilled' ? gamesOf(history.value).map((g) => compactGame(g, db)).sort((a, b) => b.created - a.created) : [],
      historyHidden: history.status !== 'fulfilled',
    };
    this.cache.set(puuid, { at: Date.now(), data });
    return data;
  }
}
