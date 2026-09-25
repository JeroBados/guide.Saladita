import places from '../data/places.json';

const site = 'https://guide.lasaladitarentals.com';

export function buildJsonLd(lang: 'en' | 'es') {
  const destination = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: lang === 'en' ? 'La Saladita' : 'La Saladita',
    description:
      lang === 'en'
        ? 'A growing surf town in Guerrero with one of the longest lefts in Mexico. Guide by Saladita Rentals, updated September 2026.'
        : 'Pueblo surfero en crecimiento en Guerrero, con una de las izquierdas más largas de México. Guía de Saladita Rentals, actualizada en septiembre 2026.',
    url: lang === 'en' ? site : `${site}/es/`,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 17.842,
      longitude: -101.7686,
    },
  };

  const featured = places
    .filter((place) => place.category === 'eat' || place.category === 'surf')
    .slice(0, 6)
    .map((place) => ({
      '@context': 'https://schema.org',
      '@type': place.category === 'eat' ? 'Restaurant' : 'TouristAttraction',
      name: place.name,
      description: place.desc[lang],
      url: `${site}/#${place.id}`,
    }));

  return {
    '@context': 'https://schema.org',
    '@graph': [destination, ...featured],
  };
}
