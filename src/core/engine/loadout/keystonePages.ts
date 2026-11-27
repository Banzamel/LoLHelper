// A full rune page (without shards) around a champion's own keystone, for when it is not the
// keystone of its class preset. The secondary tree follows how the champion deals damage.
import type { Keystone } from '../knowledge/champions.ts';
import type { BuildClass } from '../types.ts';

export interface KeystonePage { tree: string; keystone: string; rows: string[]; sub: string; subRunes: string[] }

export interface PageFor {
  cls: BuildClass;
  ap: boolean;
  melee: boolean;
}

const SORCERY = { sub: 'Sorcery', subRunes: ['Manaflow Band', 'Transcendence'] };
const INSPIRATION = { sub: 'Inspiration', subRunes: ['Magical Footwear', 'Biscuit Delivery'] };
const SUPPORT_INSP = { sub: 'Inspiration', subRunes: ['Biscuit Delivery', 'Cosmic Insight'] };
const RESOLVE = { sub: 'Resolve', subRunes: ['Bone Plating', 'Unflinching'] };
const PRECISION_AD = { sub: 'Precision', subRunes: ['Triumph', 'Last Stand'] };

export function keystonePage(ks: Keystone, { cls, ap, melee }: PageFor): KeystonePage {
  const tank = ['tank', 'support-tank'].includes(cls);
  const page = (tree: string, rows: string[], second: { sub: string; subRunes: string[] }) => ({ tree, keystone: ks, rows, sub: second.sub, subRunes: [...second.subRunes] });
  switch (ks) {
    case 'Conqueror':
      if (ap) return page('Precision', ['Presence of Mind', 'Legend: Haste', 'Last Stand'], SORCERY);
      return melee ? page('Precision', ['Triumph', 'Legend: Alacrity', 'Last Stand'], RESOLVE) : page('Precision', ['Presence of Mind', 'Legend: Haste', 'Cut Down'], INSPIRATION);
    case 'Lethal Tempo':
      if (melee) return page('Precision', ['Triumph', 'Legend: Alacrity', 'Last Stand'], { sub: 'Resolve', subRunes: ['Bone Plating', 'Overgrowth'] });
      return page('Precision', ['Presence of Mind', 'Legend: Alacrity', 'Cut Down'], ap ? { sub: 'Resolve', subRunes: ['Second Wind', 'Overgrowth'] } : INSPIRATION);
    case 'Fleet Footwork':
      return page('Precision', ['Presence of Mind', 'Legend: Bloodline', 'Coup de Grace'], INSPIRATION);
    case 'Press the Attack':
      return page('Precision', ['Presence of Mind', 'Legend: Bloodline', 'Coup de Grace'], ap ? { sub: 'Resolve', subRunes: ['Second Wind', 'Overgrowth'] } : INSPIRATION);
    case 'Electrocute':
      return ap ? page('Domination', ['Taste of Blood', 'Grisly Mementos', 'Ultimate Hunter'], SORCERY)
        : page('Domination', ['Sudden Impact', 'Grisly Mementos', 'Relentless Hunter'], PRECISION_AD);
    case 'Dark Harvest':
      return page('Domination', ['Cheap Shot', 'Grisly Mementos', 'Ultimate Hunter'], ap ? SORCERY : PRECISION_AD);
    case 'Hail of Blades':
      return page('Domination', ['Sudden Impact', 'Grisly Mementos', 'Relentless Hunter'], ap ? SORCERY : PRECISION_AD);
    case 'Arcane Comet':
      return page('Sorcery', ['Manaflow Band', 'Transcendence', 'Scorch'], SUPPORT_INSP);
    case 'Summon Aery':
      return page('Sorcery', ['Manaflow Band', 'Transcendence', 'Scorch'], { sub: 'Resolve', subRunes: ['Font of Life', 'Revitalize'] });
    case 'First Strike':
      return page('Inspiration', ['Magical Footwear', 'Biscuit Delivery', 'Cosmic Insight'], ap ? SORCERY : { sub: 'Precision', subRunes: ['Presence of Mind', 'Cut Down'] });
    case 'Grasp of the Undying':
      return tank ? page('Resolve', ['Demolish', 'Bone Plating', 'Overgrowth'], INSPIRATION)
        : page('Resolve', ['Demolish', 'Second Wind', 'Overgrowth'], { sub: 'Precision', subRunes: ['Triumph', 'Legend: Alacrity'] });
    case 'Aftershock':
      return page('Resolve', ['Font of Life', 'Bone Plating', 'Unflinching'], SUPPORT_INSP);
    case 'Guardian':
      return page('Resolve', ['Font of Life', 'Bone Plating', 'Revitalize'], SUPPORT_INSP);
  }
}
