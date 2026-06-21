import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { WIND_DAILY } from '../data/loader';
import { getSensorAQI, getPollLevel } from '../utils/aqi';
import { SUGGESTIONS } from '../data/symptoms';
import SymptomsPage from './SymptomsPage';

const TARANTO_CENTER = [40.4760, 17.2270];

// Same sensor photos used on the Home page sensor cards
const SENSOR_PHOTOS = [
  '/assets/DSC01743.jpg',
  '/assets/Piazza-Fontana-1.jpg',
  '/assets/DSC01848.jpg',
];

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

const SEL_STYLE = {
  width: '100%',
  border: '1.5px solid rgba(0,0,0,0.22)',
  background: 'transparent',
  color: 'var(--black)',
  fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400,
  letterSpacing: '0.05em', padding: '5px 8px', cursor: 'pointer',
};

function pillStyleWhite(active) {
  return {
    padding: '5px 14px',
    border: '1.5px solid ' + (active ? 'var(--primary)' : 'rgba(0,0,0,0.22)'),
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--black)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
  };
}

// Sensor list sits over the cielo.png sky background next to the map — pills
// need an opaque white face (unlike pillStyleWhite's transparent default) so
// they stay legible over the photo.
function pillStyleOnSky(active) {
  return {
    padding: '7px 14px',
    border: '1.5px solid ' + (active ? 'var(--primary)' : 'rgba(0,0,0,0.18)'),
    background: active ? 'var(--primary)' : 'var(--white)',
    color: active ? '#fff' : 'var(--black)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
    textAlign: 'left',
  };
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useIsNarrow(breakpoint = 768) {
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


function BlobOverlay({ wind, activePollutant, sensors }) {
  const map = useMap();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!wind || !sensors.length) return;

    const render = () => {
      if (svgRef.current) { svgRef.current.remove(); svgRef.current = null; }

      const mag = Math.hypot(wind.u, wind.v) || 1;
      const angleDeg = Math.atan2(-wind.v, wind.u) * 180 / Math.PI;
      const angleRad = angleDeg * Math.PI / 180;
      const windStretch = 1 + (mag - 1) * 0.15;

      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', '1');
      svg.setAttribute('height', '1');
      svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible';

      const defs = document.createElementNS(ns, 'defs');

      const sensorData = sensors.map(s => {
        const lvIdx = activePollutant
          ? getPollLevel(activePollutant, s[activePollutant] || 0)
          : getSensorAQI(s);
        let pt;
        try { pt = map.latLngToLayerPoint([s.lat, s.lon]); } catch { return null; }
        return { s, lvIdx, pt };
      }).filter(Boolean);

      const maxLvl = sensorData.reduce((m, d) => Math.max(m, d.lvIdx), 0);

      for (let blobLvl = 0; blobLvl <= maxLvl; blobLvl++) {
        const blobColor = LEVELS[blobLvl].color;
        const blurStd = 18 + (maxLvl - blobLvl) * 7;
        const opac = Math.max(0.08, 0.55 - (maxLvl - blobLvl) * 0.08);

        const filtId = `grp-bf-${blobLvl}`;
        const filt = document.createElementNS(ns, 'filter');
        filt.setAttribute('id', filtId);
        filt.setAttribute('x', '-150%'); filt.setAttribute('y', '-150%');
        filt.setAttribute('width', '400%'); filt.setAttribute('height', '400%');
        const blurEl = document.createElementNS(ns, 'feGaussianBlur');
        blurEl.setAttribute('stdDeviation', blurStd);
        filt.appendChild(blurEl);
        defs.appendChild(filt);

        const grp = document.createElementNS(ns, 'g');
        grp.setAttribute('filter', `url(#${filtId})`);
        grp.setAttribute('opacity', opac.toFixed(2));

        sensorData.forEach(({ lvIdx, pt }) => {
          if (lvIdx < blobLvl) return;
          const layerOuter = lvIdx - blobLvl;
          const rx = (50 + lvIdx * 22 + layerOuter * 32) * windStretch;
          const ry = 36 + lvIdx * 16 + layerOuter * 22;
          const offsetDist = rx * 0.3;
          // arrow screen vector is (cos(angleRad), -sin(angleRad)) — match offset and axis to it
          const ecx = pt.x + Math.cos(angleRad) * offsetDist;
          const ecy = pt.y - Math.sin(angleRad) * offsetDist;

          const ellipse = document.createElementNS(ns, 'ellipse');
          ellipse.setAttribute('cx', ecx); ellipse.setAttribute('cy', ecy);
          ellipse.setAttribute('rx', rx); ellipse.setAttribute('ry', ry);
          ellipse.setAttribute('transform', `rotate(${-angleDeg}, ${ecx}, ${ecy})`);
          ellipse.setAttribute('fill', blobColor);
          grp.appendChild(ellipse);
        });

        svg.appendChild(grp);
      }

      svg.insertBefore(defs, svg.firstChild);
      map.getPanes().overlayPane.appendChild(svg);
      svgRef.current = svg;
    };

    render();
    map.on('zoomend viewreset', render);
    return () => {
      map.off('zoomend viewreset', render);
      if (svgRef.current) { svgRef.current.remove(); svgRef.current = null; }
    };
  }, [map, wind, activePollutant, sensors]);

  return null;
}

