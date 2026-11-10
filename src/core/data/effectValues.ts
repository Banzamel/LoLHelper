// The full item effects with their numbers. Data Dragon's item texts leave most numbers out,
// so the effects come from Meraki Analytics (wiki markup, English only): as plain text for the
// player, and as the few numbers the engine scores items with. Riot's own stats and texts stay
// the source of everything else: Meraki can lag a patch behind.
import type { RawJson } from '../shared/json.ts';
import type { ItemEffectText } from './types.ts';
import { wikiToPlain } from './wikiText.ts';

export function effectTexts(meraki: RawJson | undefined): ItemEffectText[] {
  if (!meraki) return [];
  const of = (list: RawJson[] | undefined, active: boolean) => (list || [])
    .map((e): ItemEffectText => ({ name: e.name || '', text: wikiToPlain(e.effects), ...(active ? { active } : {}) }))
    .filter((e) => e.text);
  return [...of(meraki.passives, false), ...of(meraki.active, true)];
}

// "9% (melee) / 6% (ranged)" and "150–200" become one number (the mean) for the rules below.
function flatten(text: string): string {
  return text
    .replace(/([\d.]+)–([\d.]+)/g, (_, a: string, b: string) => String((Number(a) + Number(b)) / 2))
    .replace(/([\d.]+)(%?)( AD)? \(melee\) \/ ([\d.]+)%?(?: AD)? \(ranged\)/g, (_, a: string, pct: string, ad: string | undefined, b: string) => `${(Number(a) + Number(b)) / 2}${pct}${ad || ''}`);
}

const apRatio = (text: string) => Number((text.match(/\(\+ ([\d.]+)% AP\)/) || [])[1] || 0);
// An empowered attack now and then, not every attack.
const SOMETIMES = /next (\d+ )?basic attacks?|fully Energized|At \d+ stacks/i;

// The numbers of one effect text; keys as in ItemFeatures.values.
function valuesOf(effect: ItemEffectText): Record<string, number> {
  const text = flatten(effect.text);
  const out: Record<string, number> = {};
  const spellblade = effect.name === 'Spellblade' && text.match(/deals ([\d.]+)% base AD/);
  // 1% AP is counted as 4% base AD: about what an AP build's ability power is to its base AD.
  if (spellblade) out.spellblade = Number(spellblade[1]) + 4 * apRatio(text);
  // Bonus damage of the owner's basic attacks (not against wards or structures).
  const onHit = !spellblade && /basic attack/i.test(text) && !/turret|to wards/.test(text)
    && text.match(/deal(?:s|ing)? ([\d.]+) (?:\(\+ [^)]*\) )?bonus (?:magic|physical|true) damage/);
  if (onHit) out.onHit = (Number(onHit[1]) + apRatio(text)) / (SOMETIMES.test(text) ? 3 : 1);
  const hp = text.match(/([\d.]+)% of (?:the )?target's (?:current|maximum) health/);
  if (hp) {
    const ticks = text.match(/every ([\d.]+) seconds over ([\d.]+) seconds/);
    out.targetHp = Number(hp[1]) * (ticks ? Number(ticks[2]) / Number(ticks[1]) : 1);
  }
  // Increased damage: the percentage itself, or the total it stacks up to.
  for (const sentence of text.split(/\. /)) {
    if (!/increased (\w+ )?damage|damage dealt to them by/.test(sentence)) continue;
    const pcts = [...sentence.matchAll(/([\d.]+)% (?:\(\+ [^)]*\) )?(?:[a-z' ]{0,40} )?increased (?:\w+ )?damage|total (?:increase )?of ([\d.]+)%|damage dealt to them by ([\d.]+)%/g)]
      .map((m) => Number(m[1] || m[2] || m[3]));
    if (pcts.length) out.amp = Math.max(out.amp || 0, ...pcts);
  }
  const shred = text.match(/% (armor|magic resistance) reduction, up to ([\d.]+)%/);
  if (shred) out[shred[1] === 'armor' ? 'armorShred' : 'mrShred'] = Number(shred[2]);
  const pen = text.match(/([\d.]+)% resistances penetration/);
  if (pen) out.penPct = Number(pen[1]);
  const ap = text.match(/your ability power by ([\d.]+)%/i);
  if (ap) out.apMult = Number(ap[1]);
  return out;
}

// The numbers of an item: the strongest of each kind over its effects.
export function effectValues(effects: ItemEffectText[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of effects) for (const [k, v] of Object.entries(valuesOf(e))) out[k] = Math.round(Math.max(out[k] || 0, v) * 100) / 100;
  return out;
}

// Flags the full texts settle better than Data Dragon's short ones. Only called for items
// Meraki knows; the others keep the flags read from Riot's text.
export function refineFlags(flags: Record<string, boolean>, effects: ItemEffectText[], values: Record<string, number>): Record<string, boolean> {
  const text = effects.map((e) => e.text).join(' ');
  const out = { ...flags };
  const set = (flag: string, on: boolean) => { if (on) out[flag] = true; else delete out[flag]; };
  set('maxHpDamage', !!values.targetHp || (!!flags.maxHpDamage && /target's (\w+ )?health/.test(text)));
  set('onHitDamage', !!flags.onHitDamage || !!values.onHit);
  set('burn', !!flags.burn || /\bburns?\b/i.test(text));
  set('damageAmp', !!flags.damageAmp || !!values.amp);
  // Armour and magic resist reduction help different damage.
  set('armorShred', !!values.armorShred || (!!flags.armorShred && !values.mrShred && /armor/i.test(text)));
  set('mrShred', !!values.mrShred || (!!flags.armorShred && /magic resistance/i.test(text)));
  // Healing in a fight; not regeneration out of combat (Warmog's Armor) or a revive.
  set('healSelf', (!!flags.healSelf || /heals? you(rself)?\b|omnivamp/i.test(text)) && !/has not been taken|resurrection/i.test(text));
  set('execute', /execute them/i.test(text));
  set('onHitAmp', /appl(y|ies) on-hit effects/i.test(text));
  set('manaScaling', /(attack damage|ability power) equal to [\d.]+% (maximum|bonus) mana/i.test(text));
  return out;
}
