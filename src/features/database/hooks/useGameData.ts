// The loaded database. Views below the app shell render only once it exists (app/ViewSwitch
// sends the player to Settings otherwise), so they get it non-null.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { DatabaseService } from '../DatabaseService.ts';
import type { GameData } from '../GameData.ts';

export function useMaybeGameData(): GameData | null {
  return useStore(useService(DatabaseService).store).data;
}

export function useGameData(): GameData {
  const data = useMaybeGameData();
  if (!data) throw new Error('The database is not loaded');
  return data;
}
