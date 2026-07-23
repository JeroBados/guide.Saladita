# SPEC MAESTRO — Saladita Guide 2.0
### guide.lasaladitarentals.com · Rediseño completo · Astro 5 · Bilingüe EN/ES

> **Cómo usar este documento:** abrilo en Cursor como `SPEC.md` en la raíz del proyecto.
> Cada milestone (M1–M4) tiene su prompt exacto para Cursor al final del documento (§10).
> Regla de trabajo: **un milestone por sesión.** No avanzar al siguiente sin QA en móvil real.

---

## 1. Decisiones cerradas

| Ítem | Decisión |
|---|---|
| Stack | Astro 5, output `static` (Hostinger sirve archivos estáticos) |
| Estilos | CSS puro con custom properties (tokens §2). Sin Tailwind: menos peso, control total |
| Idiomas | EN default en `/`, ES en `/es/` (routing i18n de Astro + hreflang) |
| Mapa | Leaflet 1.9 + OpenStreetMap (CDN, $0). Pines auto desde `places.json` |
| Animaciones | CSS scroll-driven nativas + View Transitions. **Cero librerías JS de animación** |
| Buscador | Chips de intención (1 tap), sin texto libre |
| Tips privados | Ruta `/secrets` (y `/es/secrets`) con `noindex,nofollow`, sin link desde el sitio |
| Analytics | GA4 |
| Deploy | Hostinger — GitHub Action → FTP automático (o manual vía hPanel, §11) |
| Fuentes | Fraunces (display) + DM Sans (body), self-hosted vía `@fontsource` |

---

## 2. Design tokens (estética ORIGEN)

Crear `src/styles/tokens.css`:

```css
:root {
  /* Paleta canónica Saladita Rentals */
  --navy:   #153448;   /* fondos oscuros, hero, footer */
  --navy-2: #0f2736;   /* overlay video, profundidad */
  --cream:  #f0ede6;   /* fondo base de página */
  --sand:   #D8CEBC;   /* cards, superficies elevadas */
  --taupe:  #948979;   /* texto secundario, bordes */
  --sage:   #A4B2B0;   /* badges, acentos suaves, pines */

  /* Tipografía */
  --font-display: 'Fraunces Variable', Georgia, serif;
  --font-body: 'DM Sans Variable', system-ui, sans-serif;

  /* Escala tipográfica (mobile-first, fluida) */
  --text-hero: clamp(2.2rem, 8vw, 4.5rem);
  --text-h2:   clamp(1.6rem, 5vw, 2.6rem);
  --text-h3:   1.25rem;
  --text-body: 1rem;
  --text-small: .85rem;

  /* Superficies */
  --radius: 18px;
  --radius-chip: 999px;
  --shadow-card: 0 4px 24px rgba(21, 52, 72, .10);
  --shadow-float: 0 12px 40px rgba(21, 52, 72, .18);

  /* Motion */
  --ease-out: cubic-bezier(.16, 1, .3, 1);
  --dur: .6s;
}
```

**Patrón de firma ORIGEN (obligatorio en todos los H2):** título en Fraunces con la
palabra clave en *itálica* y peso menor. Ejemplo:
`## Where to <em>eat & drink</em>` / `## Dónde <em>comer y tomar algo</em>`.
En CSS: `h2 em { font-style: italic; font-weight: 400; color: var(--taupe); }` sobre navy usar `var(--sage)`.

**Eyebrows** (etiqueta pequeña sobre cada H2, como ORIGEN):
DM Sans, uppercase, letter-spacing `.14em`, tamaño `--text-small`, color `--taupe`.

---

## 3. Árbol del proyecto

