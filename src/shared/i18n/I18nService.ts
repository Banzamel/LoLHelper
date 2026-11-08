// The current translator: replaced when the language or the champion names change, so
// components using useT re-render with the new texts.
import { Store } from '../lib/Store.ts';
import { Translator } from './Translator.ts';

export class I18nService {
  readonly store = new Store<{ translator: Translator }>({ translator: new Translator('pl') });
  private nameOf: (id: string) => string = (id) => id;

  private publish(lang: string) {
    this.store.set({ translator: new Translator(lang, (id) => this.nameOf(id)) });
  }

  setLanguage(lang: string) {
    document.documentElement.lang = lang;
    this.publish(lang);
  }

  // Champion names in the current language, once the database is loaded.
  setChampionNames(nameOf: (id: string) => string) {
    this.nameOf = nameOf;
    this.publish(this.store.get().translator.lang);
  }

  get t() { return this.store.get().translator.t; }
}
