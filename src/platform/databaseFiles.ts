// The database files on disk: the downloaded copy in the app data folder ('user', under
// data/) and the snapshot bundled with the installer. Icons load through the asset protocol.
import { convertFileSrc } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';
import type { BuilderIo } from '../core/data/builder/buildDatabase.ts';
import type { DataReader } from '../core/data/store.ts';
import type { RawJson } from '../core/shared/json.ts';
import { commands, type DataFolders } from './commands.ts';
import { nativeEvents } from './events.ts';

export type DatabaseSource = 'user' | 'bundled';
export const USER_DATA_DIR = 'data';
const BUILD_DIR = 'data-tmp';

export function databaseReader(source: DatabaseSource): DataReader {
  return source === 'user' ? (file) => commands.dataReadText(`${USER_DATA_DIR}/${file}`) : (file) => commands.bundledReadText(file);
}

export const dataFolders = (): Promise<DataFolders> => commands.dataFolders();

// The URL of a database file (an icon) for <img src>.
export function assetUrl(folders: DataFolders, source: DatabaseSource, rel: string): string {
  const base = source === 'user' ? `${folders.root}\\${USER_DATA_DIR}` : folders.bundled;
  return convertFileSrc(`${base}\\${rel.replace(/\//g, '\\')}`);
}

async function getJson(url: string): Promise<RawJson> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Builds a new database next to the current one; `commitDatabase` swaps it in.
export function builderIo(): BuilderIo {
  return {
    getJson,
    writeText: (rel, text) => commands.dataWriteText(`${BUILD_DIR}/${rel}`, text),
    async download(files, onTick) {
      const off = await nativeEvents.downloadTick((t) => onTick(t.done, t.total));
      try { return await commands.downloadFiles(BUILD_DIR, files); } finally { off(); }
    },
  };
}

export const startDatabaseBuild = () => commands.dataRemoveDir(BUILD_DIR);
export const commitDatabase = () => commands.dataReplaceDir(BUILD_DIR, USER_DATA_DIR);
export { getJson as fetchJson };
