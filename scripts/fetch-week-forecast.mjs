#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeekForecast } from './lib/week-forecast.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'data', 'week-forecast.json');

const week = await buildWeekForecast();
const hasScores = Array.isArray(week.days) && week.days.some((d) => d.score != null);

if (!hasScores) {
  try {
    const prev = JSON.parse(await readFile(out, 'utf8'));
    if (Array.isArray(prev.days) && prev.days.some((d) => d.score != null)) {
      console.log(`Kept previous ${out} (live sources returned no scored days)`);
      console.log(`Sources attempted: ${week.sourcesUsed.join(', ') || '(none)'}`);
      if (week.errors?.length) console.log(`Warnings:\n- ${week.errors.join('\n- ')}`);
      console.log(`Best morning (kept): ${prev.bestDate || 'n/a'}`);
      // Do not fail the build when live sources are down.
      process.exit(0);
    }
  } catch {
    /* no usable previous file */
  }
}

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(week, null, 2) + '\n');

const best = week.days.find((d) => d.date === week.bestDate);
console.log(`Wrote ${out}`);
console.log(`Sources: ${week.sourcesUsed.join(', ') || '(none)'}`);
if (week.errors?.length) console.log(`Warnings:\n- ${week.errors.join('\n- ')}`);
console.log(`Best morning: ${week.bestDate || 'n/a'}${best ? ` (${best.score?.toFixed(1)}, ${best.start}:00)` : ''}`);
// Do not fail the build when live sources are down — SurfLog falls back to the JSON/PHP later.
