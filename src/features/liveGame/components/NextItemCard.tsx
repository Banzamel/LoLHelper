// What to buy: the starting items before the first purchase, then the next item with its
// progress, its parts (owned ones ticked) and the biggest part affordable right now.
import type { Build } from '../../../core/engine/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ItemIcon, useGameData } from '../../database/index.ts';
import { startersCost } from '../gameModel.ts';

export function NextItemCard({ build, gold, starting }: { build: Build; gold: number; starting: boolean }) {
  const t = useT();
  const data = useGameData();
  if (starting) {
    const cost = startersCost(data, build);
    return (
      <div className="card hero-card">
        <div className="card-kicker">{t('live.starters')}</div>
        <p className="muted small">{t('live.startersHint')}</p>
        <div className="build-strip starters">{build.starters.map((s) => <ItemIcon key={s.id} id={s.id} size="lg" count={s.count} />)}</div>
        <div className="gold-text">{t('live.startersCost', { n: cost })}</div>
        {cost > gold ? <span className="chip">{t('live.missingGold', { n: cost - gold })}</span> : null}
      </div>
    );
  }
  const next = build.next;
  const it = next ? data.item(next.id) : null;
  if (!next || !it) return <div className="card hero-card"><div className="card-kicker">{t('live.nextItem')}</div><p className="muted">{t('live.buildDone')}</p></div>;
  const missing = next.cost - gold;
  const buy = next.buy && next.buy.id !== it.id ? data.item(next.buy.id) : null;
  const progress = Math.max(0, Math.min(1, gold / Math.max(1, next.cost)));
  return (
    <div className={`card hero-card ${missing <= 0 ? 'ready' : ''}`}>
      <div className="card-kicker">{t('live.nextItem')}</div>
      <div className="next-body">
        <ItemIcon id={it.id} size="lg" />
        <div className="next-text">
          <h3>{it.name}</h3>
          <div className="gold-text">{t('live.remaining', { n: next.cost })}</div>
          <div className="bar gold next-bar"><i style={{ width: `${progress * 100}%` }} /></div>
          <span className={`chip ${missing <= 0 ? 'plus' : ''}`}>{missing <= 0 ? t('live.canAfford') : t('live.missingGold', { n: missing })}</span>
        </div>
      </div>
      {next.parts.length ? <div className="next-parts">{next.parts.map((p, i) => <div key={i} className={`next-part ${p.owned ? 'owned' : ''}`}><ItemIcon id={p.id} size="sm" /></div>)}</div> : null}
      {buy && next.buy ? (
        <div className="buy-now"><span className="muted">{t('live.buyNow')}</span><ItemIcon id={buy.id} size="sm" /><strong>{buy.name}</strong><span className="gold-text">{` ${next.buy.cost}`}</span></div>
      ) : null}
    </div>
  );
}
