// Items in buy order, numbered, each with its direct parts below (what to buy towards it).
// owned: item ids the player has (finished items and parts are ticked).
import { ItemIcon, useGameData } from '../../database/index.ts';

export function BuildOrder({ ids, owned = [], names = false }: { ids: number[]; owned?: number[]; names?: boolean }) {
  const data = useGameData();
  const have = new Set(owned);
  return (
    <div className={`buy-order ${names ? 'named' : ''}`}>
      {ids.map((id, i) => {
        const it = data.item(id);
        if (!it) return null;
        return (
          <div key={`${id}-${i}`} className={`buy-step ${have.has(id) ? 'owned' : ''}`}>
            <div className="buy-main"><span className="buy-n">{String(i + 1)}</span><ItemIcon id={id} size={names ? 'lg' : ''} /></div>
            {names ? <div className="buy-name">{it.name}<span className="gold-text">{` ${it.gold.total}`}</span></div> : null}
            {(it.from || []).length && !have.has(id) ? (
              <div className="buy-parts">{it.from.map((c, j) => <div key={`${c}-${j}`} className={have.has(c) ? 'owned' : ''}><ItemIcon id={c} size="xs" /></div>)}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
