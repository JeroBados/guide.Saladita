/** Shared week-forecast view logic for SSR (SurfLog) and the browser script. */

export type ForecastDay = {
  date: string;
  score: number | null;
  start: number;
  swell: number;
  period: number;
  swellDir: number;
  windSpeed: number;
  windDir: number;
  windKind: 'offshore' | 'cross' | 'onshore' | 'glassy';
  tideLevel: number;
  tideRising: boolean;
};

export type WeekPayload = {
  generatedAt?: string;
  bestDate: string | null;
  sourcesUsed?: string[];
  days: ForecastDay[];
};

export type WeekLogI18n = {
  best: string;
  window: string;
  answer: string;
  swell: string;
  wind: string;
  tide: string;
  offshore: string;
  cross: string;
  onshore: string;
  glassy: string;
  low: string;
  mid: string;
  high: string;
  rising: string;
  falling: string;
  ratings: string[];
  gone: string;
  source: string;
};

export type PreparedDay = ForecastDay & {
  isBest: boolean;
  gone: boolean;
  rating: number;
  dow: string;
  dayNum: string;
  heightHtml: string;
  windLabel: string;
  rateLabel: string;
  waveD: string;
};

export type PreparedWeek = {
  days: PreparedDay[];
  top: PreparedDay;
  range: string;
  answerHtml: string;
  source: string;
  detail: { title: string; swell: string; wind: string; tide: string };
};

const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function isForecastFresh(generatedAt: string | undefined, now = Date.now()): boolean {
  if (!generatedAt) return false;
  const t = Date.parse(generatedAt);
  if (Number.isNaN(t)) return false;
  return now - t < MAX_AGE_MS;
}

export function sourceLabel(sources: string[] = [], lang: string): string {
  const names = {
    surfline: 'Surfline',
    'surf-forecast': 'surf-forecast',
    windy: 'Windy',
    'open-meteo': 'Open-Meteo',
  } as const;
  const list = sources.map((s) => names[s as keyof typeof names] || s);
  if (!list.length) return lang === 'es' ? 'fuentes locales' : 'local sources';
  if (list.length === 1) return list[0];
  if (list.length === 2) return lang === 'es' ? `${list[0]} y ${list[1]}` : `${list[0]} and ${list[1]}`;
  return lang === 'es'
    ? `${list.slice(0, -1).join(', ')} y ${list.at(-1)}`
    : `${list.slice(0, -1).join(', ')}, and ${list.at(-1)}`;
}

export function compass(deg: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function clamp(v: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

export function wavePath(height: number): string {
  const amp = 4 + clamp(height / 3) * 22;
  const base = 44;
  return `M2 ${base} C 10 ${base - amp * 0.4}, 16 ${base - amp}, 26 ${base - amp} C 36 ${base - amp}, 40 ${base - amp * 0.35}, 34 ${base - amp * 0.2} C 42 ${base - amp * 0.1}, 50 ${base}, 58 ${base}`;
}

export function ratingFromScore(s: number): number {
  return s >= 85 ? 3 : s >= 72 ? 2 : s >= 58 ? 1 : 0;
}

function windowLabel(d: ForecastDay): string {
  return d.start + 3 < 12 ? `${d.start}–${d.start + 3} am` : `${d.start} am–12 pm`;
}

function ft(mtr: number): number {
  return Math.round(mtr * 3.28);
}

export function normalizeDays(days: ForecastDay[]): ForecastDay[] {
  return days.map((d) => ({
    ...d,
    windKind: (d.windKind || 'glassy') as ForecastDay['windKind'],
    swellDir: d.swellDir || 210,
    tideLevel: d.tideLevel ?? 0.5,
    tideRising: d.tideRising ?? true,
  }));
}

export function detailForDay(d: ForecastDay, locale: string, t: WeekLogI18n) {
  const dFmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
  const lvl = d.tideLevel < 0.34 ? t.low : d.tideLevel < 0.67 ? t.mid : t.high;
  return {
    title: `${dFmt(d.date, { weekday: 'long', month: 'short', day: 'numeric' })} · ${t.window} ${windowLabel(d)}`,
    swell: `${Number(d.swell).toFixed(1)} m (${ft(d.swell)} ft) · ${Math.round(d.period)} s · ${compass(d.swellDir)}`,
    wind: `${Math.round(d.windSpeed)} km/h ${compass(d.windDir)} · ${t[d.windKind]}`,
    tide: `${lvl}, ${d.tideRising ? t.rising : t.falling}`,
  };
}

/** Returns null when the payload is missing, stale, or has no scored days. */
export function prepareWeek(
  payload: WeekPayload | null | undefined,
  lang: string,
  locale: string,
  t: WeekLogI18n,
  now = Date.now(),
): PreparedWeek | null {
  if (!payload || !isForecastFresh(payload.generatedAt, now)) return null;
  if (!Array.isArray(payload.days) || !payload.days.some((d) => d.score != null)) return null;

  const days = normalizeDays(payload.days);
  const scored = days.filter((d) => d.score != null);
  const topRaw =
    days.find((d) => d.date === payload.bestDate && d.score != null) ||
    scored.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a));

  const dFmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

  const prepared: PreparedDay[] = days.map((d) => {
    const gone = d.score == null;
    const r = gone ? -1 : ratingFromScore(d.score as number);
    const isBest = d.date === topRaw.date;
    return {
      ...d,
      isBest,
      gone,
      rating: r,
      dow: dFmt(d.date, { weekday: 'short' }),
      dayNum: dFmt(d.date, { day: 'numeric' }),
      heightHtml: gone ? '—' : `${Number(d.swell).toFixed(1)}<small>m</small>`,
      windLabel: gone ? '' : compass(d.windDir),
      rateLabel: gone ? t.gone : t.ratings[r],
      waveD: gone ? 'M2 44 H58' : wavePath(d.swell),
    };
  });

  const top = prepared.find((d) => d.isBest) || prepared.find((d) => !d.gone)!;

  return {
    days: prepared,
    top,
    range: `${dFmt(days[0].date, { month: 'short', day: 'numeric' })} – ${dFmt(days[days.length - 1].date, { month: 'short', day: 'numeric' })}`,
    answerHtml: t.answer
      .replace('%day%', `<span class="hl">${dFmt(top.date, { weekday: 'long', month: 'short', day: 'numeric' })}</span>`)
      .replace('%window%', windowLabel(top)),
    source: String(t.source).replace('%sources%', sourceLabel(payload.sourcesUsed || [], lang)),
    detail: detailForDay(top, locale, t),
  };
}
