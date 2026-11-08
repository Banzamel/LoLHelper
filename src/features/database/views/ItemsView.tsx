// Item database: grid filtered by category and stat, with a detail panel.
import { useViewState } from '../../../shared/hooks/useViewState.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { ItemDetail } from '../components/ItemDetail.tsx';
import { ItemIcon } from '../components/ItemIcon.tsx';
import { useGameData } from '../hooks/useGameData.ts';

const CATEGORIES = ['legendary', 'boots', 'boots-upgrade', 'epic', 'component', 'starter', 'support', 'jungle', 'consumable', 'trinket'];
const STATS = ['ad', 'ap', 'as', 'crit', 'armor', 'mr', 'hp', 'haste', 'lethality', 'armorPen', 'magicPen', 'lifesteal', 'omnivamp', 'mana', 'hsp', 'msPct'];

interface Filters { query: string; category: string | null; stat: string | null; selected: number | null }

export function ItemsView() {
  const t = useT();
  const data = useGameData();
  const [f, setF] = useViewState<Filters>('items.filters', { query: '', category: 'legendary', stat: null, selected: null });
  const q = f.query.toLowerCase();
  const list = data.items.filter((i) => (!f.category || i.category === f.category)
    && (!f.stat || i.features.stats[f.stat] || (f.stat === 'magicPen' && i.features.stats.magicPenFlat))
    && (!q || i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q)));
  return (
    <>
      <div className="view-head">
        <h1>{t('items.title')}</h1>
        <span className="muted">{t('items.count', { n: list.length })}</span>
        <div className="spacer" />
        <input className="input search" placeholder={t('items.search')} value={f.query} onChange={(e) => setF({ ...f, query: e.target.value })} />
      </div>
      <div className="filters">
        <div className="tabs wrap">
          {[null, ...CATEGORIES].map((c) => (
            <button key={c || 'all'} className={`tab ${f.category === c ? 'active' : ''}`} onClick={() => setF({ ...f, category: c })}>{t(c ? `category.${c}` : 'category.all')}</button>
          ))}
        </div>
      </div>
      <div className="filters">
        <span className="muted">{t('items.statFilter')}</span>
        <div className="chips">
          {STATS.map((s) => (
            <button key={s} className={`chip filter ${f.stat === s ? 'teal' : ''}`} onClick={() => setF({ ...f, stat: f.stat === s ? null : s })}>{t(`stat.${s}`)}</button>
          ))}
        </div>
      </div>
      <div className="items-layout">
        <div className="item-grid">
          {list.map((i) => (
            <button key={i.id} className={`item-card ${f.selected === i.id ? 'active' : ''}`} onClick={() => setF({ ...f, selected: i.id })}>
              <ItemIcon id={i.id} />
              <div><div className="item-card-name">{i.name}</div><div className="gold-text">{String(i.gold.total)}</div></div>
            </button>
          ))}
        </div>
        <aside className="panel gold item-detail"><ItemDetail item={data.item(f.selected)} onSelect={(id) => setF({ ...f, selected: id })} /></aside>
      </div>
    </>
  );
}
