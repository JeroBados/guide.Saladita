<?php
/**
 * Live weekly forecast blend for La Saladita
 * (Surfline + surf-forecast + Windy, Open-Meteo tide / fill).
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=1800');
header('Access-Control-Allow-Origin: *');

$SPOT_ID = '584204204e65fad6a770921e';
$SF_URL = 'https://www.surf-forecast.com/breaks/La-Saladita/forecasts/latest/six_day';
$WINDY_LAT = 17.81;
$WINDY_LNG = -101.78;
$FACE_HEIGHT = 1.28;
$TZ = 'America/Mexico_City';
$LAT = 17.841;
$LNG = -101.771;
$UA = 'Mozilla/5.0 (compatible; SaladitaGuide/1.0; +https://guide.lasaladitarentals.com)';

function http_get($url, $referer = 'https://www.surfline.com/') {
  global $UA;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => [
      'User-Agent: ' . $UA,
      'Accept: text/html,application/json',
      'Accept-Language: en-US,en;q=0.9',
      'Referer: ' . $referer,
    ],
  ]);
  $body = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  if ($body === false || $code >= 400) {
    throw new Exception(($err ?: "HTTP $code") . " for $url");
  }
  return $body;
}

function mexico_today() {
  return (new DateTime('now', new DateTimeZone('America/Mexico_City')))->format('Y-m-d');
}

function add_days($iso, $n) {
  $dt = DateTime::createFromFormat('Y-m-d', $iso, new DateTimeZone('UTC'));
  $dt->modify(($n >= 0 ? '+' : '') . $n . ' day');
  return $dt->format('Y-m-d');
}

function ang($a, $b) {
  $d = fmod(abs($a - $b), 360);
  return min($d, 360 - $d);
}

function wind_kind($dir, $speed) {
  if ($speed < 7) return 'glassy';
  $d = ang($dir, 30);
  if ($d <= 60) return 'offshore';
  if ($d <= 110) return 'cross';
  return 'onshore';
}

function as_face($meters, $alreadyFace = false) {
  global $FACE_HEIGHT;
  if ($meters === null) return null;
  return $alreadyFace ? $meters : $meters * $FACE_HEIGHT;
}

function morning_score($swell, $period, $swellDir, $windDir, $windSpeed, $tide = 0.5) {
  if ($swell < 0.3) $size = 0;
  elseif ($swell < 1) $size = ($swell - 0.3) / 0.7;
  elseif ($swell <= 2) $size = 1;
  elseif ($swell < 3.2) $size = 1 - (($swell - 2) / 1.2) * 0.5;
  else $size = 0.4;
  $per = max(0.15, min(1, ($period - 6) / 8));
  $dd = ang($swellDir, 210);
  if ($dd <= 35) $dir = 1;
  elseif ($dd <= 75) $dir = 1 - (($dd - 35) / 40) * 0.6;
  else $dir = 0.2;
  $kind = wind_kind($windDir, $windSpeed);
  if ($kind === 'glassy') $wind = 0.95;
  elseif ($kind === 'offshore') $wind = $windSpeed < 25 ? 1 : 0.7;
  elseif ($kind === 'cross') $wind = $windSpeed < 15 ? 0.5 : 0.25;
  else $wind = $windSpeed < 12 ? 0.35 : 0.1;
  $tideS = $tide <= 0.62 ? 1 : ($tide <= 0.82 ? 0.7 : 0.45);
  return 100 * (0.32 * $size + 0.18 * $per + 0.14 * $dir + 0.26 * $wind + 0.1 * $tideS);
}

function parse_surf_forecast($html, $startDate) {
  preg_match_all('/star-rating__rating--(\d+)/', $html, $rm);
  preg_match_all('/swell-icon__val[^>]*>([0-9.]+)/', $html, $sm);
  preg_match_all('/class="[^"]*period[^"]*"[^>]*>(\d+)/', $html, $pm);
  preg_match_all('/wind-icon__val[^>]*>([0-9.]+)/', $html, $wm);
  $ratings = array_map('intval', $rm[1] ?? []);
  $swells = array_map('floatval', $sm[1] ?? []);
  $periods = array_map('intval', $pm[1] ?? []);
  $winds = array_map('floatval', $wm[1] ?? []);
  $days = [];
  $slots = min(21, count($ratings));
  for ($i = 0; $i < $slots; $i += 3) {
    $idx = (int)($i / 3);
    $am = $ratings[$i];
    $days[] = [
      'date' => add_days($startDate, $idx),
      'score' => max(0, min(100, 38 + $am * 14)),
      'swell' => $swells[$idx] ?? null,
      'period' => $periods[$idx] ?? null,
      'windSpeed' => $winds[$idx] ?? null,
      'start' => 6,
      'source' => 'surf-forecast',
    ];
  }
  return $days;
}

function parse_surfline($json) {
  $forecasts = $json['data']['forecasts'] ?? [];
  $by = [];
  $tz = new DateTimeZone('America/Mexico_City');
  foreach ($forecasts as $row) {
    $dt = (new DateTime('@' . $row['timestamp']))->setTimezone($tz);
    $hour = (int)$dt->format('G');
    if ($hour < 5 || $hour > 10) continue;
    $date = $dt->format('Y-m-d');
    $swells = array_values(array_filter($row['swells'] ?? [], fn($s) => ($s['height'] ?? 0) > 0));
    usort($swells, fn($a, $b) => ($b['height'] <=> $a['height']));
    $swell = $swells[0] ?? ['height' => 0, 'period' => 0, 'direction' => 0];
    $face = ((($row['surf']['min'] ?? $swell['height']) + ($row['surf']['max'] ?? $swell['height'])) / 2) ?: $swell['height'];
    $windSpeed = $row['wind']['speed'] ?? 0;
    $windDir = $row['wind']['direction'] ?? 0;
    $score = morning_score($face, $swell['period'] ?: 10, $swell['direction'] ?: 210, $windDir, $windSpeed);
    $entry = [
      'date' => $date,
      'score' => $score,
      'swell' => $face,
      'period' => $swell['period'] ?? 0,
      'swellDir' => $swell['direction'] ?? 0,
      'windSpeed' => $windSpeed,
      'windDir' => $windDir,
      'start' => max(5, $hour - 1),
      'source' => 'surfline',
    ];
    if (!isset($by[$date]) || $score > $by[$date]['score']) $by[$date] = $entry;
  }
  return array_values($by);
}

function parse_windy($json) {
  $data = $json['data'] ?? null;
  if (!$data || empty($data['day'])) return [];
  $by = [];
  $n = count($data['day']);
  for ($i = 0; $i < $n; $i++) {
    $hour = (int)($data['hour'][$i] ?? -1);
    if ($hour < 5 || $hour > 10) continue;
    $raw = $data['swell'][$i] ?? $data['swell1'][$i] ?? $data['waves'][$i] ?? null;
    if ($raw === null || $raw <= 0) continue;
    $period = $data['swellPeriod'][$i] ?? $data['swell1Period'][$i] ?? $data['wavesPeriod'][$i] ?? 10;
    $swellDir = $data['swellDir'][$i] ?? $data['swell1Dir'][$i] ?? $data['wavesDir'][$i] ?? 210;
    $windSpeed = (($data['wind'][$i] ?? 0) * 3.6);
    $windDir = $data['windDir'][$i] ?? 30;
    $face = as_face($raw, false);
    $score = morning_score($face, $period, $swellDir, $windDir, $windSpeed);
    $date = $data['day'][$i];
    $entry = [
      'date' => $date,
      'score' => $score,
      'swell' => $face,
      'period' => $period,
      'swellDir' => $swellDir,
      'windSpeed' => $windSpeed,
      'windDir' => $windDir,
      'start' => max(5, $hour - 1),
      'source' => 'windy',
    ];
    if (!isset($by[$date]) || $score > $by[$date]['score']) $by[$date] = $entry;
  }
  return array_values($by);
}

$errors = [];
$today = mexico_today();
$sf = [];
$sl = [];
$wy = [];
$omMarine = null;
$omWind = null;

try {
  $sf = parse_surf_forecast(http_get($SF_URL), $today);
} catch (Exception $e) {
  $errors[] = 'surf-forecast: ' . $e->getMessage();
}

try {
  $slUrl = "https://services.surfline.com/kbyg/spots/forecasts?spotId={$SPOT_ID}&days=8&intervalHours=1&cacheEnabled=true"
    . "&units%5BwaveHeight%5D=M&units%5BwindSpeed%5D=KPH&units%5BswellHeight%5D=M&units%5Btemperature%5D=C&units%5BtideHeight%5D=M";
  $sl = parse_surfline(json_decode(http_get($slUrl), true));
} catch (Exception $e) {
  $errors[] = 'surfline: ' . $e->getMessage();
}

try {
  $wyUrl = "https://node.windy.com/forecast/v2.1/waves/{$WINDY_LAT}/{$WINDY_LNG}?source=detail";
  $wy = parse_windy(json_decode(http_get($wyUrl, 'https://www.windy.com/'), true));
} catch (Exception $e) {
  $errors[] = 'windy: ' . $e->getMessage();
}

try {
  $marineUrl = "https://marine-api.open-meteo.com/v1/marine?latitude={$LAT}&longitude={$LNG}"
    . "&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,sea_level_height_msl,wave_height"
    . "&timezone=" . rawurlencode($TZ) . "&forecast_days=8";
  $windUrl = "https://api.open-meteo.com/v1/forecast?latitude={$LAT}&longitude={$LNG}"
    . "&hourly=wind_speed_10m,wind_direction_10m&timezone=" . rawurlencode($TZ) . "&forecast_days=8";
  $omMarine = json_decode(http_get($marineUrl), true)['hourly'] ?? null;
  $omWind = json_decode(http_get($windUrl), true)['hourly'] ?? null;
} catch (Exception $e) {
  $errors[] = 'open-meteo: ' . $e->getMessage();
}

$sfMap = [];
foreach ($sf as $d) $sfMap[$d['date']] = $d;
$slMap = [];
foreach ($sl as $d) $slMap[$d['date']] = $d;
$wyMap = [];
foreach ($wy as $d) $wyMap[$d['date']] = $d;

$days = [];
$sourcesUsed = [];
for ($i = 0; $i < 8; $i++) {
  $date = add_days($today, $i);
  $a = $sfMap[$date] ?? null;
  $b = $slMap[$date] ?? null;
  $c = $wyMap[$date] ?? null;
  $scores = [];
  if ($a) { $scores[] = $a['score']; $sourcesUsed['surf-forecast'] = true; }
  if ($b) { $scores[] = $b['score']; $sourcesUsed['surfline'] = true; }
  if ($c) { $scores[] = $c['score']; $sourcesUsed['windy'] = true; }

  $om = null;
  if (!$scores && $omMarine && $omWind) {
    $best = null;
    for ($start = 5; $start <= 8; $start++) {
      $rows = [];
      foreach ([$start, $start + 1, $start + 2] as $h) {
        $iso = sprintf('%sT%02d:00', $date, $h);
        $idx = array_search($iso, $omMarine['time'] ?? [], true);
        if ($idx === false) { $rows = null; break; }
        $swell = $omMarine['swell_wave_height'][$idx] ?? $omMarine['wave_height'][$idx] ?? null;
        $period = $omMarine['swell_wave_period'][$idx] ?? null;
        $dir = $omMarine['swell_wave_direction'][$idx] ?? null;
        $ws = $omWind['wind_speed_10m'][$idx] ?? null;
        $wd = $omWind['wind_direction_10m'][$idx] ?? null;
        if ($swell === null || $period === null || $dir === null || $ws === null || $wd === null) { $rows = null; break; }
        if ($swell == 0 && $period == 0 && $dir == 0) { $rows = null; break; }
        $face = as_face($swell, false);
        $rows[] = [
          'swell' => $face, 'period' => $period, 'swellDir' => $dir,
          'windSpeed' => $ws, 'windDir' => $wd,
          'score' => morning_score($face, $period, $dir, $wd, $ws),
        ];
      }
      if (!$rows) continue;
      $score = array_sum(array_column($rows, 'score')) / count($rows);
      $mid = $rows[1];
      if (!$best || $score > $best['score']) {
        $best = array_merge($mid, ['score' => $score, 'start' => $start, 'source' => 'open-meteo']);
      }
    }
    if ($best) {
      $om = $best;
      $scores[] = $best['score'];
      $sourcesUsed['open-meteo'] = true;
    }
  }

  if (!$scores) {
    $days[] = [
      'date' => $date, 'score' => null, 'start' => 6, 'swell' => 0, 'period' => 0, 'swellDir' => 0,
      'windSpeed' => 0, 'windDir' => 0, 'windKind' => 'glassy', 'tideLevel' => 0.5, 'tideRising' => true, 'sources' => [],
    ];
    continue;
  }

  $primary = $b ?: ($c ?: ($a ?: $om));
  $start = $primary['start'] ?? 6;
  $windDir = $primary['windDir'] ?? 30;
  $windSpeed = $primary['windSpeed'] ?? 0;

  $swellParts = [];
  if (isset($b['swell'])) $swellParts[] = $b['swell'];
  if (isset($c['swell'])) $swellParts[] = $c['swell'];
  if (isset($a['swell'])) $swellParts[] = as_face($a['swell'], false);
  if ($om && isset($om['swell']) && !$a && !$b && !$c) $swellParts[] = $om['swell'];
  $swell = $swellParts ? array_sum($swellParts) / count($swellParts) : ($primary['swell'] ?? 0);

  $tideLevel = 0.5;
  $tideRising = true;
  if ($omMarine && !empty($omMarine['time'])) {
    $idxs = [];
    foreach ($omMarine['time'] as $ti => $iso) {
      if (str_starts_with($iso, $date)) $idxs[] = $ti;
    }
    $levels = [];
    foreach ($idxs as $ti) {
      $v = $omMarine['sea_level_height_msl'][$ti] ?? null;
      if ($v !== null) $levels[] = $v;
    }
    if ($levels) {
      $lo = min($levels); $hi = max($levels);
      $pick = null; $before = null; $after = null;
      foreach ($idxs as $ti) {
        $h = (int)substr($omMarine['time'][$ti], 11, 2);
        $v = $omMarine['sea_level_height_msl'][$ti] ?? null;
        if ($v === null) continue;
        if ($h === $start + 1) $pick = $v;
        if ($h === $start) $before = $v;
        if ($h === $start + 2) $after = $v;
      }
      $pick = $pick ?? $levels[(int)(count($levels) / 2)];
      $tideLevel = ($hi - $lo > 0.05) ? ($pick - $lo) / ($hi - $lo) : 0.5;
      $tideRising = ($after ?? $pick) > ($before ?? $pick);
    }
  }

  $srcList = [];
  if ($a) $srcList[] = 'surf-forecast';
  if ($b) $srcList[] = 'surfline';
  if ($c) $srcList[] = 'windy';
  if ($om && !$a && !$b && !$c) $srcList[] = 'open-meteo';

  $days[] = [
    'date' => $date,
    'score' => array_sum($scores) / count($scores),
    'start' => $start,
    'swell' => $swell,
    'period' => $primary['period'] ?? 0,
    'swellDir' => $primary['swellDir'] ?? 210,
    'windSpeed' => $windSpeed,
    'windDir' => $windDir,
    'windKind' => wind_kind($windDir, $windSpeed),
    'tideLevel' => $tideLevel,
    'tideRising' => $tideRising,
    'sources' => $srcList,
    'parts' => [
      'surfline' => $b['score'] ?? null,
      'surfForecast' => $a['score'] ?? null,
      'windy' => $c['score'] ?? null,
      'openMeteo' => $om['score'] ?? null,
    ],
  ];
}

$scored = array_values(array_filter($days, fn($d) => $d['score'] !== null));
$preferred = array_values(array_filter($scored, function ($d) {
  foreach ($d['sources'] as $s) {
    if ($s === 'surfline' || $s === 'surf-forecast' || $s === 'windy') return true;
  }
  return false;
}));
$pool = $preferred ?: $scored;
$bestDate = null;
if ($pool) {
  usort($pool, fn($a, $b) => $b['score'] <=> $a['score']);
  $bestDate = $pool[0]['date'];
}

echo json_encode([
  'generatedAt' => gmdate('c'),
  'faceHeight' => $FACE_HEIGHT,
  'spot' => [
    'surflineId' => $SPOT_ID,
    'surflineUrl' => 'https://www.surfline.com/surf-report/la-saladita/' . $SPOT_ID,
    'surfForecastUrl' => $SF_URL,
    'windyUrl' => "https://www.windy.com/-Waves-waves?waves,{$WINDY_LAT},{$WINDY_LNG},11",
    'windyLat' => $WINDY_LAT,
    'windyLng' => $WINDY_LNG,
    'lat' => $LAT,
    'lng' => $LNG,
    'tz' => $TZ,
  ],
  'sourcesUsed' => array_keys($sourcesUsed),
  'bestDate' => $bestDate,
  'days' => $days,
  'errors' => $errors,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
