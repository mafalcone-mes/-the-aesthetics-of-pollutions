// Single source of truth: parse mock_data.csv, derive SENSORS + HOURLY_DATA.
// All pages read from these two exports — nothing generates its own numbers.

import rawCsv from './mock_data.csv?raw';
import { SENSOR_META } from './sensor_meta';
import { POLLUTANTS } from './pollutants';
import { getPollLevel } from '../utils/aqi';

const POLL_KEYS = Object.keys(POLLUTANTS);

function parseRows(raw) {
  const lines = raw.trim().split('\n');
  // Skip header line
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const [tsStr, sensorIdStr, pm25, pm10, no2, o3, so2, co, nh3, c6h6, temp, hum] = cols;

    const [datePart, timePart] = tsStr.split('T');
    const [yr, mo, dy] = datePart.split('-').map(Number);
    const hr = Number(timePart.split(':')[0]);
    const dateObj = new Date(yr, mo - 1, dy, hr);

    const sensorId = Number(sensorIdStr);
    const meta = SENSOR_META.find(s => s.id === sensorId);

    const poll = {
      pm25: Number(pm25), pm10: Number(pm10),
      no2:  Number(no2),  o3:   Number(o3),
      so2:  Number(so2),  co:   Number(co),
      nh3:  Number(nh3),  c6h6: Number(c6h6),
    };

    return {
      dateObj,
      dateStr: dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hourStr: String(hr).padStart(2, '0') + ':00',
      hour: hr,
      sensorId,
      sensorName: meta.name,
      location:   meta.location,
      district:   meta.district,
      temp: Number(temp),
      hum:  Number(hum),
      ...poll,
      aqi: Math.max(...POLL_KEYS.map(k => getPollLevel(k, poll[k] || 0))),
    };
  });
}

export const HOURLY_DATA = parseRows(rawCsv).sort((a, b) => a.dateObj - b.dateObj);

// "Current" reading per sensor = its latest row in the CSV
export const SENSORS = SENSOR_META.map(meta => {
  const rows = HOURLY_DATA.filter(r => r.sensorId === meta.id);
  const last = rows[rows.length - 1];
  return {
    ...meta,
    pm25: last.pm25, pm10: last.pm10, no2: last.no2,  o3:   last.o3,
    so2:  last.so2,  co:   last.co,   nh3: last.nh3,  c6h6: last.c6h6,
  };
});
