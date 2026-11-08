// Rune page, summoner spells and skill order for a champion class and the enemy threats.
import type { Champion, Db } from '../../data/types.ts';
import type { BuildClass, Loadout, Threats } from '../types.ts';
import { tune } from './presets.ts';
import { resolveRunes } from './runePages.ts';
import { pickSpells, skillOrder } from './skills.ts';

export interface LoadoutRequest {
  champ: Champion;
  cls: BuildClass;
  role: string | null;
  laner: Champion | null;
  threats: Threats;
}

export function recommendLoadout(db: Db, { champ, cls, role, laner, threats }: LoadoutRequest): Loadout {
  const { p, reasons } = tune(cls, role, laner, threats);
  const runes = db.runes.trees.length ? resolveRunes(db, p) : null;
  const spells = pickSpells(cls, role, laner, threats);
  const byKey = Object.fromEntries(db.summoners.map((s) => [s.key, s]));
  return {
    runes: runes && { ...runes, reasons },
    spells: { ids: spells.spells.map((k) => (byKey[k] ? byKey[k].id : null)).filter((id): id is number => id !== null), reason: spells.reason },
    skills: skillOrder(champ, cls),
  };
}
