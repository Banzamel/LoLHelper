// Helpers of the history views: game types in display order, the player's participant, and
// the player's record with a champion (from the matches the app recorded).
import type { HistoryEntry } from '../../core/history/types.ts';
import type { CompactGame, CompactPlayer } from '../../core/matches/types.ts';

export const QUEUE_TYPES = ['solo', 'flex', 'normal', 'clash', 'aram', 'arena', 'bots', 'rotating', 'custom'];
export const REMAKE_SECONDS = 300;

// The account's (or `puuid`'s) participant of a compact game.
export function mine(game: CompactGame, puuid: string | null | undefined): CompactPlayer | null {
  return game.players.find((p) => p.puuid && p.puuid === puuid) || (game.players.length === 1 ? game.players[0] : null);
}

export interface ChampionRecord { wins: number; games: number; vsWins: number; vsGames: number }

// Wins and games with a champion, overall and against one lane opponent.
export function recordOf(history: HistoryEntry[], championId: string | null, enemyId: string | null = null): ChampionRecord {
  const games = (history || []).filter((g) => g.championId === championId);
  const vs = enemyId ? games.filter((g) => g.opponentId === enemyId) : [];
  return { wins: games.filter((g) => g.win).length, games: games.length, vsWins: vs.filter((g) => g.win).length, vsGames: vs.length };
}
