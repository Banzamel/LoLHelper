// Translation keys -> texts. Params are interpolated as {name}; the {champ} and {enemy} params
// hold a champion id and are rendered as the champion's localized name.
import en from '../../lang/en.json';
import pl from '../../lang/pl.json';

export type Dictionary = Record<string, string>;
export type Params = Record<string, string | number | null | undefined>;

const LANGUAGES: Record<string, Dictionary> = { en, pl };
export const LANGUAGE_CODES = Object.keys(LANGUAGES);

export class Translator {
  readonly lang: string;
  private readonly dict: Dictionary;
  private readonly champName: (id: string) => string;

  constructor(lang: string, champName: (id: string) => string = (id) => id) {
    this.lang = LANGUAGES[lang] ? lang : 'en';
    this.dict = LANGUAGES[this.lang];
    this.champName = champName;
  }

  withChampionNames(champName: (id: string) => string): Translator {
    return new Translator(this.lang, champName);
  }

  t = (key: string, params: Params = {}): string => {
    const text = this.dict[key] ?? en[key as keyof typeof en] ?? key;
    return text.replace(/\{(\w+)\}/g, (m, name: string) => {
      if (!(name in params)) return m;
      const value = params[name];
      return name === 'champ' || name === 'enemy' ? this.champName(String(value)) : String(value);
    });
  };

  // The locale for dates and numbers.
  get locale() { return this.lang === 'pl' ? 'pl-PL' : 'en-GB'; }
}
