import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { WIND_DAILY } from '../data/loader';
import { getSensorAQI, getPollLevel } from '../utils/aqi';

const TARANTO_CENTER = [40.4760, 17.2270];

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

const SEL_STYLE = {
  width: '100%',
  border: '1.5px solid rgba(255,255,255,0.45)',
  background: 'transparent',
  color: '#fff',
  fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400,
  letterSpacing: '0.05em', padding: '5px 8px', cursor: 'pointer',
};

function pillStyleWhite(active) {
  return {
    padding: '5px 14px',
    border: '1.5px solid ' + (active ? '#fff' : 'rgba(255,255,255,0.4)'),
    background: active ? '#fff' : 'transparent',
    color: active ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
    display: 'block',
  };
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


function WindSpreadOverlay({ wind, activePollutant, sensors }) {
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

      // Pre-compute per-sensor data
      const sensorData = sensors.map(s => {
        const lvIdx = activePollutant
          ? getPollLevel(activePollutant, s[activePollutant] || 0)
          : getSensorAQI(s);
        let pt;
        try { pt = map.latLngToLayerPoint([s.lat, s.lon]); } catch { return null; }
        return { s, lvIdx, pt };
      }).filter(Boolean);

      const maxLvl = sensorData.reduce((m, d) => Math.max(m, d.lvIdx), 0);

      // Group all ellipses by blobLvl so same-level blobs share one blur filter
      // and composite/merge before blurring — this makes nearby sensors merge.
      for (let blobLvl = 0; blobLvl <= maxLvl; blobLvl++) {
        const blobColor = LEVELS[blobLvl].color;
        const blurStd = 16 + (maxLvl - blobLvl) * 6;
        const opac = Math.max(0.08, 0.55 - (maxLvl - blobLvl) * 0.10);

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
          const rx = (30 + lvIdx * 16 + layerOuter * 22) * windStretch;
          const ry = 20 + lvIdx * 10 + layerOuter * 14;
          const offsetDist = rx * 0.3;
          const ecx = pt.x + Math.cos(angleRad) * offsetDist;
          const ecy = pt.y + Math.sin(angleRad) * offsetDist;

          const ellipse = document.createElementNS(ns, 'ellipse');
          ellipse.setAttribute('cx', ecx); ellipse.setAttribute('cy', ecy);
          ellipse.setAttribute('rx', rx); ellipse.setAttribute('ry', ry);
          ellipse.setAttribute('transform', `rotate(${angleDeg}, ${ecx}, ${ecy})`);
          ellipse.setAttribute('fill', blobColor);
          grp.appendChild(ellipse);
        });

        svg.appendChild(grp);
      }

      // Dust dots — rendered per-sensor on top, no blur
      sensorData.forEach(({ s, lvIdx, pt }) => {
        const innerRx = 42 * windStretch;
        const innerRy = 28;
        const innerOffsetDist = innerRx * 0.3;
        const icx = pt.x + Math.cos(angleRad) * innerOffsetDist;
        const icy = pt.y + Math.sin(angleRad) * innerOffsetDist;
        const innerColor = LEVELS[lvIdx].color;
        const seed = s.id * 137;
        const numDots = 7 + lvIdx * 3;
        for (let i = 0; i < numDots; i++) {
          const t = ((seed * (i + 1) * 0.618) % 1) * Math.PI * 2;
          const r2 = 0.18 + ((seed * (i + 1) * 0.314) % 1) * 0.82;
          const localX = Math.cos(t) * r2 * innerRx * 1.3;
          const localY = Math.sin(t) * r2 * innerRy * 1.3;
          const dotX = icx + localX * Math.cos(angleRad) - localY * Math.sin(angleRad);
          const dotY = icy + localX * Math.sin(angleRad) + localY * Math.cos(angleRad);
          const dot = document.createElementNS(ns, 'circle');
          dot.setAttribute('cx', dotX.toFixed(1)); dot.setAttribute('cy', dotY.toFixed(1));
          dot.setAttribute('r', (1.5 + r2 * Math.max(1, lvIdx) * 0.5).toFixed(1));
          dot.setAttribute('fill', innerColor);
          dot.setAttribute('opacity', (0.28 + r2 * 0.42).toFixed(2));
          svg.appendChild(dot);
        }
      });

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

function FlyTo({ sensor }) {
  const map = useMap();
  useEffect(() => {
    if (sensor) map.flyTo([sensor.lat, sensor.lon], 15, { duration: 0.8 });
  }, [sensor, map]);
  return null;
}

