/**
 * Monthly face-height climatology for the Saladita point chart.
 * Solid line = last 12 months; dashed = ~5-year monthly mean.
 * Source: Open-Meteo marine daily wave_height_max, scaled by FACE_HEIGHT.
 */
import { FACE_HEIGHT, SPOT, asFaceHeight } from './week-forecast.mjs';

/** Fallback if the marine archive is unreachable (local experience, face m). */
export const FALLBACK_HEIGHTS = [0.7, 0.65, 0.7, 1.0, 1.35, 1.55, 1.5, 1.5, 1.4, 1.15, 0.8, 0.7];
export const FALLBACK_CLIMATE = [0.85, 0.8, 0.85, 1.05, 1.25, 1.4, 1.4, 1.35, 1.3, 1.15, 0.95, 0.85];

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function monthMeans(times, values, { from = null, to = null } = {}) {
  const buckets = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
  times.forEach((t, i) => {
    if (from && t < from) return;
    if (to && t > to) return;
    const v = values[i];
    if (v == null || Number.isNaN(v)) return;
    const m = Number(t.slice(5, 7)) - 1;
    buckets[m].sum += v;
    buckets[m].n += 1;
  });
  return buckets.map((b) => (b.n ? asFaceHeight(b.sum / b.n) : null));
}

function fillNulls(vals, fallback) {
  return vals.map((v, i) => {
    if (v != null && !Number.isNaN(v)) return Math.round(v * 100) / 100;
    return fallback[i];
  });
}

export async function buildSeasonHeights() {
  const end = isoDaysAgo(0);
  const start = isoDaysAgo(365 * 5 + 2);
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${SPOT.windyLat}&longitude=${SPOT.windyLng}` +
    `&daily=wave_height_max&start_date=${start}&end_date=${end}` +
    `&timezone=${encodeURIComponent(SPOT.tz)}`;

  const errors = [];
  let climate = [...FALLBACK_CLIMATE];
  let heights = [...FALLBACK_HEIGHTS];
  let source = 'fallback';
  let years = 0;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`Open-Meteo marine HTTP ${res.status}`);
    const json = await res.json();
    if (json.error || json.reason) throw new Error(json.reason || 'Open-Meteo error');
    const times = json.daily?.time || [];
    const wave = json.daily?.wave_height_max || [];
    if (!times.length) throw new Error('Open-Meteo returned no daily rows');

    const recentFrom = isoDaysAgo(365);
    climate = fillNulls(monthMeans(times, wave), FALLBACK_CLIMATE);
    heights = fillNulls(monthMeans(times, wave, { from: recentFrom }), FALLBACK_HEIGHTS);
    source = 'open-meteo-marine';
    years = Math.max(1, Math.round(times.length / 365));
  } catch (err) {
    errors.push(String(err?.message || err));
  }

  return {
    updatedAt: new Date().toISOString(),
    source,
    faceHeight: FACE_HEIGHT,
    years,
    range: { start, end },
    heights,
    climate,
    errors,
  };
}