// Pulsing ring under sensors at poor-or-worse severity (level ≥ 4) — a constant,
// data-driven "this one's bad" cue that doesn't depend on hover/selection.
function SeverityPulseOverlay({ sensors, activePollutant }) {
  const map = useMap();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!sensors.length) return;

    const render = () => {
      if (svgRef.current) { svgRef.current.remove(); svgRef.current = null; }

      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', '1');
      svg.setAttribute('height', '1');
      svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible';

      sensors.forEach((s, i) => {
        const lvIdx = activePollutant
          ? getPollLevel(activePollutant, s[activePollutant] || 0)
          : getSensorAQI(s);
        if (lvIdx < 4) return;
        let pt;
        try { pt = map.latLngToLayerPoint([s.lat, s.lon]); } catch { return; }

        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', pt.x);
        circle.setAttribute('cy', pt.y);
        circle.setAttribute('r', 10);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', LEVELS[lvIdx].color);
        circle.setAttribute('stroke-width', 2.5);
        circle.style.cssText = `animation: map-pulse-ring 2.2s ease-out ${(i % 4) * 0.4}s infinite;`;
        svg.appendChild(circle);
      });

      map.getPanes().overlayPane.appendChild(svg);
      svgRef.current = svg;
    };

    render();
    map.on('zoomend viewreset', render);
    return () => {
      map.off('zoomend viewreset', render);
      if (svgRef.current) { svgRef.current.remove(); svgRef.current = null; }
    };
  }, [map, sensors, activePollutant]);

  return null;
}

