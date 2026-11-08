// Item details in the tooltip. The description is Data Dragon markup reduced to a fixed set of
// tags by the database builder (data/parse sanitizeHtml), so it is rendered as HTML.
import { useT } from '../../../shared/i18n/useT.ts';
import type { UiItem } from '../types.ts';

export function ItemTooltip({ item }: { item: UiItem }) {
  const t = useT();
  return (
    <div>
      <h4>{item.name}</h4>
      <div className="tt-cost">{t('common.gold', { n: item.gold.total })}</div>
      <div className="item-desc" dangerouslySetInnerHTML={{ __html: item.description || '' }} />
    </div>
  );
}
