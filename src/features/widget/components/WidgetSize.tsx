// The size slider shown on the widget in move mode, so it can be resized during a match without
// leaving the game. The new size is applied on release: the widget would otherwise grow under
// the cursor while the slider is dragged.
import { useEffect, useState } from 'react';
import { windowMessages } from '../../../platform/index.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { SCALE_MAX, SCALE_MIN, WIDGET_SCALE } from '../types.ts';

export function WidgetSize({ scale }: { scale: number }) {
  const t = useT();
  const [value, setValue] = useState(Math.round(scale * 100));
  useEffect(() => { setValue(Math.round(scale * 100)); }, [scale]);
  const commit = () => { void windowMessages.send('main', WIDGET_SCALE, value / 100); };
  return (
    <div className="w-size">
      <span>{t('overlay.size')}</span>
      <input type="range" min={SCALE_MIN * 100} max={SCALE_MAX * 100} step={5} value={value}
        onChange={(e) => setValue(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} />
      <span className="gold-text">{`${value}%`}</span>
    </div>
  );
}
