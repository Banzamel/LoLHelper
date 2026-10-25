// App languages. UI texts live in src/renderer/lang/<code>.json (translation keys);
// DATA_LOCALES maps each app language to the Data Dragon locale used for champion
// and item texts. To add a language: add lang/<code>.json and an entry here.
const DATA_LOCALES = {
  pl: 'pl_PL',
  en: 'en_US',
};

const DEFAULT_LANGUAGE = 'pl';

module.exports = { DATA_LOCALES, DEFAULT_LANGUAGE };
