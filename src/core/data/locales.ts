// App languages. UI texts live in src/lang/<code>.json (translation keys); DATA_LOCALES maps
// each app language to the Data Dragon locale used for champion and item texts. To add a
// language: add lang/<code>.json, register it in shared/i18n and add an entry here.
export const DATA_LOCALES: Record<string, string> = {
  pl: 'pl_PL',
  en: 'en_US',
};

export const DEFAULT_LANGUAGE = 'pl';
