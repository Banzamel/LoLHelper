// Match history: recorded matches and the client's games, the History view, the player sheet
// and the small pieces the Draft and Match views reuse.
export { MatchHistoryService, type MatchesState, type PlayerSheetData } from './MatchHistoryService.ts';
export { HistoryView } from './views/HistoryView.tsx';
export { RecordChip } from './components/RecordChip.tsx';
export { StatTile } from './components/StatTile.tsx';
export { ItemList } from './components/ItemList.tsx';
export { usePlayerSheet } from './hooks/usePlayerSheet.tsx';
export type { SheetPlayer } from './components/PlayerSheet.tsx';
