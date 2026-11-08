// Build view: recommended items for a champion against the lane opponent and enemy team, with
// an export to the in-game shop as an item set.
import { ROLES, type Role } from '../../../core/data/types.ts';
import { useService, useStore } from '../../../shared/hooks/services.tsx';
import { useAsync } from '../../../shared/hooks/useAsync.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ClientService } from '../../client/index.ts';
import { ChampIcon, useChampionPicker, useGameData } from '../../database/index.ts';
import { BuildService } from '../BuildService.ts';
import { BuildOrder } from '../components/BuildOrder.tsx';
import { BuildSections } from '../components/BuildSections.tsx';
import { LoadoutPanels } from '../components/LoadoutPanels.tsx';
import { useExports } from '../hooks/useExports.ts';

export function BuildView() {
  const t = useT();
  const data = useGameData();
  const service = useService(BuildService);
  const { target } = useStore(service.store);
  const connected = useStore(useService(ClientService).store).lcu.connected;
  const pick = useChampionPicker();
  const exports = useExports();
  const me = data.champ(target.championId);
  const enemy = data.champ(target.enemyId);
  const role = target.role || (me ? me.positions[0] : null);
  const enemyIds = [...new Set([...(target.enemyIds || []), ...(enemy ? [enemy.id] : [])])];
  const query = me ? { championId: me.id, enemyId: enemy ? enemy.id : null, enemyIds, role } : null;
  const { value: build } = useAsync(() => (query ? service.build(query) : Promise.resolve(null)), [query, connected]);
  const shown = build && query && build.championId === query.championId ? build : null;

  const choose = async (key: 'championId' | 'enemyId') => {
    const id = await pick({ role: key === 'championId' ? role : null, allowClear: key === 'enemyId' });
    if (id !== null) service.setTarget({ ...target, [key]: id || null });
  };
  const picker = (id: string | null, key: 'championId' | 'enemyId', label: string) => (
    <button className="build-picker" onClick={() => { void choose(key); }}>
      <ChampIcon id={id} size="lg" />
      <div><div className="muted">{label}</div><h3>{data.champ(id) ? data.champName(id) : t('build.choose')}</h3></div>
    </button>
  );

  return (
    <>
      <div className="view-head">
        <h1>{t('build.title')}</h1>
        <div className="spacer" />
        <div className="tabs">
          {ROLES.map((r: Role) => <button key={r} className={`tab ${role === r ? 'active' : ''}`} title={t(`role.${r}`)} onClick={() => service.setTarget({ ...target, role: r })}><RoleIcon role={r} /></button>)}
        </div>
      </div>
      <div className="panel gold versus">
        {picker(target.championId, 'championId', t('build.champion'))}
        <div className="vs">{t('build.vs')}</div>
        {picker(target.enemyId, 'enemyId', t('build.enemy'))}
        {shown ? (
          <>
            <div className="spacer" />
            <div className="versus-side">
              <span className="chip teal">{t('build.class', { cls: t(`class.${shown.cls}`) })}</span>
              <button className="btn primary" disabled={!connected} title={connected ? undefined : t('build.needClient')} onClick={() => { void exports.itemSet(shown); }}>{t('build.export')}</button>
            </div>
          </>
        ) : null}
      </div>
      {!me ? <p className="muted">{t('build.pickChampion')}</p> : null}
      {me && shown ? (
        <>
          {shown.threats.length ? (
            <div className="threats"><span className="muted">{t('build.threats')}</span>{shown.threats.map((x, i) => <span key={i} className="chip minus">{t(x.key, x.params)}</span>)}</div>
          ) : null}
          <div className="build-full panel gold">
            <h2>{t('build.order')}</h2>
            <p className="muted small">{t('build.orderHint')}</p>
            <BuildOrder ids={shown.order} names />
          </div>
          <LoadoutPanels build={shown} />
          <BuildSections build={shown} />
        </>
      ) : null}
    </>
  );
}
