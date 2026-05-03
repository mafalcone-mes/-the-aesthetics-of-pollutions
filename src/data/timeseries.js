import { SENSORS } from './sensors';
import { POLLUTANTS } from './pollutants';
import { getPollLevel } from '../utils/aqi';

export const MOCK_TIMESERIES = (() => {
  const records = [];
  const now = new Date('2026-05-03T23:50:00');
  const SEVEN_DAYS = 7 * 24 * 6;
  for (const s of SENSORS) {
    for (let i = SEVEN_DAYS - 1; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 10 * 60 * 1000);
      const h = ts.getHours();
      const dow = ts.getDay();
      const rush = (h >= 7 && h <= 10) || (h >= 16 && h <= 19) ? 1.35 : 1.0;
      const night = h < 5 || h > 22 ? 0.55 : 1.0;
      const weekend = dow === 0 || dow === 6 ? 0.72 : 1.0;
      const seed = (s.id * 1000 + i * 17) % 100;
      const noise = 0.75 + seed / 200;
      const scale = rush * night * weekend * noise;
      const clamp = (v, mn, mx) => Math.round(Math.min(mx, Math.max(mn, v * scale * (0.85 + (seed % 30) / 100))));
      records.push({
        ts, sensorId: s.id, sensorName: s.name, location: s.location, district: s.district,
        temp: Math.round(18 + (h < 6 ? -2 : h < 12 ? h * 0.4 : h < 18 ? 8 - (h - 12) * 0.3 : 4) + (seed % 6 - 3)),
        hum:  Math.round(55 + (night > 0.9 ? 10 : 0) + (seed % 20 - 10)),
        pm25: clamp(s.pm25, 1, 200),
        pm10: clamp(s.pm10, 2, 400),
        no2:  clamp(s.no2,  1, 200),
        o3:   clamp(s.o3,   5, 250),
        so2:  clamp(s.so2,  1, 350),
        co:   Math.round(Math.min(40, Math.max(0.5, s.co * scale * (0.9 + (seed % 20) / 100))) * 10) / 10,
        nh3:  clamp(s.nh3,  1, 300),
        c6h6: Math.round(Math.min(30, Math.max(0.5, s.c6h6 * scale * (0.9 + (seed % 20) / 100))) * 10) / 10,
      });
    }
  }
  return records;
})();

export function aggregateHourly(records) {
  const map = {};
  for (const r of records) {
    const key = `${r.sensorId}_${r.ts.getFullYear()}-${String(r.ts.getMonth() + 1).padStart(2, '0')}-${String(r.ts.getDate()).padStart(2, '0')}_${String(r.ts.getHours()).padStart(2, '0')}`;
    if (!map[key]) {
      map[key] = {
        ...r, _sum: { ...r }, _count: 1,
        hour: r.ts.getHours(),
        dateStr: r.ts.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hourStr: String(r.ts.getHours()).padStart(2, '0') + ':00',
        dateObj: new Date(r.ts.getFullYear(), r.ts.getMonth(), r.ts.getDate(), r.ts.getHours()),
      };
    } else {
      const m = map[key];
      m._count++;
      for (const k of ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3', 'c6h6', 'temp', 'hum']) m._sum[k] += r[k];
    }
  }
  return Object.values(map).map((m) => {
    const out = { ...m };
    for (const k of ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3', 'c6h6', 'temp', 'hum'])
      out[k] = Math.round((m._sum[k] / m._count) * 10) / 10;
    out.aqi = Math.max(...['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3', 'c6h6'].map((k) => getPollLevel(k, out[k])));
    return out;
  }).sort((a, b) => a.dateObj - b.dateObj);
}

export const HOURLY_DATA = aggregateHourly(MOCK_TIMESERIES);
