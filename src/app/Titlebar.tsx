// The main window's title bar (the shared one in src/shared/ui/titlebar) with LoL Helper's status:
// client connection, game phase (with the mode when it matters), patch and account.
import { windowFrame } from '../platform/index.ts';
import { useService, useStore } from '../shared/hooks/services.tsx';
import { useT } from '../shared/i18n/useT.ts';
import { TitleBar } from '../shared/ui/titlebar/index.ts';
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
  const labels = { minimize: t('window.minimize'), maximize: t('window.maximize'), restore: t('window.restore'), close: t('window.close') };
  return (
    <TitleBar icon={<span className="brand-hex" />} name={t('app.name')} labels={labels} frame={windowFrame}>
      <span className={`status-pill ${client.lcu.connected ? 'on' : ''}`} id="lcu-status"><i /><span>{t(client.lcu.connected ? 'status.connected' : 'status.waiting')}</span></span>
      <span className="phase-pill" id="game-phase">{suffix ? `${label} · ${suffix}` : label}</span>
      <span className="patch-pill" id="patch">{data && data.meta ? t('status.patch', { version: data.meta.version }) : ''}</span>
      <span className="profile-pill" id="profile" title={t('status.profile')}>{p && p.gameName ? `${p.gameName}${p.tagLine ? `#${p.tagLine}` : ''}` : ''}</span>
    </TitleBar>
  );
}
