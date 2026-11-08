// The Draft title with live/manual mode, the player's role tabs and the reset of a manual draft.
import { ROLES } from '../../../core/data/types.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampSelectService } from '../ChampSelectService.ts';
import type { DraftModel } from '../draftModel.ts';

export function DraftHeader({ model }: { model: DraftModel }) {
  const t = useT();
  const service = useService(ChampSelectService);
  return (
    <div className="view-head">
      <h1>{t('draft.title')}</h1>
      <span className={`chip ${model.live ? 'teal' : ''}`}>{t(model.live ? 'draft.live' : 'draft.manual')}</span>
      <div className="spacer" />
      <span className="muted">{t('draft.myRole')}</span>
      <div className="tabs">
        {ROLES.map((r) => (
          <button key={r} className={`tab ${model.myRole === r ? 'active' : ''}`} disabled={model.roleFixed && model.myRole !== r} title={t(`role.${r}`)} onClick={() => service.setRole(r)}>
            <RoleIcon role={r} />{t(`role.${r}`)}
          </button>
        ))}
      </div>
      {!model.live ? <button className="btn small ghost" onClick={() => service.reset()}>{t('draft.reset')}</button> : null}
    </div>
  );
}
