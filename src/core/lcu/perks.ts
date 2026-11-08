// Exports a rune page and summoner spells to the League client.
// The rune page reuses a page created by this app (name prefix) when one exists; if the
// account has no free page, the caller can confirm overwriting the currently selected page.
import type { Role } from '../data/types.ts';
import type { RunePage } from '../engine/types.ts';
import type { RawJson } from '../shared/json.ts';
import type { Lcu } from './types.ts';

const PAGE_PREFIX = 'LoL Helper';
const FLASH = 4;

export type ExportResult = { status: 'ok' | 'noSlot' };

export async function exportRunePage(lcu: Lcu, runes: RunePage, name: string, { overwriteCurrent = false } = {}): Promise<ExportResult> {
  const pages: RawJson[] = await lcu.get('/lol-perks/v1/pages');
  const body = {
    name: `${PAGE_PREFIX}: ${name}`.slice(0, 25),
    primaryStyleId: runes.primaryStyleId,
    subStyleId: runes.subStyleId,
    selectedPerkIds: runes.selectedPerkIds,
    current: true,
  };
  const ours = pages.find((p) => p.isEditable && p.name.startsWith(PAGE_PREFIX));
  if (ours) {
    await lcu.request('DELETE', `/lol-perks/v1/pages/${ours.id}`);
    await lcu.request('POST', '/lol-perks/v1/pages', body);
    return { status: 'ok' };
  }
  try {
    await lcu.request('POST', '/lol-perks/v1/pages', body);
    return { status: 'ok' };
  } catch (err) {
    if (!overwriteCurrent) return { status: 'noSlot' };
    const current = pages.find((p) => p.current && p.isEditable) || pages.find((p) => p.isEditable && p.isDeletable);
    if (!current) throw err;
    await lcu.request('DELETE', `/lol-perks/v1/pages/${current.id}`);
    await lcu.request('POST', '/lol-perks/v1/pages', body);
    return { status: 'ok' };
  }
}

// [D, F] with Flash on the key the player wants it on.
export function spellOrder([spell1Id, spell2Id]: number[], flashOnD: boolean): [number, number] {
  if (spell1Id !== FLASH && spell2Id !== FLASH) return [spell1Id, spell2Id];
  const other = spell1Id === FLASH ? spell2Id : spell1Id;
  return flashOnD ? [FLASH, other] : [other, FLASH];
}

// Works only during champion select (same as picking the spells by hand).
export async function exportSummonerSpells(lcu: Lcu, ids: number[], { flashOnD = true } = {}): Promise<ExportResult> {
  const [spell1Id, spell2Id] = spellOrder(ids, flashOnD);
  await lcu.request('PATCH', '/lol-champ-select/v1/session/my-selection', { spell1Id, spell2Id });
  return { status: 'ok' };
}

export interface ClientPage extends RunePage { spells: number[] }

// The rune pages the client itself recommends for a champion (the ones offered in champion
// select), in the app's format.
export async function recommendedPages(lcu: Lcu, championKey: number, position: Role | null): Promise<ClientPage[]> {
  const pos = position === 'SUPPORT' ? 'UTILITY' : position || 'NONE';
  const pages: RawJson[] = await lcu.get(`/lol-perks/v1/recommended-pages/champion/${championKey}/position/${pos}/map/11`);
  return (pages || []).filter((p) => p.perks && p.perks.length === 9).map((p) => ({
    primaryStyleId: p.primaryPerkStyleId,
    subStyleId: p.secondaryPerkStyleId,
    selectedPerkIds: p.perks.map((x: RawJson) => x.id),
    spells: p.summonerSpellIds || [],
  }));
}
