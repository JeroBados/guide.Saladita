import places from '../data/places.json';

const site = 'https://guide.lasaladitarentals.com';

export function buildJsonLd(lang: 'en' | 'es') {
  const destination = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: lang === 'en' ? 'La Saladita' : 'La Saladita',
    description:
      lang === 'en'
        ? 'A surf village on the Guerrero coast — local guide by Saladita Rentals.'
        : 'Pueblo de surf en la costa de Guerrero — guía local de Saladita Rentals.',
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
