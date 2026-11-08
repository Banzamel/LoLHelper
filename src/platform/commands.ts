// Typed wrappers of the Rust commands (src-tauri/src/commands). The IPC boundary: arguments
// and results are checked here once, everything above works with typed values.
import { invoke } from '@tauri-apps/api/core';
import type { RawJson } from '../core/shared/json.ts';
import type { LcuStatus } from '../core/lcu/types.ts';

export interface DataFolders { root: string; bundled: string }
export interface DevOptions { live: boolean; roster: string | null }

export const commands = {
  dataFolders: () => invoke<DataFolders>('data_folders'),
  dataReadText: (path: string) => invoke<string | null>('data_read_text', { path }),
  bundledReadText: (path: string) => invoke<string | null>('bundled_read_text', { path }),
  dataWriteText: (path: string, text: string) => invoke<void>('data_write_text', { path, text }),
  dataExists: (path: string) => invoke<boolean>('data_exists', { path }),
  dataRename: (from: string, to: string) => invoke<void>('data_rename', { from, to }),
  dataList: (path: string) => invoke<string[]>('data_list', { path }),
  dataModified: (path: string) => invoke<number | null>('data_modified', { path }),
  dataRemoveDir: (path: string) => invoke<void>('data_remove_dir', { path }),
  dataReplaceDir: (from: string, to: string) => invoke<void>('data_replace_dir', { from, to }),
  downloadFiles: (dir: string, files: { url: string; rel: string }[]) => invoke<string[]>('download_files', { dir, files }),

  lcuStart: (leagueDir: string) => invoke<void>('lcu_start', { leagueDir }),
  lcuStatus: () => invoke<LcuStatus>('lcu_status'),
  lcuRequest: (method: string, path: string, body?: unknown) => invoke<RawJson>('lcu_request', { method, path, body: body ?? null }),
  liveGameData: () => invoke<RawJson | null>('live_game_data'),

  overlayApply: (visible: boolean, interactive: boolean) => invoke<void>('overlay_apply', { visible, interactive }),
  overlayPlace: (x: number, y: number) => invoke<void>('overlay_place', { x, y }),
  overlayResize: (height: number) => invoke<void>('overlay_resize', { height }),
  overlayReload: () => invoke<void>('overlay_reload'),

  devOptions: () => invoke<DevOptions>('dev_options'),
};

// Errors from Rust arrive as their message string.
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
