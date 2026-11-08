// Number and time formats shared by the views.

export const fmtMinutes = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtGold = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace('.0', '')}k` : String(Math.round(v)));
export const kdaText = (k: number, d: number, a: number) => `${k} / ${d} / ${a}`;
export const kdaRatio = (k: number, d: number, a: number) => ((k + a) / Math.max(1, d)).toFixed(2);
export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
export const percent = (wins: number, games: number) => (games ? Math.round((wins / games) * 100) : 0);
export const fmtDate = (ms: number, locale: string) => new Date(ms).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });

// Joins class names, skipping empty ones.
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');
