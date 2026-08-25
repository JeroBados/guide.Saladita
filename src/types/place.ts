export type PlaceCategory = 'eat' | 'cafe' | 'surf' | 'service' | 'tip' | 'stay';
export type PlaceChip = 'eat' | 'surf' | 'move' | 'relax' | 'tips' | 'stay';

export interface PlaceCta {
  type: 'maps' | 'whatsapp' | 'link';
  url?: string;
  waText?: { en: string; es: string };
}

export interface Place {
  id: string;
  category: PlaceCategory;
  chip: PlaceChip;
  name: string;
  lat: number | null;
  lng: number | null;
  mapsQuery?: string;
  badge: { en: string; es: string };
  desc: { en: string; es: string };
  note?: { en: string; es: string };
  hours?: string;
  featured?: boolean;
  image?: string;
  cta: PlaceCta;
}

export interface MapPlace {
  id: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  chip: PlaceChip;
  name: string;
  badge: string;
  image: string;
  ctaType: PlaceCta['type'];
  ctaUrl: string | null;
  directionsLabel: string;
  whatsappLabel: string;
}
