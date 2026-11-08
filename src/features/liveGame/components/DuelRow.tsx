// One compared figure of two players.
import { fmtGold } from '../../../shared/lib/format.ts';
import { VersusBar } from '../../../shared/ui/charts/VersusBar.tsx';

const fmt = (v: number) => (v >= 1000 ? fmtGold(v) : String(v));

export function DuelRow({ label, a, b }: { label: string; a: number; b: number }) {
  return <div className="duel-row"><span className="duel-label">{label}</span><VersusBar a={a} b={b} fmt={fmt} /></div>;
}