```
saladita-guide/
├── SPEC.md                        ← este documento
├── astro.config.mjs               ← i18n: defaultLocale 'en', locales ['en','es']
├── package.json
├── public/
│   ├── media/
│   │   ├── hero.mp4               ← <2MB, 8–12s loop, sin audio
│   │   ├── hero-poster.jpg        ← fallback obligatorio
│   │   └── places/                ← 1 foto por lugar: {id}.jpg (1200px, WebP ideal)
│   ├── og/
│   │   ├── og-default.jpg         ← 1200×630, preview al compartir por WhatsApp
│   │   └── og-secrets.jpg
│   ├── favicon.svg
│   └── robots.txt                 ← Disallow: /secrets, /es/secrets
├── src/
│   ├── data/
│   │   ├── places.json            ← ÚNICA fuente de verdad (§4)
│   │   └── secrets.json           ← tips privados, misma estructura
│   ├── i18n/
│   │   ├── en.json                ← strings de UI (§5)
│   │   └── es.json
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   └── animations.css         ← scroll-driven (§9)
│   ├── layouts/
│   │   └── Base.astro             ← SEO head, hreflang, GA4, fuentes, View Transitions
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── LangToggle.astro       ← EN/ES arriba a la derecha, como ORIGEN
│   │   ├── IntentChips.astro
│   │   ├── MapSection.astro       ← Leaflet
│   │   ├── SurfToday.astro
│   │   ├── PlaceCard.astro
│   │   ├── ServiceCard.astro      ← CTA WhatsApp
│   │   ├── TipsTeaser.astro
│   │   ├── StayRebook.astro
│   │   ├── WaveDivider.astro      ← SVG ola animada
│   │   └── Footer.astro
│   └── pages/
│       ├── index.astro            ← EN
│       ├── secrets.astro          ← EN, noindex
│       └── es/
│           ├── index.astro
│           └── secrets.astro
└── .github/workflows/deploy.yml   ← build + FTP a Hostinger (§11)
```

---

## 4. Data layer — `places.json` (fuente única de verdad)

**Todo el contenido vive acá.** Las tarjetas Y los pines del mapa se generan de este
archivo. Agregar un restaurante nuevo = agregar un objeto, cero código.

### Schema

```json
{
  "id": "string único, kebab-case (= nombre de foto en /public/media/places/)",
  "category": "eat | cafe | surf | service | tip",
  "chip": "eat | surf | move | relax | tips",
  "name": "string",
  "lat": 0.0,
  "lng": 0.0,
  "badge": { "en": "...", "es": "..." },
  "desc": { "en": "1–2 frases", "es": "1–2 frases" },
  "note": { "en": "tip del local, opcional", "es": "..." },
  "hours": "string opcional",
  "cta": {
    "type": "maps | whatsapp | link",
    "url": "solo si type=link",
    "waText": { "en": "mensaje pre-armado", "es": "..." }
  }
}
```

### Seed inicial (contenido real — completar `lat/lng`, ver §12)

