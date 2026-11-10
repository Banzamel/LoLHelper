// Meraki Analytics carries the item effects as League wiki markup, the only public source with
// their numbers ("{{as|9% of the target's '''current''' health}}", "{{rd|9%|6%}}"). This turns
// the markup into plain English text, which is shown to the player and read by the effect
// rules (effectValues.ts).

const fmt = (n: number) => String(Math.round(n * 100) / 100);

// "150*0.8" -> 120: products and quotients of plain numbers (null for anything else).
function calc(expr: string): number | null {
  const parts = expr.trim().split(/([*/])/).map((p) => p.trim());
  let value = Number(parts[0]);
  if (!parts[0] || Number.isNaN(value)) return null;
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i + 1]);
    if (!parts[i + 1] || Number.isNaN(n)) return null;
    value = parts[i] === '*' ? value * n : value / n;
  }
  return value;
}

const LINEAR = /([\d.*/]+)\s*\+\s*\(([\d.*/]+)\s*-\s*[\d.*/]+\)\s*\/\s*[\d.]+\s*\*\s*\(x-1\)(?:\s+for\s+\d+)?/g;
const SPAN = /^(.+?)\s+to\s+(.+?)(?:\s+(?:for|by)\s+[\d.]+)?$/;

const span = (a: string, b: string, whole: string) => {
  const from = calc(a);
  const to = calc(b);
  return from === null || to === null ? whole : `${fmt(from)}–${fmt(to)}`;
};

// A value that grows with the level, written as a formula or as "a to b for n": "a–b".
function range(value: string): string {
  const text = value.trim().replace(LINEAR, (whole, a: string, b: string) => span(a, b, whole));
  const m = text.match(SPAN);
  if (m) return span(m[1], m[2], text);
  const n = calc(text.replace(/\s+for\s+\d+$/, ''));
  return n === null ? text : fmt(n);
}

// {{name|a|b|key=value}} -> its positional arguments (key=value ones are options).
function args(body: string): { name: string; pos: string[]; opts: Record<string, string> } {
  const [name, ...rest] = body.split('|');
  const pos: string[] = [];
  const opts: Record<string, string> = {};
  for (const part of rest) {
    const eq = part.match(/^\s*([a-z][a-z0-9 ]*)=(.*)$/i);
    if (eq) opts[eq[1].trim()] = eq[2].trim();
    else pos.push(part.trim());
  }
  return { name: name.trim().toLowerCase(), pos, opts };
}

function template(body: string): string {
  const { name, pos, opts } = args(body);
  const first = pos[0] || '';
  switch (name) {
    // Melee / ranged values.
    case 'rd': return pos.length > 1 ? `${range(first)} (melee) / ${range(pos[1])} (ranged)` : range(first);
    // A value growing with the level or with something else (type), optional unit (key).
    case 'pp': return `${range(pos.find((p) => /\d/.test(p)) || first)}${opts.key || ''}${opts.type ? ` ${opts.type}` : ''}`;
    // Links to champions, items, abilities, units and tips: the visible name.
    case 'ai': case 'ii': case 'ci': case 'cai': case 'si': case 'ui': case 'bi': case 'ri': case 'sti': case 'tip':
      return pos[pos.length - 1] || first;
    // Styling and tooltip variants: the first argument is the one shown.
    default: return ` ${first} `;
  }
}

export function wikiToPlain(markup: string): string {
  let text = String(markup || '');
  // Innermost templates first, until none is left (bounded: malformed markup must not loop).
  for (let i = 0; i < 40 && /\{\{[^{}]*\}\}/.test(text); i += 1) text = text.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => template(body));
  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/[{}]/g, '')
    .replace(LINEAR, (whole, a: string, b: string) => span(a, b, whole))
    .replace(/(?<![\w.])\d[\d.]*(?:[*/]\d[\d.]*)+(?![\w.])/g, (expr) => { const n = calc(expr); return n === null ? expr : fmt(n); })
    // Radius markers of the wiki ("cr 600 units").
    .replace(/\b[ce]r (?=\d)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:)%])/g, '$1')
    .replace(/\(\s+/g, '(')
    .trim();
}
