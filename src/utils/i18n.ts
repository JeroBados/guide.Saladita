import en from '../i18n/en.json';
import es from '../i18n/es.json';
import { fillContentDate } from './meta';

export type Lang = 'en' | 'es';

export function getTranslations(lang: Lang) {
  const raw = lang === 'es' ? es : en;
  return {
    ...raw,
    'hero.updated': fillContentDate(raw['hero.updated'], lang),
    byline: fillContentDate(raw['byline'], lang),
  };
}

export function getAlternateLang(lang: Lang): Lang {
  return lang === 'en' ? 'es' : 'en';
}