```json
[
  {
    "id": "bennys",
    "category": "eat", "chip": "eat",
    "name": "Benny's",
    "lat": null, "lng": null,
    "badge": { "en": "Lunch by the beach", "es": "Almuerzo frente al mar" },
    "desc": {
      "en": "Fresh seafood and a casual beachside vibe. The go-to for a relaxed daytime meal.",
      "es": "Mariscos frescos y ambiente relajado junto a la playa. El clásico para comer de día."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "marea",
    "category": "eat", "chip": "eat",
    "name": "Marea",
    "lat": null, "lng": null,
    "badge": { "en": "Sunset spot", "es": "Atardeceres" },
    "desc": {
      "en": "The most popular spot in town — ocean-view dinners and cocktails at sunset.",
      "es": "El lugar más popular del pueblo: cenas con vista al mar y cócteles al atardecer."
    },
    "note": { "en": "Arrive early at sunset, it fills up fast.", "es": "Llegá temprano al atardecer, se llena rápido." },
    "cta": { "type": "maps" }
  },
  {
    "id": "pacos",
    "category": "eat", "chip": "eat",
    "name": "Paco's",
    "lat": null, "lng": null,
    "badge": { "en": "All-day reliable", "es": "Rinde todo el día" },
    "desc": {
      "en": "Local dishes, consistent quality, any time of day. A safe bet, always.",
      "es": "Platos locales, calidad constante, a cualquier hora. Apuesta segura, siempre."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "ilianet",
    "category": "eat", "chip": "eat",
    "name": "Ilianet",
    "lat": null, "lng": null,
    "badge": { "en": "Dinner classic", "es": "Cena clásica" },
    "desc": {
      "en": "Traditional cuisine and a relaxed nighttime atmosphere. A memorable dinner spot.",
      "es": "Cocina tradicional y ambiente nocturno relajado. Una cena para recordar."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "acadia",
    "category": "cafe", "chip": "eat",
    "name": "Acadia",
    "lat": null, "lng": null,
    "badge": { "en": "Café · bar · events", "es": "Café · bar · eventos" },
    "desc": {
      "en": "Coffee and breakfast by day, drinks by night, events on weekends. The town's meeting point.",
      "es": "Café y desayuno de día, tragos de noche, eventos los findes. El punto de encuentro del pueblo."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "angelinas",
    "category": "eat", "chip": "eat",
    "name": "Angelina's (Los Llanos)",
    "lat": null, "lng": null,
    "badge": { "en": "Authentic local food", "es": "Comida local auténtica" },
    "desc": {
      "en": "In the nearby town of Los Llanos — traditional Mexican dishes, truly local experience.",
      "es": "En el pueblo vecino de Los Llanos: platos mexicanos tradicionales, experiencia 100% local."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "hacienda-cafe",
    "category": "cafe", "chip": "eat",
    "name": "Hacienda Café",
    "lat": null, "lng": null,
    "badge": { "en": "Best WiFi in town", "es": "El mejor WiFi del pueblo" },
    "desc": {
      "en": "Good coffee, reliable internet, small market with basics. Remote-work friendly.",
      "es": "Buen café, internet confiable y tiendita con básicos. Ideal para trabajar remoto."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "saladita-point",
    "category": "surf", "chip": "surf",
    "name": "La Saladita Point",
    "lat": null, "lng": null,
    "badge": { "en": "The endless left", "es": "La izquierda infinita" },
    "desc": {
      "en": "The wave that put Saladita on the map — a long, mellow left made for longboarding. Beginner to intermediate friendly.",
      "es": "La ola que puso a Saladita en el mapa: una izquierda larga y noble, hecha para longboard. Apta de principiante a intermedio."
    },
    "cta": { "type": "whatsapp", "waText": {
      "en": "Hi! I'd like to book a surf lesson at La Saladita 🏄",
      "es": "¡Hola! Quiero reservar una clase de surf en La Saladita 🏄"
    }}
  },
  {
    "id": "rancho",
    "category": "surf", "chip": "surf",
    "name": "Rancho",
    "lat": null, "lng": null,
    "badge": { "en": "Step it up", "es": "Un nivel más" },
    "desc": {
      "en": "Bigger and more exposed than the point, often less crowded. For intermediate surfers.",
      "es": "Más grande y expuesta que el point, y muchas veces con menos gente. Para intermedios."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "la-boca",
    "category": "surf", "chip": "surf",
    "name": "La Boca",
    "lat": null, "lng": null,
    "badge": { "en": "Fast & punchy", "es": "Rápida y con fuerza" },
    "desc": {
      "en": "A nearby beach break with faster, more powerful sections. Intermediate level, swell-dependent.",
      "es": "Beach break cercano con secciones rápidas y potentes. Nivel intermedio, depende del swell."
    },
    "cta": { "type": "maps" }
  },
  {
    "id": "surf-lessons",
    "category": "service", "chip": "surf",
    "name": "Surf lessons & board rental",
    "lat": null, "lng": null,
    "badge": { "en": "All levels", "es": "Todos los niveles" },
    "desc": {
      "en": "Local instructors who know every section of the wave. Boards included.",
      "es": "Instructores locales que conocen cada sección de la ola. Tablas incluidas."
    },
    "cta": { "type": "whatsapp", "waText": {
      "en": "Hi! I'd like info about surf lessons / board rental 🏄",
      "es": "¡Hola! Quiero info de clases de surf / renta de tablas 🏄"
    }}
  },
  {
    "id": "massage",
    "category": "service", "chip": "relax",
    "name": "Massage & wellness",
    "lat": null, "lng": null,
    "badge": { "en": "At your house", "es": "En tu casa" },
    "desc": {
      "en": "Post-surf massage at your rental, ocean sounds included.",
      "es": "Masaje post-surf en tu casa, con sonido de mar incluido."
    },
    "cta": { "type": "whatsapp", "waText": {
      "en": "Hi! I'd like to book a massage in La Saladita 💆",
      "es": "¡Hola! Quiero reservar un masaje en La Saladita 💆"
    }}
  },
  {
    "id": "private-chef",
    "category": "service", "chip": "relax",
    "name": "Private chef",
    "lat": null, "lng": null,
    "badge": { "en": "Dinner at home", "es": "Cena en casa" },
    "desc": {
      "en": "A local chef cooks fresh seafood at your place. Ideal for groups and special nights.",
      "es": "Un chef local cocina mariscos frescos en tu casa. Ideal para grupos y noches especiales."
    },
    "cta": { "type": "whatsapp", "waText": {
      "en": "Hi! I'd like info about a private chef dinner 👨‍🍳",
      "es": "¡Hola! Quiero info de cena con chef privado 👨‍🍳"
    }}
  },
  {
    "id": "airport-transfer",
    "category": "service", "chip": "move",
    "name": "Airport transfers & drivers",
    "lat": null, "lng": null,
    "badge": { "en": "ZIH ⇄ Saladita", "es": "ZIH ⇄ Saladita" },
    "desc": {
      "en": "Private transfer from Zihuatanejo airport, with a grocery stop on the way if you want.",
      "es": "Traslado privado desde el aeropuerto de Zihuatanejo, con parada para súper si querés."
    },
    "cta": { "type": "whatsapp", "waText": {
      "en": "Hi! I'd like to book an airport transfer to La Saladita 🚗",
      "es": "¡Hola! Quiero reservar un traslado al aeropuerto desde/hacia La Saladita 🚗"
    }}
  },
  {
    "id": "tours",
    "category": "service", "chip": "relax",
    "name": "Tours & excursions",
    "lat": null, "lng": null,
    "badge": { "en": "Beyond the wave", "es": "Más allá de la ola" },
    "desc": {
      "en": "Day trips and local excursions around the coast — ask us what's on this week.",
      "es": "Salidas de día y excursiones por la costa. Preguntanos qué hay esta semana."
    },
    "cta": { "type": "whatsapp", "waText": {
      "en": "Hi! What tours / excursions are available this week?",
      "es": "¡Hola! ¿Qué tours o excursiones hay disponibles esta semana?"
    }}
  }
]
```

