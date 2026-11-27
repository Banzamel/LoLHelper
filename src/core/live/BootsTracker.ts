// Boots the Live Client API does not report. Since the 2026 role quests boots can sit in an extra
// slot (the bot lane quest moves them there, the Magical Footwear rune grants them there) and the
// API lists only slots 0–6, so the player's boots vanish from the inventory. Per match this
// remembers the boots once seen, assumes the rune's boots once granted, and reads a purchase that
// changed no visible item as an upgrade of the hidden boots.
import type { Db } from '../data/types.ts';
import { isFinishedBoots } from '../engine/live/purchases.ts';
import type { HiddenBoots, LiveGame } from './types.ts';

const BOOTS = 1001;
const RUNE_BOOTS = 2422;
const MAGICAL_FOOTWEAR = 8304;
// The rune grants its boots at 12:00, 45 s earlier per champion takedown.
const RUNE_GRANT_AT = 12 * 60;
const RUNE_TAKEDOWN_BONUS = 45;
// More than any consumable that stays in the inventory: a purchase this big that changed no
// visible item went into the hidden slot (elixirs are drunk on purchase and cost 500).
const HIDDEN_PURCHASE = 600;

const sameItems = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function runeBootsGranted(game: LiveGame): boolean {
  const me = game.me;
  if (!me || !me.runes || !me.runes.selectedPerkIds.includes(MAGICAL_FOOTWEAR)) return false;
  const takedowns = (me.scores.kills || 0) + (me.scores.assists || 0);
  return game.gameTime >= RUNE_GRANT_AT - RUNE_TAKEDOWN_BONUS * takedowns;
}

export class BootsTracker {
  private seen: HiddenBoots | null = null;
  private last: { t: number; gold: number; items: number[] } | null = null;

  reset() { this.seen = null; this.last = null; }

  track(game: LiveGame, db: Db): LiveGame {
    const me = game.me;
    if (!me) return game;
    if (this.last && game.gameTime < this.last.t - 30) this.reset();
    const visible = me.items.find((id) => isFinishedBoots(db, id)) ?? me.items.find((id) => id === BOOTS || id === RUNE_BOOTS);
    const prev = this.last;
    this.last = { t: game.gameTime, gold: me.gold, items: me.items.slice() };
    if (visible !== undefined) {
      this.seen = { id: visible, finished: isFinishedBoots(db, visible) };
      return game;
    }
    if (!this.seen && runeBootsGranted(game)) this.seen = { id: RUNE_BOOTS, finished: false };
    // Gold spent while the visible inventory stayed the same: the hidden boots were upgraded.
    if (this.seen && !this.seen.finished && prev && sameItems(prev.items, me.items) && prev.gold - me.gold >= HIDDEN_PURCHASE) {
      this.seen = { id: null, finished: true };
    }
    return this.seen ? { ...game, me: { ...me, hiddenBoots: { ...this.seen } } } : game;
  }
}