function WindParticleOverlay({ wind, sensors, activePollutant }) {
  const map = useMap();

  useEffect(() => {
    if (!wind || !sensors.length) return;

    const sensorData = sensors.map(s => {
      const lvl = activePollutant
        ? getPollLevel(activePollutant, s[activePollutant] || 0)
        : getSensorAQI(s);
      const c = LEVELS[lvl].color;
      return {
        lat: s.lat, lon: s.lon, lvl,
        rgb: [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)],
      };
    });

    const windAngle = Math.atan2(-wind.v, wind.u);
    const baseSpeed = 0.07 + wind.spd * 0.055;
    const LIFETIME = Math.round(320 - wind.spd * 6);

    const particles = sensorData.flatMap((s, si) => {
      const N = 4 + s.lvl * 7; // level 0 → 4 dots, level 5 → 39 dots
      const pt = map.latLngToLayerPoint([s.lat, s.lon]);
      return Array.from({ length: N }, (_, k) => ({
        x: pt.x + (Math.random() - 0.5) * 12,
        y: pt.y + (Math.random() - 0.5) * 12,
        age: (k / N) * LIFETIME,
        maxAge: LIFETIME * (0.8 + Math.random() * 0.4),
        speedMult: 0.6 + Math.random() * 0.8,
        size: 1.2 + Math.random() * 1.8,
        si,
      }));
    });

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;pointer-events:none;';
    map.getPanes().overlayPane.appendChild(canvas);

    let tlX = 0, tlY = 0;
    const resize = () => {
      const size = map.getSize();
      const tl = map.containerPointToLayerPoint([0, 0]);
      tlX = tl.x; tlY = tl.y;
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.left = tlX + 'px';
      canvas.style.top  = tlY + 'px';
    };
    resize();

    const ctx = canvas.getContext('2d');
    let rafId;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.age++;
        if (p.age >= p.maxAge) {
          const s = sensorData[p.si];
          const pt = map.latLngToLayerPoint([s.lat, s.lon]);
          p.x = pt.x + (Math.random() - 0.5) * 12;
          p.y = pt.y + (Math.random() - 0.5) * 12;
          p.age = 0;
          p.maxAge = LIFETIME * (0.8 + Math.random() * 0.4);
          p.speedMult = 0.6 + Math.random() * 0.8;
        }

        const jitter = 0.3 + wind.spd * 0.08;
        p.x += Math.cos(windAngle) * baseSpeed * p.speedMult + (Math.random() - 0.5) * jitter;
        p.y -= Math.sin(windAngle) * baseSpeed * p.speedMult + (Math.random() - 0.5) * jitter;

        const t = p.age / p.maxAge;
        let alpha = t < 0.08 ? t / 0.08 : t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
        alpha *= 0.15 + sensorData[p.si].lvl * 0.14;

        const cx = p.x - tlX;
        const cy = p.y - tlY;
        if (cx < -20 || cy < -20 || cx > canvas.width + 20 || cy > canvas.height + 20) continue;

        const [r, g, b] = sensorData[p.si].rgb;
        ctx.beginPath();
        ctx.arc(cx, cy, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(animate);
    };

    animate();
    map.on('moveend zoomend viewreset', resize);
    return () => {
      cancelAnimationFrame(rafId);
      map.off('moveend zoomend viewreset', resize);
      canvas.remove();
    };
  }, [map, wind, sensors, activePollutant]);

  return null;
}

function FlyTo({ sensor }) {
  const map = useMap();
  useEffect(() => {
    if (sensor) map.flyTo([sensor.lat, sensor.lon], 15, { duration: 0.8 });
  }, [sensor, map]);
  return null;
}