### `secrets.json` (misma estructura, capa privada)

```json
[
  {
    "id": "hot-springs",
    "category": "tip", "chip": "tips",
    "name": "The hot springs",
    "lat": null, "lng": null,
    "badge": { "en": "Local secret", "es": "Secreto local" },
    "desc": {
      "en": "TODO Jero: cómo llegar, mejor horario, qué llevar, con quién ir.",
      "es": "TODO Jero: cómo llegar, mejor horario, qué llevar, con quién ir."
    },
    "cta": { "type": "maps" }
  }
]
```
*(Agregar acá más secretos a medida que aparezcan: playas escondidas, spots de pesca, etc.)*

---

## 5. i18n — `en.json` / `es.json`

Solo strings de UI (el contenido ya es bilingüe en `places.json`):

```json
{
  "nav.lang": "ES",
  "hero.eyebrow": "Curated by the people who live here",
  "hero.title": "Your local guide to <em>La Saladita</em>",
  "hero.sub": "Where to eat, surf, relax and move — from your hosts at Saladita Rentals.",
  "chips.question": "What are you looking for?",
  "chips.eat": "🍽 Eat & drink",
  "chips.surf": "🏄 Surf",
  "chips.move": "🚗 Get around",
  "chips.relax": "💆 Relax",
  "chips.tips": "💎 Local tips",
  "map.title": "La Saladita, <em>mapped</em>",
  "map.directions": "Directions",
  "surf.title": "Surf <em>today</em>",
  "surf.forecast": "Live forecast",
  "eat.title": "Where to <em>eat & drink</em>",
  "services.title": "Book an <em>experience</em>",
  "services.cta": "Book via WhatsApp",
  "tips.title": "Know <em>before you go</em>",
  "tips.teaser": "Hot springs, hidden corners and the things only locals know — guests staying with us get the full list in their welcome message.",
  "stay.title": "Coming back? <em>Book direct</em>",
  "stay.sub": "Best rates, no platform fees, and a host who already knows you.",
  "stay.cta": "See our houses",
  "footer.share": "Share this guide"
}
```
*(Cursor genera el `es.json` espejo; revisar tono rioplatense-neutro para huésped: usar “tú/neutral” en ES público.)*

