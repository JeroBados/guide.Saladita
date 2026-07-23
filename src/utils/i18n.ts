import en from '../i18n/en.json';
import es from '../i18n/es.json';

export type Lang = 'en' | 'es';

export function getTranslations(lang: Lang) {
  return lang === 'es' ? es : en;
}

export function getAlternateLang(lang: Lang): Lang {
  return lang === 'en' ? 'es' : 'en';
}
