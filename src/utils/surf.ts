import surfSpots from '../data/surf-spots.json';
import type { SurfSpot } from '../types/surf-spot';

export const allSurfSpots = surfSpots as SurfSpot[];

export function getSurfSpots(): SurfSpot[] {
  return allSurfSpots;
}