**Nota de tono ES público:** el contenido en español de cara al huésped va en
español neutro (tú/impersonal), no voseo. El voseo queda para comunicación interna.

---

## 6. Especificación por sección (orden de la página)

### 6.1 Hero — `Hero.astro`
- 100svh (usar `svh`, no `vh`, por barras de navegador móvil).
- `<video autoplay muted loop playsinline poster="/media/hero-poster.jpg">` + overlay
  `linear-gradient(180deg, rgba(15,39,54,.55), rgba(21,52,72,.85))`.
- **Regla de peso:** si `navigator.connection.saveData === true` o `effectiveType` incluye
  `2g` → no cargar el video, dejar poster. Script inline de 5 líneas.
- Título con animación de *reveal* por línea (clip-path, CSS puro, al load).
- Logo SR arriba izquierda, `LangToggle` arriba derecha.
- Al fondo: `WaveDivider` (SVG de ola, path animado con `translateX` loop lento,
  `@media (prefers-reduced-motion: reduce)` lo frena).

### 6.2 Chips de intención — `IntentChips.astro`
- Sticky bajo el hero (`position: sticky; top: 0`), fondo cream con blur sutil.
- 5 chips: Eat & drink · Surf · Get around · Relax · Local tips. Radius `--radius-chip`,
  activo = fondo navy texto cream; inactivo = borde taupe.
- Comportamiento: filtran **tarjetas + pines del mapa a la vez** (mismo dataset).
  JS vanilla: `data-chip` en cada card/pin, toggle de clase `.hidden`, transición con
  View Transitions API si está disponible (`document.startViewTransition`).
- Chip "Local tips" muestra la sección teaser (no los secretos).
- Estado inicial: todos visibles.

### 6.3 Mapa — `MapSection.astro`
- Leaflet vía CDN, cargado con `client:visible` / lazy (solo cuando entra al viewport —
  crítico para performance móvil).
- Tiles OSM estándar. Pines: `L.divIcon` circular con color por categoría
  (eat=navy, surf=sage, service=taupe, tip=sand con borde navy).
- Tap en pin → popup custom con: foto (si existe), nombre, badge, botón según `cta.type`:
  - `maps` → `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` (abre navegación)
  - `whatsapp` → link wa.me (§6.5)
- El mapa escucha los chips y muestra/oculta pines.
- Altura móvil: `60svh`. Centro inicial: promedio de coordenadas cargadas.

### 6.4 Surf today — `SurfToday.astro`
- Fondo navy (sección oscura de contraste, como ORIGEN).
- Widget embed gratuito de surf-forecast.com para el spot "La Saladita" (iframe lazy)
  + botón outline "Live forecast" → link al spot La Saladita en Surfline (abre pestaña).
