// The current view of the main window. Views are named; the app shell renders the one in the
// store (app/ViewSwitch) and features navigate by name.
import { Store } from './Store.ts';

export type ViewName = 'draft' | 'live' | 'history' | 'build' | 'champions' | 'champion' | 'items' | 'settings';
export const NAV_VIEWS: ViewName[] = ['draft', 'live', 'history', 'build', 'champions', 'items', 'settings'];

export interface Route { name: ViewName; params: Record<string, string> }

export class Navigator {
  readonly store = new Store<Route>({ name: 'draft', params: {} });

  navigate(name: ViewName, params: Record<string, string> = {}) {
    this.store.set({ name, params });
  }

  get current(): Route { return this.store.get(); }
}

// View state kept while navigating away and back (open tabs, filters, sort order).
export class ViewMemory {
  private readonly values = new Map<string, unknown>();

  get<T>(key: string, initial: T): T {
    return this.values.has(key) ? (this.values.get(key) as T) : initial;
  }

  set<T>(key: string, value: T) {
    this.values.set(key, value);
  }
}
