import { useService, useStore } from '../../hooks/services.tsx';
import { ToastController } from './ToastController.ts';

export function ToastHost() {
  const { message, error, visible } = useStore(useService(ToastController).store);
  return <div id="toast" className={`toast${error ? ' error' : ''}`} hidden={!visible}>{message}</div>;
}