- Debajo: 3 mini-cards de spots (del JSON, chip=surf) + CTA "Book a surf lesson".

### 6.5 Eat & Drink + Servicios — `PlaceCard.astro` / `ServiceCard.astro`
- Grid: 1 col móvil, 2 tablet, 3 desktop. Gap generoso.
- Card: foto arriba (aspect 4/3, `loading="lazy"`, zoom sutil `scale(1.04)` en
  hover/`:active`), badge sage flotante, nombre en Fraunces, desc, `note` en itálica
  taupe si existe, CTA abajo.
- **Construcción del link WhatsApp (helper único `wa.ts`):**
  `https://wa.me/525611073849?text=${encodeURIComponent(waText[lang])}`
- Analytics: `gtag('event', 'cta_click', { place: id, type: cta.type })` en cada CTA.
  Este evento es la métrica de éxito comercial de la guía.

### 6.6 Tips — `TipsTeaser.astro` + página `/secrets`
- **Pública:** acordeones colapsables (cash, señal, caminos, groceries, respeto local —
  contenido del Local Guide actual) + card final navy: teaser de secretos
  (`tips.teaser`) **sin link**. Genera deseo, no regala el contenido.
- **/secrets:** misma estética, render de `secrets.json`, `<meta name="robots"
  content="noindex,nofollow">` + bloqueada en `robots.txt`. El link viaja solo en el
  mensaje de bienvenida de cada huésped (agregar al template de welcome de Gato Surf).

### 6.7 Stay & rebook — `StayRebook.astro`
- Sección navy final. Título `stay.title`, stats estilo ORIGEN con count-up
  (4.9★ rating · 80–90% high-season occupancy) — count-up con
  `IntersectionObserver` + JS de 15 líneas, sin librerías.
- CTA primario sand → `https://lasaladitarentals.com` (UTM: `?utm_source=guide&utm_medium=referral&utm_campaign=rebook`).
- CTA secundario outline → Instagram @saladitarentals.

### 6.8 Footer
- Navy. Logo, WhatsApp, Instagram, mail, "Share this guide" (Web Share API:
  `navigator.share` con fallback copy-link). Crédito: Saladita Rentals · Surf · Stay · Connect.

---

## 7. SEO (lo que hoy no existe)

En `Base.astro`:
- `<title>` y meta description únicos por página e idioma.
- **Open Graph completo** (`og:image` = `/og/og-default.jpg` 1200×630) — es lo que hace
  que el link compartido por WhatsApp muestre foto + título. Prioridad máxima.
- `hreflang` recíprocos en/es + `x-default`.
- JSON-LD: `TouristDestination` para la página + `Restaurant`/`TouristAttraction` por
  lugar destacado (generado desde `places.json`).
- `@astrojs/sitemap` con exclusión de `/secrets`.
- `robots.txt`: `Disallow: /secrets` y `Disallow: /es/secrets`.

---

## 8. Performance (presupuesto duro)

| Métrica | Límite |
|---|---|
| Peso primera carga (sin video) | < 300 KB |
| Video hero | < 2 MB, se omite en conexiones lentas |
| JS total | < 30 KB propio (Leaflet solo carga al ver el mapa) |
| LCP en 3G | < 3 s |
| Imágenes | WebP 1200px máx, `loading="lazy"` en todo salvo hero poster |

---

## 9. Animaciones (spec exacta)

`src/styles/animations.css`:

