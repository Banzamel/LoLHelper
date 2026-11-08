// File access of the pure modules (settings, history, match cache, profiles), relative to the
// app's data folder. The app implements it with Rust commands limited to that folder
// (backend/native.ts); tests and scripts use Node's fs (test/helpers.ts).
export interface Storage {
  // The file's text, or null when it does not exist.
  read(path: string): Promise<string | null>;
  // Writes the whole file (parent folders are created).
  write(path: string, text: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  rename(from: string, to: string): Promise<void>;
  // Names of the entries of a folder ([] when it does not exist).
  list(dir: string): Promise<string[]>;
  // Last modification time in ms, or null when the file does not exist.
  modified(path: string): Promise<number | null>;
}

export const joinPath = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join('/');

export async function readJson<T>(storage: Storage, path: string, fallback: T): Promise<T> {
  try {
    const text = await storage.read(path);
    return text === null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

// Writes go out in order per file and never overlap, while the caller keeps working with the
// data in memory (the settings, history and caches are all small JSON files).
const queues = new Map<string, Promise<void>>();

export function queueWrite(storage: Storage, path: string, text: string): Promise<void> {
  const prev = queues.get(path) || Promise.resolve();
  const next = prev.catch(() => {}).then(() => storage.write(path, text));
  queues.set(path, next);
  next.catch((e) => console.error(`[storage] ${path}:`, e)).finally(() => { if (queues.get(path) === next) queues.delete(path); });
  return next;
}
