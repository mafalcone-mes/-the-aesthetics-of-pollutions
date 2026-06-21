import { createContext, useContext, useState, useEffect, useRef } from 'react';

const PI_SENSOR_META = {
  id:       999,
  name:     'Sensore di Tonio',
  location: 'Piazza Fontana',
  district: 'Locale',
  lat:      40.4760,
  lon:      17.2270,
  x:        0.5,
  y:        0.5,
};

const POLL_INTERVAL = 30_000; // ms

const LiveDataContext = createContext(null);

function rowToSensor(row) {
  if (!row || !row.ts) return null;
  return {
    ...PI_SENSOR_META,
    pm25:  row.pm25  ?? 0,
    pm10:  row.pm10  ?? 0,
    no2:   row.no2   ?? 0,
    o3:    row.o3    ?? 0,
    so2:   row.so2   ?? 0,
    co:    row.co    ?? 0,
    nh3:   row.nh3   ?? 0,
    c6h6:  row.c6h6  ?? 0,
    temp:  row.temp  ?? 0,
    hum:   row.hum   ?? 0,
  };
}

function rowToHourlyRow(row) {
  if (!row || !row.ts) return null;
  const d = new Date(row.ts);
  return {
    dateObj:    d,
    dateStr:    row.dateStr ?? d.toLocaleDateString('it-IT'),
    hourStr:    row.hourStr ?? `${String(d.getHours()).padStart(2, '0')}:00`,
    hour:       row.hour    ?? d.getHours(),
    sensorId:   PI_SENSOR_META.id,
    sensorName: PI_SENSOR_META.name,
    location:   PI_SENSOR_META.location,
    district:   PI_SENSOR_META.district,
    pm25:  row.pm25  ?? 0,
    pm10:  row.pm10  ?? 0,
    no2:   row.no2   ?? 0,
    o3:    row.o3    ?? 0,
    so2:   row.so2   ?? 0,
    co:    row.co    ?? 0,
    nh3:   row.nh3   ?? 0,
    c6h6:  row.c6h6  ?? 0,
    temp:  row.temp  ?? 0,
    hum:   row.hum   ?? 0,
    aqi:   0,
  };
}

export function LiveDataProvider({ children }) {
  const [latestRow,   setLatestRow]   = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [lastFetch,   setLastFetch]   = useState(null);
  const timer = useRef(null);

  const fetchData = async () => {
    try {
      const [liveRes, histRes] = await Promise.all([
        fetch('/api/live'),
        fetch('/api/history'),
      ]);
      if (liveRes.ok) {
        const row = await liveRes.json();
        if (row && row.ts) setLatestRow(row);
      }
      if (histRes.ok) {
        const rows = await histRes.json();
        if (Array.isArray(rows)) setHistoryRows(rows);
      }
      setLastFetch(Date.now());
    } catch {
      // server unreachable — keep last known data shown
    }
  };

  useEffect(() => {
    fetchData();
    timer.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(timer.current);
  }, []);

  const liveSensor  = rowToSensor(latestRow);
  const liveHistory = historyRows.map(rowToHourlyRow).filter(Boolean);
  const liveRows    = latestRow ? [rowToHourlyRow(latestRow)].filter(Boolean) : [];
  const liveAge     = lastFetch ? Math.round((Date.now() - lastFetch) / 1000) : null;

  return (
    <LiveDataContext.Provider value={{ liveSensor, liveRows, liveHistory, liveAge }}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  return useContext(LiveDataContext);
}
