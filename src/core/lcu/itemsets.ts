// Exports a recommended build to the in-game shop as a custom item set (LCU item-sets API).
// Only sets created by this app (uid prefix) are replaced; the player's own sets stay untouched.
import type { RawJson } from '../shared/json.ts';
import type { Build } from '../engine/types.ts';
import type { Lcu } from './types.ts';

const UID_PREFIX = 'lolhelper-';

export interface BlockNames { start: string; boots: string; core: string; situational: string; full: string }

type Entry = number | { id: number; count?: number };

export function toItemSet(build: Build, champKey: number, title: string, blockNames: BlockNames) {
  const block = (type: string, ids: Entry[]) => ({
    type,
    items: ids.map((x) => (typeof x === 'number' ? { id: String(x), count: 1 } : { id: String(x.id), count: x.count || 1 })),
  });
  const blocks = [
    block(blockNames.start, build.starters),
    build.boots ? block(blockNames.boots, [build.boots.id, ...(build.boots.upgrade ? [build.boots.upgrade] : [])]) : null,
    block(blockNames.core, build.core),
    block(blockNames.situational, build.situational),
    block(blockNames.full, build.full),
  ].filter((b): b is NonNullable<typeof b> => !!b && b.items.length > 0);
  return {
    uid: `${UID_PREFIX}${champKey}`,
    title,
    associatedChampions: [champKey],
    associatedMaps: [11],
    blocks,
    map: 'SR',
    mode: 'any',
    type: 'custom',
    sortrank: 0,
    startedFrom: 'blank',
    preferredItemSlots: [],
  };
}

export async function exportItemSet(lcu: Lcu, build: Build, champKey: number, title: string, blockNames: BlockNames): Promise<string> {
  const summoner = await lcu.get('/lol-summoner/v1/current-summoner');
  const endpoint = `/lol-item-sets/v1/item-sets/${summoner.summonerId}/sets`;
  const current = await lcu.get(endpoint);
  const set = toItemSet(build, champKey, title, blockNames);
  const itemSets = (current.itemSets || []).filter((s: RawJson) => s.uid !== set.uid);
  itemSets.unshift(set);
  await lcu.request('PUT', endpoint, { accountId: summoner.accountId, itemSets, timestamp: Date.now() });
  return set.uid;
}
