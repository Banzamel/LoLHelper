// Rune guide (engine/runes): how to use the shown keystone; nothing without a curated tip.
import type { KeystoneTip as Tip } from '../../../core/engine/runes.ts';
import { useT } from '../../../shared/i18n/useT.ts';

export function KeystoneTip({ tip }: { tip: Tip | null | undefined }) {
  const t = useT();
  if (!tip) return null;
  return <p className="rune-tip"><span className="rune-tip-label">{t('rune.howTo')}</span>{t(tip.use)}</p>;
}
