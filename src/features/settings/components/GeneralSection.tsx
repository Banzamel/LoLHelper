// Language, League folder and window behaviour.
import type { SettingsData } from '../../../core/settings/defaults.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { LANGUAGE_CODES } from '../../../shared/i18n/Translator.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { useSaveSettings } from '../hooks/useSaveSettings.ts';
import { SettingsService } from '../SettingsService.ts';
import { SettingRow } from './SettingRow.tsx';

const LANGUAGE_NAMES: Record<string, string> = { pl: 'Polski', en: 'English' };
type Flag = 'alwaysOnTop' | 'autoOpenDraft' | 'autoOpenLive' | 'flashOnD';

export function GeneralSection() {
  const t = useT();
  const { settings: s } = useStore(useService(SettingsService).store);
  const save = useSaveSettings();
  const toggle = (key: Flag) => <input type="checkbox" className="toggle" checked={!!s[key]} onChange={(e) => save({ [key]: e.target.checked } as Partial<SettingsData>)} />;
  return (
    <section className="panel">
      <h2>{t('settings.general')}</h2>
      <SettingRow label={t('settings.language')}>
        <select className="select" value={s.language} onChange={(e) => save({ language: e.target.value })}>
          {LANGUAGE_CODES.map((l) => <option key={l} value={l}>{LANGUAGE_NAMES[l] || l}</option>)}
        </select>
      </SettingRow>
      <SettingRow label={t('settings.leagueDir')} hint={t('settings.leagueDirHint')}>
        <input className="input wide" defaultValue={s.leagueDir} placeholder="T:\Riot Games\League of Legends" onBlur={(e) => { if (e.target.value.trim() !== s.leagueDir) save({ leagueDir: e.target.value.trim() }); }} />
      </SettingRow>
      <SettingRow label={t('settings.alwaysOnTop')}>{toggle('alwaysOnTop')}</SettingRow>
      <SettingRow label={t('settings.autoOpenDraft')}>{toggle('autoOpenDraft')}</SettingRow>
      <SettingRow label={t('settings.autoOpenLive')}>{toggle('autoOpenLive')}</SettingRow>
      <SettingRow label={t('settings.flashOnD')} hint={t('settings.flashOnDHint')}>{toggle('flashOnD')}</SettingRow>
    </section>
  );
}
