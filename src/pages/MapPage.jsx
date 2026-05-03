import { useState } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { getSensorAQI, getPollLevel } from '../utils/aqi';

export default function MapPage({ lang, setPage, setSelectedSensor }) {
  const [selected, setSelected] = useState(null);
  const [popup, setPopup] = useState(null);
  const L = lang === 'it';

  const FILTERS = [
    { label: L ? 'Periodo'    : 'Period',    opts: ['01/01/2025 – 01/01/2026', 'Ultimi 30 giorni', 'Ultima settimana'] },
    { label: L ? 'Sensore'    : 'Sensor',    opts: [L ? 'Tutti i sensori' : 'All sensors', ...SENSORS.map((s) => s.name)] },
    { label: L ? 'Inquinante' : 'Pollutant', opts: [L ? 'Tutti' : 'All', ...Object.values(POLLUTANTS).map((p) => p.name)] },
  ];

  return (
    <div className="map-page">
      <div className="map-area">
        <svg viewBox="0 0 800 600" style={{ width: '100%', height: '100%' }}>
          {Array.from({ length: 20 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 30} x2="800" y2={i * 30} stroke="#CCC8BF" strokeWidth="0.5" />)}
          {Array.from({ length: 27 }).map((_, i) => <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="600" stroke="#CCC8BF" strokeWidth="0.5" />)}
          <path d="M100,80 L200,60 L320,70 L420,85 L500,100 L560,130 L600,180 L610,250 L590,320 L560,380 L520,420 L480,440 L440,460 L380,470 L320,460 L260,440 L200,410 L160,370 L130,320 L110,260 L100,200 Z" fill="#E0DBD1" stroke="#C5C0B8" strokeWidth="1.5" />
          <path d="M560,180 L620,200 L650,280 L640,360 L600,400 L560,380 Z" fill="#C8D8E8" opacity="0.5" />
          <path d="M200,410 L180,450 L220,480 L300,490 L380,470 Z" fill="#C8D8E8" opacity="0.5" />
          <rect x="80" y="200" width="120" height="80" fill="#B5213D" opacity="0.07" stroke="#B5213D" strokeWidth="1" strokeDasharray="4,3" />
          <text x="88" y="248" fontSize="8" fill="#B5213D" fontFamily="Epilogue" fontWeight="700" letterSpacing="1">AREA IND.</text>
          {[{ l: 'TAMBURI', x: 200, y: 180 }, { l: 'CENTRO', x: 340, y: 340 }, { l: 'PAOLO VI', x: 120, y: 320 }, { l: 'T. VECCHIA', x: 380, y: 420 }].map((d) => (
            <text key={d.l} x={d.x} y={d.y} fontSize="8" fill="#9B9790" fontFamily="Epilogue" letterSpacing="1">{d.l}</text>
          ))}
          <path d="M150,150 L400,200 L500,350 L450,440" stroke="#C5C0B8" strokeWidth="2" fill="none" />
          <path d="M250,100 L280,350" stroke="#C5C0B8" strokeWidth="1.5" fill="none" />
          <path d="M150,300 L500,310" stroke="#C5C0B8" strokeWidth="1.5" fill="none" />
          {SENSORS.map((s) => {
            const x = s.x * 800, y = s.y * 600;
            const ai = getSensorAQI(s);
            const lv = LEVELS[ai];
            const sel = selected === s.id;
            return (
              <g key={s.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(s.id); setPopup(s); }}>
                <circle cx={x} cy={y} r={sel ? 22 : 16} fill={lv.color} opacity="0.15" />
                <circle cx={x} cy={y} r={sel ? 12 : 8} fill={lv.color} stroke="#111010" strokeWidth={sel ? 2 : 1.5} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="8" fontFamily="Epilogue" fontWeight="700" fill="#111010">{s.id}</text>
                {sel && <circle cx={x} cy={y} r={24} fill="none" stroke={lv.color} strokeWidth="2" strokeDasharray="3,3" />}
              </g>
            );
          })}
        </svg>

        {popup && (
          <div className="sensor-popup" style={{ left: `${popup.x * 100}%`, top: `${popup.y * 100}%`, transform: 'translate(-50%,-110%)' }}>
            <button className="sensor-popup-close" onClick={() => { setPopup(null); setSelected(null); }}>×</button>
            <h3>{popup.name}</h3>
            <div className="sensor-popup-sub">{popup.location}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {['pm25', 'pm10', 'no2', 'co'].map((k) => {
                const li = getPollLevel(k, popup[k] || 0);
                return (
                  <div key={k} style={{ padding: '4px 8px', background: LEVELS[li].color, color: '#fff', fontSize: 10, fontFamily: 'Epilogue', fontWeight: 700 }}>
                    {POLLUTANTS[k].name}: {popup[k]}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => { setSelectedSensor(popup); setPage('record'); }}
              style={{ width: '100%', padding: '8px', background: '#111010', color: '#fff', border: 'none', fontFamily: 'Epilogue', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {L ? 'Apri record →' : 'Open record →'}
            </button>
          </div>
        )}
      </div>

      <div className="map-sidebar">
        <div className="map-filters">
          <div style={{ padding: '14px 16px', borderBottom: '2px solid #111010', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-title)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {L ? 'Mappa Sensori' : 'Sensor Map'}
            </span>
            <span className="live-badge"><span className="live-dot" />LIVE</span>
          </div>
          {FILTERS.map((f) => (
            <div key={f.label} className="map-filter-row">
              <span className="filter-label">{f.label}</span>
              <select className="filter-select">{f.opts.map((o) => <option key={o}>{o}</option>)}</select>
            </div>
          ))}
        </div>

        <div className="map-sensor-list">
          {SENSORS.map((s) => {
            const ai = getSensorAQI(s);
            const lv = LEVELS[ai];
            return (
              <div key={s.id} className={`map-sensor-item${selected === s.id ? ' selected' : ''}`} onClick={() => { setSelected(s.id); setPopup(s); }}>
                <div className="map-sensor-dot" style={{ background: lv.color }} />
                <div className="map-sensor-info">
                  <div className="map-sensor-title">{s.name} — {s.district}</div>
                  <div className="map-sensor-sub">{s.location}</div>
                </div>
                <div className="map-sensor-aqi" style={{ color: selected === s.id ? '#fff' : lv.color }}>
                  {L ? lv.it : lv.en}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '2px solid #111010', padding: '12px 16px' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B9790', marginBottom: 8 }}>
            {L ? 'Legenda' : 'Legend'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {LEVELS.map((l) => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, background: l.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 600 }}>{L ? l.it : l.en}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
