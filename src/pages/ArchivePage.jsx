import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOM_OPTIONS } from '../data/symptoms';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel, getSensorAQI } from '../utils/aqi';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MultiLineChart from '../components/charts/MultiLineChart';
import HourlyBarChart from '../components/charts/HourlyBarChart';
import DailyHeatmap from '../components/charts/DailyHeatmap';
import RadarChart from '../components/charts/RadarChart';

const PAGE_SIZE = 50;

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Stable string signature for a filter Set — used as a React `key` to force a
// chart to remount (and replay its entrance animation) only when its inputs actually change.
function setKey(s) {
  return [...s].sort().join(',');
}

function useIsNarrow(breakpoint = 640) {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return isNarrow;
}

// Module-level constants — HOURLY_DATA is static so this is safe
const AVAILABLE_DATES = [...new Set(HOURLY_DATA.map(r => toISO(r.dateObj)))].sort();
const FIRST_DATE  = AVAILABLE_DATES[0] ?? '';
const LATEST_DATE = AVAILABLE_DATES[AVAILABLE_DATES.length - 1] ?? '';
const ALL_DISTRICTS = [...new Set(SENSORS.map(s => s.district))];
const CHART_DEFS = [
  { key: 'radar',   it: 'Radar',         en: 'Radar' },
  { key: 'line',    it: 'Andamento',     en: 'Trend' },
  { key: 'bar',     it: 'Media oraria',  en: 'Hourly avg' },
  { key: 'heatmap', it: 'Heatmap',       en: 'Heatmap' },
];

// ── Shared styles ─────────────────────────────────────────────────────────────

const SEL_STYLE = {
  border: '1.5px solid rgba(0,0,0,0.22)', background: 'transparent', color: 'var(--black)',
  fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400,
  letterSpacing: '0.05em', padding: '5px 8px', cursor: 'pointer',
};

const SUBLABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 8,
};

const CHART_LABEL = {
  fontFamily: 'Epilogue', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 10,
};

function pillStyle(active) {
  return {
    padding: '5px 14px',
    border: '1.5px solid ' + (active ? 'var(--primary)' : 'rgba(0,0,0,0.22)'),
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--black)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
  };
}

function toggleSet(set, setFn, val, allVal) {
  const s = new Set(set);
  if (val === allVal) { setFn(new Set([allVal])); return; }
  s.delete(allVal);
  if (s.has(val)) { s.delete(val); if (!s.size) s.add(allVal); } else s.add(val);
  setFn(s);
}

// ── Custom hook — independent filter state + filtered data ────────────────────

function useChartFilter(defaultFrom = LATEST_DATE, defaultTo = LATEST_DATE, defaultMode = 'single') {
  const [open, setOpen]         = useState(false);
  const [mode, setMode]         = useState(defaultMode);
  const [from, setFrom]         = useState(defaultFrom);
  const [to, setTo]             = useState(defaultTo);
  const [sensors, setSensors]   = useState(new Set(['all']));
  const [districts, setDistricts] = useState(new Set(['all']));

  const filtered = useMemo(() => {
    if (!from || !to) return [];
    const f = new Date(from);
    const t = new Date(to + 'T23:59:59');
    return HOURLY_DATA.filter(r => {
      if (r.dateObj < f || r.dateObj > t) return false;
      if (!sensors.has('all') && !sensors.has(String(r.sensorId))) return false;
      if (!districts.has('all') && !districts.has(r.district)) return false;
      return true;
    });
  }, [from, to, sensors, districts]);

  return { open, setOpen, mode, setMode, from, setFrom, to, setTo, sensors, setSensors, districts, setDistricts, filtered };
}

// ── Reusable filter UI pieces ─────────────────────────────────────────────────

