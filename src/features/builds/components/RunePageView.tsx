// A rune page: both trees with the keystone, the runes with their short descriptions and the
// stat shards; with a guide, how to use the keystone.
import type { KeystoneTip as Tip } from '../../../core/engine/runes.ts';
import type { RunePage } from '../../../core/engine/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RuneIcon, useGameData, type UiRune } from '../../database/index.ts';
import { KeystoneTip } from './KeystoneTip.tsx';

function TreeHead({ tree }: { tree: UiRune | null }) {
  const data = useGameData();
  return <div className="tree-head">{tree ? <img src={data.asset(tree.icon)} alt="" /> : null}<span>{tree ? tree.name : ''}</span></div>;
}

// A rune with its Data Dragon short description (line breaks flattened; the tooltip has it in full).
function RuneCell({ id }: { id: number }) {
  const data = useGameData();
  const r = data.rune(id);
  return (
    <div className="rune-cell">
      <RuneIcon id={id} />
      <div className="rune-text">
        <span>{r ? r.name || '' : ''}</span>
        {r && r.description ? <span className="rune-desc" dangerouslySetInnerHTML={{ __html: r.description.replace(/<br\s*\/?>/gi, ' ') }} /> : null}
      </div>
    </div>
  );
}

export function RunePageView({ runes, tip }: { runes: RunePage; tip?: Tip | null }) {
  const t = useT();
  const data = useGameData();
  const ids = runes.selectedPerkIds;
  const keystone = data.rune(ids[0]);
  return (
    <div className="rune-page">
      <div className="rune-col">
        <TreeHead tree={data.rune(runes.primaryStyleId)} />
        <div className="keystone"><RuneIcon id={ids[0]} size="lg" /><strong>{keystone ? keystone.name : ''}</strong></div>
        <KeystoneTip tip={tip} />
        <div className="rune-row">{ids.slice(1, 4).map((id) => <RuneCell key={id} id={id} />)}</div>
      </div>
      <div className="rune-col">
        <TreeHead tree={data.rune(runes.subStyleId)} />
        <div className="rune-row">{ids.slice(4, 6).map((id) => <RuneCell key={id} id={id} />)}</div>
        <div className="shards">
          {ids.slice(6).map((id, i) => <div className="rune-cell" key={`${id}-${i}`}><RuneIcon id={id} size="sm" /><span>{t(`shard.${id}`)}</span></div>)}
        </div>
      </div>
    </div>
  );
}
