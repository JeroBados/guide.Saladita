import meta from '../data/meta.json';
import type { Lang } from './i18n';

export function contentDateModified(): string {
  return `${meta.contentUpdated}-01`;
}

export function formatContentDate(lang: Lang): string {
  const [year, month] = meta.contentUpdated.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function fillContentDate(text: string, lang: Lang): string {
  return text.replaceAll('{date}', formatContentDate(lang));
}
