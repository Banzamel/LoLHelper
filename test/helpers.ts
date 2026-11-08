// Test helpers: the bundled database (run `npm run fetch-data` first) and a Storage over a
// real folder, as the app's Rust commands provide it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { indexDatabase } from '../src/core/data/store.ts';
import type { Storage } from '../src/core/storage.ts';
import type { Db } from '../src/core/types.ts';

export const DATA_DIR = path.join(import.meta.dirname, '..', 'resources', 'data');

const readJson = (dir: string, file: string, fallback: unknown) => {
  try { return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { return fallback; }
};

export function loadDatabase(dir: string = DATA_DIR): Db {
  return indexDatabase({
    meta: readJson(dir, 'meta.json', null),
    champions: readJson(dir, 'champions.json', []),
    items: readJson(dir, 'items.json', []),
    runes: readJson(dir, 'runes.json', { trees: [], shards: [] }),
    summoners: readJson(dir, 'summoners.json', []),
  });
}

export function nodeStorage(root: string): Storage {
  const abs = (p: string) => path.join(root, p);
  return {
    async read(p) { try { return fs.readFileSync(abs(p), 'utf8'); } catch { return null; } },
    async write(p, text) { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); fs.writeFileSync(abs(p), text); },
    async exists(p) { return fs.existsSync(abs(p)); },
    async rename(from, to) { fs.mkdirSync(path.dirname(abs(to)), { recursive: true }); fs.renameSync(abs(from), abs(to)); },
    async list(dir) { try { return fs.readdirSync(abs(dir)); } catch { return []; } },
    async modified(p) { try { return fs.statSync(abs(p)).mtimeMs; } catch { return null; } },
  };
}

export const tempDir = (prefix = 'lolh-') => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
