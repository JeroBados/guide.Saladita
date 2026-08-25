import surfSpots from '../data/surf-spots.json';
import type { Lang } from './i18n';
import type { SurfSpot } from '../types/surf-spot';

export const allSurfSpots = surfSpots as SurfSpot[];

export function getSurfSpots(): SurfSpot[] {
  return allSurfSpots;
}

export function getForecastWidgetUrl(slug: string): string {
  return `https://www.surf-forecast.com/breaks/${slug}/forecasts/widget/a`;
}

export function getForecastPageUrl(slug: string, lang: Lang): string {
  const base = lang === 'es' ? 'https://es.surf-forecast.com' : 'https://www.surf-forecast.com';
  return `${base}/breaks/${slug}/forecasts/latest`;
}