function PeriodPicker({ L, mode, setMode, from, setFrom, to, setTo }) {
  return (
    <div>
      <div style={SUBLABEL}>{L ? 'Periodo' : 'Period'}</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {['single', 'range'].map(m => (
          <span key={m} style={{ ...pillStyle(mode === m), flex: 1, textAlign: 'center' }} onClick={() => {
            setMode(m);
            if (m === 'single') { setFrom(LATEST_DATE); setTo(LATEST_DATE); }
            else { setFrom(FIRST_DATE); setTo(LATEST_DATE); }
          }}>
            {m === 'single' ? (L ? 'Giorno' : 'Day') : (L ? 'Intervallo' : 'Range')}
          </span>
        ))}
      </div>
      {mode === 'single' ? (
        <select value={from} onChange={e => { setFrom(e.target.value); setTo(e.target.value); }} style={{ ...SEL_STYLE, width: '100%' }}>
          {AVAILABLE_DATES.map(d => (
            <option key={d} value={d}>
              {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <select value={from} onChange={e => setFrom(e.target.value)} style={{ ...SEL_STYLE, width: '100%' }}>
            {AVAILABLE_DATES.filter(d => d <= to).map(d => (
              <option key={d} value={d}>
                {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
              </option>
            ))}
          </select>
          <select value={to} onChange={e => setTo(e.target.value)} style={{ ...SEL_STYLE, width: '100%' }}>
            {AVAILABLE_DATES.filter(d => d >= from).map(d => (
              <option key={d} value={d}>
                {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function SensorPills({ L, sensors, setSensors }) {
  return (
    <div>
      <div style={SUBLABEL}>{L ? 'Sensore' : 'Sensor'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span style={pillStyle(sensors.has('all'))} onClick={() => setSensors(new Set(['all']))}>{L ? 'Tutti' : 'All'}</span>
        {SENSORS.map(s => (
          <span key={s.id} style={pillStyle(sensors.has(String(s.id)))}
            onClick={() => toggleSet(sensors, setSensors, String(s.id), 'all')}>
            {s.name.replace('Taranto - ', '')}
          </span>
        ))}
      </div>
    </div>
  );
}

function DistrictPills({ L, districts, setDistricts }) {
  return (
    <div>
      <div style={SUBLABEL}>{L ? 'Quartiere' : 'District'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span style={pillStyle(districts.has('all'))} onClick={() => setDistricts(new Set(['all']))}>{L ? 'Tutti' : 'All'}</span>
        {ALL_DISTRICTS.map(d => (
          <span key={d} style={pillStyle(districts.has(d))}
            onClick={() => setDistricts(districts.has(d) ? new Set(['all']) : new Set([d]))}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function PollutantPills({ L, polls, setPolls }) {
  return (
    <div>
      <div style={SUBLABEL}>{L ? 'Inquinanti' : 'Pollutants'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Object.keys(POLLUTANTS).map(k => (
          <span key={k} style={pillStyle(polls.has(k))} onClick={() => {
            const s = new Set(polls);
            s.has(k) ? (s.size > 1 && s.delete(k)) : s.add(k);
            setPolls(s);
          }}>
            {POLLUTANTS[k].name}
          </span>
        ))}
      </div>
    </div>
  );
}

function FilterPanel({ open, setOpen, children, exportFn }) {
  return (
    <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--gray)' }}>
      {/* toggle strip — matches map page box style */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)' }}>
          {open ? '▲' : '▼'}
        </span>
        {exportFn && (
          <button onClick={e => { e.stopPropagation(); exportFn(); }}
            style={{ padding: '4px 12px', background: 'var(--primary)', color: '#fff', border: 'none', fontFamily: 'Epilogue', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            ↓ CSV
          </button>
        )}
      </div>
      {open && (
        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--gray)' }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Smooth show/hide wrapper for toggleable chart sections ────────────────────

function Collapsible({ open, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: open ? '1fr' : '0fr',
      opacity: open ? 1 : 0,
      transition: 'grid-template-rows 380ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms ease',
    }}>
      <div style={{
        overflow: 'hidden',
        minHeight: 0,
        transform: open ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Inline mini-map for table hover rows ─────────────────────────────────────

function SensorMiniMap({ sensor, color }) {
  if (!sensor?.lat) return null;
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer key={sensor.id} center={[sensor.lat, sensor.lon]} zoom={13}
        style={{ width: '100%', height: '100%' }} zoomControl={false} dragging={false}
        scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <CircleMarker center={[sensor.lat, sensor.lon]} radius={9}
          pathOptions={{ fillColor: color, fillOpacity: 0.9, color: '#111', weight: 1.5 }} />
      </MapContainer>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ArchivePage({ lang, setPage, setSelectedSensor, reports = [] }) {
  const L = lang === 'it';

  // Same city-wide AQI snapshot the home page hero uses to drive its title's font blend
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));

  // Each chart has its own independent filter
  const radar = useChartFilter(FIRST_DATE,  LATEST_DATE, 'range');
  const line  = useChartFilter(LATEST_DATE, LATEST_DATE, 'single');
  const bar   = useChartFilter(FIRST_DATE,  LATEST_DATE, 'range');
  const heat  = useChartFilter(FIRST_DATE,  LATEST_DATE, 'range');
  const tbl   = useChartFilter(LATEST_DATE, LATEST_DATE, 'single');

  // Line chart extras
  const [lineSensor, setLineSensor]       = useState(null);
  const [linePollutants, setLinePollutants] = useState(new Set(['pm25', 'pm10', 'no2', 'co']));

  // Bar chart pollutants
  const [barPolls, setBarPolls] = useState(new Set(['pm25', 'pm10', 'no2', 'co']));

  // Which charts are shown — table is always visible and not part of this set.
  // At least one chart must stay visible, so toggling off the last one is a no-op.
  const [visibleCharts, setVisibleCharts] = useState(new Set(CHART_DEFS.map(c => c.key)));
  const toggleChart = key => setVisibleCharts(prev => {
    if (prev.has(key) && prev.size === 1) return prev;
    const s = new Set(prev);
    s.has(key) ? s.delete(key) : s.add(key);
    return s;
  });

  // Sticky toggle bar — measure its own height so the table's sticky header
  // (and any sticky content below) can offset past it instead of overlapping.
  const toggleBarRef = useRef(null);
  const [toggleBarH, setToggleBarH] = useState(0);
  useEffect(() => {
    const el = toggleBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setToggleBarH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Narrower internal chart coordinate system on small screens keeps SVG text legible —
  // charts scale via viewBox, so a 900-wide canvas shrunk to a 340px phone screen
  // would render labels at a fraction of their set font-size.
  const isNarrow = useIsNarrow();

  // Table pagination + hover
  const [tableMode, setTableMode]     = useState('numeric'); // 'numeric' | 'qualitative'
  const [currentPage, setCurrentPage] = useState(1);
  const [filterKey, setFilterKey]     = useState(0);
  const [hoveredRow, setHoveredRow]   = useState(null);
  const leaveTimer = useRef(null);

  useEffect(() => { setFilterKey(k => k + 1); setCurrentPage(1); }, [tbl.from, tbl.to, tbl.sensors, tbl.districts, tableMode]);

  // Qualitative (citizen reports) view of the same Table filters — period/sensor/district
  // are shared with the numeric table via `tbl`, just applied to report fields instead.
  const reportsFiltered = useMemo(() => {
    if (!tbl.from || !tbl.to) return [];
    const f = new Date(tbl.from);
    const t = new Date(tbl.to + 'T23:59:59');
    return reports.filter(r => {
      if (r.dateObj < f || r.dateObj > t) return false;
      if (!tbl.sensors.has('all') && !tbl.sensors.has(String(r.sensorId))) return false;
      if (!tbl.districts.has('all') && !tbl.districts.has(r.district)) return false;
      return true;
    }).sort((a, b) => a.dateObj - b.dateObj);
  }, [reports, tbl.from, tbl.to, tbl.sensors, tbl.districts]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const radarSensors = useMemo(() => {
    const ids = [...new Set(radar.filtered.map(r => r.sensorId))];
    return ids.map(id => {
      const rows = radar.filtered.filter(r => r.sensorId === id);
      const sensor = SENSORS.find(s => s.id === id);
      const pollutantLevels = {};
      for (const key of Object.keys(POLLUTANTS)) {
        const peak = Math.max(...rows.map(r => r[key] ?? 0));
        pollutantLevels[key] = getPollLevel(key, peak);
      }
      const overallAqi = Math.max(...Object.values(pollutantLevels));
      return { id, name: sensor?.name?.replace('Taranto - ', '') || String(id), pollutantLevels, overallAqi };
    });
  }, [radar.filtered]);

  const lineSensorIds = [...new Set(line.filtered.map(r => r.sensorId))];
  const effectiveLineSensor = lineSensorIds.includes(lineSensor) ? lineSensor : (lineSensorIds[0] ?? null);
  const lineSensorRows = line.filtered.filter(r => r.sensorId === effectiveLineSensor);
  const lineSensorMeta = SENSORS.find(s => s.id === effectiveLineSensor);

  const activeFiltered = tableMode === 'numeric' ? tbl.filtered : reportsFiltered;
  const pagedData  = activeFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(activeFiltered.length / PAGE_SIZE);

  const exportCSV = () => {
    let cols, rows, suffix;
    if (tableMode === 'numeric') {
      cols = ['data', 'ora', 'sensore', 'posizione', 'distretto', 'pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3', 'c6h6', 'temp', 'hum', 'aqi'];
      rows = [cols.join(',')];
      for (const r of tbl.filtered) {
        rows.push([r.dateStr, r.hourStr, r.sensorName, `"${r.location}"`, r.district,
          r.pm25, r.pm10, r.no2, r.o3, r.so2, r.co, r.nh3, r.c6h6, r.temp, r.hum, r.aqi + 1].join(','));
      }
      suffix = '';
    } else {
      cols = ['data', 'ora', 'nome', 'sensore', 'distretto', 'sintomi', 'note'];
      rows = [cols.join(',')];
      for (const r of reportsFiltered) {
        rows.push([r.dateStr, r.hourStr, `"${r.name}"`, `"${r.sensorName || ''}"`, r.district,
          `"${r.symptoms.join(';')}"`, `"${(r.note || '').replace(/"/g, '""')}"`].join(','));
      }
      suffix = '-segnalazioni';
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aria-bene-comune${suffix}-${tbl.from}-${tbl.to}.csv`;
    a.click();
  };

  const CARD = { background: 'var(--white)', padding: '12px 14px' };
  const SECTION = { display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--gray)' };
  const PANEL = { ...CARD, width: '100%', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', padding: '16px clamp(16px, 4vw, 24px)', borderBottom: '1px solid var(--gray)' };
  const CHART_AREA = {
    ...CARD, flex: 1, minWidth: 0, padding: '20px clamp(16px, 4vw, 24px)',
    background: 'url(/assets/cielo.png) center / cover no-repeat',
  };

  // Smaller internal coordinate system on narrow viewports — these charts scale via
  // viewBox, so keeping width=900 on a 340px phone would shrink label text to a sliver.
  const chartW = isNarrow ? 480 : 900;
  const radarH = isNarrow ? 340 : 420;
  const plotH  = isNarrow ? 230 : 300;

  return (
    <div style={{ '--archive-sticky-offset': `${48 + toggleBarH}px` }}>

      {/* TITLE — same treatment as the home page hero: Ronzino Variable's blend axis
          tied to current AQI, white fill + primary stroke outline */}
      <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) 16px', borderBottom: '1px solid var(--gray)' }}>
        <span style={{
          fontFamily: "'Ronzino Variable', sans-serif",
          fontVariationSettings: `"BLND" ${Math.max(50, globalAQI * 200)}`,
          fontSize: 'clamp(48px, 6vw, 96px)', textTransform: 'uppercase',
          lineHeight: 0.92, letterSpacing: '-0.02em',
          color: 'var(--white)', WebkitTextStroke: '6px var(--primary)', paintOrder: 'stroke fill',
        }}>
          {L ? 'Archivio Dati' : 'Data Archive'}
        </span>
      </div>

      {/* ── CHART VISIBILITY TOGGLE ───────────────────────────────────────────── */}
      <div ref={toggleBarRef} style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '14px clamp(16px, 4vw, 24px)', borderBottom: '1px solid var(--gray)',
        background: 'var(--white)', position: 'sticky', top: 48, zIndex: 1100,
      }}>
        <span style={SUBLABEL}>
          {L ? 'Grafici visibili' : 'Visible charts'}
          <span style={{ marginLeft: 6, color: 'var(--primary)' }}>{visibleCharts.size}/{CHART_DEFS.length}</span>
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {CHART_DEFS.map(c => {
            const isOnlyOne = visibleCharts.size === 1 && visibleCharts.has(c.key);
            return (
              <span key={c.key} style={{ ...pillStyle(visibleCharts.has(c.key)), ...(isOnlyOne ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                onClick={() => toggleChart(c.key)}
                title={isOnlyOne ? (L ? 'Deve restare visibile almeno un grafico' : 'At least one chart must stay visible') : undefined}>
                {L ? c.it : c.en}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── RADAR ─────────────────────────────────────────────────────────────── */}
      <Collapsible open={visibleCharts.has('radar')}>
        <div style={SECTION}>
          <div style={PANEL}>
            <div style={{ ...SUBLABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>Radar</div>
            <PeriodPicker L={L} mode={radar.mode} setMode={radar.setMode}
              from={radar.from} setFrom={radar.setFrom} to={radar.to} setTo={radar.setTo} />
            <SensorPills L={L} sensors={radar.sensors} setSensors={radar.setSensors} />
            <DistrictPills L={L} districts={radar.districts} setDistricts={radar.setDistricts} />
          </div>
          <div style={CHART_AREA}>
            <div style={CHART_LABEL}>{L ? 'Radar inquinanti — picco nel periodo' : 'Pollutant radar — peak over period'}</div>
            <RadarChart key={`${radar.from}-${radar.to}-${setKey(radar.sensors)}-${setKey(radar.districts)}`}
              sensors={radarSensors} pollutants={Object.keys(POLLUTANTS)} lang={lang} width={chartW} height={radarH} />
          </div>
        </div>
      </Collapsible>

      {/* ── LINE CHART ────────────────────────────────────────────────────────── */}
      <Collapsible open={visibleCharts.has('line')}>
        <div style={SECTION}>
          <div style={PANEL}>
            <div style={{ ...SUBLABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>{L ? 'Andamento' : 'Trend'}</div>
            <PeriodPicker L={L} mode={line.mode} setMode={line.setMode}
              from={line.from} setFrom={line.setFrom} to={line.to} setTo={line.setTo} />
            <div>
              <div style={SUBLABEL}>{L ? 'Sensore' : 'Sensor'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {lineSensorIds.map(id => {
                  const s = SENSORS.find(s => s.id === id);
                  return (
                    <span key={id} style={pillStyle(effectiveLineSensor === id)}
                      onClick={() => setLineSensor(id)}>
                      {s?.name?.replace('Taranto - ', '') || id}
                    </span>
                  );
                })}
              </div>
            </div>
            <PollutantPills L={L} polls={linePollutants} setPolls={setLinePollutants} />
          </div>
          <div style={CHART_AREA}>
            <div style={CHART_LABEL}>
              {lineSensorMeta?.name?.replace('Taranto - ', '') || '—'}
              <span style={{ fontWeight: 400, marginLeft: 8, color: '#BDBAB4' }}>
                {line.from}{line.from !== line.to ? ` → ${line.to}` : ''}
              </span>
            </div>
            <MultiLineChart key={`${effectiveLineSensor}-${line.from}-${line.to}-${setKey(linePollutants)}`}
              data={lineSensorRows} pollutants={[...linePollutants]}
              mode="pollutant" width={chartW} height={plotH} />
          </div>
        </div>
      </Collapsible>

      {/* ── HOURLY BAR ────────────────────────────────────────────────────────── */}
      <Collapsible open={visibleCharts.has('bar')}>
        <div style={SECTION}>
          <div style={PANEL}>
            <div style={{ ...SUBLABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>{L ? 'Media oraria' : 'Hourly avg'}</div>
            <PeriodPicker L={L} mode={bar.mode} setMode={bar.setMode}
              from={bar.from} setFrom={bar.setFrom} to={bar.to} setTo={bar.setTo} />
            <SensorPills L={L} sensors={bar.sensors} setSensors={bar.setSensors} />
            <PollutantPills L={L} polls={barPolls} setPolls={setBarPolls} />
          </div>
          <div style={CHART_AREA}>
            <div style={CHART_LABEL}>
              {L ? 'Media per ora del giorno — ' : 'Mean by hour of day — '}
              {bar.from}{bar.from !== bar.to ? ` → ${bar.to}` : ''}
            </div>
            <HourlyBarChart data={bar.filtered} pollutants={[...barPolls]} lang={lang} width={chartW} height={plotH} />
          </div>
        </div>
      </Collapsible>

      {/* ── DAILY HEATMAP ─────────────────────────────────────────────────────── */}
      <Collapsible open={visibleCharts.has('heatmap')}>
        <div style={SECTION}>
          <div style={PANEL}>
            <div style={{ ...SUBLABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>Heatmap</div>
            <PeriodPicker L={L} mode={heat.mode} setMode={heat.setMode}
              from={heat.from} setFrom={heat.setFrom} to={heat.to} setTo={heat.setTo} />
            <SensorPills L={L} sensors={heat.sensors} setSensors={heat.setSensors} />
          </div>
          <div style={CHART_AREA}>
            <div style={CHART_LABEL}>
              {L ? 'AQI massimo giornaliero — ' : 'Daily max AQI — '}
              {heat.from}{heat.from !== heat.to ? ` → ${heat.to}` : ''}
            </div>
            <DailyHeatmap key={`${heat.from}-${heat.to}-${setKey(heat.sensors)}`}
              data={heat.filtered} lang={lang} width={chartW} height={plotH} />
          </div>
        </div>
      </Collapsible>

      {/* ── TABLE ─────────────────────────────────────────────────────────────── */}
      <div style={SECTION}>
        <div style={PANEL}>
          <div style={{ ...SUBLABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>{L ? 'Tabella' : 'Table'}</div>
          <div>
            <div style={SUBLABEL}>{L ? 'Tipo di dati' : 'Data type'}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['numeric', 'qualitative'].map(m => (
                <span key={m} style={{ ...pillStyle(tableMode === m), textAlign: 'center' }} onClick={() => setTableMode(m)}>
                  {m === 'numeric' ? (L ? 'Numerici' : 'Numerical') : (L ? 'Qualitativi' : 'Qualitative')}
                </span>
              ))}
            </div>
          </div>
          <PeriodPicker L={L} mode={tbl.mode} setMode={tbl.setMode}
            from={tbl.from} setFrom={tbl.setFrom} to={tbl.to} setTo={tbl.setTo} />
          <SensorPills L={L} sensors={tbl.sensors} setSensors={tbl.setSensors} />
          <DistrictPills L={L} districts={tbl.districts} setDistricts={tbl.setDistricts} />
          <button onClick={exportCSV}
            style={{ padding: '6px 16px', background: 'var(--primary)', color: '#fff', border: 'none', fontFamily: 'Epilogue', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            ↓ CSV
          </button>
        </div>
        <div style={{ background: 'var(--white)', flex: 1, minWidth: 0, padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="archive-table">
              {tableMode === 'numeric' ? (
                <thead>
                  <tr>
                    <th style={{ minWidth: 40 }}>#</th>
                    <th style={{ minWidth: 70 }}>{L ? 'Sensore' : 'Sensor'}</th>
                    <th style={{ minWidth: 90 }}>{L ? 'Quartiere' : 'District'}</th>
                    <th style={{ minWidth: 80 }}>{L ? 'Data' : 'Date'}</th>
                    <th style={{ minWidth: 50 }}>{L ? 'Ora' : 'Hour'}</th>
                    <th style={{ minWidth: 70 }}>AQI</th>
                    <th style={{ minWidth: 60 }}>PM2.5<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>μg/m³</span></th>
                    <th style={{ minWidth: 60 }}>PM10<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>μg/m³</span></th>
                    <th style={{ minWidth: 60 }}>NO₂<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>μg/m³</span></th>
                    <th style={{ minWidth: 60 }}>CO<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>mg/m³</span></th>
                    <th style={{ minWidth: 50 }}>Temp<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>°C</span></th>
                    <th style={{ minWidth: 50 }}>Hum<br /><span style={{ fontWeight: 400, fontSize: 9, color: '#9B9790' }}>%</span></th>
                  </tr>
                </thead>
              ) : (
                <thead>
                  <tr>
                    <th style={{ minWidth: 40 }}>#</th>
                    <th style={{ minWidth: 110 }}>{L ? 'Nome' : 'Name'}</th>
                    <th style={{ minWidth: 70 }}>{L ? 'Sensore' : 'Sensor'}</th>
                    <th style={{ minWidth: 90 }}>{L ? 'Quartiere' : 'District'}</th>
                    <th style={{ minWidth: 80 }}>{L ? 'Data' : 'Date'}</th>
                    <th style={{ minWidth: 50 }}>{L ? 'Ora' : 'Hour'}</th>
                    <th style={{ minWidth: 220 }}>{L ? 'Sintomi' : 'Symptoms'}</th>
                    <th style={{ minWidth: 220 }}>{L ? 'Nota' : 'Note'}</th>
                  </tr>
                </thead>
              )}
              {tableMode === 'numeric' ? (
                <tbody>
                  {pagedData.map((r, i) => {
                    const lv = LEVELS[r.aqi];
                    const isDark = r.aqi <= 1;
                    const rowKey = `${r.sensorId}-${r.dateStr}-${r.hourStr}`;
                    const isHovered = hoveredRow === rowKey;
                    const onEnter = () => { clearTimeout(leaveTimer.current); setHoveredRow(rowKey); };
                    const onLeave = () => { leaveTimer.current = setTimeout(() => setHoveredRow(null), 60); };
                    return (
                      <Fragment key={`${filterKey}-${r.sensorId}-${r.dateObj}`}>
                        <tr className="archive-row-animate"
                          style={{ animationDelay: `${i * 18}ms`, background: isHovered ? 'var(--gray)' : '' }}
                          onMouseEnter={onEnter} onMouseLeave={onLeave}
                          onClick={() => { setSelectedSensor(SENSORS.find(s => s.id === r.sensorId)); setPage('record'); }}>
                          <td style={{ color: '#9B9790', fontSize: 11 }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                          <td><span style={{ fontFamily: 'Epilogue', fontWeight: 700 }}>{r.sensorName}</span></td>
                          <td>{r.district}</td>
                          <td>{r.dateStr}</td>
                          <td style={{ fontFamily: 'Epilogue', fontWeight: 600 }}>{r.hourStr}</td>
                          <td><span className={`aqi-pill${isDark ? ' dark' : ''}`} style={{ background: lv.color }}>{L ? lv.it : lv.en}</span></td>
                          <td style={{ color: LEVELS[getPollLevel('pm25', r.pm25)].color, fontFamily: 'Epilogue', fontWeight: 700 }}>{r.pm25}</td>
                          <td style={{ color: LEVELS[getPollLevel('pm10', r.pm10)].color, fontFamily: 'Epilogue', fontWeight: 700 }}>{r.pm10}</td>
                          <td style={{ color: LEVELS[getPollLevel('no2',  r.no2)].color,  fontFamily: 'Epilogue', fontWeight: 700 }}>{r.no2}</td>
                          <td style={{ color: LEVELS[getPollLevel('co',   r.co)].color,   fontFamily: 'Epilogue', fontWeight: 700 }}>{r.co}</td>
                          <td style={{ fontFamily: 'Epilogue' }}>{r.temp}°</td>
                          <td style={{ fontFamily: 'Epilogue' }}>{r.hum}%</td>
                        </tr>
                        {isHovered && (
                          <tr onMouseEnter={onEnter} onMouseLeave={onLeave}>
                            <td colSpan={12} style={{ padding: '8px 16px 10px 24px', background: 'var(--gray)', borderBottom: '1px solid var(--gray2)' }}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ width: 280, flexShrink: 0 }}>
                                  <MultiLineChart
                                    data={HOURLY_DATA.filter(d => d.sensorId === r.sensorId && d.dateStr === r.dateStr)}
                                    pollutants={[...linePollutants]}
                                    mode="pollutant" width={280} height={90} compact />
                                </div>
                                <div style={{ width: 120, height: 90, flexShrink: 0 }}>
                                  <SensorMiniMap sensor={SENSORS.find(s => s.id === r.sensorId)} color={LEVELS[r.aqi].color} />
                                </div>
                                <div style={{ fontFamily: 'Epilogue', fontSize: 10, color: 'var(--gray2)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.6 }}>
                                  <div style={{ fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>{r.sensorName}</div>
                                  <div>{r.dateStr}</div>
                                  <div>{r.hourStr}</div>
                                  <div style={{ marginTop: 6 }}>
                                    <span className={`aqi-pill${r.aqi <= 1 ? ' dark' : ''}`} style={{ background: lv.color }}>{L ? lv.it : lv.en}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              ) : (
                <tbody>
                  {pagedData.map((r, i) => (
                    <tr key={`${filterKey}-${r.id}`} className="archive-row-animate"
                      style={{ animationDelay: `${i * 18}ms` }}
                      onClick={() => { setSelectedSensor(SENSORS.find(s => s.id === r.sensorId)); setPage('record'); }}>
                      <td style={{ color: '#9B9790', fontSize: 11 }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td><span style={{ fontFamily: 'Epilogue', fontWeight: 700 }}>{r.name}</span></td>
                      <td>{r.sensorName ? r.sensorName.replace('Taranto - ', '') : '—'}</td>
                      <td>{r.district}</td>
                      <td>{r.dateStr}</td>
                      <td style={{ fontFamily: 'Epilogue', fontWeight: 600 }}>{r.hourStr}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {r.symptoms.map(k => {
                            const opt = SYMPTOM_OPTIONS.find(o => o.key === k);
                            return opt ? <span key={k} style={pillStyle(false)}>{L ? opt.it : opt.en}</span> : null;
                          })}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 12 }}>{r.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: '1px solid var(--gray)' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#9B9790' }}>
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, activeFiltered.length)} {L ? 'di' : 'of'} {activeFiltered.length.toLocaleString()} {tableMode === 'numeric' ? (L ? 'letture' : 'readings') : (L ? 'segnalazioni' : 'reports')}
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    style={{ padding: '6px 12px', border: '1.5px solid var(--gray2)', borderRight: p < Math.min(totalPages, 7) ? 'none' : '1.5px solid var(--gray2)', background: p === currentPage ? 'var(--primary)' : 'transparent', color: p === currentPage ? '#fff' : '#111', fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {p}
                  </button>
                );
              })}
              {totalPages > 7 && <span style={{ padding: '6px 10px', fontFamily: 'Epilogue', fontSize: 11, color: '#9B9790' }}>…{totalPages}</span>}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
