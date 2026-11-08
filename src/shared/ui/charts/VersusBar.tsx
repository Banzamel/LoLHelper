// Two-sided comparison bar: share of `a` against `b` (e.g. team gold), labels on both ends.
export function VersusBar({ a, b, fmt = String, labelA = '', labelB = '' }: { a: number; b: number; fmt?: (v: number) => string; labelA?: string; labelB?: string }) {
  const sum = a + b || 1;
  return (
    <div className="versus-bar">
      <span className="vb-a">{labelA}<strong>{fmt(a)}</strong></span>
      <div className="vb-track"><i className="vb-fill-a" style={{ width: `${(a / sum) * 100}%` }} /><i className="vb-fill-b" style={{ width: `${(b / sum) * 100}%` }} /></div>
      <span className="vb-b"><strong>{fmt(b)}</strong>{labelB}</span>
    </div>
  );
}
