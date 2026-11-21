#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeasonHeights } from './lib/season-heights.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'data', 'season-heights.json');

const season = await buildSeasonHeights();
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(season, null, 2) + '\n');

console.log(`Wrote ${out}`);
console.log(`Source: ${season.source} (~${season.years}y)`);
console.log(`Heights (12m): ${season.heights.join(', ')}`);
console.log(`Climate (long): ${season.climate.join(', ')}`);
if (season.errors?.length) {
  console.log(`Warnings:\n- ${season.errors.join('\n- ')}`);
  // Keep exit 0 so CI/deploy still publishes when Open-Meteo is briefly down.
}
