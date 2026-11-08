// The selected item: cost, plain text, description and its build path both ways.
import { useT } from '../../../shared/i18n/useT.ts';
import { useGameData } from '../hooks/useGameData.ts';
import type { UiItem } from '../types.ts';
import { ItemIcon } from './ItemIcon.tsx';

export function ItemDetail({ item: it, onSelect }: { item: UiItem | null; onSelect: (id: number) => void }) {
  const t = useT();
  const data = useGameData();
  if (!it) return <p className="muted">{t('items.select')}</p>;
  const tree = (ids: number[], title: string) => (ids.length ? (
    <div>
      <h3 className="sub">{title}</h3>
      <div className="build-strip">{ids.filter((id) => data.item(id)).map((id) => <ItemIcon key={id} id={id} onClick={() => onSelect(id)} />)}</div>
    </div>
  ) : null);
  return (
    <div>
      <div className="item-head">
        <ItemIcon id={it.id} size="lg" />
        <div>
          <h2>{it.name}</h2>
          <div className="gold-text">{`${t('items.cost')}: ${it.gold.total} (${it.gold.base})`}</div>
          <div className="muted">{`${t('items.sell')}: ${it.gold.sell}`}</div>
        </div>
      </div>
      {it.plaintext ? <p className="muted item-plain">{it.plaintext}</p> : null}
      <div className="item-desc" dangerouslySetInnerHTML={{ __html: it.description || '' }} />
      {tree(it.from, t('items.buildsFrom'))}
      {tree(it.into, t('items.buildsInto'))}
    </div>
  );
}
