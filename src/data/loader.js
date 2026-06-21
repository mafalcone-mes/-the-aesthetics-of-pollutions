// Single source of truth: parse real ARPA Taranto CSVs.
// Exports SENSORS, HOURLY_DATA, WIND_DAILY.

import rawStations from './stations_taranto.csv?raw';
import rawHourly   from './hourly_taranto.csv?raw';
import rawWind     from './wind_daily.csv?raw';
import rawReports  from './mock_reports.csv?raw';
import { POLLUTANTS } from './pollutants';
import { getPollLevel } from '../utils/aqi';

const POLL_KEYS = Object.keys(POLLUTANTS);

// ── stations ────────────────────────────────────────────────────────────────
function parseStations(raw) {
  const lines = raw.trim().split('\n');
  return lines.slice(1).map(line => {
    // Handle quoted fields (denominazione may have commas)
    const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g).map(c => c.replace(/^"|"$/g, ''));
    const [id, name, comune, provincia, longitude, latitude, tipologia_area, tipologia_stazione] = cols;
    return {
      id: Number(id),
      name: name.trim(),
      comune: comune.trim(),
      longitude: Number(longitude),
      latitude:  Number(latitude),
      tipologia_area:     (tipologia_area     || '').trim(),
      tipologia_stazione: (tipologia_stazione || '').trim(),
    };
  });
}

const ALL_STATIONS = parseStations(rawStations);

// Stations that actually have hourly readings (19,20,21,22,37,38)
const ACTIVE_IDS = new Set([19, 20, 21, 22, 37, 38]);

// district label derived from station name / tipologia
function districtOf(s) {
  if (s.name.includes('CISI'))        return 'Industriale';
  if (s.name.includes('Archimede'))   return 'Centro';
  if (s.name.includes('Machiavelli')) return 'Centro';
  if (s.name.includes('San Vito'))    return 'San Vito';
  if (s.name.includes('Alto Adige'))  return 'Tamburi';
  if (s.name.includes('Talsano'))     return 'Talsano';
  if (s.comune !== 'Taranto')         return s.comune;
  return s.comune;
}

// Sensors are community-owned and named after the people who host them.
const SENSOR_NAMES = {
  19: 'Sensore di Tonio',
  20: 'Sensore di Maria',
  21: 'Sensore di Giuseppe',
  22: 'Sensore di Anna',
  37: 'Sensore di Vito',
  38: 'Sensore di Rosa',
};

// "Taranto - Archimede" / "Statte - Wind" → "Via Archimede" / "Via Wind"
function locationOf(s) {
  return `Via ${s.name.replace(/^(Taranto|Statte)\s*-\s*/, '')}`;
}

export const SENSOR_META = ALL_STATIONS
  .filter(s => ACTIVE_IDS.has(s.id))
  .map(s => ({
    id:       s.id,
    name:     SENSOR_NAMES[s.id] || s.name,
    location: locationOf(s),
    district: districtOf(s),
    lat:      s.latitude,
    lon:      s.longitude,
    // fractional x/y for any SVG positioning (computed from bounding box)
    x: null,
    y: null,
  }));

// compute fractional x/y after we have the full list
const lats = SENSOR_META.map(s => s.lat);
const lons = SENSOR_META.map(s => s.lon);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const minLon = Math.min(...lons), maxLon = Math.max(...lons);
SENSOR_META.forEach(s => {
  s.x = maxLon === minLon ? 0.5 : (s.lon - minLon) / (maxLon - minLon);
  s.y = maxLat === minLat ? 0.5 : 1 - (s.lat - minLat) / (maxLat - minLat);
});

// ── hourly data ──────────────────────────────────────────────────────────────
function parseHourly(raw) {
  const lines = raw.trim().split('\n');
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const [tsStr, sensorIdStr, pm25, pm10, no2, o3, so2, co, nh3, c6h6, temp, hum] = cols;

    const [datePart, timePart] = tsStr.split('T');
    const [yr, mo, dy] = datePart.split('-').map(Number);
    const hr = Number((timePart || '00:00').split(':')[0]);
    const dateObj = new Date(yr, mo - 1, dy, hr);

    const sensorId = Number(sensorIdStr);
    const meta = SENSOR_META.find(s => s.id === sensorId);
    if (!meta) return null;

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
  }).filter(Boolean);
}

export const HOURLY_DATA = parseHourly(rawHourly).sort((a, b) => a.dateObj - b.dateObj);

// "current" reading per sensor = latest row in hourly data
export const SENSORS = SENSOR_META.map(meta => {
  const rows = HOURLY_DATA.filter(r => r.sensorId === meta.id);
  if (!rows.length) return { ...meta, pm25:0, pm10:0, no2:0, o3:0, so2:0, co:0, nh3:0, c6h6:0 };
  const last = rows[rows.length - 1];
  return {
    ...meta,
    pm25: last.pm25, pm10: last.pm10,
    no2:  last.no2,  o3:   last.o3,
    so2:  last.so2,  co:   last.co,
    nh3:  last.nh3,  c6h6: last.c6h6,
  };
});

// ── wind data ────────────────────────────────────────────────────────────────
function parseWind(raw) {
  const lines = raw.trim().split('\n');
  const result = {};
  lines.slice(1).forEach(line => {
    const [date, spd, dir, gusts, u, v] = line.split(',');
    if (!date) return;
    result[date.trim()] = {
      spd:  Number(spd),
      dir:  Number(dir),
      gusts: Number(gusts),
      u:    Number(u),
      v:    Number(v),
    };
  });
  return result;
}

export const WIND_DAILY = parseWind(rawWind);

export function getLatestWind() {
  const dates = Object.keys(WIND_DAILY).sort();
  return dates.length ? WIND_DAILY[dates[dates.length - 1]] : null;
}

// ── mock symptom reports (qualitative data) ───────────────────────────────────
// Seeded by scripts/generate_mock_reports.mjs from the same hourly pollution
// data — sensor/district are joined here, same pattern as HOURLY_DATA above.
function parseReports(raw) {
  const lines = raw.trim().split('\n');
  return lines.slice(1).map(line => {
    const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g).map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
    const [idStr, sensorIdStr, tsStr, name, symptomsStr, note] = cols;

    const sensorId = Number(sensorIdStr);
    const meta = SENSOR_META.find(s => s.id === sensorId);
    if (!meta) return null;

    const [datePart, timePart] = tsStr.split('T');
    const [yr, mo, dy] = datePart.split('-').map(Number);
    const hr = Number((timePart || '00:00').split(':')[0]);
    const dateObj = new Date(yr, mo - 1, dy, hr);

    return {
      id: Number(idStr),
      sensorId,
      sensorName: meta.name,
      district: meta.district,
      dateObj,
      dateStr: dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hourStr: String(hr).padStart(2, '0') + ':00',
      name,
      symptoms: symptomsStr ? symptomsStr.split(';') : [],
      note: note || '',
    };
  }).filter(Boolean);
}

export const MOCK_REPORTS = parseReports(rawReports).sort((a, b) => a.dateObj - b.dateObj);
