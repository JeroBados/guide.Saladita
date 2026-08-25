import type { Lang } from './i18n';
import type { Place } from '../types/place';

export const WA_NUMBER = '525611073849';
export const WA_CATALOG_URL = 'https://www.whatsapp.com/catalog/5215611073849/?app_absent=0';

export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function buildMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function getCtaUrl(place: Place, lang: Lang): string | null {
  const { cta } = place;

  if (cta.type === 'maps') {
    if (place.mapsQuery) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapsQuery)}`;
    }
    if (place.lat == null || place.lng == null) return null;
    return buildMapsDirectionsUrl(place.lat, place.lng);
  }

  if (cta.type === 'whatsapp' && cta.waText) {
    return buildWhatsAppUrl(cta.waText[lang]);
  }

  if (cta.type === 'link' && cta.url) {
    return cta.url;
  }

  return null;
}

export function getCtaLabel(
  place: Place,
  lang: Lang,
  labels: { directions: string; whatsapp: string; catalog?: string },
): string {
  if (place.cta.type === 'whatsapp') return labels.whatsapp;
  if (place.cta.type === 'link' && place.cta.url?.includes('whatsapp.com/catalog')) {
    return labels.catalog ?? labels.whatsapp;
  }
  if (place.cta.type === 'maps') return labels.directions;
  return labels.directions;
}
