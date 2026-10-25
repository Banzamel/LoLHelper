// Exports a rune page and summoner spells to the League client.
// The rune page reuses a page created by this app (name prefix) when one exists; if the
// account has no free page, the caller can confirm overwriting the currently selected page.
const PAGE_PREFIX = 'LoL Helper';

async function exportRunePage(lcu, runes, name, { overwriteCurrent = false } = {}) {
  const pages = await lcu.get('/lol-perks/v1/pages');
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

// Works only during champion select (same as picking the spells by hand).
async function exportSummonerSpells(lcu, [spell1Id, spell2Id], { flashOnD = true } = {}) {
  const flash = 4;
  const ids = spell1Id === flash || spell2Id === flash
    ? (flashOnD ? [flash, spell1Id === flash ? spell2Id : spell1Id] : [spell1Id === flash ? spell2Id : spell1Id, flash])
    : [spell1Id, spell2Id];
  await lcu.request('PATCH', '/lol-champ-select/v1/session/my-selection', { spell1Id: ids[0], spell2Id: ids[1] });
  return { status: 'ok' };
}

module.exports = { exportRunePage, exportSummonerSpells };
