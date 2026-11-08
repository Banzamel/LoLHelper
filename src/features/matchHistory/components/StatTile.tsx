// A labelled figure with an optional second line; tone colours it as good or bad.
export function StatTile({ label, value, sub = null, tone = '' }: { label: string; value: string; sub?: string | null; tone?: string }) {
  return (
    <div className={`stat-tile ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {sub ? <span className="stat-sub">{sub}</span> : null}
    </div>
  );
}
