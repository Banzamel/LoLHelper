// Starting items and boots for a build class.
import type { Champion, Db, Item } from '../../data/types.ts';
import type { Build, BuildClass, Threats } from '../types.ts';

const MAGES: BuildClass[] = ['mage-burst', 'mage-battle', 'mage-artillery', 'enchanter'];

function mainStarter(db: Db, cls: BuildClass, role: string | null, laner: Champion | null): Item | undefined {
  const byName = (n: string) => db.items.filter((i) => i.nameEn === n).sort((a, b) => a.id - b.id)[0];
  if (role === 'SUPPORT') return db.items.find((i) => i.category === 'support' && i.nameEn === 'World Atlas') || db.items.find((i) => i.category === 'support');
  if (role === 'JUNGLE') return byName(cls === 'tank' ? 'Mosstomper Seedling' : (cls === 'assassin-ad' ? 'Gustwalker Hatchling' : 'Scorchclaw Pup'));
  if (MAGES.includes(cls) || cls === 'ap-bruiser') return byName("Doran's Ring");
  if (cls === 'tank' || (cls === 'bruiser' && laner && laner.attackType === 'RANGED')) return byName("Doran's Shield");
  return byName("Doran's Blade");
}

export function pickStarters(db: Db, cls: BuildClass, role: string | null, laner: Champion | null): Build['starters'] {
  const potion = db.items.filter((i) => i.nameEn === 'Health Potion').sort((a, b) => a.id - b.id)[0];
  const main = mainStarter(db, cls, role, laner);
  const potions = main && main.nameEn === "Doran's Ring" ? 2 : 1;
  const out: Build['starters'] = [];
  if (main) out.push({ id: main.id, count: 1 });
  if (potion) out.push({ id: potion.id, count: role === 'SUPPORT' ? 2 : potions });
  return out;
}

// attacker: the champion's item style lives off attack speed, whatever its class.
function bootsChoice(cls: BuildClass, t: Threats, attacker: boolean): [string, string] {
  if (t.cc >= 2 || (t.ap >= 0.6 && cls !== 'marksman' && !attacker)) return ["Mercury's Treads", 'build.bootsMercury'];
  if (t.ad >= 0.6 && (t.autoAttack >= 0.4 || t.burstAD >= 0.2)) return ['Plated Steelcaps', 'build.bootsSteelcaps'];
  if (cls === 'marksman' || attacker) return ["Berserker's Greaves", 'build.bootsBerserker'];
  if (['mage-burst', 'mage-battle', 'mage-artillery'].includes(cls)) return ["Sorcerer's Shoes", 'build.bootsSorcerer'];
  if (cls === 'enchanter' || cls === 'assassin-ad') return ['Ionian Boots of Lucidity', 'build.bootsLucidity'];
  return [t.ad >= t.ap ? 'Plated Steelcaps' : "Mercury's Treads", 'build.bootsDefault'];
}

export function pickBoots(db: Db, cls: BuildClass, t: Threats, attacker = false): Build['boots'] {
  const [name, reason] = bootsChoice(cls, t, attacker);
  const boots = db.items.find((i) => i.nameEn === name && i.category === 'boots') || db.items.find((i) => i.category === 'boots');
  return boots ? { id: boots.id, upgrade: boots.into[0] || null, reason } : null;
}
