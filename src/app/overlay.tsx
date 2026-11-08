// Entry of the in-game widget window: its own small set of services (language, database for
// names and icons, tooltip); everything else comes from the main window.
import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/overlay.css';
import { DatabaseService } from '../features/database/index.ts';
import { WidgetApp } from '../features/widget/index.ts';
import { ServiceRegistry, ServicesProvider } from '../shared/hooks/services.tsx';
import { I18nService } from '../shared/i18n/I18nService.ts';
import { TooltipController } from '../shared/ui/overlays/TooltipController.ts';

const registry = new ServiceRegistry();
const i18n = registry.add(I18nService, new I18nService());
registry.add(DatabaseService, new DatabaseService(i18n));
registry.add(TooltipController, new TooltipController());

const root = document.getElementById('root');
if (root) createRoot(root).render(<ServicesProvider registry={registry}><WidgetApp /></ServicesProvider>);
