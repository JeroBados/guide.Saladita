/**
 * Build a weekly "best morning" forecast for La Saladita point by averaging
 * Surfline + surf-forecast.com + Windy waves (Open-Meteo as tide / last-resort fill).
 *
 * Heights from model Hs are lifted toward face height as seen from the water
 * (surfers reading the set, not deep-water significant height).
 */

export const SPOT = {
  surflineId: '584204204e65fad6a770921e',
  surflineUrl: 'https://www.surfline.com/surf-report/la-saladita/584204204e65fad6a770921e',
  surfForecastUrl: 'https://www.surf-forecast.com/breaks/La-Saladita/forecasts/latest/six_day',
  windyUrl: 'https://www.windy.com/-Waves-waves?waves,17.810,-101.780,11',
  /** Nearest Windy ocean cell that returns wave fields (land pin is empty). */
  windyLat: 17.81,
  windyLng: -101.78,
  lat: 17.841,
  lng: -101.771,
  tz: 'America/Mexico_City',
};

/** Significant wave height → approx face height in the line-up. */
export const FACE_HEIGHT = 1.28;

export function asFaceHeight(meters, alreadyFace = false) {
  if (meters == null || Number.isNaN(meters)) return meters;
  return alreadyFace ? meters : meters * FACE_HEIGHT;
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ang = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

export function windKind(dir, speed) {
  if (speed < 7) return 'glassy';
  const d = ang(dir, 30);
  if (d <= 60) return 'offshore';
  if (d <= 110) return 'cross';
  return 'onshore';
}

/** Physical score 0–100 from swell/wind (Saladita left point preferences). */
export function morningScore({ swell, period, swellDir, windDir, windSpeed, tide = 0.5 }) {
  const size = swell < 0.3 ? 0 : swell < 1 ? (swell - 0.3) / 0.7 : swell <= 2 ? 1 : swell < 3.2 ? 1 - ((swell - 2) / 1.2) * 0.5 : 0.4;
  const per = clamp((period - 6) / 8, 0.15, 1);
  const dd = ang(swellDir, 210);
  const dir = dd <= 35 ? 1 : dd <= 75 ? 1 - ((dd - 35) / 40) * 0.6 : 0.2;
  const kind = windKind(windDir, windSpeed);
  const wind =
    kind === 'glassy' ? 0.95 : kind === 'offshore' ? (windSpeed < 25 ? 1 : 0.7) : kind === 'cross' ? (windSpeed < 15 ? 0.5 : 0.25) : windSpeed < 12 ? 0.35 : 0.1;
  const tideS = tide <= 0.62 ? 1 : tide <= 0.82 ? 0.7 : 0.45;
  return 100 * (0.32 * size + 0.18 * per + 0.14 * dir + 0.26 * wind + 0.1 * tideS);
}

function mexicoParts(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: SPOT.tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      Origin: 'https://www.surfline.com',
      Referer: SPOT.surflineUrl,
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** Parse surf-forecast.com six_day table: AM/PM/Night ratings + swell/period/wind. */
export function parseSurfForecastHtml(html, startDate) {
  const ratings = [...html.matchAll(/star-rating__rating--(\d+)/g)].map((m) => Number(m[1]));
  const swells = [...html.matchAll(/swell-icon__val[^>]*>([0-9.]+)/g)].map((m) => Number(m[1]));
  const periods = [...html.matchAll(/class="[^"]*period[^"]*"[^>]*>(\d+)/g)].map((m) => Number(m[1]));
  const winds = [...html.matchAll(/wind-icon__val[^>]*>([0-9.]+)/g)].map((m) => Number(m[1]));

  const slots = Math.min(21, ratings.length);
  const days = [];
  for (let i = 0; i < slots; i += 3) {
    const dayIndex = i / 3;
    const date = addDays(startDate, dayIndex);
    const am = ratings[i];
    const slot = dayIndex; // AM column index in primary swell row
    // Map 0–10 stars onto the same 0–100 band as Surfline morningScore.
    const score = Math.max(0, Math.min(100, 38 + am * 14));
    days.push({
      date,
      ratingAm: am,
      ratingPm: ratings[i + 1],
      ratingNight: ratings[i + 2],
      score,
      swell: swells[slot] ?? null,
      period: periods[slot] ?? null,
      windSpeed: winds[slot] ?? null,
      start: 6,
      source: 'surf-forecast',
    });
  }
  return days;
}

/** Surfline combined forecasts → best morning window per day. */
export function parseSurflineForecasts(payload) {
  const forecasts = payload?.data?.forecasts;
  if (!Array.isArray(forecasts) || !forecasts.length) return [];

  const byDate = new Map();
  for (const row of forecasts) {
    const parts = mexicoParts(new Date(row.timestamp * 1000));
    if (parts.hour < 5 || parts.hour > 10) continue;
    const swell = (row.swells || [])
      .filter((s) => s && s.height > 0)
      .sort((a, b) => b.height - a.height)[0] || { height: 0, period: 0, direction: 0 };
    const surfMid = ((row.surf?.min ?? swell.height) + (row.surf?.max ?? swell.height)) / 2;
    const windSpeed = row.wind?.speed ?? 0;
    const windDir = row.wind?.direction ?? 0;
    // Surfline surf min/max is already closer to face height — do not re-scale.
    const face = surfMid || swell.height;
    const score = morningScore({
      swell: face,
      period: swell.period || 10,
      swellDir: swell.direction || 210,
      windDir,
      windSpeed,
    });
    const entry = {
      date: parts.date,
      hour: parts.hour,
      score,
      swell: face,
      period: swell.period || 0,
      swellDir: swell.direction || 0,
      windSpeed,
      windDir,
      windKind: windKind(windDir, windSpeed),
      start: Math.max(5, parts.hour - 1),
      source: 'surfline',
    };
    const prev = byDate.get(parts.date);
    if (!prev || score > prev.score) byDate.set(parts.date, entry);
  }
  return [...byDate.values()];
}

export async function fetchSurfForecastDays(today = mexicoParts().date) {
  const html = await fetchText(SPOT.surfForecastUrl);
  return parseSurfForecastHtml(html, today);
}

export async function fetchSurflineDays() {
  const url =
    `https://services.surfline.com/kbyg/spots/forecasts?spotId=${SPOT.surflineId}` +
    `&days=8&intervalHours=1&cacheEnabled=true` +
    `&units%5BwaveHeight%5D=M&units%5BwindSpeed%5D=KPH&units%5BswellHeight%5D=M` +
    `&units%5Btemperature%5D=C&units%5BtideHeight%5D=M`;
  const json = await fetchJson(url);
  return parseSurflineForecasts(json);
}

/** Windy detail waves (ECMWF-WAM via node.windy.com) — public forecast feed used by the map. */
export function parseWindyWaves(payload) {
  const data = payload?.data;
  if (!data?.day?.length) return [];

  const byDate = new Map();
  for (let i = 0; i < data.day.length; i++) {
    const hour = Number(data.hour[i]);
    if (hour < 5 || hour > 10) continue;
    const raw =
      data.swell?.[i] ??
      data.swell1?.[i] ??
      data.waves?.[i];
    if (raw == null || raw <= 0) continue;
    const period = data.swellPeriod?.[i] ?? data.swell1Period?.[i] ?? data.wavesPeriod?.[i] ?? 10;
    const swellDir = data.swellDir?.[i] ?? data.swell1Dir?.[i] ?? data.wavesDir?.[i] ?? 210;
    // Windy wind is m/s on this endpoint.
    const windSpeed = (data.wind?.[i] ?? 0) * 3.6;
    const windDir = data.windDir?.[i] ?? 30;
    const face = asFaceHeight(raw, false);
    const score = morningScore({ swell: face, period, swellDir, windDir, windSpeed });
    const date = data.day[i];
    const entry = {
      date,
      hour,
      score,
      swell: face,
      period,
      swellDir,
      windSpeed,
      windDir,
      windKind: windKind(windDir, windSpeed),
      start: Math.max(5, hour - 1),
      source: 'windy',
    };
    const prev = byDate.get(date);
    if (!prev || score > prev.score) byDate.set(date, entry);
  }
  return [...byDate.values()];
}

export async function fetchWindyDays() {
  const url = `https://node.windy.com/forecast/v2.1/waves/${SPOT.windyLat}/${SPOT.windyLng}?source=detail`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      Referer: 'https://www.windy.com/',
      Origin: 'https://www.windy.com',
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return parseWindyWaves(await res.json());
}

/** Default Open-Meteo marine (has swell + MSL tide). */
export async function fetchOpenMeteoTide() {
  const q =
    `latitude=${SPOT.lat}&longitude=${SPOT.lng}` +
    `&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,sea_level_height_msl,wave_height` +
    `&timezone=${encodeURIComponent(SPOT.tz)}&forecast_days=8`;
  const json = await fetchJson(`https://marine-api.open-meteo.com/v1/marine?${q}`);
  const wind = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${SPOT.lat}&longitude=${SPOT.lng}` +
      `&hourly=wind_speed_10m,wind_direction_10m&timezone=${encodeURIComponent(SPOT.tz)}&forecast_days=8`,
  );
  return { marine: json.hourly, wind: wind.hourly };
}

function tideAround(marine, date, hour) {
  if (!marine?.time) return { level: 0.5, rising: true };
  const idxs = marine.time
    .map((iso, i) => (iso.startsWith(date) ? i : -1))
    .filter((i) => i >= 0);
  const levels = idxs.map((i) => marine.sea_level_height_msl[i]).filter((v) => v != null);
  if (!levels.length) return { level: 0.5, rising: true };
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const norm = (v) => (hi - lo > 0.05 ? (v - lo) / (hi - lo) : 0.5);
  const at = (h) => {
    const i = idxs.find((idx) => Number(marine.time[idx].slice(11, 13)) === h);
    return i == null ? null : marine.sea_level_height_msl[i];
  };
  const mid = at(hour) ?? at(hour + 1) ?? levels[Math.floor(levels.length / 2)];
  const a = at(hour - 1) ?? mid;
  const b = at(hour + 1) ?? mid;
  return { level: norm(mid), rising: b > a };
}

function omMorning(marine, wind, date) {
  if (!marine?.time) return null;
  let best = null;
  for (let start = 5; start <= 8; start++) {
    const hours = [start, start + 1, start + 2];
    const rows = hours.map((h) => {
      const i = marine.time.findIndex((iso) => iso === `${date}T${String(h).padStart(2, '0')}:00`);
      if (i < 0) return null;
      const swell = marine.swell_wave_height?.[i] ?? marine.wave_height?.[i];
      const period = marine.swell_wave_period?.[i];
      const swellDir = marine.swell_wave_direction?.[i];
      const windSpeed = wind?.wind_speed_10m?.[i];
      const windDir = wind?.wind_direction_10m?.[i];
      if (swell == null || period == null || swellDir == null || windSpeed == null || windDir == null) return null;
      if (swell === 0 && period === 0 && swellDir === 0) return null;
      const face = asFaceHeight(swell, false);
      return { swell: face, period, swellDir, windSpeed, windDir, score: morningScore({ swell: face, period, swellDir, windDir, windSpeed }) };
    });
    if (rows.some((r) => !r)) continue;
    const score = rows.reduce((s, r) => s + r.score, 0) / rows.length;
    const mid = rows[1];
    if (!best || score > best.score) {
      best = {
        date,
        score,
        start,
        swell: mid.swell,
        period: mid.period,
        swellDir: mid.swellDir,
        windSpeed: mid.windSpeed,
        windDir: mid.windDir,
        windKind: windKind(mid.windDir, mid.windSpeed),
        source: 'open-meteo',
      };
    }
  }
  return best;
}

const PRIMARY = new Set(['surfline', 'surf-forecast', 'windy']);

/**
 * Average Surfline + surf-forecast + Windy (+ Open-Meteo fill) into 8 day cards.
 */
export function blendWeek({ surfForecast = [], surfline = [], windy = [], openMeteo = null, now = mexicoParts() }) {
  const dates = Array.from({ length: 8 }, (_, i) => addDays(now.date, i));
  const sfMap = new Map(surfForecast.map((d) => [d.date, d]));
  const slMap = new Map(surfline.map((d) => [d.date, d]));
  const wyMap = new Map(windy.map((d) => [d.date, d]));

  const days = dates.map((date) => {
    const sf = sfMap.get(date);
    const sl = slMap.get(date);
    const wy = wyMap.get(date);
    const om = openMeteo ? omMorning(openMeteo.marine, openMeteo.wind, date) : null;

    const scores = [];
    if (sf?.score != null) scores.push({ n: 'surf-forecast', score: sf.score });
    if (sl?.score != null) scores.push({ n: 'surfline', score: sl.score });
    if (wy?.score != null) scores.push({ n: 'windy', score: wy.score });
    // Open-Meteo only when none of the three named sources landed that day
    if (!scores.length && om?.score != null) scores.push({ n: 'open-meteo', score: om.score });

    if (!scores.length) {
      return {
        date,
        score: null,
        start: 6,
        swell: 0,
        period: 0,
        swellDir: 0,
        windSpeed: 0,
        windDir: 0,
        windKind: 'glassy',
        tideLevel: 0.5,
        tideRising: true,
        sources: [],
      };
    }

    const score = scores.reduce((s, x) => s + x.score, 0) / scores.length;
    const primary = sl || wy || sf || om;
    const swellParts = [sl?.swell, wy?.swell, sf?.swell != null ? asFaceHeight(sf.swell, false) : null, om?.swell].filter(
      (v) => typeof v === 'number' && v > 0,
    );
    const swell = swellParts.length ? swellParts.reduce((a, b) => a + b, 0) / swellParts.length : primary?.swell ?? 0;
    const period = sl?.period ?? wy?.period ?? sf?.period ?? om?.period ?? 0;
    const swellDir = sl?.swellDir ?? wy?.swellDir ?? om?.swellDir ?? 210;
    const windSpeed = sl?.windSpeed ?? wy?.windSpeed ?? sf?.windSpeed ?? om?.windSpeed ?? 0;
    const windDir = sl?.windDir ?? wy?.windDir ?? om?.windDir ?? 30;
    const start = sl?.start ?? wy?.start ?? sf?.start ?? om?.start ?? 6;
    const tide = openMeteo ? tideAround(openMeteo.marine, date, start + 1) : { level: 0.5, rising: true };

    return {
      date,
      score,
      start,
      swell,
      period,
      swellDir,
      windSpeed,
      windDir,
      windKind: windKind(windDir, windSpeed),
      tideLevel: tide.level,
      tideRising: tide.rising,
      sources: scores.map((s) => s.n),
      parts: {
        surfline: sl?.score ?? null,
        surfForecast: sf?.score ?? null,
        windy: wy?.score ?? null,
        openMeteo: om?.score ?? null,
      },
      primary: primary?.source || scores[0].n,
    };
  });

  const scored = days.filter((d) => d.score != null);
  // Prefer Surfline / surf-forecast / Windy so Open-Meteo-only filler cannot steal the circle.
  const preferred = scored.filter((d) => d.sources.some((s) => PRIMARY.has(s)));
  const pool = preferred.length ? preferred : scored;
  const bestDate = pool.length ? pool.reduce((a, b) => (b.score > a.score ? b : a)).date : null;

  return {
    generatedAt: new Date().toISOString(),
    spot: SPOT,
    faceHeight: FACE_HEIGHT,
    sourcesUsed: [...new Set(days.flatMap((d) => d.sources))],
    bestDate,
    days,
  };
}

export async function buildWeekForecast() {
  const now = mexicoParts();
  const errors = [];
  let surfForecast = [];
  let surfline = [];
  let windy = [];
  let openMeteo = null;

  try {
    surfForecast = await fetchSurfForecastDays(now.date);
  } catch (e) {
    errors.push(`surf-forecast: ${e.message}`);
  }
  try {
    surfline = await fetchSurflineDays();
  } catch (e) {
    errors.push(`surfline: ${e.message}`);
  }
  try {
    windy = await fetchWindyDays();
  } catch (e) {
    errors.push(`windy: ${e.message}`);
  }
  try {
    openMeteo = await fetchOpenMeteoTide();
  } catch (e) {
    errors.push(`open-meteo: ${e.message}`);
  }

  const week = blendWeek({ surfForecast, surfline, windy, openMeteo, now });
  week.errors = errors;
  return week;
}
