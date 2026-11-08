// The one floating tooltip of a window (item, rune and spell details), following the cursor.
import type { ReactNode } from 'react';
import { Store } from '../../lib/Store.ts';

export interface TooltipState { content: ReactNode | null; x: number; y: number }

export class TooltipController {
  readonly store = new Store<TooltipState>({ content: null, x: 0, y: 0 });

  show(content: ReactNode, x: number, y: number) { this.store.set({ content, x, y }); }
  move(x: number, y: number) { if (this.store.get().content) this.store.set({ x, y }); }
  hide() { if (this.store.get().content) this.store.set({ content: null }); }
}