```css
/* 1. Reveal en cascada al scroll — CSS scroll-driven, cero JS */
@supports (animation-timeline: view()) {
  .reveal {
    animation: rise var(--dur) var(--ease-out) both;
    animation-timeline: view();
    animation-range: entry 0% entry 40%;
  }
}
@keyframes rise {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: none; }
}
/* Cascada: en cada grid, .reveal:nth-child(n) con animation-range escalonado
   o delay incremental vía style="--i: n" */

/* Fallback navegadores viejos: IntersectionObserver agrega .reveal-in (10 líneas JS) */

/* 2. Respeto reduced motion — obligatorio */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Inventario completo:
1. **Hero:** reveal del título por línea al load + ola SVG ondulando en loop.
2. **Scroll:** todas las cards y H2 con `.reveal` en cascada (lo de arriba).
3. **Chips:** transición de filtrado con View Transitions API (fallback: fade CSS).
4. **Cards:** hover/active → `translateY(-4px)` + zoom de imagen `1.04`.
5. **Stats rebook:** count-up al entrar en viewport.
6. **Pines del mapa:** aparición con `scale(0→1)` escalonada al cargar el mapa.

**Regla Chanel:** nada más. Seis efectos coordinados > veinte sueltos.

---

## 10. Prompts por milestone para Cursor

> Pegar cada prompt en Cursor (modo Agent/Composer) **en sesiones separadas**, con este
> SPEC.md en la raíz. Después de cada milestone: `npm run build` + probar en el teléfono
> (`npm run preview -- --host` y abrir la IP local desde el celular).

**M1 — Base técnica**
```
Lee SPEC.md completo. Ejecutá el milestone M1:
1. Iniciá un proyecto Astro 5 con output 'static', i18n routing (defaultLocale 'en',
   locales ['en','es'], prefixDefaultLocale false).
2. Instalá @fontsource-variable/fraunces, @fontsource-variable/dm-sans, @astrojs/sitemap.
3. Creá la estructura de carpetas exacta del §3, los tokens del §2 (tokens.css),
   global.css con reset moderno y estilos base (h2 con em itálica, eyebrows).
4. Creá Base.astro con todo el §7 (SEO, OG, hreflang, GA4 placeholder, robots).
5. Creá places.json y secrets.json con el seed del §4, y en.json/es.json del §5
   (generá el es.json espejo, español neutro).
6. Páginas index en/es renderizando por ahora solo Hero placeholder + Footer.
No inventes diseño fuera de los tokens. Mobile-first estricto.
```

**M2 — Mapa + chips + cards**
```
Lee SPEC.md. Ejecutá M2: implementá IntentChips (§6.2), MapSection con Leaflet lazy
(§6.3), PlaceCard y ServiceCard (§6.5) y el grid de Eat & Drink, todo alimentado desde
places.json. Los chips filtran cards y pines simultáneamente. CTAs según cta.type con
el helper wa.ts. Si lat/lng es null, el lugar aparece como card pero no como pin.
```

**M3 — Capa comercial + secrets**
```
Lee SPEC.md. Ejecutá M3: SurfToday (§6.4), sección de servicios con CTAs WhatsApp,
TipsTeaser con acordeones + card teaser (§6.6), páginas /secrets noindex desde
secrets.json, StayRebook con stats y UTM (§6.7), Footer con Web Share API.
Agregá los eventos GA4 de cta_click en todos los CTAs.
```

**M4 — Motion + pulido**
```
Lee SPEC.md. Ejecutá M4: implementá el inventario completo de animaciones del §9
(scroll-driven CSS con fallback IntersectionObserver, reveal del hero, ola SVG,
View Transitions en filtros, count-up de stats, pines escalonados). Verificá el
presupuesto de performance del §8 con lighthouse. prefers-reduced-motion obligatorio.
```

---

## 11. Paso a paso completo (de cero a producción)

### Fase A — Preparación (vos, 1 tarde — es el M0)
1. **Coordenadas:** abrí Google Maps en el teléfono, buscá cada lugar (o parate en la
   puerta), mantené apretado el punto → copiá lat/lng → pegalas en `places.json`.
   15 minutos en total.
2. **Fotos:** shot list del §12. Con el celular alcanza; luz de mañana o golden hour.
3. **Video hero:** 8–12 segundos de la ola desde el point, horizontal, estable.
   Comprimir a <2MB: https://handbrake.fr o `ffmpeg -i in.mp4 -vf scale=1280:-2 -b:v 1.5M hero.mp4`.
4. **Aguas termales:** escribí el contenido real del secreto en `secrets.json`.

### Fase B — Desarrollo (Cursor)
5. Crear repo `saladita-guide` en GitHub (privado).
6. Clonar, abrir en Cursor, pegar este archivo como `SPEC.md` en la raíz.
7. Correr los prompts M1 → M4 (§10), **uno por sesión**, probando en el teléfono
   después de cada uno.
8. Reemplazar el GA4 placeholder por tu Measurement ID real
   (analytics.google.com → crear propiedad "Saladita Guide").

### Fase C — Deploy a Hostinger
**Opción rápida (hoy mismo, manual):**
9. `npm run build` → se genera la carpeta `dist/`.
10. hPanel → Archivos → Administrador de archivos → carpeta del subdominio
    `guide.lasaladitarentals.com` (su `public_html`) → borrar lo viejo → subir el
    **contenido** de `dist/` (no la carpeta).

**Opción pro (automática, configurar una vez):**
9. hPanel → Avanzado → FTP: crear cuenta FTP apuntando al directorio del subdominio.
   Anotar host, usuario, contraseña.
10. En GitHub: Settings → Secrets → agregar `FTP_HOST`, `FTP_USER`, `FTP_PASS`.
11. Crear `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Hostinger
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_HOST }}
          username: ${{ secrets.FTP_USER }}
          password: ${{ secrets.FTP_PASS }}
          local-dir: ./dist/
