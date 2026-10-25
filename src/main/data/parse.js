// Text analysis of Data Dragon (en_US) ability and item descriptions.
// Traits are detected with keyword rules, so they work for every champion and item
// without a hand-written table — including new ones after a patch.

const ALLOWED_TAGS = new Set(['br', 'stats', 'attention', 'passive', 'active', 'rarityMythic', 'rarityLegendary',
  'physicalDamage', 'magicDamage', 'trueDamage', 'healing', 'shield', 'keyword', 'status', 'speed', 'OnHit',
  'scaleArmor', 'scaleMR', 'scaleHealth', 'scaleAD', 'scaleAP', 'scaleMana', 'buffedStat', 'nerfedStat', 'li', 'rules', 'flavorText', 'mainText']);

function sanitizeHtml(html) {
  return String(html)
    .replace(/<(\/?)([a-zA-Z]+)[^>]*>/g, (m, slash, tag) => (ALLOWED_TAGS.has(tag) ? `<${slash}${tag.toLowerCase()}>` : ''))
    .replace(/\{\{[^}]*\}\}/g, '');
}

function plain(html) {
  return String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\{\{[^}]*\}\}/g, '?').trim();
}

const SPELL_RULES = {
  hardCC: /\b(stun(s|ned)?|knock(s|ed)? ?(up|back|aside)|airborne|root(s|ed)?|snare|suppress(es|ed)?|charm(s|ed)?|fear(s|ed)?|flee|taunt(s|ed)?|sleep|drowsy|pull(s|ed)?|polymorph|ground(s|ed)?|berserk)\b/i,
  slow: /\bslow(s|ed|ing)?\b/i,
  dash: /\b(dash(es)?|leap(s)?|lunge(s)?|blink(s)?|jump(s)?|vault(s)?|teleport(s)?|charges? forward|flies)\b/i,
  heal: /\b(heal(s|ing)?|restor(e|es|ing) .{0,25}health|life ?steal|omnivamp|physical vamp|regenerat(e|es|ion))\b/i,
  shield: /\bshield(s|ed)?\b/i,
  stealth: /\b(invisib(le|ility)|camouflage(d)?|stealth)\b/i,
  untargetable: /\buntargetable|invulnerab(le|ility)|stasis\b/i,
  percentHp: /(maximum|max|missing|current) health (as |in )?(bonus )?(physical|magic|true )?damage|% of (the )?target's (maximum|max|missing|current) health/i,
  trueDamage: /true damage/i,
  execute: /\bexecute(s|d)?\b/i,
  zone: /\b(zone|field|area for \d|pool|wall)\b/i,
};

function spellText(s) {
  return `${s.description || ''} ${s.tooltip || ''}`;
}

// Returns counts of abilities that have each trait plus derived flags.
function extractChampionTraits(en) {
  const counts = Object.fromEntries(Object.keys(SPELL_RULES).map((k) => [k, 0]));
  const texts = [...en.spells.map(spellText), en.passive.description || ''];
  for (const t of texts) {
    const clean = plain(t);
    for (const [k, re] of Object.entries(SPELL_RULES)) if (re.test(clean)) counts[k] += 1;
  }
  const ranges = en.spells.map((s) => Math.max(...(s.range || [0]).map(Number).filter((n) => n < 25000)));
  counts.longRange = ranges.filter((r) => r >= 1000).length;
  counts.range = en.stats.attackrange;
  return counts;
}

const STAT_NAMES = {
  'attack damage': 'ad', 'ability power': 'ap', armor: 'armor', 'magic resist': 'mr', health: 'hp',
  'attack speed': 'as', 'critical strike chance': 'crit', 'ability haste': 'haste', lethality: 'lethality',
  'armor penetration': 'armorPen', 'life steal': 'lifesteal', omnivamp: 'omnivamp', mana: 'mana',
  'base mana regen': 'manaRegen', 'base health regen': 'hpRegen', 'heal and shield power': 'hsp',
  tenacity: 'tenacity', 'slow resist': 'slowResist', 'critical strike damage': 'critDmg',
};

function parseStats(desc) {
  const stats = {};
  const block = (desc.match(/<stats>([\s\S]*?)<\/stats>/) || [])[1] || '';
  for (const line of block.split(/<br\s*\/?>/i)) {
    const m = plain(line).match(/^([\d.]+)(%?)\s+(.+)$/);
    if (!m) continue;
    const value = Number(m[1]);
    const name = m[3].toLowerCase().trim();
    if (name === 'move speed') stats[m[2] ? 'msPct' : 'ms'] = value;
    else if (name === 'magic penetration') stats[m[2] ? 'magicPen' : 'magicPenFlat'] = value;
    else if (STAT_NAMES[name]) stats[STAT_NAMES[name]] = value;
  }
  return stats;
}

const ITEM_RULES = {
  grievous: /Grievous Wounds|Wounds<\/keyword>|% Wounds/i,
  stasis: /Stasis/i,
  lifeline: /Lifeline/i,
  revive: /Rebirth|revive|resurrect/i,
  spellshield: /Spell ?Shield|Annul/i,
  cleanse: /Remove all crowd control|Quicksilver|cleanse/i,
  antiAttackSpeed: /Attack Speed of|reduc\w* .{0,40}Attack Speed|Winter's Caress|Rock Solid/i,
  antiCrit: /critical strike/i,
  thorns: /Thorns|reflect/i,
  antiShield: /Shield Reaver|reduc\w* .{0,20}shield/i,
  maxHpDamage: /(maximum|max|current) Health (as )?(bonus )?(physical |magic )?damage|of the target's (maximum|current) Health/i,
  blockAttacks: /damage taken from Attacks|reduce\w* .{0,30}damage from (basic )?Attacks/i,
  shieldSelf: /gain .{0,40}shield|shield/i,
  slowOnHit: /Slow/i,
  armorShred: /reduc\w* .{0,30}(Armor|Magic Resist)/i,
};

function extractItemFeatures(en) {
  const desc = en.description || '';
  const passiveText = desc.replace(/<stats>[\s\S]*?<\/stats>/, '');
  const flags = {};
  for (const [k, re] of Object.entries(ITEM_RULES)) if (re.test(passiveText)) flags[k] = true;
  if ((en.tags || []).includes('OnHit')) flags.onHit = true;
  const passives = [...passiveText.matchAll(/<(passive|active)>([^<]+)<\/\1>/g)].map((m) => m[2].trim());
  return { stats: parseStats(desc), flags, passives };
}

module.exports = { extractChampionTraits, extractItemFeatures, sanitizeHtml, plain };
