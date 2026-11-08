// League accounts seen on this computer: each has a profile folder `profiles/<puuid>/` with its
// account.json (name, level, icon, ranks, lastSeenAt), settings, history and match cache.
import type { Rank } from '../lcu/types.ts';
import { joinPath, type Storage } from '../shared/storage.ts';

export const PROFILES_DIR = 'profiles';

export interface Account {
  puuid: string;
  gameName: string;
  tagLine: string;
  level?: number | null;
  icon?: number | null;
  ranks?: { solo: Rank | null; flex: Rank | null } | null;
  // When the account was last logged in to the client (ISO time).
  lastSeenAt?: string;
}

// The profile folder of an account, relative to the data folder.
export const profileDir = (puuid: string) => joinPath(PROFILES_DIR, puuid.replace(/[^\w-]/g, ''));

// One account.json with the time its account was last logged in to the client (ms); accounts
// saved before `lastSeenAt` existed use the file's modification time. Null when unreadable.
async function readSeenAccount(storage: Storage, file: string): Promise<{ account: Account; seenMs: number } | null> {
  try {
    const text = await storage.read(file);
    if (text === null) return null;
    const account = JSON.parse(text);
    if (!account || typeof account.puuid !== 'string' || !account.puuid) return null;
    const seenMs = Date.parse(account.lastSeenAt);
    return { account, seenMs: Number.isNaN(seenMs) ? (await storage.modified(file)) || 0 : seenMs };
  } catch {
    return null;
  }
}

// The account last logged in to the client, from the profile folders in `dir`; it is shown
// at launch, before the client connects. Folders without a readable account.json (missing,
// corrupt, no puuid) are skipped; null when `dir` is missing or holds no account.
export async function lastPlayedAccount(storage: Storage, dir: string = PROFILES_DIR): Promise<Account | null> {
  let names: string[] = [];
  try { names = await storage.list(dir); } catch { return null; }
  const seen = (await Promise.all(names.map((name) => readSeenAccount(storage, joinPath(dir, name, 'account.json')))))
    .filter((s): s is { account: Account; seenMs: number } => s !== null);
  if (!seen.length) return null;
  return seen.reduce((newest, s) => (s.seenMs > newest.seenMs ? s : newest)).account;
}
