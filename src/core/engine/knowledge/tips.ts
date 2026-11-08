// Curated champion briefs: champion id -> translation key of a hand-written brief, for
// champions whose kit the archetype and rating rules describe poorly (unique mechanics).
// The curated text replaces the generated one; each key needs a text in every lang file.
export const BRIEFS: Record<string, string> = {
  Yuumi: 'brief.champ.Yuumi',
  Kalista: 'brief.champ.Kalista',
  Teemo: 'brief.champ.Teemo',
  Sylas: 'brief.champ.Sylas',
  Singed: 'brief.champ.Singed',
};

// Keystones with curated tips, by Data Dragon rune key (the same in every language). Each key K
// needs rune.use.K (how to play it) and rune.watch.K (how to play against it) in every lang file;
// a keystone missing here (a new one) shows only its Data Dragon description.
export const KEYSTONE_TIPS: string[] = [
  'Electrocute', 'DarkHarvest', 'HailOfBlades',
  'GlacialAugment', 'UnsealedSpellbook', 'FirstStrike',
  'PressTheAttack', 'LethalTempo', 'FleetFootwork', 'Conqueror',
  'GraspOfTheUndying', 'Aftershock', 'Guardian',
  'SummonAery', 'ArcaneComet', 'PhaseRush', 'DeathfireTouch',
];
