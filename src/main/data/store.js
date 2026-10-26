// Locates and loads the active database: the downloaded copy in userData when present,
// otherwise the snapshot bundled with the installer (resources/data).
const fs = require('fs');
const path = require('path');

// Bump when the database layout changes; older databases are then ignored (re-download needed).
const SCHEMA = 3;

function readMeta(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch { return null; }
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function usable(meta) {
  return meta && (meta.schema || 1) >= SCHEMA;
}

function resolveDataDir(userDir, bundledDir) {
  const u = readMeta(userDir);
  const b = readMeta(bundledDir);
  if (usable(u) && (!usable(b) || compareVersions(u.version, b.version) >= 0)) return userDir;
  return usable(b) ? bundledDir : null;
}

function readJson(dir, file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { return fallback; }
}

function loadDatabase(dir) {
  const db = {
    dir,
    meta: readMeta(dir),
    champions: readJson(dir, 'champions.json', []),
    items: readJson(dir, 'items.json', []),
    runes: readJson(dir, 'runes.json', { trees: [], shards: [] }),
    summoners: readJson(dir, 'summoners.json', []),
    byId: {}, byKey: {}, itemById: {},
  };
  for (const c of db.champions) { db.byId[c.id] = c; db.byKey[c.key] = c; }
  for (const i of db.items) db.itemById[i.id] = i;
  return db;
}

module.exports = { resolveDataDir, loadDatabase, compareVersions, readMeta, SCHEMA };
