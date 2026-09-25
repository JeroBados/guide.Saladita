# Saladita Guide — Resumen de sesión

**Última actualización:** 25 sep 2026 — rediseño "cuaderno de surf" (rama `cuaderno-de-surf`)

## Sesión 25 sep 2026 — Cuaderno de surf

- **Diseño orgánico, de surfista a surfista:** papel con grano, tinta navy, notas manuscritas (Caveat), bocetos a mano (`Sketch.astro`), polaroid con cinta, post-it, highlighter.
- **Solo recomendaciones:** sin formulario de fechas ni paquetes. WhatsApp: hero, post-it y botón flotante.
- **La versión corta** (debajo del hero): 45 min de ZIH, izquierda larga, agua cálida, 1 cajero, Telcel/Starlink.
- **La mejor mañana (`SurfLog.astro`):** pronóstico horario de Open-Meteo; puntúa ventanas de 3 h entre 5 y 11 am con tamaño y período del swell, dirección (S/SO), viento (offshore N/NE o glassy) y marea (media-baja). Circula el mejor día en rojo. ⚠️ La API gratis de Open-Meteo es solo para uso no comercial: contratar plan comercial antes de lanzar.
- **Mes a mes:** franja estática de temporada (texto citable por Google/IAs aunque falle el pronóstico).
- **Spots** como páginas de cuaderno; **Comer** como un día (mañana → noche); **FAQ** ampliada a 9 preguntas + FAQPage JSON-LD.
- Español pasado a **tú** mexicano. hreflang corregido para `/get-there` ↔ `/es/como-llegar`.
- GA4 no se carga mientras el ID sea `G-XXXXXXXXXX`.
- Borrados componentes sin uso (SurfToday, Packages, BookStay, etc.) y `packages.json`.

---



## Qué es esto

Guía bilingüe (EN `/` · ES `/es/`) para huéspedes y surfistas en **La Saladita, Guerrero**.  
Stack: Astro 7 static, i18n, WhatsApp CTAs, sin backend.

---

## Lo que se hizo en esta sesión

### UX mobile-first
- Botones mínimo 48px, texto más legible, cards en 1 columna en celular
- Navegación sticky por secciones (`GuideNav`) — ya no filtra/oculta contenido

### Hero (estilo guía original)
- Título + formulario de fechas → WhatsApp en el hero
- Link secundario: “¿Ya estás aquí? WhatsApp”

### Surf
- **Tabs de pronóstico:** La Saladita · Rancho (The-Ranch_1) · Boca
- Datos técnicos por spot en `src/data/surf-spots.json`
- **Boca** → “Playa Boca de las Iguanillas” + Google Maps por nombre
- Copy SEO: no Sayulita, agua 29–31°C, temporada mayo–oct

### Servicios (sin marcas de escuelas)
- Clases de surf, renta de tablas, traslado aeropuerto ZIH (**más vendido**), masajes, etc.
- Eliminados Mezcalli, Brandom, Casa Esmeralda como escuelas

### Paquetes & surf trips
- Sección con datos en `src/data/packages.json`
- Traslado, pack 3 clases, tablas, surf trip custom
- Links a lasaladitarentals.com con UTM

### Logística
- `/get-there` (EN) y `/es/como-llegar` (ES)
- Taxi ZIH recomendado, bus+taxi, auto propio

### Mapa
- Leaflet eliminado → embed simple de Google Maps (`MiniMap.astro`)
- Cada lugar sigue con “Abrir en Google Maps” en su tarjeta

---

## Archivos clave

| Archivo | Para qué |
|---------|----------|
| `src/data/surf-spots.json` | Spots técnicos + slugs de pronóstico |
| `src/data/places.json` | Comer, servicios, stay |
| `src/data/packages.json` | Paquetes comerciales |
| `src/i18n/en.json` / `es.json` | Todos los textos |
| `src/components/GuideContent.astro` | Orden de secciones |
| `src/components/SurfToday.astro` | Widget + tabs de forecast |
| `SPEC.md` | Spec original del proyecto |

---

## Pendiente (cuando vuelvas)

1. **Fotos** — Subir a `public/media/places/{id}.jpg`  
   Ej: `bennys.jpg`, `marea.jpg`, `saladita-point.jpg`, `rancho.jpg`, `la-boca.jpg`  
   (Hoy muestran gradiente si falta la foto)

2. **Coordenadas** — Revisar pin de Boca en Maps si hace falta afinar en `surf-spots.json`

3. **Precios/copy paquetes** — Verificar vs. sitio actual lasaladitarentals.com

4. **Deploy** — Hostinger FTP (ver `SPEC.md` §11) o conectar CI

5. **GA4** — Reemplazar placeholder `G-XXXXXXXXXX` en `Base.astro`

6. **Limpieza opcional** — Borrar componentes no usados: `PersonaCards.astro`, `BookStay.astro` (formulario ya está en Hero)

---

## Comandos útiles

```bash
cd "/Users/jero/Downloads/GUIDE CURSOR"
npm run dev          # desarrollo
npm run build        # build producción → dist/
npm run preview      # preview del build

git status
git add .
git commit -m "mensaje"
git push
```

---

## URLs del sitio (local)

| Página | EN | ES |
|--------|----|----|
| Guía | `/` | `/es/` |
| Cómo llegar | `/get-there` | `/es/como-llegar` |
| Secretos (noindex) | `/secrets` | `/es/secrets` |

---

## WhatsApp & catálogo

- Número: `525611073849`
- Catálogo casas: https://www.whatsapp.com/catalog/5215611073849/?app_absent=0

---

## Próximo paso sugerido

1. Probar en el celular (`npm run dev -- --host` + IP local)
2. Subir fotos de lugares
3. Deploy a guide.lasaladitarentals.com
