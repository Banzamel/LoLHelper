// In-game widget: on/off, opacity, size, hotkeys and a preview to position it before a match.
import { useState } from 'react';
import type { OverlaySettings } from '../../../core/settings/defaults.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { ToastController } from '../../../shared/ui/overlays/ToastController.ts';
import { OverlayService, SCALE_MAX, SCALE_MIN } from '../../widget/index.ts';
import { useSaveSettings } from '../hooks/useSaveSettings.ts';
import { SettingsService } from '../SettingsService.ts';
import { SettingRow } from './SettingRow.tsx';

export function OverlaySection() {
  const t = useT();
  const { settings } = useStore(useService(SettingsService).store);
  const overlay = useService(OverlayService);
  const { preview } = useStore(overlay.store);
  const toast = useService(ToastController);
  const save = useSaveSettings();
  const o = settings.overlay;
  const [opacity, setOpacity] = useState(Math.round(o.opacity * 100));
  const [size, setSize] = useState(Math.round(o.scale * 100));
  const saveOverlay = async (patch: Partial<OverlaySettings>) => {
    save({ overlay: { ...o, ...patch } });
    const failed = await overlay.applySettings();
    if (failed.length) toast.show(t('overlay.shortcutFailed', { keys: failed.join(', ') }), { error: true });
  };
  const key = (name: 'toggleKey' | 'moveKey') => (
    <input className="input hotkey" defaultValue={o[name]} onBlur={(e) => { if (e.target.value.trim() !== o[name]) void saveOverlay({ [name]: e.target.value.trim() }); }} />
  );
  return (
    <section className="panel">
      <h2>{t('overlay.title')}</h2>
      <p className="muted small">{t('overlay.borderless')}</p>
      <SettingRow label={t('overlay.enabled')}>
        <input type="checkbox" className="toggle" checked={o.enabled} onChange={(e) => { void saveOverlay({ enabled: e.target.checked }); }} />
      </SettingRow>
      <SettingRow label={t('overlay.opacity')}>
        <div className="opacity-row">
          <input type="range" min={40} max={100} value={opacity} className="level-slider opacity-slider"
            onChange={(e) => setOpacity(Number(e.target.value))} onPointerUp={() => { void saveOverlay({ opacity: opacity / 100 }); }}
            onKeyUp={() => { void saveOverlay({ opacity: opacity / 100 }); }} />
          <span className="gold-text">{`${opacity}%`}</span>
        </div>
      </SettingRow>
      <SettingRow label={t('overlay.size')}>
        <div className="opacity-row">
          <input type="range" min={SCALE_MIN * 100} max={SCALE_MAX * 100} step={5} value={size} className="level-slider opacity-slider"
            onChange={(e) => setSize(Number(e.target.value))} onPointerUp={() => overlay.setScale(size / 100)} onKeyUp={() => overlay.setScale(size / 100)} />
          <span className="gold-text">{`${size}%`}</span>
        </div>
      </SettingRow>
      <SettingRow label={t('overlay.toggleKey')} hint={t('overlay.keyHint')}>{key('toggleKey')}</SettingRow>
      <SettingRow label={t('overlay.moveKey')}>{key('moveKey')}</SettingRow>
      <div className="row-actions">
        <button className="btn" onClick={() => overlay.setPreview(!preview)}>{t(preview ? 'overlay.previewStop' : 'overlay.previewStart')}</button>
      </div>
      <p className="muted small">{t('overlay.previewHint')}</p>
    </section>
  );
}
