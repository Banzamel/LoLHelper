// Entry of the main window.
import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/views.css';
import '../styles/live.css';
import '../styles/app.css';
import '../styles/app-history.css';
import { mainWindow } from '../platform/index.ts';
import { ServicesProvider } from '../shared/hooks/services.tsx';
import { App } from './App.tsx';
import { startApp } from './startApp.ts';

const root = document.getElementById('root');
if (root) {
  startApp().then(({ registry, version }) => {
    createRoot(root).render(<ServicesProvider registry={registry}><App version={version} /></ServicesProvider>);
  }).catch((e: unknown) => {
    // Show the window anyway, so a failed start is visible instead of an invisible process.
    root.textContent = `LoL Helper failed to start: ${e instanceof Error ? e.message : String(e)}`;
    void mainWindow.show();
  });
}
