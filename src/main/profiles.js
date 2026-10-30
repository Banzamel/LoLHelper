// League accounts seen on this computer: each has a profile folder `<puuid>/` with its
// account.json (name, level, icon, ranks, lastSeenAt), settings, history and match cache.
const fs = require('fs');
const path = require('path');

// One account.json with the time its account was last logged in to the client (ms); accounts
// saved before `lastSeenAt` existed use the file's modification time. Null when unreadable.
function readSeenAccount(file) {
  try {
    const account = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!account || typeof account.puuid !== 'string' || !account.puuid) return null;
    const seenMs = Date.parse(account.lastSeenAt);
    return { account, seenMs: Number.isNaN(seenMs) ? fs.statSync(file).mtimeMs : seenMs };
  } catch {
    return null;
  }
}

// The account last logged in to the client, from the profile folders in `dir`; it is shown
// at launch, before the client connects. Folders without a readable account.json (missing,
// corrupt, no puuid) are skipped; null when `dir` is missing or holds no account.
function lastPlayedAccount(dir) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return null; }
  const seen = names.map((name) => readSeenAccount(path.join(dir, name, 'account.json'))).filter((s) => s);
  if (!seen.length) return null;
  return seen.reduce((newest, s) => (s.seenMs > newest.seenMs ? s : newest)).account;
}

module.exports = { lastPlayedAccount };
