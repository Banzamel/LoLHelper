// Champion archetype checks shared by the build, counter and team rules. Archetypes come from
// Meraki Analytics (MARKSMAN, ENCHANTER, VANGUARD…); a missing champion has none.
import type { Champion } from '../data/types.ts';

export const hasArchetype = (c: Champion | null | undefined, archetypes: readonly string[]) =>
  !!c && c.archetypes.some((a) => archetypes.includes(a));
