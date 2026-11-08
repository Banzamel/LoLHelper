// Settings: general, simulated match, widget, database, about, champion pool.
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { Navigator } from '../../../shared/lib/Navigator.ts';
import { ToastController } from '../../../shared/ui/overlays/ToastController.ts';
import { UpdateSection } from '../../appUpdate/index.ts';
import { useMaybeGameData } from '../../database/index.ts';
import { LiveGameService } from '../../liveGame/index.ts';
import { DatabaseSection } from '../components/DatabaseSection.tsx';
import { GeneralSection } from '../components/GeneralSection.tsx';
import { OverlaySection } from '../components/OverlaySection.tsx';
import { PoolSection } from '../components/PoolSection.tsx';
import { SettingRow } from '../components/SettingRow.tsx';

export function SettingsView({ version }: { version: string }) {
  const t = useT();
  const live = useService(LiveGameService);
  const { demo } = useStore(live.store);
  const toast = useService(ToastController);
  const nav = useService(Navigator);
  const data = useMaybeGameData();
  const setDemo = (on: boolean) => {
    if (!on) { live.stopDemo(); return; }
    if (live.startDemo()) nav.navigate('live');
    else toast.show(t('demo.busy'), { error: true });
  };
  return (
    <>
      <div className="view-head"><h1>{t('settings.title')}</h1></div>
      <div className="settings-grid">
        <div className="champ-col">
          <GeneralSection />
          <section className="panel">
            <h2>{t('demo.title')}</h2>
            <p className="muted small">{t('demo.startHint')}</p>
            <SettingRow label={t('demo.toggle')}><input type="checkbox" className="toggle" checked={demo} onChange={(e) => setDemo(e.target.checked)} /></SettingRow>
          </section>
          <OverlaySection />
          <DatabaseSection />
          <section className="panel">
            <h2>{t('settings.about')}</h2>
            <p>{`${t('app.name')} — ${t('settings.version', { version })}`}</p>
            <h3 className="sub">{t('appUpdate.title')}</h3>
            <UpdateSection version={version} />
            <p className="muted small disclaimer">{t('settings.disclaimer')}</p>
          </section>
        </div>
        <div className="champ-col">{data ? <PoolSection /> : null}</div>
      </div>
    </>
  );
}
