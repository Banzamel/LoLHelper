// What the main window sends the widget window: the widget's state, the settings it shows and
// the live game with its build (computed in the main window, where the history lives).
import type { OverlaySettings } from '../../core/settings/defaults.ts';
import type { PlayingGame } from '../../core/live/types.ts';
import type { GameBuild } from '../liveGame/index.ts';

export interface WidgetState {
  gameActive: boolean;
  moveMode: boolean;
  preview: boolean;
  userHidden: boolean;
  opacity: number;
}

export interface WidgetUpdate {
  state: WidgetState;
  language: string;
  overlay: OverlaySettings;
  game: PlayingGame | null;
  model: GameBuild | null;
}

export const WIDGET_UPDATE = 'widget:update';
export const WIDGET_READY = 'widget:ready';
