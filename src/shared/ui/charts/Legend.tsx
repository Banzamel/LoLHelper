// Series legend; a single series needs none (its title says it).
export function Legend({ series }: { series: { label: string; color: string }[] }) {
  if (series.length < 2) return null;
  return <div className="chart-legend">{series.map((s) => <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>)}</div>;
}
