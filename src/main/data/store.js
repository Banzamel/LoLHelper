// Locates and loads the active database: the downloaded copy in userData when present,
// otherwise the snapshot bundled with the installer (resources/data).
const fs = require('fs');
const path = require('path');

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

function resolveDataDir(userDir, bundledDir) {
  const u = readMeta(userDir);
  const b = readMeta(bundledDir);
  if (u && (!b || compareVersions(u.version, b.version) >= 0)) return userDir;
  return b ? bundledDir : null;
}

function loadDatabase(dir) {
  const champions = JSON.parse(fs.readFileSync(path.join(dir, 'champions.json'), 'utf8'));
  const items = JSON.parse(fs.readFileSync(path.join(dir, 'items.json'), 'utf8'));
  const db = { dir, meta: readMeta(dir), champions, items, byId: {}, byKey: {}, itemById: {} };
  for (const c of champions) { db.byId[c.id] = c; db.byKey[c.key] = c; }
  for (const i of items) db.itemById[i.id] = i;
  return db;
}

module.exports = { resolveDataDir, loadDatabase, compareVersions, readMeta };
