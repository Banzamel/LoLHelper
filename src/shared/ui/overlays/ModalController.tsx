// The one modal of the main window (champion picker, confirmations, player sheet).
import type { ReactNode } from 'react';
import { Store } from '../../lib/Store.ts';

export interface ModalSpec {
  title: string;
  body: ReactNode;
  actions?: ReactNode;
  // Runs once however the modal is closed (button, backdrop, Escape or code).
  onClose?: () => void;
}

export class ModalController {
  readonly store = new Store<{ modal: ModalSpec | null }>({ modal: null });

  // Returns a function closing this modal (a no-op once another one replaced it).
  open(spec: ModalSpec): () => void {
    this.close();
    this.store.set({ modal: spec });
    return () => { if (this.store.get().modal === spec) this.close(); };
  }

  close() {
    const { modal } = this.store.get();
    if (!modal) return;
    this.store.set({ modal: null });
    modal.onClose?.();
  }

  // Resolves true when confirmed, false otherwise.
  confirm(title: string, message: string, confirmLabel: string): Promise<boolean> {
    return new Promise((resolve) => {
      let ok = false;
      const yes = () => { ok = true; this.close(); };
      this.open({
        title,
        body: <p>{message}</p>,
        actions: <button className="btn primary small" onClick={yes}>{confirmLabel}</button>,
        onClose: () => resolve(ok),
      });
    });
  }
}
