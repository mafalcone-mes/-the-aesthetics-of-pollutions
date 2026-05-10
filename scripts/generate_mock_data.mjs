// Run once: node scripts/generate_mock_data.mjs
// Outputs: src/data/mock_data.csv
// 168 hourly rows × 8 sensors = 1 344 data rows

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Baselines — define the "character" of each location.
// These are only used during generation; the app reads the CSV, not these values.
const BASELINES = [
  { id: 1, pm25: 4,  pm10: 18,  no2: 14,  o3: 55,  so2: 18,  co: 1.2,  nh3: 8,   c6h6: 1.2 },
  { id: 2, pm25: 28, pm10: 88,  no2: 42,  o3: 110, so2: 55,  co: 5.2,  nh3: 35,  c6h6: 4.1 },
  { id: 3, pm25: 12, pm10: 38,  no2: 22,  o3: 78,  so2: 30,  co: 2.8,  nh3: 18,  c6h6: 2.5 },
  { id: 4, pm25: 68, pm10: 145, no2: 78,  o3: 135, so2: 148, co: 12.0, nh3: 78,  c6h6: 7.2 },
  { id: 5, pm25: 9,  pm10: 28,  no2: 18,  o3: 68,  so2: 22,  co: 1.8,  nh3: 12,  c6h6: 1.6 },
  { id: 6, pm25: 45, pm10: 110, no2: 55,  o3: 125, so2: 88,  co: 8.5,  nh3: 52,  c6h6: 5.8 },
  { id: 7, pm25: 95, pm10: 210, no2: 112, o3: 168, so2: 210, co: 18.0, nh3: 125, c6h6: 12.5 },
  { id: 8, pm25: 7,  pm10: 22,  no2: 16,  o3: 72,  so2: 25,  co: 1.5,  nh3: 14,  c6h6: 1.4 },
];

// End at Thursday 08:00 (rush hour) so the "latest" reading looks realistic
const END   = new Date('2026-05-07T08:00:00');
const HOURS = 7 * 24; // 168

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const header = 'ts,sensor_id,pm25,pm10,no2,o3,so2,co,nh3,c6h6,temp,hum';
const rows   = [header];

for (const s of BASELINES) {
  for (let i = HOURS - 1; i >= 0; i--) {
    const ts  = new Date(END.getTime() - i * 3_600_000);
    const h   = ts.getHours();
    const dow = ts.getDay();

    const rush    = (h >= 7 && h <= 10) || (h >= 16 && h <= 19) ? 1.35 : 1.0;
    const night   = h < 5 || h > 22 ? 0.55 : 1.0;
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1.0;

    const hourIndex = HOURS - 1 - i;
    const seed  = (s.id * 1000 + hourIndex * 17) % 100;
    const noise = 0.75 + seed / 200;
    const scale = rush * night * weekend * noise;
    const extra = 0.85 + (seed % 30) / 100;

    const ci = (v, lo, hi) => Math.round(clamp(v * scale * extra, lo, hi));
    const cf = (v, lo, hi) => Math.round(clamp(v * scale * (0.9 + (seed % 20) / 100), lo, hi) * 10) / 10;

    const yr  = ts.getFullYear();
    const mo  = String(ts.getMonth() + 1).padStart(2, '0');
    const dy  = String(ts.getDate()).padStart(2, '0');
    const hr  = String(h).padStart(2, '0');
    const tsStr = `${yr}-${mo}-${dy}T${hr}:00`;

    const temp = Math.round(18 + (h < 6 ? -2 : h < 12 ? h * 0.4 : h < 18 ? 8 - (h - 12) * 0.3 : 4) + (seed % 6 - 3));
    const hum  = Math.round(55 + (h < 5 || h > 22 ? 10 : 0) + (seed % 20 - 10));

    rows.push([
      tsStr, s.id,
      ci(s.pm25,  1, 200), ci(s.pm10,  2, 400),
      ci(s.no2,   1, 200), ci(s.o3,    5, 250),
      ci(s.so2,   1, 350), cf(s.co,  0.5,  40),
      ci(s.nh3,   1, 300), cf(s.c6h6, 0.5,  30),
      temp, hum,
    ].join(','));
  }
}

const outPath = join(__dirname, '../src/data/mock_data.csv');
writeFileSync(outPath, rows.join('\n'), 'utf8');
console.log(`✓ Generated ${rows.length - 1} rows → ${outPath}`);
