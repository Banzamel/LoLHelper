// The database as the views use it: language-independent records merged with the texts of
// the current language.
import type { Champion, ChampionSpell, Item, Rune, SummonerSpell } from '../../core/data/types.ts';

export interface UiSpell extends ChampionSpell { name: string; description: string; costType: string }

export interface UiChampion extends Omit<Champion, 'spells'> {
  name: string;
  title: string;
  blurb: string;
  allytips: string[];
  enemytips: string[];
  passive: { name: string; description: string; icon: string };
  spells: UiSpell[];
}

export interface UiItem extends Item { name: string; plaintext?: string; description?: string }

export interface UiRune extends Omit<Rune, 'key' | 'nameEn'> {
  key?: string;
  nameEn?: string;
  name?: string;
  description?: string;
  tree?: number;
  shard?: boolean;
  slots?: UiRune[][];
}

export interface UiSummoner extends SummonerSpell { name: string; description?: string }

