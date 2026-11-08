// Root of the widget window: renders what the main window sends, in its language, with the
// database loaded here for names and icons.
import { useEffect, useState } from 'react';
import { windowMessages } from '../../platform/index.ts';
import { useService } from '../../shared/hooks/services.tsx';
import { I18nService } from '../../shared/i18n/I18nService.ts';
import { TooltipHost } from '../../shared/ui/overlays/TooltipHost.tsx';
import { DatabaseService } from '../database/index.ts';
import { Widget } from './components/Widget.tsx';
import { useCursorTooltip } from './hooks/useCursorTooltip.tsx';
import { WIDGET_READY, WIDGET_UPDATE, type WidgetUpdate } from './types.ts';

export function WidgetApp() {
  const database = useService(DatabaseService);
  const i18n = useService(I18nService);
  const [update, setUpdate] = useState<WidgetUpdate | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  useCursorTooltip();

  useEffect(() => {
    const off = windowMessages.listen<WidgetUpdate>(WIDGET_UPDATE, setUpdate);
    void windowMessages.send('main', WIDGET_READY, null);
    return () => { void off.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    if (!update || update.language === language) return;
    setLanguage(update.language);
    i18n.setLanguage(update.language);
    void database.load(update.language);
  }, [update, language, i18n, database]);

  return (
    <>
      {update ? <Widget update={update} /> : <div id="widget" className="widget" />}
      <TooltipHost />
    </>
  );
}
