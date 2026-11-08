// Play-style traits as chips, each with its hint in the title.
import type { StyleTrait } from '../../../core/matches/playStyle.ts';
import { useT } from '../../../shared/i18n/useT.ts';

export function TraitChips({ traits }: { traits: StyleTrait[] }) {
  const t = useT();
  return (
    <div className="chips">
      {traits.map((x) => {
        const params = { v: x.value, champ: x.value };
        return <span key={x.key} className={`chip ${x.tone === 'plus' ? 'plus' : x.tone === 'minus' ? 'minus' : 'teal'}`} title={t(`${x.key}Hint`, params)}>{t(x.key, params)}</span>;
      })}
    </div>
  );
}
