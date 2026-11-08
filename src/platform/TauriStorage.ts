// The core Storage over the Rust file commands (paths relative to the app data folder).
import type { Storage } from '../core/shared/storage.ts';
import { commands } from './commands.ts';

export class TauriStorage implements Storage {
  read(path: string) { return commands.dataReadText(path); }
  write(path: string, text: string) { return commands.dataWriteText(path, text); }
  exists(path: string) { return commands.dataExists(path); }
  rename(from: string, to: string) { return commands.dataRename(from, to); }
  list(dir: string) { return commands.dataList(dir); }
  modified(path: string) { return commands.dataModified(path); }
}
