// The full effects of an item with their numbers, under Riot's own description (which leaves
// most numbers out). English only: that is the language of the source.
import { useT } from '../../../shared/i18n/useT.ts';
import type { UiItem } from '../types.ts';

export function ItemEffects({ item }: { item: UiItem }) {
  const t = useT();
  if (!item.effects || !item.effects.length) return null;
  return (
    <div className="item-effects">
      <div className="item-effects-title">{t('items.effects')}</div>
      {item.effects.map((e, i) => (
        <p key={i}>
          {e.name ? <strong>{`${e.name}${e.active ? ` (${t('items.active')})` : ''}: `}</strong> : null}
          {e.text}
        </p>
      ))}
    </div>
  );
}
