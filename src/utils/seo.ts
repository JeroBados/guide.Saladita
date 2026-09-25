import places from '../data/places.json';
import spots from '../data/surf-spots.json';

const site = 'https://guide.lasaladitarentals.com';

export function buildJsonLd(lang: 'en' | 'es') {
  const pageUrl = lang === 'en' ? `${site}/` : `${site}/es/`;
  const org = {
    '@type': 'Organization',
    '@id': 'https://lasaladitarentals.com/#org',
    name: 'Saladita Rentals',
    url: 'https://lasaladitarentals.com',
    logo: `${site}/logo.png`,
    sameAs: ['https://instagram.com/saladitarentals'],
  };

  const destination = {
    '@type': 'TouristDestination',
    '@id': `${pageUrl}#la-saladita`,
    name: 'La Saladita',
    description:
      lang === 'en'
        ? 'A growing surf town in Guerrero, Mexico, with one of the longest left-hand waves in Mexico and an international crowd. About 45 minutes from Zihuatanejo airport (ZIH).'
        : 'Pueblo surfero en crecimiento en Guerrero, México, con una de las izquierdas más largas de México y turismo internacional. A unos 45 minutos del aeropuerto de Zihuatanejo (ZIH).',
    url: pageUrl,
    geo: { '@type': 'GeoCoordinates', latitude: 17.842, longitude: -101.7686 },
    containedInPlace: { '@type': 'AdministrativeArea', name: 'Guerrero, México' },
    includesAttraction: spots.map((s) => ({
      '@type': 'TouristAttraction',
      name: s.name[lang],
      description: `${s.badge[lang]}. ${s.summary[lang]}`,
      url: `${pageUrl}#${s.id}`,
      geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
    })),
  };

  const eats = places
    .filter((p) => 'slot' in p && p.slot)
    .map((p) => ({
      '@type': p.id === 'hacienda-cafe' ? 'GroceryStore' : 'FoodEstablishment',
      name: p.name,
      description: p.desc[lang],
      url: `${pageUrl}#${p.id}`,
      address: { '@type': 'PostalAddress', addressLocality: p.id === 'angelinas' ? 'Los Llanos' : 'La Saladita', addressRegion: 'Guerrero', addressCountry: 'MX' },
    }));

  const page = {
    '@type': 'WebPage',
    '@id': pageUrl,
    url: pageUrl,
    inLanguage: lang,
    dateModified: '2026-09-25',
    author: { '@id': org['@id'] },
    publisher: { '@id': org['@id'] },
    about: { '@id': destination['@id'] },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [org, page, destination, ...eats],
  };
}
