// Renders the open modal: backdrop click, Escape and the close button all close it.
import { useEffect } from 'react';
import { useService, useStore } from '../../hooks/services.tsx';
import { useT } from '../../i18n/useT.ts';
import { ModalController } from './ModalController.tsx';

export function ModalHost() {
  const controller = useService(ModalController);
  const { modal } = useStore(controller.store);
  const t = useT();
  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') controller.close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, controller]);
  if (!modal) return <div id="modal-root" />;
  return (
    <div id="modal-root">
      <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) controller.close(); }}>
        <div className="modal">
          <div className="modal-head">
            <h2>{modal.title}</h2>
            <div className="spacer" />
            {modal.actions}
            <button className="btn small ghost" onClick={() => controller.close()}>{t('common.close')}</button>
          </div>
          <div className="modal-body">{modal.body}</div>
        </div>
      </div>
    </div>
  );
}
