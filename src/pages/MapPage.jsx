import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { WIND_DAILY } from '../data/taranto_wind';
import { getSensorAQI, getPollLevel } from '../utils/aqi';

const TARANTO_CENTER = [40.4760, 17.2270];

function getLatestWind() {
  const dates = Object.keys(WIND_DAILY).sort();
  return dates.length ? WIND_DAILY[dates[dates.length - 1]] : null;
}

function createWindIcon(u, v, spd, dir) {
  const scale = 44;
  const dx = +(u * scale).toFixed(1);
  const dy = +(-v * scale).toFixed(1); // screen y is inverted
  const angle = Math.atan2(dy, dx);
  const arrowLen = 13;
  const ah1x = +(dx + Math.cos(angle + 2.5) * arrowLen).toFixed(1);
  const ah1y = +(dy + Math.sin(angle + 2.5) * arrowLen).toFixed(1);
  const ah2x = +(dx + Math.cos(angle - 2.5) * arrowLen).toFixed(1);
  const ah2y = +(dy + Math.sin(angle - 2.5) * arrowLen).toFixed(1);

  const labelX = dx > 0 ? 7 : -(88 + 7);
  const labelY = +((dy - 20) / 2).toFixed(1);

  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" style="overflow:visible;pointer-events:none">
      <circle cx="0" cy="0" r="5" fill="#B7410E" opacity="0.9"/>
      <line x1="0" y1="0" x2="${dx}" y2="${dy}" stroke="#B7410E" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${dx}" y1="${dy}" x2="${ah1x}" y2="${ah1y}" stroke="#B7410E" stroke-width="2" stroke-linecap="round"/>
      <line x1="${dx}" y1="${dy}" x2="${ah2x}" y2="${ah2y}" stroke="#B7410E" stroke-width="2" stroke-linecap="round"/>
      <rect x="${labelX}" y="${labelY}" width="88" height="18" fill="white" rx="2" opacity="0.92"/>
      <text x="${labelX + 5}" y="${labelY + 13}" font-family="Epilogue,sans-serif" font-size="11" font-weight="700" fill="#B7410E">
        ${spd.toFixed(1)} m/s · ${Math.round(dir)}°
      </text>
    </svg>`;

  return L.divIcon({ html, iconSize: [0, 0], iconAnchor: [0, 0], className: '' });
}

function WindMarker() {
  const map = useMap();
  const wind = getLatestWind();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!wind) return;
    const icon = createWindIcon(wind.u, wind.v, wind.spd, wind.dir);
    const marker = L.marker(TARANTO_CENTER, { icon, interactive: false, zIndexOffset: 500 });
    marker.addTo(map);
    markerRef.current = marker;
    return () => { marker.remove(); };
  }, [map, wind]);

  return null;
}

function WindSpreadOverlay({ wind }) {
  const map = useMap();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!wind) return;

    const render = () => {
      if (svgRef.current) { svgRef.current.remove(); svgRef.current = null; }

      const container = map.getContainer();
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      const mag = Math.hypot(wind.u, wind.v) || 1;
      const angleDeg = Math.atan2(-wind.v, wind.u) * 180 / Math.PI;

      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:350';

      const defs = document.createElementNS(ns, 'defs');

      SENSORS.forEach(s => {
        const ai = getSensorAQI(s);
        const lv = LEVELS[ai];
        let pt;
        try { pt = map.latLngToContainerPoint([s.lat, s.lon]); } catch { return; }

        const rx = Math.max(55, 40 + mag * 28);
        const ry = 28;

        const grad = document.createElementNS(ns, 'radialGradient');
        grad.setAttribute('id', `wg-${s.id}`);
        grad.setAttribute('cx', '35%');
        grad.setAttribute('cy', '50%');
        grad.setAttribute('r', '75%');
        const st0 = document.createElementNS(ns, 'stop');
        st0.setAttribute('offset', '0%'); st0.setAttribute('stop-color', lv.color); st0.setAttribute('stop-opacity', '0.42');
        const st1 = document.createElementNS(ns, 'stop');
        st1.setAttribute('offset', '100%'); st1.setAttribute('stop-color', lv.color); st1.setAttribute('stop-opacity', '0');
        grad.appendChild(st0); grad.appendChild(st1);
        defs.appendChild(grad);

        const ellipse = document.createElementNS(ns, 'ellipse');
        ellipse.setAttribute('cx', pt.x); ellipse.setAttribute('cy', pt.y);
        ellipse.setAttribute('rx', rx); ellipse.setAttribute('ry', ry);
        ellipse.setAttribute('transform', `rotate(${angleDeg}, ${pt.x}, ${pt.y})`);
        ellipse.setAttribute('fill', `url(#wg-${s.id})`);
        svg.appendChild(ellipse);

        const seed = s.id * 137;
        const rad = angleDeg * Math.PI / 180;
        for (let i = 0; i < 6; i++) {
          const t = ((seed * (i + 1) * 0.618) % 1) * Math.PI * 2;
          const r2 = 0.25 + ((seed * (i + 1) * 0.314) % 1) * 0.7;
          const dxL = Math.cos(t) * r2 * rx * 0.85;
          const dyL = Math.sin(t) * r2 * ry * 0.85;
          const cx = pt.x + dxL * Math.cos(rad) - dyL * Math.sin(rad);
          const cy = pt.y + dxL * Math.sin(rad) + dyL * Math.cos(rad);
          const dot = document.createElementNS(ns, 'circle');
          dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
          dot.setAttribute('r', 2.5);
          dot.setAttribute('fill', lv.color);
          dot.setAttribute('opacity', 0.5);
          svg.appendChild(dot);
        }
      });

      svg.insertBefore(defs, svg.firstChild);
      container.appendChild(svg);
      svgRef.current = svg;
    };

    render();
    map.on('move zoom moveend zoomend viewreset', render);
    return () => {
      map.off('move zoom moveend zoomend viewreset', render);
      if (svgRef.current) { svgRef.current.remove(); svgRef.current = null; }
    };
  }, [map, wind]);

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
  const markerRefs = useRef({});
  const L_lang = lang === 'it';
  const wind = getLatestWind();

  const selectedSensor = selected != null ? SENSORS.find(s => s.id === selected) : null;

  const handleSelect = (s) => setSelected(prev => prev === s.id ? null : s.id);

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([id, marker]) => {
      if (!marker) return;
      if (selected != null && String(id) === String(selected)) marker.openPopup();
      else marker.closePopup();
    });
  }, [selected]);

  const windDirLabel = (dir) => {
    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return labels[Math.round(dir / 45) % 8];
  };

  return (
    <div className="map-page">
      {/* SIDEBAR */}
      <div className="map-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '24px 28px', borderBottom: '1px solid var(--gray)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="map-sidebar-title" style={{ fontWeight: 400, color: 'var(--black)' }}>
              {L_lang ? 'MAPPA SENSORI' : 'SENSOR MAP'}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--black)', margin: 0 }}>
            {L_lang
              ? 'Rete di sensori costruita attraverso laboratori partecipativi con cittadine e cittadini di Taranto. Accesso libero ai dati raccolti.'
              : 'Sensor network built through participatory workshops with Taranto citizens. Free and transparent access to collected data.'}
          </p>

          {/* Wind info strip */}
          {wind && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 12px',
              background: 'var(--primary)', color: 'var(--white)',
            }}>
              <svg width="28" height="28" viewBox="-14 -14 28 28" style={{ flexShrink: 0, overflow: 'visible' }}>
                {(() => {
                  const scale = 11;
                  const dx = +(wind.u * scale).toFixed(1);
                  const dy = +(-wind.v * scale).toFixed(1);
                  const angle = Math.atan2(dy, dx);
                  const ah1x = +(dx + Math.cos(angle + 2.5) * 5).toFixed(1);
                  const ah1y = +(dy + Math.sin(angle + 2.5) * 5).toFixed(1);
                  const ah2x = +(dx + Math.cos(angle - 2.5) * 5).toFixed(1);
                  const ah2y = +(dy + Math.sin(angle - 2.5) * 5).toFixed(1);
                  return (
                    <>
                      <circle cx="0" cy="0" r="3" fill="white" opacity="0.7" />
                      <line x1="0" y1="0" x2={dx} y2={dy} stroke="white" strokeWidth="2" strokeLinecap="round" />
                      <line x1={dx} y1={dy} x2={ah1x} y2={ah1y} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1={dx} y1={dy} x2={ah2x} y2={ah2y} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </>
                  );
                })()}
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>
                  {L_lang ? 'Vento' : 'Wind'}
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 13, fontWeight: 700 }}>
                  {wind.spd.toFixed(1)} m/s · {windDirLabel(wind.dir)} ({Math.round(wind.dir)}°)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sensor list */}
        <div className="map-sensor-list">
          {SENSORS.map((s) => {
            const ai = getSensorAQI(s);
            const lv = LEVELS[ai];
            const isSel = selected === s.id;
            return (
              <div key={s.id}>
                <div
                  className={`map-sensor-item${isSel ? ' selected' : ''}`}
                  onClick={() => handleSelect(s)}
                >
                  <div className="map-sensor-dot" style={{ background: lv.color, borderRadius: '50%' }} />
                  <div className="map-sensor-info">
                    <div className="map-sensor-title">{s.name} — {s.district}</div>
                    <div className="map-sensor-sub">{s.location}</div>
                  </div>
                  <div className="map-sensor-aqi" style={{ color: isSel ? '#fff' : lv.color }}>
                    {L_lang ? lv.it : lv.en}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ borderTop: '1px solid var(--gray)', padding: '12px 16px' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 8 }}>
            {L_lang ? 'Legenda' : 'Legend'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {LEVELS.map((l) => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 600 }}>{L_lang ? l.it : l.en}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAP */}
      <div className="map-area">
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
          <WindSpreadOverlay wind={wind} />
          <WindMarker />
          {SENSORS.map((s) => {
            const ai = getSensorAQI(s);
            const lv = LEVELS[ai];
            const isSel = selected === s.id;
            return (
              <CircleMarker
                key={s.id}
                ref={(el) => { if (el) markerRefs.current[s.id] = el; }}
                center={[s.lat, s.lon]}
                radius={isSel ? 14 : 9}
                pathOptions={{
                  fillColor: lv.color,
                  fillOpacity: 0.85,
                  color: '#111010',
                  weight: isSel ? 2.5 : 1.5,
                }}
                eventHandlers={{ click: () => handleSelect(s) }}
              >
                <Popup
                  closeButton={false}
                  className="map-popup"
                  eventHandlers={{ remove: () => setSelected((prev) => (prev === s.id ? null : prev)) }}
                >
                  <div className="map-popup-inner">
                    <div className="map-popup-name">{s.name}</div>
                    <div className="map-popup-loc">{s.location}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 10 }}>
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
                        width: '100%', padding: '7px', background: 'var(--primary)', color: '#fff',
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
    </div>
  );
}
