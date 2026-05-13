import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { getSensorAQI, getPollLevel } from '../utils/aqi';

const TARANTO_CENTER = [40.4760, 17.2270];

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
  const L = lang === 'it';

  const selectedSensor = selected != null ? SENSORS.find(s => s.id === selected) : null;

  const handleSelect = (s) => setSelected(prev => prev === s.id ? null : s.id);

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([id, marker]) => {
      if (!marker) return;
      if (selected != null && String(id) === String(selected)) marker.openPopup();
      else marker.closePopup();
    });
  }, [selected]);

  return (
    <div className="map-page">
      {/* SIDEBAR */}
      <div className="map-sidebar">
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '24px 28px', borderBottom: '1px solid var(--gray)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="map-sidebar-title" style={{ fontWeight: 400, color: 'var(--black)' }}>
              {L ? 'MAPPA SENSORI' : 'SENSOR MAP'}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--black)', margin: 0 }}>
            {L
              ? 'Questa mappa mostra la rete di sensori costruita attraverso laboratori partecipativi con cittadine e cittadini. La piattaforma offre accesso libero e trasparente ai dati raccolti, per favorire consapevolezza, ricerca e azione collettiva sul tema della qualità dell\'aria. L\'iniziativa è realizzata da Jonix Group Taranto.'
              : 'This map shows the sensor network built through participatory workshops with citizens. The platform provides free and transparent access to the collected data, to foster awareness, research and collective action on air quality. The initiative is by Jonix Group Taranto.'}
          </p>
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
                    {L ? lv.it : lv.en}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{ borderTop: '1px solid var(--gray)', padding: '12px 16px' }}>
          <div style={{ fontFamily: 'Epilogue', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 8 }}>
            {L ? 'Legenda' : 'Legend'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {LEVELS.map((l) => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'Epilogue', fontSize: 10, fontWeight: 600 }}>{L ? l.it : l.en}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* OSM MAP */}
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
          {SENSORS.map((s) => {
            const ai = getSensorAQI(s);
            const lv = LEVELS[ai];
            const isSel = selected === s.id;
            return (
              <CircleMarker
                key={s.id}
                ref={(el) => {
                  if (el) markerRefs.current[s.id] = el;
                }}
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
                <Popup closeButton={false} className="map-popup" eventHandlers={{ remove: () => setSelected((prev) => (prev === s.id ? null : prev)) }}>
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
                      {L ? 'Apri record →' : 'Open record →'}
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