export default function MapPage({ lang, setPage, setSelectedSensor, reportsControl }) {
  const [selectedSensorId, setSelectedSensorId] = useState('all');
  const [activePollutant, setActivePollutant] = useState(null);
  const L_lang = lang === 'it';
  const isNarrow = useIsNarrow();

  // Same city-wide AQI snapshot the home page hero uses to drive its title's font blend
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));

  // ── time controls ──────────────────────────────────────────────────────────
  const availableDates = useMemo(() =>
    [...new Set(HOURLY_DATA.map(r => toISO(r.dateObj)))].sort()
  , []);

  const latestDate = availableDates[availableDates.length - 1] ?? '';
  const firstDate  = availableDates[0] ?? '';
  const [selectedDate,    setSelectedDate]    = useState(latestDate);
  const [timeMode,        setTimeMode]        = useState('single'); // 'single' | 'range'
  const [selectedHour,    setSelectedHour]    = useState(0);
  const [rangeDateStart,  setRangeDateStart]  = useState(firstDate);
  const [rangeDateEnd,    setRangeDateEnd]    = useState(latestDate);
  const [playhead,        setPlayhead]        = useState(0); // index into rangeDates
  const [isPlaying,       setIsPlaying]       = useState(false);

  // Days included in the range
  const rangeDates = useMemo(() =>
    availableDates.filter(d => d >= rangeDateStart && d <= rangeDateEnd)
  , [availableDates, rangeDateStart, rangeDateEnd]);

  // Active date and hour for sensor/wind lookup
  const displayDate = timeMode === 'range' ? (rangeDates[playhead] ?? rangeDateStart) : selectedDate;
  const displayHour = selectedHour;

  const getWind = (date) => {
    if (WIND_DAILY[date]) return WIND_DAILY[date];
    const windDates = Object.keys(WIND_DAILY).sort();
    if (!windDates.length) return null;
    const dayNum = new Date(date + 'T12:00:00').getDate();
    return WIND_DAILY[windDates[dayNum % windDates.length]];
  };
  const wind = useMemo(() => getWind(displayDate), [displayDate]);

  // Unwrapped wind-arrow rotation — accumulates by the shortest signed delta
  // each time wind changes, so the CSS transition never spins the long way
  // round when direction crosses the 0°/360° seam between two dates.
  const [windArrowDeg, setWindArrowDeg] = useState(0);
  useEffect(() => {
    if (!wind) return;
    const mathAngle = Math.atan2(-wind.v, wind.u) * 180 / Math.PI;
    const target = 90 - mathAngle;
    setWindArrowDeg(prev => {
      const delta = (((target - prev) % 360) + 540) % 360 - 180;
      return prev + delta;
    });
  }, [wind]);

  // Sensors with readings at displayDate + displayHour
  const displaySensors = useMemo(() => {
    const rows = HOURLY_DATA.filter(r =>
      toISO(r.dateObj) === displayDate && r.hour === displayHour
    );
    return SENSORS.map(s => {
      const row = rows.find(r => r.sensorId === s.id);
      if (!row) return s;
      return { ...s, pm25: row.pm25, pm10: row.pm10, no2: row.no2, o3: row.o3,
                     so2: row.so2, co: row.co, nh3: row.nh3, c6h6: row.c6h6 };
    });
  }, [displayDate, displayHour]);

  // Clamp playhead when range changes
  useEffect(() => {
    setPlayhead(h => Math.min(Math.max(h, 0), Math.max(0, rangeDates.length - 1)));
  }, [rangeDates]);

  // Playback animation — advance one day per tick
  useEffect(() => {
    if (!isPlaying || timeMode !== 'range') return;
    const id = setInterval(() => {
      setPlayhead(h => {
        if (h >= rangeDates.length - 1) { setIsPlaying(false); return 0; }
        return h + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [isPlaying, timeMode, rangeDates.length]);

  // ── selected-sensor detail panel (rendered outside the map, to its right) ──
  const selectedSensor = selectedSensorId !== 'all' ? SENSORS.find(s => s.id === selectedSensorId) : null;
  const detailSensor = selectedSensorId !== 'all' ? displaySensors.find(s => s.id === selectedSensorId) : null;
  const detailSensorIdx = detailSensor ? displaySensors.findIndex(s => s.id === selectedSensorId) : 0;
  const detailLv = detailSensor ? LEVELS[getSensorAQI(detailSensor)] : null;

  const getDotLevel = (s) => activePollutant
    ? getPollLevel(activePollutant, s[activePollutant] || 0)
    : getSensorAQI(s);

  // ── shared health recommendation (same data source as the embedded Symptoms section) ──
  const rowsForHealthCalc = useMemo(() => {
    const hourRows = HOURLY_DATA.filter(r => toISO(r.dateObj) === displayDate && r.hour === displayHour);
    const scopedRows = selectedSensorId === 'all'
      ? hourRows
      : hourRows.filter(r => r.sensorId === selectedSensorId);
    return scopedRows.length ? scopedRows : hourRows;
  }, [displayDate, displayHour, selectedSensorId]);

  const getCategoryLevel = (catKey) => {
    const keys = Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === catKey);
    if (!keys.length) return 0;
    return Math.max(...keys.map(pollutantKey => {
      const peak = Math.max(...rowsForHealthCalc.map(row => row[pollutantKey] || 0));
      return getPollLevel(pollutantKey, peak);
    }));
  };

  const categoryLevels = {
    particulates: getCategoryLevel('particulates'),
    gaseous:      getCategoryLevel('gaseous'),
    systemic:     getCategoryLevel('systemic'),
  };

  const overallLevelIndex = Math.max(...Object.values(categoryLevels));
  const lvSuggestion = LEVELS[overallLevelIndex];

  const fmtHour = h => `${String(h).padStart(2, '0')}:00`;

  // Filters-on-top-of-content, sky-backed map area below — same SECTION/PANEL/
  // AREA rules as ArchivePage's chart sections.
  const BOX = { background: 'var(--white)', padding: '12px 14px' };
  const SECTION = { display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--gray)' };
  const PANEL = { ...BOX, width: '100%', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', padding: '16px clamp(16px, 4vw, 24px)', borderBottom: '1px solid var(--gray)' };
  const MAP_AREA = { ...BOX, padding: '24px clamp(16px, 4vw, 24px)', background: 'url(/assets/cielo.png) center / cover no-repeat' };

  const sharedTimeControl = {
    timeMode, setTimeMode,
    selectedDate, setSelectedDate,
    selectedHour, setSelectedHour,
    rangeDateStart, setRangeDateStart,
    rangeDateEnd, setRangeDateEnd,
    playhead, setPlayhead,
    isPlaying, setIsPlaying,
  };
  const sharedSensorControl = { selectedSensorId, setSelectedSensorId };

  // Health-rec block — third slot of the filters panel above the map.
  const healthRecBlock = (
    <div style={{ background: lvSuggestion.color, padding: '12px 14px', flex: '1 1 260px', minWidth: 240, transition: 'background 0.5s ease' }}>
      <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
        {L_lang ? "QUALITÀ DELL'ARIA" : 'AIR QUALITY'}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 8 }}>
        {L_lang ? lvSuggestion.it : lvSuggestion.en}
      </div>
      {[
        { who: L_lang ? 'Popolazione generale' : 'General population', text: L_lang ? SUGGESTIONS[lvSuggestion.key]?.gen?.it : SUGGESTIONS[lvSuggestion.key]?.gen?.en },
        { who: L_lang ? 'Popolazione sensibile' : 'Sensitive population', text: L_lang ? SUGGESTIONS[lvSuggestion.key]?.sen?.it : SUGGESTIONS[lvSuggestion.key]?.sen?.en },
      ].map((s, i) => (
        <div key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
          <div style={{ ...SUB_LABEL, fontSize: 9, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.who}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
        </div>
      ))}
    </div>
  );

  // Sensor-selector block — third slot of the filters panel above the
  // Symptoms section, in place of the health-rec block used above the map.
  const sensorFilterBlock = (
    <div style={{ flex: '1 1 260px', minWidth: 240 }}>
      <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>
        {L_lang ? 'Sensore' : 'Sensor'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span style={pillStyleWhite(selectedSensorId === 'all')} onClick={() => setSelectedSensorId('all')}>
          {L_lang ? 'Tutti' : 'All'}
        </span>
        {SENSORS.map(s => (
          <span key={s.id} style={pillStyleWhite(selectedSensorId === s.id)}
            onClick={() => setSelectedSensorId(prev => prev === s.id ? 'all' : s.id)}>
            {s.location}
          </span>
        ))}
      </div>
    </div>
  );

  // Filters panel — shared by both render sites (above the map, above the
  // Symptoms section); only the third slot differs between them.
  const mapFiltersPanel = (thirdBlock) => (
    <div className="map-fade-in" style={{ ...PANEL, animationDelay: '90ms' }}>
      <div style={{ ...SUB_LABEL, color: 'var(--black)', marginBottom: 0, width: '100%' }}>{L_lang ? 'Mappa' : 'Map'}</div>

      <div style={{ flex: '1 1 260px', minWidth: 240 }}>
        <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>
          {L_lang ? 'Tempo' : 'Time'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {['single', 'range'].map(m => (
            <span key={m}
              style={{ ...pillStyleWhite(timeMode === m), flex: 1, textAlign: 'center', display: 'block' }}
              onClick={() => { setTimeMode(m); setIsPlaying(false); }}>
              {m === 'single' ? (L_lang ? 'Giorno' : 'Day') : (L_lang ? 'Intervallo' : 'Range')}
            </span>
          ))}
        </div>
        {timeMode === 'single' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={SEL_STYLE}>
              {availableDates.map(d => (
                <option key={d} value={d}>
                  {new Date(d + 'T12:00:00').toLocaleDateString(L_lang ? 'it-IT' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...SUB_LABEL, color: 'var(--gray2)' }}>{L_lang ? 'Ora' : 'Hour'}</div>
              <div style={{ ...SUB_LABEL, color: 'var(--black)' }}>{fmtHour(selectedHour)}</div>
            </div>
            <input type="range" min={0} max={23} value={selectedHour}
              onChange={e => setSelectedHour(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', margin: 0 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 4 }}>{L_lang ? 'Da' : 'From'}</div>
                <select value={rangeDateStart} onChange={e => setRangeDateStart(e.target.value)} style={SEL_STYLE}>
                  {availableDates.filter(d => d <= rangeDateEnd).map(d => (
                    <option key={d} value={d}>
                      {new Date(d + 'T12:00:00').toLocaleDateString(L_lang ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 4 }}>{L_lang ? 'A' : 'To'}</div>
                <select value={rangeDateEnd} onChange={e => setRangeDateEnd(e.target.value)} style={SEL_STYLE}>
                  {availableDates.filter(d => d >= rangeDateStart).map(d => (
                    <option key={d} value={d}>
                      {new Date(d + 'T12:00:00').toLocaleDateString(L_lang ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...SUB_LABEL, color: 'var(--gray2)' }}>{L_lang ? 'Ora fissa' : 'Fixed hour'}</div>
              <div style={{ ...SUB_LABEL, color: 'var(--black)' }}>{fmtHour(selectedHour)}</div>
            </div>
            <input type="range" min={0} max={23} value={selectedHour}
              onChange={e => setSelectedHour(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', margin: 0 }} />

            <div style={{ ...SUB_LABEL, color: 'var(--gray2)' }}>{L_lang ? 'Timeline' : 'Timeline'}</div>
            <input type="range" min={0} max={Math.max(0, rangeDates.length - 1)} value={playhead}
              onChange={e => { setIsPlaying(false); setPlayhead(Number(e.target.value)); }}
              style={{ width: '100%', accentColor: 'var(--primary)', margin: 0, cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(0,0,0,0.45)', fontFamily: 'Epilogue', fontSize: 9 }}>{rangeDateStart}</span>
              <span style={{ color: 'rgba(0,0,0,0.45)', fontFamily: 'Epilogue', fontSize: 9 }}>{rangeDateEnd}</span>
            </div>
            <div style={{
              background: 'var(--primary)', color: '#fff', fontFamily: 'Epilogue',
              fontSize: 11, fontWeight: 700, padding: '4px 10px', letterSpacing: '0.05em',
              textAlign: 'center',
            }}>
              {displayDate}
            </div>

            <button onClick={() => setIsPlaying(p => !p)} style={{ ...pillStyleWhite(isPlaying), width: '100%', textAlign: 'center' }}>
              {isPlaying ? (L_lang ? '⏸ Pausa' : '⏸ Pause') : (L_lang ? '▶ Anima' : '▶ Play')}
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 260px', minWidth: 240 }}>
        <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>
          {L_lang ? 'Inquinante' : 'Pollutant'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <span style={pillStyleWhite(activePollutant === null)} onClick={() => setActivePollutant(null)}>AQI</span>
          {Object.keys(POLLUTANTS).map(k => (
            <span key={k} style={pillStyleWhite(activePollutant === k)}
              onClick={() => setActivePollutant(prev => prev === k ? null : k)}>
              {POLLUTANTS[k].name}
            </span>
          ))}
        </div>
      </div>

      {thirdBlock}
    </div>
  );

  return (
    <div>
      <div className="map-fade-in" style={{ padding: '24px 24px 0 24px' }}>
        <div style={{
          fontFamily: "'Ronzino Variable', sans-serif",
          fontVariationSettings: `"BLND" ${Math.max(50, globalAQI * 200)}`,
          fontSize: 'clamp(40px, 5.5vw, 88px)', textTransform: 'uppercase',
          lineHeight: 0.92, letterSpacing: '-0.02em',
          color: 'var(--white)', WebkitTextStroke: '6px var(--primary)', paintOrder: 'stroke fill',
        }}>
          {L_lang ? 'Aria e Salute' : 'Air & Health'}
        </div>
      </div>

      {/* MAP FILTERS — full-width panel on top, same pattern as Archive's chart filters */}
      <div style={SECTION}>
        {mapFiltersPanel(healthRecBlock)}

        {/* MAP AREA — sky backdrop; sensor list pinned to the left edge, detail panel to the
            right edge, map fills the (now much bigger) space between them */}
        <div className="map-fade-in" style={{ ...MAP_AREA, animationDelay: '160ms' }}>
          <div style={{
            display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: 20,
            width: '100%', height: isNarrow ? 'auto' : '76vh',
          }}>

            {/* Sensor list — sits over the sky photo, pills kept opaque white for legibility */}
            <div style={{
              width: isNarrow ? '100%' : 170, flexShrink: 0, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ ...SUB_LABEL, color: 'var(--black)', marginBottom: 2 }}>
                {L_lang ? 'Sensore' : 'Sensor'}
              </div>
              <div style={{ display: 'flex', flexDirection: isNarrow ? 'row' : 'column', flexWrap: isNarrow ? 'wrap' : 'nowrap', gap: 6 }}>
                <span style={pillStyleOnSky(selectedSensorId === 'all')} onClick={() => setSelectedSensorId('all')}>
                  {L_lang ? 'Tutti' : 'All'}
                </span>
                {SENSORS.map(s => (
                  <span key={s.id} style={pillStyleOnSky(selectedSensorId === s.id)}
                    onClick={() => setSelectedSensorId(prev => prev === s.id ? 'all' : s.id)}>
                    {s.location}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', height: isNarrow ? '50vh' : '100%' }}>
          <MapContainer
            center={TARANTO_CENTER}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <ZoomControl position="bottomright" />
            <FlyTo sensor={selectedSensor} />
            <BlobOverlay wind={wind} activePollutant={activePollutant} sensors={displaySensors} />
            <WindParticleOverlay wind={wind} activePollutant={activePollutant} sensors={displaySensors} />
            <SeverityPulseOverlay activePollutant={activePollutant} sensors={displaySensors} />
            {displaySensors.map((s) => {
              const dotLv = getDotLevel(s);
              const dotColor = LEVELS[dotLv].color;
              const isSel = selectedSensorId === s.id;
              return (
                <CircleMarker
                  key={s.id}
                  center={[s.lat, s.lon]}
                  radius={isSel ? 14 : 9}
                  pathOptions={{
                    fillColor: dotColor,
                    fillOpacity: 0.85,
                    color: '#111010',
                    weight: isSel ? 2.5 : 1.5,
                    className: `map-sensor-marker${isSel ? ' selected' : ''}`,
                  }}
                  eventHandlers={{ click: () => setSelectedSensorId(prev => prev === s.id ? 'all' : s.id) }}
                />
              );
            })}
          </MapContainer>

          {/* Wind — floating top-right, map chrome like the zoom control */}
          {wind && (() => {
            const pts = ['N','NE','E','SE','S','SW','W','NW'];
            const compassPt = pts[Math.round(((wind.dir + 180) % 360) / 45) % 8];
            return (
              <div className="map-fade-in" style={{
                position: 'absolute', top: 12, right: 12, zIndex: 1000,
                background: 'var(--white)', padding: '10px 14px', animationDelay: '220ms',
                display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
              }}>
                <svg width="32" height="32" viewBox="-16 -16 32 32" style={{ flexShrink: 0 }}>
                  <circle r="14" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                  <g style={{ transform: `rotate(${windArrowDeg}deg)`, transformOrigin: '0px 0px', transition: 'transform 0.6s ease' }}>
                    <line x1="0" y1="10" x2="0" y2="-8" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    <polygon points="0,-13 -4,-5 4,-5" fill="var(--primary)" />
                  </g>
                </svg>
                <div>
                  <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 4 }}>
                    {L_lang ? 'Vento' : 'Wind'}
                  </div>
                  <div style={{ fontFamily: 'Epilogue', fontSize: 18, fontWeight: 700, color: 'var(--black)', lineHeight: 1 }}>
                    {wind.spd.toFixed(1)} <span style={{ fontSize: 10, fontWeight: 400 }}>m/s</span>
                  </div>
                  <div style={{ fontFamily: 'Epilogue', fontSize: 11, color: 'var(--gray2)', marginTop: 2 }}>
                    {compassPt} · {Math.round(wind.dir)}°
                  </div>
                </div>
              </div>
            );
          })()}
            </div>

            {/* Detail panel — sensor info appears OUTSIDE the map, to its right, instead of a Leaflet popup */}
            <div style={{ width: isNarrow ? '100%' : 260, flexShrink: 0, overflowY: 'auto' }}>
              {detailSensor ? (
                <div className="map-fade-in" style={{ background: 'var(--white)' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ ...SUB_LABEL, color: 'var(--black)' }}>{L_lang ? 'Sensore selezionato' : 'Selected sensor'}</span>
                    <span onClick={() => setSelectedSensorId('all')}
                      style={{ cursor: 'pointer', fontFamily: 'Epilogue', fontSize: 16, color: 'var(--gray2)', lineHeight: 1 }}>×</span>
                  </div>

                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: L_lang ? 'Sensore' : 'Sensor',     value: detailSensor.name },
                        { label: L_lang ? 'Posizione' : 'Location', value: detailSensor.location },
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
                            {detailSensor[k] != null ? Number(detailSensor[k]).toFixed(1) : '—'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 5 }}>
                        {L_lang ? 'Scala AQI' : 'AQI Scale'}
                      </div>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                        {LEVELS.map(l => (
                          <div key={l.key} style={{
                            flex: 1, height: 6, background: l.color,
                            outline: l.key === detailLv.key ? `2px solid ${l.color}` : 'none',
                            outlineOffset: 1,
                            opacity: l.key === detailLv.key ? 1 : 0.4,
                          }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)' }}>
                        <span>1 — {L_lang ? 'Buono' : 'Good'}</span>
                        <span>6 — {L_lang ? 'Estremo' : 'Extreme'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sensor photo, same images used on the Home page sensor cards */}
                  <div style={{ height: 140, overflow: 'hidden' }}>
                    <img
                      src={SENSOR_PHOTOS[detailSensorIdx % SENSOR_PHOTOS.length]}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>

                  <button
                    onClick={() => { setSelectedSensor(detailSensor); setPage('record'); }}
                    style={{
                      width: '100%', padding: '8px', background: 'var(--primary)', color: '#fff',
                      border: 'none', fontFamily: 'Epilogue', fontWeight: 700, fontSize: 10,
                      cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}
                  >
                    {L_lang ? 'Apri record →' : 'Open record →'}
                  </button>
                </div>
              ) : (
                <div style={{ background: 'var(--white)', padding: '16px', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--gray2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {L_lang ? 'Seleziona un sensore sulla mappa per vedere i dettagli.' : 'Select a sensor on the map to see its details.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="map-fade-in" style={{ padding: '24px 24px 0 24px' }}>
        <div style={{
          fontFamily: "'Ronzino Variable', sans-serif",
          fontVariationSettings: `"BLND" ${Math.max(50, globalAQI * 200)}`,
          fontSize: 'clamp(40px, 5.5vw, 88px)', textTransform: 'uppercase',
          lineHeight: 0.92, letterSpacing: '-0.02em',
          color: 'var(--white)', WebkitTextStroke: '6px var(--primary)', paintOrder: 'stroke fill',
        }}>
          {L_lang ? 'Sintomi' : 'Symptoms'}
        </div>
      </div>

      <div style={SECTION}>
        {mapFiltersPanel(sensorFilterBlock)}
      </div>

      {/* Symptom boxes + matrix + report form — full width, under the map */}
      <div className="map-fade-in" style={{ animationDelay: '260ms' }}>
        <SymptomsPage
          lang={lang}
          embedded
          timeControl={sharedTimeControl}
          sensorControl={sharedSensorControl}
          reportsControl={reportsControl}
        />
      </div>
    </div>
  );
}
