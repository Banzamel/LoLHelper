// The frameless window's title bar: brand, client status, game phase (with the mode when it
// matters), patch, account and the window buttons. Empty areas drag the window.
import { mainWindow, type WindowAction } from '../platform/index.ts';
import { useService, useStore } from '../shared/hooks/services.tsx';
import { useT } from '../shared/i18n/useT.ts';
import { AccountService } from '../features/account/index.ts';
import { ClientService } from '../features/client/index.ts';
import { useMaybeGameData } from '../features/database/index.ts';
import { LiveGameService } from '../features/liveGame/index.ts';

// Modes other than a regular queue are named next to the phase.
const NAMED_MODES = ['practice', 'custom'];

export function Titlebar() {
  const t = useT();
  const client = useStore(useService(ClientService).store);
  const { demo } = useStore(useService(LiveGameService).store);
  const { profile: p } = useStore(useService(AccountService).store);
  const data = useMaybeGameData();
  const supported = !client.mode || client.mode.supported;
  const phase = client.draft && client.draft.phase ? client.draft.phase : client.phase;
  const label = demo ? t('demo.pill') : client.lcu.connected && phase && phase !== 'None' ? t(`phase.${phase}`) : '';
  const suffix = !label ? '' : !supported ? t('mode.unsupportedShort') : client.mode && NAMED_MODES.includes(client.mode.key) ? t(`mode.${client.mode.key}`) : '';
  const button = (action: WindowAction, text: string, title: string, cls?: string) => (
    <button className={cls} title={t(title)} onClick={() => { void mainWindow.action(action); }}>{text}</button>
  );
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region><span className="brand-hex" /><span data-tauri-drag-region>{t('app.name')}</span></div>
      <div className="titlebar-status" data-tauri-drag-region>
        <span className={`status-pill ${client.lcu.connected ? 'on' : ''}`} id="lcu-status"><i /><span>{t(client.lcu.connected ? 'status.connected' : 'status.waiting')}</span></span>
        <span className="phase-pill" id="game-phase">{suffix ? `${label} · ${suffix}` : label}</span>
        <span className="patch-pill" id="patch">{data && data.meta ? t('status.patch', { version: data.meta.version }) : ''}</span>
        <span className="profile-pill" id="profile" title={t('status.profile')}>{p && p.gameName ? `${p.gameName}${p.tagLine ? `#${p.tagLine}` : ''}` : ''}</span>
      </div>
      <div className="window-controls">
        {button('minimize', '–', 'window.minimize')}
        {button('maximize', '□', 'window.maximize')}
        {button('close', '✕', 'window.close', 'close')}
      </div>
    </header>
  );
}
