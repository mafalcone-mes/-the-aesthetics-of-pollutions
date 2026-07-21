import { useState, useMemo, useRef, useEffect } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOM_OPTIONS } from '../data/symptoms';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel } from '../utils/aqi';
import MultiLineChart from '../components/charts/MultiLineChart';
import HourlyBarChart from '../components/charts/HourlyBarChart';
import DailyHeatmap from '../components/charts/DailyHeatmap';
import RadarChart from '../components/charts/RadarChart';
import ComposedTrendChart from '../components/charts/ComposedTrendChart';
import SensorCalendarHeatmap from '../components/charts/SensorCalendarHeatmap';

// Trial: one combined Recharts view (mean/peak/count) standing in for the four-chart grid
// below. Flip to false to go back to Radar/Trend/Hourly-avg/Heatmap — none of that code
// was removed, it's just not rendered while this is true.
const TRIAL_COMPOSED_CHART = true;

// Same sensor photos used on the Home/Map sensor cards
const SENSOR_PHOTOS = [
  '/assets/DSC01743.jpg',
  '/assets/Piazza-Fontana-1.jpg',
  '/assets/DSC01848.jpg',
];

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
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 16,
};

// Doesn't depend on any component state, so it's hoisted out — ChartTile (below)
// and the page body both reference the same object.
const CHART_AREA = {
  padding: '24px clamp(16px, 4vw, 24px)',
  background: 'var(--white)',
  borderRadius: 'var(--elevated-radius)',
  boxShadow: 'var(--elevated-shadow)',
  position: 'relative',
};

