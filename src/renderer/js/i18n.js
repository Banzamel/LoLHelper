// Translation keys -> texts. Language files live in ../lang/<code>.json.
// Params are interpolated as {name}; the special {champ} param holds a champion id
// and is rendered as the champion's localized name.
let dict = {};
let fallback = {};
let champName = (id) => id;

export async function loadLanguage(lang) {
  const load = async (code) => (await fetch(`lang/${code}.json`)).json();
  fallback = await load('en');
  dict = lang === 'en' ? fallback : await load(lang).catch(() => fallback);
  document.documentElement.lang = lang;
}

export function setChampionResolver(fn) { champName = fn; }

export function t(key, params = {}) {
  const text = dict[key] ?? fallback[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, name) => {
    if (!(name in params)) return m;
    return name === 'champ' || name === 'enemy' ? champName(params[name]) : String(params[name]);
  });
}

// Fills static markup: data-i18n (text) and data-i18n-title (title attribute).
export function translateDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}
