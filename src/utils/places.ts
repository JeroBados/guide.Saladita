import places from '../data/places.json';
import type { Lang } from './i18n';
import type { MapPlace, Place } from '../types/place';
import { buildMapsDirectionsUrl, buildWhatsAppUrl, getCtaUrl } from './wa';

export const allPlaces = places as Place[];

export const SURF_SPOT_IDS = ['saladita-point', 'rancho', 'la-boca'] as const;

export function getEatPlaces(): Place[] {
  return allPlaces.filter((place) => place.chip === 'eat');
}

export function getSurfPlaces(): Place[] {
  return allPlaces.filter((place) => SURF_SPOT_IDS.includes(place.id as (typeof SURF_SPOT_IDS)[number]));
}

export function getServicePlaces(): Place[] {
  const order = ['airport-transfer', 'surf-lessons', 'board-rental', 'massage', 'private-chef', 'car-rental', 'moto-rental', 'atv-rental'];
  const services = allPlaces.filter((place) => place.category === 'service');
  return services.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export function getStayPlaces(): Place[] {
  return allPlaces.filter((place) => place.chip === 'stay');
}

export function getMapPlaces(
  lang: Lang,
  labels: { directions: string; whatsapp: string },
): MapPlace[] {
  return allPlaces
    .filter((place): place is Place & { lat: number; lng: number } => place.lat != null && place.lng != null)
    .map((place) => ({
      id: place.id,
      lat: place.lat,
      lng: place.lng,
      category: place.category,
      chip: place.chip,
      name: place.name,
      badge: place.badge[lang],
      image: `/media/places/${place.id}.jpg`,
      ctaType: place.cta.type,
      ctaUrl: getCtaUrl(place, lang),
      directionsLabel: labels.directions,
      whatsappLabel: labels.whatsapp,
    }));
}

export function getMapCenter(mapPlaces: MapPlace[]): [number, number] {
  if (mapPlaces.length === 0) return [17.842, -101.7686];

  const totals = mapPlaces.reduce(
    (acc, place) => ({ lat: acc.lat + place.lat, lng: acc.lng + place.lng }),
    { lat: 0, lng: 0 },
  );

  return [totals.lat / mapPlaces.length, totals.lng / mapPlaces.length];
}

export { buildMapsDirectionsUrl, buildWhatsAppUrl, getCtaUrl };