export default function MapPage({ lang, setPage, setSelectedSensor }) {
  const [selected, setSelected] = useState(null);
  const [activePollutant, setActivePollutant] = useState(null);
  const markerRefs = useRef({});
  const L_lang = lang === 'it';

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

  // ── popup management ───────────────────────────────────────────────────────
  const selectedSensor = selected != null ? SENSORS.find(s => s.id === selected) : null;

  const getDotLevel = (s) => activePollutant
    ? getPollLevel(activePollutant, s[activePollutant] || 0)
    : getSensorAQI(s);

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([id, marker]) => {
      if (!marker) return;
      if (selected != null && String(id) === String(selected)) marker.openPopup();
      else marker.closePopup();
    });
  }, [selected]);

  const fmtHour = h => `${String(h).padStart(2, '0')}:00`;

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, padding: '24px 24px 0 24px' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {L_lang ? 'Mappa Sensori' : 'Sensor Map'}
        </span>
      </div>
      <div style={{ height: 'calc(100vh - 160px)', display: 'flex' }}>

        {/* LEFT PANEL */}
        <div style={{ width: 'calc(100vw / 6 * 1.5)', flexShrink: 0, background: 'var(--primary)', padding: '14px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Date / time section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {['single', 'range'].map(m => (
                <span key={m} style={{ ...pillStyleWhite(timeMode === m), display: 'inline-block', flex: 1, textAlign: 'center' }}
                  onClick={() => { setTimeMode(m); setIsPlaying(false); }}>
                  {m === 'single' ? (L_lang ? 'Giorno' : 'Day') : (L_lang ? 'Intervallo' : 'Range')}
                </span>
              ))}
            </div>

            {timeMode === 'single' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={SEL_STYLE}>
                  {availableDates.map(d => (
                    <option key={d} value={d} style={{ background: '#B7410E' }}>
                      {new Date(d + 'T12:00:00').toLocaleDateString(L_lang ? 'it-IT' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </option>
                  ))}
                </select>
                <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
                  {fmtHour(selectedHour)}
                </div>
                <input type="range" min={0} max={23} value={selectedHour}
                  onChange={e => setSelectedHour(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#fff' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Epilogue', fontSize: 9 }}>00:00</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Epilogue', fontSize: 9 }}>23:00</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{L_lang ? 'Da' : 'From'}</div>
                    <select value={rangeDateStart} onChange={e => setRangeDateStart(e.target.value)} style={SEL_STYLE}>
                      {availableDates.filter(d => d <= rangeDateEnd).map(d => (
                        <option key={d} value={d} style={{ background: '#B7410E' }}>
                          {new Date(d + 'T12:00:00').toLocaleDateString(L_lang ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{L_lang ? 'A' : 'To'}</div>
                    <select value={rangeDateEnd} onChange={e => setRangeDateEnd(e.target.value)} style={SEL_STYLE}>
                      {availableDates.filter(d => d >= rangeDateStart).map(d => (
                        <option key={d} value={d} style={{ background: '#B7410E' }}>
                          {new Date(d + 'T12:00:00').toLocaleDateString(L_lang ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
                  {L_lang ? 'Ora fissa' : 'Fixed hour'} — {fmtHour(selectedHour)}
                </div>
                <input type="range" min={0} max={23} value={selectedHour}
                  onChange={e => setSelectedHour(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#fff' }} />
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginBottom: 20 }} />

          {/* Pollutant selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
              {L_lang ? 'Inquinante' : 'Pollutant'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={pillStyleWhite(activePollutant === null)} onClick={() => setActivePollutant(null)}>AQI</span>
              {Object.keys(POLLUTANTS).map(k => (
                <span key={k} style={pillStyleWhite(activePollutant === k)}
                  onClick={() => setActivePollutant(prev => prev === k ? null : k)}>
                  {POLLUTANTS[k].name}
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginBottom: 20 }} />

          {/* Sensor selector */}
          <div>
            <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
              {L_lang ? 'Sensori' : 'Sensors'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SENSORS.map(s => (
                <span key={s.id} style={pillStyleWhite(selected === s.id)}
                  onClick={() => setSelected(prev => prev === s.id ? null : s.id)}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* MAP */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
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
              <WindSpreadOverlay wind={wind} activePollutant={activePollutant} sensors={displaySensors} />
              {displaySensors.map((s) => {
                const dotLv = getDotLevel(s);
                const dotColor = LEVELS[dotLv].color;
                const popupLv = LEVELS[getSensorAQI(s)];
                const isSel = selected === s.id;
                return (
                  <CircleMarker
                    key={s.id}
                    ref={(el) => { if (el) markerRefs.current[s.id] = el; }}
                    center={[s.lat, s.lon]}
                    radius={isSel ? 14 : 9}
                    pathOptions={{
                      fillColor: dotColor,
                      fillOpacity: 0.85,
                      color: '#111010',
                      weight: isSel ? 2.5 : 1.5,
                    }}
                    eventHandlers={{ click: () => setSelected(prev => prev === s.id ? null : s.id) }}
                  >
                    <Popup
                      closeButton={false}
                      className="map-popup"
                      eventHandlers={{ remove: () => setSelected((prev) => (prev === s.id ? null : prev)) }}
                    >
                      <div style={{ minWidth: 210 }}>
                        <div style={{ background: popupLv.color, padding: '12px 14px' }}>
                          <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
                            {L_lang ? popupLv.it : popupLv.en}
                          </div>
                          <div style={{ fontFamily: 'Epilogue', fontSize: 22, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1, marginBottom: 4 }}>
                            {s.name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                            {displayDate} — {fmtHour(displayHour)}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                          {Object.keys(POLLUTANTS).map((k, idx) => {
                            const li = getPollLevel(k, s[k] || 0);
                            const isOdd = idx % 2 === 0;
                            const isBottomRow = idx >= Object.keys(POLLUTANTS).length - 2;
                            return (
                              <div key={k} style={{
                                padding: '8px 10px',
                                borderRight: isOdd ? '1px solid var(--gray)' : 'none',
                                borderBottom: isBottomRow ? 'none' : '1px solid var(--gray)',
                              }}>
                                <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray2)' }}>
                                  {POLLUTANTS[k].name}
                                </div>
                                <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 800, color: LEVELS[li].color, lineHeight: 1.2 }}>
                                  {s[k] ?? '—'} <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--gray2)' }}>{POLLUTANTS[k].unit}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => { setSelectedSensor(s); setPage('record'); }}
                          style={{
                            width: '100%', padding: '8px', background: popupLv.color, color: '#fff',
                            border: 'none', fontFamily: 'Epilogue', fontWeight: 700, fontSize: 10,
                            cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
                          }}
                        >
                          {L_lang ? 'Apri record →' : 'Open record →'}
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* WIND BOX */}
          {wind && (() => {
            const mathAngle = Math.atan2(-wind.v, wind.u) * 180 / Math.PI;
            const arrowRot = 90 - mathAngle; // CSS rotation: 0° = up (north)
            const pts = ['N','NE','E','SE','S','SW','W','NW'];
            const toDir = (wind.dir + 180) % 360;
            const compassPt = pts[Math.round(toDir / 45) % 8];
            return (
              <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 1000,
                background: 'var(--primary)',
                padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                pointerEvents: 'none',
              }}>
                {/* Arrow */}
                <svg width="32" height="32" viewBox="-16 -16 32 32" style={{ flexShrink: 0 }}>
                  <circle r="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <g transform={`rotate(${arrowRot})`}>
                    <line x1="0" y1="10" x2="0" y2="-8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <polygon points="0,-13 -4,-5 4,-5" fill="white" />
                  </g>
                </svg>
                {/* Labels */}
                <div>
                  <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                    {L_lang ? 'Vento' : 'Wind'}
                  </div>
                  <div style={{ fontFamily: 'Epilogue', fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                    {wind.spd.toFixed(1)} <span style={{ fontSize: 10, fontWeight: 400 }}>m/s</span>
                  </div>
                  <div style={{ fontFamily: 'Epilogue', fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    {compassPt} · {Math.round(wind.dir)}°
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TIMELINE — only in range mode */}
          {timeMode === 'range' && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
              background: 'rgba(17,16,16,0.82)', backdropFilter: 'blur(4px)',
              padding: '10px 16px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Play/pause */}
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  style={{
                    background: 'none', border: '1.5px solid rgba(255,255,255,0.5)',
                    color: '#fff', width: 28, height: 28, cursor: 'pointer',
                    fontFamily: 'Epilogue', fontSize: 12, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                {/* From label */}
                <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Epilogue', fontSize: 10, flexShrink: 0 }}>
                  {rangeDateStart}
                </span>

                {/* Scrubber */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="range"
                    min={0} max={Math.max(0, rangeDates.length - 1)} value={playhead}
                    onChange={e => { setIsPlaying(false); setPlayhead(Number(e.target.value)); }}
                    style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  {/* Day ticks */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, pointerEvents: 'none' }}>
                    {rangeDates.map((d, i) => (
                      <div key={d} style={{
                        width: 1, height: i === playhead ? 8 : 4,
                        background: i === playhead ? '#fff' : 'rgba(255,255,255,0.3)',
                        flexShrink: 0,
                      }} />
                    ))}
                  </div>
                </div>

                {/* To label */}
                <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Epilogue', fontSize: 10, flexShrink: 0 }}>
                  {rangeDateEnd}
                </span>

                {/* Current day badge */}
                <div style={{
                  background: 'var(--primary)', color: '#fff',
                  fontFamily: 'Epilogue', fontSize: 11, fontWeight: 700,
                  padding: '3px 10px', flexShrink: 0, letterSpacing: '0.05em',
                  border: '1px solid rgba(255,255,255,0.4)',
                }}>
                  {displayDate}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
