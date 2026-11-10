// Locates and loads the active database: the downloaded copy in the app data folder when
// present, otherwise the snapshot bundled with the installer (resources/data).
import type { Db, DbMeta, RawDatabase } from './types.ts';

// Bump when the database layout changes; older databases are then ignored (re-download needed).
export const SCHEMA = 5;

// Reads one file of a database folder as text (null when missing).
export type DataReader = (file: string) => Promise<string | null>;

const parse = <T>(text: string | null, fallback: T): T => {
  try { return text === null ? fallback : JSON.parse(text); } catch { return fallback; }
};

export async function readMeta(read: DataReader): Promise<DbMeta | null> {
  return parse<DbMeta | null>(await read('meta.json').catch((): null => null), null);
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function usable(meta: DbMeta | null): meta is DbMeta {
  return !!meta && (meta.schema || 1) >= SCHEMA;
}

// 'user' (downloaded) when it is at least as new as the bundled one, else 'bundled'; null
// when neither is usable.
export function chooseDatabase(user: DbMeta | null, bundled: DbMeta | null): 'user' | 'bundled' | null {
  if (usable(user) && (!usable(bundled) || compareVersions(user.version, bundled.version) >= 0)) return 'user';
  return usable(bundled) ? 'bundled' : null;
}

export function indexDatabase(raw: RawDatabase): Db {
  const db: Db = { ...raw, byId: {}, byKey: {}, itemById: {} };
  for (const c of db.champions) { db.byId[c.id] = c; db.byKey[c.key] = c; }
  for (const i of db.items) db.itemById[i.id] = i;
  return db;
}

export async function readRawDatabase(read: DataReader): Promise<RawDatabase> {
  const file = async <T>(name: string, fallback: T) => parse<T>(await read(name).catch((): null => null), fallback);
  const [meta, champions, items, runes, summoners] = await Promise.all([
    readMeta(read),
    file('champions.json', []),
    file('items.json', []),
    file('runes.json', { trees: [], shards: [] }),
    file('summoners.json', []),
  ]);
  return { meta, champions, items, runes, summoners };
}

export async function loadDatabase(read: DataReader): Promise<Db> {
  return indexDatabase(await readRawDatabase(read));
}
