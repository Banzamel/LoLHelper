// The main window: title bar, update banner, sidebar with the current view, and the modal,
// tooltip and toast layers. The window is shown once the first frame is rendered.
import { useEffect } from 'react';
import { mainWindow } from '../platform/index.ts';
import { ModalHost } from '../shared/ui/overlays/ModalHost.tsx';
import { ToastHost } from '../shared/ui/overlays/ToastHost.tsx';
import { TooltipHost } from '../shared/ui/overlays/TooltipHost.tsx';
import { UpdateBanner } from '../features/appUpdate/index.ts';
import { Sidebar } from './Sidebar.tsx';
import { Titlebar } from './Titlebar.tsx';
import { useAutoNavigation } from './useAutoNavigation.ts';
import { ViewSwitch } from './ViewSwitch.tsx';

export function App({ version }: { version: string }) {
  useAutoNavigation();
  useEffect(() => { void mainWindow.show(); }, []);
  return (
    <>
      <Titlebar />
      <UpdateBanner version={version} />
      <div className="shell">
        <Sidebar />
        <ViewSwitch version={version} />
      </div>
      <ModalHost />
      <TooltipHost />
      <ToastHost />
    </>
  );
}
