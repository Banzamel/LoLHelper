// The detail sections under the buy order: starters, boots, core and situational items with
// the reasons for each.
import type { Build, BuildItem } from '../../../core/engine/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ItemIcon, useGameData } from '../../database/index.ts';

function ItemRow({ entry }: { entry: BuildItem }) {
  const t = useT();
  const data = useGameData();
  const it = data.item(entry.id);
  if (!it) return null;
  const reasons: string[] = [];
  if (entry.stats && entry.stats.length) reasons.push(t('build.keyStats', { stats: entry.stats.map((s) => t(`stat.${s}`)).join(', ') }));
  for (const r of entry.reasons || []) reasons.push(t(r.key, r.params));
  return (
    <div className="build-item">
      <ItemIcon id={entry.id} />
      <div>
        <div className="build-item-name">{it.name}<span className="gold-text">{` ${it.gold.total}`}</span></div>
        <div className="chips">{reasons.map((r, i) => <span key={i} className="chip">{r}</span>)}</div>
      </div>
    </div>
  );
}

export function BuildSections({ build }: { build: Build }) {
  const t = useT();
  const data = useGameData();
  const boots = build.boots ? data.item(build.boots.id) : null;
  const upgrade = build.boots ? data.item(build.boots.upgrade) : null;
  return (
    <div className="build-grid">
      <section className="panel build-section">
        <h2>{t('build.start')}</h2>
        <div className="build-strip">{build.starters.map((s) => <ItemIcon key={s.id} id={s.id} count={s.count} />)}</div>
      </section>
      <section className="panel build-section">
        <h2>{t('build.boots')}</h2>
        {boots && build.boots ? (
          <div className="build-item">
            <ItemIcon id={boots.id} />
            <div>
              <div className="build-item-name">{boots.name}</div>
              <div className="chips">
                <span className="chip">{t(build.boots.reason)}</span>
                {upgrade ? <span className="chip teal">{t('build.upgrade', { name: upgrade.name })}</span> : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <section className="panel build-section"><h2>{t('build.core')}</h2>{build.core.map((e) => <ItemRow key={e.id} entry={e} />)}</section>
      <section className="panel build-section"><h2>{t('build.situational')}</h2>{build.situational.map((e) => <ItemRow key={e.id} entry={e} />)}</section>
    </div>
  );
}
