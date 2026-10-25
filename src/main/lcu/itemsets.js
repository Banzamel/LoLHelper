// Exports a recommended build to the in-game shop as a custom item set (LCU item-sets API).
// Only sets created by this app (uid prefix) are replaced; the player's own sets stay untouched.
const UID_PREFIX = 'lolhelper-';

function toItemSet(build, champKey, title, blockNames) {
  const block = (type, ids) => ({ type, items: ids.map((x) => ({ id: String(x.id || x), count: x.count || 1 })) });
  const blocks = [
    block(blockNames.start, build.starters),
    build.boots && block(blockNames.boots, [build.boots.id, ...(build.boots.upgrade ? [build.boots.upgrade] : [])]),
    block(blockNames.core, build.core),
    block(blockNames.situational, build.situational),
    block(blockNames.full, build.full),
  ].filter((b) => b && b.items.length);
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

async function exportItemSet(lcu, build, champKey, title, blockNames) {
  const summoner = await lcu.get('/lol-summoner/v1/current-summoner');
  const endpoint = `/lol-item-sets/v1/item-sets/${summoner.summonerId}/sets`;
  const current = await lcu.get(endpoint);
  const set = toItemSet(build, champKey, title, blockNames);
  const itemSets = (current.itemSets || []).filter((s) => s.uid !== set.uid);
  itemSets.unshift(set);
  await lcu.request('PUT', endpoint, { accountId: summoner.accountId, itemSets, timestamp: Date.now() });
  return set.uid;
}

module.exports = { exportItemSet };