// One chart's tile: label, the chart itself, and the small expand/collapse
// button bottom-right. Reused for the 2-up grid, the large expanded view, and
// the filmstrip thumbnails — only sizing around it changes.
function ChartTile({ title, expanded, onToggle, L, children }) {
  return (
    <div style={CHART_AREA}>
      <div style={CHART_LABEL}>{title}</div>
      {children}
      <button type="button" onClick={onToggle}
        aria-label={expanded ? (L ? 'Riduci grafico' : 'Collapse chart') : (L ? 'Ingrandisci grafico' : 'Expand chart')}
        style={{
          position: 'absolute', bottom: 10, right: 10, zIndex: 5,
          width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--gray)', border: 'none', cursor: 'pointer',
          fontFamily: 'Epilogue', fontSize: 13, color: 'var(--black)',
        }}>
        {expanded ? '⤡' : '⤢'}
      </button>
    </div>
  );
}

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
          <button key={m} type="button" className="pill-btn" style={{ ...pillStyle(mode === m), flex: 1, textAlign: 'center' }} onClick={() => {
            setMode(m);
            if (m === 'single') { setFrom(LATEST_DATE); setTo(LATEST_DATE); }
            else { setFrom(FIRST_DATE); setTo(LATEST_DATE); }
          }}>
            {m === 'single' ? (L ? 'Giorno' : 'Day') : (L ? 'Intervallo' : 'Range')}
          </button>
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
        <button type="button" className="pill-btn" style={pillStyle(sensors.has('all'))} onClick={() => setSensors(new Set(['all']))}>{L ? 'Tutti' : 'All'}</button>
        {SENSORS.map(s => (
          <button key={s.id} type="button" className="pill-btn" style={pillStyle(sensors.has(String(s.id)))}
            onClick={() => toggleSet(sensors, setSensors, String(s.id), 'all')}>
            {s.location}
          </button>
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
        <button type="button" className="pill-btn" style={pillStyle(districts.has('all'))} onClick={() => setDistricts(new Set(['all']))}>{L ? 'Tutti' : 'All'}</button>
        {ALL_DISTRICTS.map(d => (
          <button key={d} type="button" className="pill-btn" style={pillStyle(districts.has(d))}
            onClick={() => setDistricts(districts.has(d) ? new Set(['all']) : new Set([d]))}>
            {d}
          </button>
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
          <button key={k} type="button" className="pill-btn" style={pillStyle(polls.has(k))} onClick={() => {
            const s = new Set(polls);
            s.has(k) ? (s.size > 1 && s.delete(k)) : s.add(k);
            setPolls(s);
          }}>
            {POLLUTANTS[k].name}
          </button>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ArchivePage({ lang, setPage, setSelectedSensor, reports = [] }) {
  const L = lang === 'it';

  // One filter set shared by Radar/Trend/Hourly avg/Heatmap — the table keeps
  // its own, independent set (tbl), since it's browsing raw rows rather than
  // comparing charts against each other.
  const shared = useChartFilter(FIRST_DATE,  LATEST_DATE, 'range');
  const tbl    = useChartFilter(LATEST_DATE, LATEST_DATE, 'single');
  const [sharedPolls, setSharedPolls] = useState(new Set(['pm25', 'pm10', 'no2', 'co']));

  // Which chart (if any) is shown large, with the rest reflowing into a
  // filmstrip row underneath it. All four charts are always rendered now —
  // there's no separate show/hide selection anymore.
  const [expandedChart, setExpandedChart] = useState(null);

  // Narrower internal chart coordinate system on small screens keeps SVG text legible —
  // charts scale via viewBox, so a 900-wide canvas shrunk to a 340px phone screen
  // would render labels at a fraction of their set font-size.
  const isNarrow = useIsNarrow();

  // Table pagination + hover
  const [tableMode, setTableMode]     = useState('numeric'); // 'numeric' | 'qualitative'
  const [currentPage, setCurrentPage] = useState(1);
  const [filterKey, setFilterKey]     = useState(0);
  // { key, r, lv, x, y } of the row currently showing the floating hover card, or null
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
    const ids = [...new Set(shared.filtered.map(r => r.sensorId))];
    return ids.map(id => {
      const rows = shared.filtered.filter(r => r.sensorId === id);
      const sensor = SENSORS.find(s => s.id === id);
      const pollutantLevels = {};
      for (const key of sharedPolls) {
        const peak = Math.max(...rows.map(r => r[key] ?? 0));
        pollutantLevels[key] = getPollLevel(key, peak);
      }
      const overallAqi = Math.max(...Object.values(pollutantLevels));
      return { id, name: sensor?.location || String(id), pollutantLevels, overallAqi };
    });
  }, [shared.filtered, sharedPolls]);

  // Trend now draws one line per selected sensor (its worst score among the
  // shared selected pollutants), instead of one sensor's separate pollutant
  // lines — a direct consequence of sharing sensor/pollutant filters with
  // every other chart instead of keeping its own single-sensor picker.
  const lineSensorSeries = useMemo(() => {
    const ids = [...new Set(shared.filtered.map(r => r.sensorId))];
    return ids.map(id => {
      const sensor = SENSORS.find(s => s.id === id);
      return { sensorId: id, sensorName: sensor?.location || String(id), rows: shared.filtered.filter(r => r.sensorId === id) };
    });
  }, [shared.filtered]);

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

  const CARD = { padding: '12px 14px' };
  // Same construction as MapPage's floating filters card (fixed content width,
  // flex-row-wrap, gap 24) — the .map-glass-panel class supplies the glass
  // background/radius/shadow; margin gives its shadow room to render.
  const PANEL = { ...CARD, width: isNarrow ? '100%' : 320, flexShrink: 0, display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', padding: '16px clamp(16px, 4vw, 24px)', margin: 16, boxSizing: 'border-box' };
  // Full-width variant of the same glass panel, for the one filter bar shared
  // by all four charts (as opposed to Table's own narrow side panel above).
  // Column stack instead of PANEL's row-wrap: with flex-wrap and auto-width
  // items of very different natural widths (Period ~250px vs Sensor's 7 pills
  // ~800px), the browser was leaving a large dead gap before District rather
  // than packing tightly — a grid row with content-sized columns below avoids
  // that ambiguity entirely.
  // width: 'auto' (not '100%') — PANEL's margin: 16 already insets it from its
  // parent on both sides; combining that margin with width: 100% would make the
  // box 100% of the parent PLUS 32px of margin, overflowing past the chart
  // cards below (which are inset via padding on their wrapper, not margin).
  // auto lets the browser fill the remaining width after the margins instead,
  // which lines its edges up with the chart cards exactly.
  const SHARED_PANEL = { ...PANEL, width: 'auto', flexShrink: 1, flexDirection: 'column', flexWrap: 'nowrap', gap: 20 };
  // Period / Sensor / District as three explicit content-sized grid columns —
  // grid tracks never stretch a column past its own content the way a flex
  // item can, so the gap between columns is always exactly `gap`. Each track
  // is `minmax(0, max-content)` rather than bare `auto`: bare `auto` has an
  // automatic minimum equal to its own content width, so on a viewport too
  // narrow for all three at full width the row overflows off-screen instead
  // of shrinking; the explicit 0 floor lets a column shrink below its
  // preferred width, which makes its own internal flex-wrap (Sensor/District's
  // pills) kick in and wrap onto more lines instead of forcing overflow.
  const FILTER_ROW = { display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(3, minmax(0, max-content))', columnGap: 32, rowGap: 16, alignItems: 'flex-start', maxWidth: '100%' };

  // Smaller internal coordinate system on narrow viewports — these charts scale via
  // viewBox, so keeping width=900 on a 340px phone would shrink label text to a sliver.
  const chartW = isNarrow ? 480 : 900;
  const radarH = isNarrow ? 340 : 420;
  const plotH  = isNarrow ? 230 : 300;
  const filmstripH = 130;

  const CHART_TITLES = {
    radar: L ? 'Radar inquinanti — picco nel periodo' : 'Pollutant radar — peak over period',
    line: L ? 'Andamento — punteggio peggiore per sensore' : 'Trend — worst score per sensor',
    bar: (L ? 'Media per ora del giorno — ' : 'Mean by hour of day — ') + shared.from + (shared.from !== shared.to ? ` → ${shared.to}` : ''),
    heatmap: (L ? 'AQI massimo giornaliero — ' : 'Daily max AQI — ') + shared.from + (shared.from !== shared.to ? ` → ${shared.to}` : ''),
  };

  function renderChartBody(key, w, h) {
    switch (key) {
      case 'radar':
        return <RadarChart key={`radar-${shared.from}-${shared.to}-${setKey(shared.sensors)}-${setKey(shared.districts)}-${setKey(sharedPolls)}`}
          sensors={radarSensors} pollutants={[...sharedPolls]} lang={lang} width={w} height={h} />;
      case 'line':
        return <MultiLineChart key={`line-${shared.from}-${shared.to}-${setKey(shared.sensors)}-${setKey(sharedPolls)}`}
          data={lineSensorSeries} pollutants={[...sharedPolls]} mode="sensor" lang={lang} width={w} height={h} />;
      case 'bar':
        return <HourlyBarChart data={shared.filtered} pollutants={[...sharedPolls]} lang={lang} width={w} height={h} />;
      case 'heatmap':
        return <DailyHeatmap key={`heat-${shared.from}-${shared.to}-${setKey(shared.sensors)}`}
          data={shared.filtered} lang={lang} width={w} height={h} />;
      default:
        return null;
    }
  }

  return (
    <div>

      {/* ── SHARED CHART FILTERS — one panel drives Radar/Trend/Hourly avg/Heatmap;
          the table keeps its own, further down. ────────────────────────────── */}
      <div style={{ paddingTop: 24, borderBottom: '1px solid var(--gray)', background: "url('/assets/cielo.png') center / cover no-repeat" }}>
        <div style={{ textAlign: 'center', padding: '24px 24px 40px' }}>
          <h1 style={{
            fontFamily: 'var(--font-title)', fontSize: 'clamp(56px, 9vw, 96px)', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', margin: 0,
            // -webkit-text-stroke draws its line centered on the glyph edge (half inside the
            // fill, half outside); layering text-shadow copies at a fixed offset in every
            // direction instead keeps the outline entirely outside the white fill. The soft
            // dark shadow is appended last (furthest back) so it sits behind the crisp
            // orange outline instead of muddying it, same drop-shadow used on the subtitle.
            textShadow: [-2, -1, 0, 1, 2].flatMap(x =>
              [-2, -1, 0, 1, 2].filter(y => x !== 0 || y !== 0).map(y => `${x}px ${y}px 0 var(--primary)`)
            ).concat('0 4px 16px rgba(0,0,0,0.35)').join(', '),
          }}>
            {L ? 'Archivio' : 'Archive'}
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.65, fontWeight: 400,
            letterSpacing: '0.01em', color: '#fff', maxWidth: 640, margin: '24px auto 0',
            textAlign: 'center', textWrap: 'pretty',
            // Solid white + a real shadow instead of opacity — opacity was fighting the very
            // contrast it needed against the paler parts of the photo.
            textShadow: '0 1px 3px rgba(0,0,0,0.45), 0 1px 12px rgba(0,0,0,0.2)',
          }}>
            {L
              ? 'La pagina archivio è pensata per la raccolta ed analisi dei dati con un profilo più tecnico. In questa pagina è possibile vedere uno storico di tutti i dati qualitativi e quantitativi raccolti da quando la piattaforma è attiva.'
              : 'The archive page is designed for data collection and analysis with a more technical profile. Here you can see a historical record of all qualitative and quantitative data collected since the platform went live.'}
          </p>
        </div>
        <div className="map-glass-panel" style={SHARED_PANEL}>
          <div style={{ ...SUBLABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>
            {L ? 'Filtri grafici' : 'Chart filters'}
          </div>
          <div style={FILTER_ROW}>
            <PeriodPicker L={L} mode={shared.mode} setMode={shared.setMode}
              from={shared.from} setFrom={shared.setFrom} to={shared.to} setTo={shared.setTo} />
            <SensorPills L={L} sensors={shared.sensors} setSensors={shared.setSensors} />
            <DistrictPills L={L} districts={shared.districts} setDistricts={shared.setDistricts} />
          </div>
          <PollutantPills L={L} polls={sharedPolls} setPolls={setSharedPolls} />
        </div>

        {/* ── CHARTS ───────────────────────────────────────────────────────────── */}
        {TRIAL_COMPOSED_CHART ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={CHART_AREA}>
              <div style={CHART_LABEL}>{L ? 'Andamento combinato — prova' : 'Combined trend — trial'}</div>
              <ComposedTrendChart data={shared.filtered} pollutants={[...sharedPolls]} lang={lang} height={isNarrow ? 260 : 380} />
            </div>
            <div style={CHART_AREA}>
              <div style={CHART_LABEL}>{L ? 'Calendario giornaliero — prova' : 'Daily calendar — trial'}</div>
              <SensorCalendarHeatmap data={shared.filtered} pollutants={[...sharedPolls]} lang={lang} />
            </div>
          </div>
        ) : expandedChart ? (
          <div style={{ padding: '0 16px 16px' }}>
            <ChartTile title={CHART_TITLES[expandedChart]} expanded L={L}
              onToggle={() => setExpandedChart(null)}>
              {renderChartBody(expandedChart, chartW, radarH)}
            </ChartTile>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
              {CHART_DEFS.filter(c => c.key !== expandedChart).map(c => (
                <div key={c.key} style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <ChartTile title={L ? c.it : c.en} L={L}
                    onToggle={() => setExpandedChart(c.key)}>
                    {renderChartBody(c.key, 480, filmstripH)}
                  </ChartTile>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)', gap: 16, padding: 16 }}>
            {CHART_DEFS.map(c => (
              <ChartTile key={c.key} title={L ? c.it : c.en} L={L}
                onToggle={() => setExpandedChart(c.key)}>
                {renderChartBody(c.key, 480, plotH)}
              </ChartTile>
            ))}
          </div>
        )}
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 24, borderBottom: '1px solid var(--gray)', background: 'var(--white)' }}>
        <div className="map-glass-panel" style={SHARED_PANEL}>
          <div style={{ ...SUBLABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>{L ? 'Tabella' : 'Table'}</div>
          <div>
            <div style={SUBLABEL}>{L ? 'Tipo di dati' : 'Data type'}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['numeric', 'qualitative'].map(m => (
                <button key={m} type="button" className="pill-btn" style={{ ...pillStyle(tableMode === m), textAlign: 'center' }} onClick={() => setTableMode(m)}>
                  {m === 'numeric' ? (L ? 'Numerici' : 'Numerical') : (L ? 'Qualitativi' : 'Qualitative')}
                </button>
              ))}
            </div>
          </div>
          <div style={FILTER_ROW}>
            <PeriodPicker L={L} mode={tbl.mode} setMode={tbl.setMode}
              from={tbl.from} setFrom={tbl.setFrom} to={tbl.to} setTo={tbl.setTo} />
            <SensorPills L={L} sensors={tbl.sensors} setSensors={tbl.setSensors} />
            <DistrictPills L={L} districts={tbl.districts} setDistricts={tbl.setDistricts} />
          </div>
          <button type="button" className="pill-btn" onClick={exportCSV}
            style={{ padding: '6px 16px', background: 'var(--primary)', color: '#fff', border: 'none', fontFamily: 'Epilogue', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            ↓ CSV
          </button>
        </div>
      </div>
      <div style={{ background: 'var(--white)' }}>
          {/* overflowX: 'auto' alone forces the browser to compute overflow-y as 'auto' too
              (a mixed overflow-x:auto/overflow-y:visible is not a valid computed combination) —
              that silently made this div, not the page, the sticky <th>'s scrolling ancestor,
              so `top: topbarH` pushed the header down from the div's own edge and hid row 1
              underneath it. Giving the div its own bounded height/overflowY and sticking the
              header at top:0 within it (a self-contained scrollable table) fixes that directly
              instead of fighting the page-topbar-offset trick. */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh' }}>
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
                    const isHovered = hoveredRow?.key === rowKey;
                    const onEnter = e => { clearTimeout(leaveTimer.current); setHoveredRow({ key: rowKey, r, lv, x: e.clientX, y: e.clientY }); };
                    const onMove  = e => { if (isHovered) setHoveredRow(h => h && { ...h, x: e.clientX, y: e.clientY }); };
                    const onLeave = () => { leaveTimer.current = setTimeout(() => setHoveredRow(null), 60); };
                    return (
                      <tr key={`${filterKey}-${r.sensorId}-${r.dateObj}`} className="archive-row-animate"
                        style={{ animationDelay: `${i * 18}ms`, background: isHovered ? 'var(--gray)' : '' }}
                        onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave}
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

      {/* Floating hover card — overlaps the table near the cursor instead of pushing rows down.
          Same look as the sensor card on Home/Map (header strip, label/value rows, pollutant
          grid, AQI scale bar) so a row preview reads as "the same sensor card" everywhere. */}
      {hoveredRow && (() => {
        const { r, lv, x, y } = hoveredRow;
        const cardW = 260;
        const left = Math.min(x + 16, window.innerWidth - cardW - 12);
        const top  = Math.min(y + 16, window.innerHeight - 452);
        const sensorIdx = SENSORS.findIndex(s => s.id === r.sensorId);
        return (
          <div style={{
            position: 'fixed', left, top, width: cardW, zIndex: 1300, pointerEvents: 'none',
            background: 'var(--white)', overflow: 'hidden',
            borderRadius: 'var(--elevated-radius)', boxShadow: 'var(--elevated-shadow)',
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--gray)' }}>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)' }}>
                {r.sensorName}
              </span>
            </div>

            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: L ? 'Data' : 'Date', value: r.dateStr },
                  { label: L ? 'Ora' : 'Hour', value: r.hourStr },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.01em', color: 'var(--black)' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
                {Object.keys(POLLUTANTS).map(k => (
                  <div key={k}>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>
                      {POLLUTANTS[k].name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 400, letterSpacing: '-0.01em', color: 'var(--black)' }}>
                      {r[k] != null ? Number(r[k]).toFixed(1) : '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 5 }}>
                  {L ? 'Scala AQI' : 'AQI Scale'}
                </div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                  {LEVELS.map(l => (
                    <div key={l.key} style={{
                      flex: 1, height: 6, background: l.color,
                      outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                      outlineOffset: 1,
                      opacity: l.key === lv.key ? 1 : 0.4,
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)' }}>
                  <span>1 — {L ? 'Buono' : 'Good'}</span>
                  <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
                </div>
              </div>
            </div>

            <div style={{ height: 140, overflow: 'hidden' }}>
              <img
                src={SENSOR_PHOTOS[sensorIdx % SENSOR_PHOTOS.length]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        );
      })()}

    </div>
  );
}
