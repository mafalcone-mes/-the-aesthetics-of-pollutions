// Run once: node scripts/generate_mock_reports.mjs
// Outputs: src/data/mock_reports.csv
// Seeds plausible citizen symptom reports from the real hourly_taranto.csv
// pollution levels — worse air around a sensor/hour means more (and more
// severe) reports get generated for it. Sensor/district join happens at
// load time in src/data/loader.js, same pattern as the numeric readings.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { POLLUTANTS } from '../src/data/pollutants.js';
import { SYMPTOM_OPTIONS } from '../src/data/symptoms.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ACTIVE_IDS = new Set([19, 20, 21, 22, 37, 38]);

function getPollLevel(key, val) {
  const p = POLLUTANTS[key];
  if (!p) return 0;
  for (let i = 0; i < p.ranges.length; i++) {
    if (val <= p.ranges[i][1]) return i;
  }
  return p.ranges.length - 1;
}

// Deterministic PRNG (mulberry32) so re-running the script reproduces the same file.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260101);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const FIRST_NAMES = ['Mario', 'Giulia', 'Anna', 'Luca', 'Francesca', 'Giuseppe', 'Maria', 'Antonio', 'Rosa', 'Vito', 'Carmela', 'Pietro', 'Angela', 'Cosimo', 'Lucia'];
const SURNAME_INITIALS = ['R.', 'T.', 'B.', 'M.', 'D.', 'S.', 'C.', 'G.', 'P.', 'L.'];

const CATEGORY_SYMPTOMS = {
  particulates: ['cough', 'breath', 'chest'],
  gaseous: ['eyes', 'throat', 'cough'],
  systemic: ['headache', 'nausea', 'dizziness', 'fatigue'],
};
const BASELINE_SYMPTOMS = ['cough', 'fatigue', 'headache'];

// Expected report count per AQI level (buono..estremamente-scarso), tuned against
// this dataset's level histogram to land around ~120 reports total, ~85% of
// them at level 3+ (scarso and worse).
const LEVEL_REPORT_CHANCE = [0.001, 0.003, 0.01, 0.035, 0.07, 0.09];

const NOTE_TEMPLATES = [
  'Sintomi avvertiti soprattutto nel tardo pomeriggio, vicino alla zona industriale.',
  "Disturbo iniziato dopo poche ore all'aperto, passato rientrando in casa.",
  'Già capitato altre volte in giornate simili, sembra peggiorare col vento da nord.',
  'Fastidio lieve ma persistente per tutta la giornata.',
  'Avvertito soprattutto la mattina presto, prima che il vento cambiasse.',
  'Sintomi più forti del solito, mi ha costretto a stare in casa.',
  'Nulla di grave, solo un fastidio passeggero.',
  "Bambini di casa con sintomi simili nello stesso periodo.",
];

function csvField(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

const rawHourly = readFileSync(join(__dirname, '../src/data/hourly_taranto.csv'), 'utf8');
const hourlyLines = rawHourly.trim().split('\n').slice(1);

const header = 'id,sensor_id,ts,name,symptoms,note';
const rows = [header];
let nextId = 1;

for (const line of hourlyLines) {
  const cols = line.split(',');
  const [ts, sensorIdStr, pm25, pm10, no2, o3, so2, co, nh3, c6h6] = cols;
  const sensorId = Number(sensorIdStr);
  if (!ACTIVE_IDS.has(sensorId)) continue;

  const particulatesLvl = Math.max(getPollLevel('pm25', Number(pm25)), getPollLevel('pm10', Number(pm10)));
  const gaseousLvl = Math.max(getPollLevel('no2', Number(no2)), getPollLevel('o3', Number(o3)), getPollLevel('so2', Number(so2)));
  const systemicLvl = Math.max(getPollLevel('co', Number(co)), getPollLevel('nh3', Number(nh3)), getPollLevel('c6h6', Number(c6h6)));
  const overallLvl = Math.max(particulatesLvl, gaseousLvl, systemicLvl);

  // Worse air → more likely a citizen logs a symptom report that hour.
  // Skewed sharply toward poor/very poor/extremely poor (levels 3-5) so most
  // reports cluster around real pollution spikes instead of evenly sampling.
  const reportChance = LEVEL_REPORT_CHANCE[overallLvl];
  if (rng() > reportChance) continue;

  const pool = new Set(BASELINE_SYMPTOMS);
  if (particulatesLvl >= 2) CATEGORY_SYMPTOMS.particulates.forEach(s => pool.add(s));
  if (gaseousLvl >= 2) CATEGORY_SYMPTOMS.gaseous.forEach(s => pool.add(s));
  if (systemicLvl >= 2) CATEGORY_SYMPTOMS.systemic.forEach(s => pool.add(s));
  const poolArr = [...pool];

  const symptomCount = overallLvl >= 3 ? 1 + Math.floor(rng() * 3) : 1;
  const chosen = new Set();
  while (chosen.size < Math.min(symptomCount, poolArr.length)) chosen.add(pick(poolArr));

  const name = `${pick(FIRST_NAMES)} ${pick(SURNAME_INITIALS)}`;
  const note = rng() < 0.45 ? pick(NOTE_TEMPLATES) : '';

  rows.push([
    nextId++, sensorId, ts,
    csvField(name), csvField([...chosen].join(';')), csvField(note),
  ].join(','));
}

const outPath = join(__dirname, '../src/data/mock_reports.csv');
writeFileSync(outPath, rows.join('\n'), 'utf8');
console.log(`✓ Generated ${rows.length - 1} reports → ${outPath}`);
