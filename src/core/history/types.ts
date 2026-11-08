// A match the app followed and recorded itself (with the purchase timeline).
import type { LearningEntry } from '../engine/types.ts';

export interface HistoryEntry extends LearningEntry {
  date: string;
  queueId: number | null;
  role: string | null;
  enemies: { championId: string | null; position: string | null; items: number[] }[];
  allies: { championId: string | null; position: string | null }[];
  purchases: { id: number; t: number }[];
  kda: { kills: number; deaths: number; assists: number };
  cs: number;
  level: number;
  duration: number;
  win: boolean;
  // Item gold of both teams once a minute: [minute, allies, enemies].
  gold: number[][];
}
