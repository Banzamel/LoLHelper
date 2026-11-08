// Short notices at the bottom of the main window ("Saved", export results, errors).
import { Store } from '../../lib/Store.ts';

export interface ToastState { message: string; error: boolean; visible: boolean }

export class ToastController {
  readonly store = new Store<ToastState>({ message: '', error: false, visible: false });
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string, { error = false, ms = 3500 } = {}) {
    this.store.set({ message, error, visible: true });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.store.set({ visible: false }), ms);
  }
}
