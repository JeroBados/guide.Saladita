# Saladita forecast reference

## Spot IDs / URLs

- Surfline: https://www.surfline.com/surf-report/la-saladita/584204204e65fad6a770921e
- Surfline API: `https://services.surfline.com/kbyg/spots/forecasts?spotId=584204204e65fad6a770921e&days=8&intervalHours=1&cacheEnabled=true&units[waveHeight]=M&units[windSpeed]=KPH&...`
- surf-forecast: https://www.surf-forecast.com/breaks/La-Saladita/forecasts/latest/six_day
- Coords: `17.841, -101.771` · `America/Mexico_City`

## Payload shape (`week-forecast.json`)

```json
{
  "generatedAt": "ISO",
  "sourcesUsed": ["surfline", "surf-forecast"],
  "bestDate": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "score": 80.5,
      "start": 6,
      "swell": 1.1,
      "period": 13,
      "swellDir": 203,
      "windSpeed": 6,
      "windDir": 30,
      "windKind": "offshore",
      "tideLevel": 0.4,
      "tideRising": true,
      "sources": ["surfline", "surf-forecast"],
      "parts": { "surfline": 78, "surfForecast": 80, "openMeteo": null }
    }
  ],
  "errors": []
}
```

## Client load order

1. `/api/week-forecast.php` (live on Hostinger)
2. `/data/week-forecast.json` (build-time / cron)
