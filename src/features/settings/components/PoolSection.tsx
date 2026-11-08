// The account's champion pool per role (it raises those champions in the counter-picks).
import { ROLES } from '../../../core/data/types.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { AccountService } from '../../account/index.ts';
import { ChampIcon, useChampionPicker } from '../../database/index.ts';
import { useSaveSettings } from '../hooks/useSaveSettings.ts';
import { SettingsService } from '../SettingsService.ts';

export function PoolSection() {
  const t = useT();
  const { settings } = useStore(useService(SettingsService).store);
  const { profile } = useStore(useService(AccountService).store);
  const save = useSaveSettings();
  const pick = useChampionPicker();
  const pool = settings.pool;
  return (
    <section className="panel">
      <h2>{t('settings.pool')}</h2>
      <p className="muted small">{t('settings.poolHint')}</p>
      <p className="muted small">{profile && profile.gameName ? t('settings.profileNote', { name: `${profile.gameName}#${profile.tagLine}` }) : t('settings.noProfileNote')}</p>
      <div className="pool">
        {ROLES.map((r) => {
          const ids = pool[r] || [];
          const add = async () => {
            const id = await pick({ role: r, exclude: ids, allowClear: false });
            if (id) save({ pool: { ...pool, [r]: [...ids, id] } });
          };
          return (
            <div className="pool-row" key={r}>
              <div className="role-badge"><RoleIcon role={r} />{t(`role.${r}`)}</div>
              <div className="pool-champs">
                {ids.map((id) => <ChampIcon key={id} id={id} size="sm" onClick={() => save({ pool: { ...pool, [r]: ids.filter((x) => x !== id) } })} />)}
                <button className="btn small ghost" onClick={() => { void add(); }}>{`+ ${t('settings.add')}`}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
