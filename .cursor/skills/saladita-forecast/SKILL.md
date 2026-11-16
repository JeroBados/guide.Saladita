---
name: saladita-forecast
description: Diagnose and fix La Saladita weekly Best morning / Mejor mañana forecast. Use when forecasts fail, disagree with Surfline or surf-forecast.com, Best morning picks the wrong day, week-forecast.json is stale, Open-Meteo/tide breaks, or the user mentions forecast connection, Surfline La Saladita, or weekly forecast.
---

# Saladita forecast (Best morning)

## Product rule

Best morning is the **average** of public weekly reads for the Saladita point:

1. **Surfline** LOTUS — spot `584204204e65fad6a770921e`
2. **surf-forecast.com** — AM star ratings on the six-day table
3. **Windy** waves — `node.windy.com/forecast/v2.1/waves/17.81/-101.78` (nearest ocean cell)
4. **Open-Meteo** — tide + filler only when all three named sources miss a day

Model Hs is scaled by `FACE_HEIGHT` (1.28) toward face height as seen from the water (Surfline surf range is left as-is). Prefer Surfline / surf-forecast / Windy days over Open-Meteo-only filler for the red circle.

## Code map

| Path | Role |
|------|------|
| `scripts/lib/week-forecast.mjs` | Fetch + parse + blend |
| `scripts/fetch-week-forecast.mjs` | Writes `public/data/week-forecast.json` |
| `public/api/week-forecast.php` | Live Hostinger endpoint (same blend) |
| `src/components/SurfLog.astro` | Loads `/api/week-forecast.php` then `/data/week-forecast.json` |

Commands: `npm run forecast` · hooked as `predev` / `prebuild`. Deploy workflow also runs on a cron so the static JSON refreshes.

## Diagnose

```bash
npm run forecast
node -e "console.log(require('./public/data/week-forecast.json').errors, require('./public/data/week-forecast.json').bestDate, require('./public/data/week-forecast.json').sourcesUsed)"
```

Compare with:

- https://www.surfline.com/surf-report/la-saladita/584204204e65fad6a770921e
- https://www.surf-forecast.com/breaks/La-Saladita/forecasts/latest/six_day

## Known issues

- Surfline `services.surfline.com` often returns **403** from datacenter / CLI IPs (Cloudflare). Browser sessions and some host IPs (Hostinger PHP) can still reach it. Treat Surfline as best-effort; surf-forecast must keep the widget alive.
- surf-forecast stars are remapped: `score = clamp(38 + am*14, 0, 100)`.
- Old Open-Meteo multi-model blend (`ecmwf_wam` null swell, `ncep_gfswave025` zeros) is retired for scoring.

## Fix rules

1. Keep averaging Surfline + surf-forecast; do not reintroduce OM-only scoring as primary.
2. Tide from default Open-Meteo marine (`sea_level_height_msl`).
3. Morning windows only (≈5–10am).
4. Update `week.source` / `week.lead` copy if sources change.
5. After changes: `npm run forecast`, reload `/#section-surf`, confirm circle + source line.

## Acceptance

- [ ] Widget live (not `week.unavailable`) EN + ES
- [ ] Source line names Surfline and/or surf-forecast when present
- [ ] Circled day matches the stronger AM in those tables more often than not
- [ ] Surfline 403 warning alone does not blank the widget

See [reference.md](reference.md).
