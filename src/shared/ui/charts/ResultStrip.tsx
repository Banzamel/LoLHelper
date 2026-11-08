// Results as a strip of W/L squares, newest first.
export function ResultStrip({ results, label }: { results: boolean[]; label?: string }) {
  return <div className="result-strip" title={label}>{results.map((w, i) => <i key={i} className={w ? 'w' : 'l'}>{w ? 'W' : 'L'}</i>)}</div>;
}
