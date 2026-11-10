// What a champion's abilities scale with, read from Meraki's ability data: the damage ratios
// (AP, AD) and how much the kit leans on basic attacks, on-hit effects and critical strikes.
// The engine picks the item style of a champion from it (engine/builds/itemStyle.ts).
import type { RawJson } from '../shared/json.ts';
import type { ChampionScaling } from './types.ts';

const SLOTS = ['P', 'Q', 'W', 'E', 'R'];
// One ability counts at most this much: "total damage" rows of multi-hit abilities would
// otherwise outweigh the rest of the kit.
const RATIO_CAP = 150;

const lastOf = <T>(list: T[] | undefined): T | undefined => (list && list.length ? list[list.length - 1] : undefined);

// The highest AP and AD damage ratio (%, at maximum rank) of one ability.
function ratios(forms: RawJson[]): { ap: number; ad: number } {
  let ap = 0;
  let ad = 0;
  for (const form of forms) for (const effect of form.effects || []) for (const row of effect.leveling || []) {
    if (!/damage/i.test(row.attribute || '')) continue;
    for (const m of row.modifiers || []) {
      const unit = String(lastOf<string>(m.units) || '').replace(/\s+/g, ' ').trim();
      const value = Number(lastOf<number>(m.values)) || 0;
      if (unit === '% AP') ap = Math.max(ap, value);
      else if (unit === '% AD' || unit === '% bonus AD') ad = Math.max(ad, value);
    }
  }
  return { ap: Math.min(RATIO_CAP, ap), ad: Math.min(RATIO_CAP, ad) };
}

// meraki: one champion of Meraki's champions.json (undefined when it is not listed).
export function championScaling(meraki: RawJson | undefined): ChampionScaling | undefined {
  if (!meraki || !meraki.abilities) return undefined;
  const out: ChampionScaling = { ap: 0, ad: 0, attack: 0, onHit: 0, attackSpeed: 0, crit: 0, critChance: 0 };
  for (const slot of SLOTS) {
    const forms: RawJson[] = meraki.abilities[slot] || [];
    const text = forms.flatMap((f) => (f.effects || []).map((e: RawJson) => e.description || '')).join(' ');
    const r = ratios(forms);
    out.ap += r.ap;
    out.ad += r.ad;
    if (/basic attack|on-hit|attack speed/i.test(text)) out.attack += 1;
    if (/on-hit/i.test(text)) out.onHit += 1;
    if (/bonus attack speed/i.test(text)) out.attackSpeed += 1;
    if (/critical(ly)? strike/i.test(text)) out.crit += 1;
    if (/critical strike chance/i.test(text)) out.critChance += 1;
  }
  out.ap = Math.round(out.ap);
  out.ad = Math.round(out.ad);
  return out;
}
