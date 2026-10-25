// Enemy role inference. The client hides enemy positions in champion select, so each enemy
// pick is assigned to the position that maximises the total fit over the whole team.
const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'SUPPORT'];
const TAG_ROLE = { Marksman: 'BOTTOM', Support: 'SUPPORT', Mage: 'MIDDLE', Assassin: 'MIDDLE', Fighter: 'TOP', Tank: 'TOP' };

function fit(champ, role) {
  let w = 0;
  if (champ.positions.includes(role)) w += 1 + 1 / champ.positions.length;
  if (TAG_ROLE[champ.tags[0]] === role) w += 0.4;
  return w;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

// picks: [{ cellId, championId(ddragon id) | null, role | null (fixed) }] -> { cellId: role }
function inferRoles(db, picks) {
  const fixed = Object.fromEntries(picks.filter((p) => p.role).map((p) => [p.cellId, p.role]));
  const free = picks.filter((p) => !p.role && p.championId && db.byId[p.championId]);
  const openRoles = ROLES.filter((r) => !Object.values(fixed).includes(r));
  let best = null;
  let bestScore = -1;
  for (const perm of permutations(openRoles)) {
    let score = 0;
    free.forEach((p, i) => { if (perm[i]) score += fit(db.byId[p.championId], perm[i]); });
    if (score > bestScore) { bestScore = score; best = perm; }
  }
  const result = { ...fixed };
  free.forEach((p, i) => { if (best && best[i]) result[p.cellId] = best[i]; });
  return result;
}

module.exports = { inferRoles, ROLES };