```
12. Desde acá: cada `git push` a main publica solo. Agregar un restaurante nuevo =
    editar `places.json` en GitHub desde el teléfono → push → online en 2 minutos.

### Fase D — Activación comercial
13. Agregar el link `/secrets` al template de mensaje de bienvenida de Gato Surf Houses.
14. Compartir la guía en el linktree/bio de Instagram y en los mensajes post-reserva.
15. A los 30 días: revisar GA4 → ¿qué chips se usan? ¿qué CTAs convierten? → iterar.

---

## 12. Shot list M0 (producción con celular, 1 tarde)

| Asset | Toma | Momento |
|---|---|---|
| `hero.mp4` + `hero-poster.jpg` | Ola del point rompiendo, plano fijo horizontal | Golden hour |
| `bennys.jpg` | Mesa con mariscos + mar de fondo | Mediodía |
| `marea.jpg` | Cóctel/mesa con atardecer | Sunset |
| `pacos.jpg` | Plato insignia o fachada | Día |
| `ilianet.jpg` | Plato tradicional o ambiente nocturno | Noche |
| `acadia.jpg` | Café + ambiente | Mañana |
| `angelinas.jpg` | Plato local | Día |
| `hacienda-cafe.jpg` | Café + laptop (ángulo remote-work) | Mañana |
| `saladita-point.jpg` | Surfer en la izquierda (zoom) | Mañana |
| `rancho.jpg` / `la-boca.jpg` | Line-up de cada spot | Según swell |
| `surf-lessons.jpg` | Instructor + alumno en espuma | Mañana |
| `massage.jpg` | Camilla en terraza con vista | Tarde |
| `private-chef.jpg` | Mesa servida en una casa Gato | Noche |
| `airport-transfer.jpg` | Camioneta/camino escénico | Día |
| `og-default.jpg` | La mejor foto de la ola + logo + "Your local guide to La Saladita" (armar en Canva 1200×630) | — |

**Regla:** pedir permiso en cada restaurante antes de fotografiar — y de paso es la
excusa perfecta para presentarte como SR y sembrar la red de partners/referidos.

---

*Spec v1.0 — Julio 2026 · Saladita Rentals · Un milestone por sesión. Blockers >2h se escalan a la próxima conversación con Claude.*
