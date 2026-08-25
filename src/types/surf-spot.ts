export interface SurfSpot {
  id: string;
  forecastSlug: string;
  name: { en: string; es: string };
  badge: { en: string; es: string };
  summary: { en: string; es: string };
  type: { en: string; es: string };
  bottom: { en: string; es: string };
  level: { en: string; es: string };
  tide: { en: string; es: string };
  wind: { en: string; es: string };
  swell: { en: string; es: string };
  rideLength?: { en: string; es: string };
  lat: number;
  lng: number;
  mapsQuery?: string;
  image?: string;
}
