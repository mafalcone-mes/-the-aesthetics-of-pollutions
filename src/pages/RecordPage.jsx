import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI, getPollLevel } from '../utils/aqi';
import MultiLineChart from '../components/charts/MultiLineChart';
import HeatMap from '../components/charts/HeatMap';

const SUB_LABEL = {
  fontFamily: 'Epilogue', fontSize: 10, fontWeight: 400,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)',
};

export default function RecordPage({ lang, sensor }) {
  const [activePollutant, setActivePollutant] = useState('pm25');

  if (!sensor) {
    return <div style={{ padding: 40, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gray2)' }}>Nessun sensore selezionato.</div>;
  }

  const L = lang === 'it';
  const ai = getSensorAQI(sensor);
  const lv = LEVELS[ai];
  const poll = POLLUTANTS[activePollutant] || POLLUTANTS.pm25;
  const activeVal = sensor[activePollutant] || 0;
  const activeLi = getPollLevel(activePollutant, activeVal);
  const activeLv = LEVELS[activeLi];

  const sensorRows = HOURLY_DATA.filter(r => r.sensorId === sensor.id);
  const histRows = sensorRows.slice(-24);

  const latestRow = sensorRows[sensorRows.length - 1];
  const now = latestRow ? latestRow.dateObj : new Date();

  return (
    <div className="record-page">

      {/* TOP BAR — archive style */}
      <div style={{ padding: '24px 28px 0 28px' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {sensor.name}
        </span>
      </div>

      {/* STATUS BAR — archive filter bar style */}
      <div style={{ borderBottom: '1px solid var(--gray)', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--black)' }}>
            {sensor.location}
            {' — '}
            <span style={{ color: 'var(--black)' }}>
              {now.toLocaleDateString(L ? 'it-IT' : 'en-GB', { weekday: 'long', day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="live-badge"><span className="live-dot" />LIVE</span>
            <span style={{ padding: '7px 14px', background: lv.color, color: '#fff', fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {L ? lv.it : lv.en}
            </span>
          </div>
        </div>
      </div>

      {/* ── COLUMNS ── */}
      <div className="record-columns">

        {/* ── LEFT PANEL ── */}
        <div className="record-left">

          {/* POLLUTANT TABLE */}
          <div style={{ borderBottom: '1px solid var(--gray)', overflowX: 'auto' }}>
            <table className="archive-table record-table">
              <thead>
                <tr>
                  <th>{L ? 'Inquinante' : 'Pollutant'}</th>
                  <th style={{ textAlign: 'right' }}>{L ? 'Valore' : 'Value'}</th>
                  <th style={{ textAlign: 'right' }}>{L ? 'Unità' : 'Unit'}</th>
                  <th>{L ? 'Livello' : 'Level'}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(POLLUTANTS).map(([key, p]) => {
                  const val = sensor[key] || 0;
                  const li = getPollLevel(key, val);
                  const lvc = LEVELS[li];
                  const isActive = key === activePollutant;
                  return (
                    <tr
                      key={key}
                      onClick={() => setActivePollutant(key)}
                      style={{ background: isActive ? lvc.color : undefined, cursor: 'pointer' }}
                    >
                      <td style={{ fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: isActive ? '#fff' : 'var(--black)' }}>
                        {p.name}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'Epilogue', fontWeight: 700, fontSize: 13, color: isActive ? '#fff' : lvc.color }}>
                        {val}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-body)', fontSize: 11, color: isActive ? 'rgba(255,255,255,0.65)' : 'var(--black)' }}>
                        {p.unit}
                      </td>
                      <td>
                        <span className={`aqi-pill${lvc.index <= 1 ? ' dark' : ''}`} style={{ background: isActive ? 'rgba(255,255,255,0.25)' : lvc.color }}>
                          {L ? lvc.it : lvc.en}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MAP */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray)' }}>
            <div style={{ height: 280, width: '100%' }}>
            <MapContainer
              key={sensor.id}
              center={[sensor.lat, sensor.lon]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <ZoomControl position="bottomright" />
              {SENSORS.map((s) => {
                const ai = getSensorAQI(s);
                const lv = LEVELS[ai];
                const isCurrent = s.id === sensor.id;
                return (
                  <CircleMarker
                    key={s.id}
                    center={[s.lat, s.lon]}
                    radius={isCurrent ? 14 : 7}
                    pathOptions={{
                      fillColor: lv.color,
                      fillOpacity: isCurrent ? 0.9 : 0.45,
                      color: '#111010',
                      weight: isCurrent ? 2.5 : 1,
                    }}
                  />
                );
              })}
            </MapContainer>
            </div>
          </div>

          {/* CHART */}
          <div className="chart-area">
            {/* POLLUTANTS */}
            <div style={{ marginBottom: 16, borderBottom: '1px solid var(--gray)', paddingBottom: 16 }}>
              <div style={{ ...SUB_LABEL, marginBottom: 10 }}>{L ? 'Inquinanti · Seleziona per esplorare' : 'Pollutants · Select to explore'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(POLLUTANTS).map(([key, p]) => {
                  const val = sensor[key] || 0;
                  const li = getPollLevel(key, val);
                  const lvc = LEVELS[li];
                  const isActive = key === activePollutant;
                  return (
                    <button
                      key={key}
                      onClick={() => setActivePollutant(key)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePollutant(key); } }}
                      style={{
                        padding: '5px 14px',
                        border: '1.5px solid ' + (isActive ? lvc.color : 'var(--black)'),
                        background: isActive ? lvc.color : 'transparent',
                        color: isActive ? '#fff' : 'var(--black)',
                        fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400,
                        letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="chart-title">{poll.name} {poll.unit} — {L ? 'ultime 24 ore' : 'last 24 hours'}</div>
            <MultiLineChart
              data={histRows}
              pollutants={[activePollutant]}
              mode="pollutant"
              width={900}
              height={220}
              pollutantColors={{ [activePollutant]: activeLv.color }}
            />
          </div>

          {/* HEATMAP */}
          <div className="chart-area">
            <div className="chart-title">{L ? `Heatmap ${poll.name} — ultima settimana` : `${poll.name} Heatmap — last week`}</div>
            <HeatMap readings={sensorRows} lang={lang} pollutantKey={activePollutant} showLegend={false} dailyView={true} />
          </div>

        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="record-right">
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Raccomandazioni */}
            <div style={{ ...SUB_LABEL, fontSize: 14, padding: '14px 20px', borderBottom: '1px solid var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--primary)', color: 'var(--white)' }}>
              {L ? 'Raccomandazioni' : 'Recommendations'}
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: lv.color, display: 'inline-block' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--gray)' }}>
              {[
                { who: L ? 'Popolazione generale' : 'General population', text: SUGGESTIONS[lv.key]?.gen },
                { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: SUGGESTIONS[lv.key]?.sen },
              ].map((s, i) => (
                <div key={i} style={{ padding: '14px 20px', borderBottom: i === 0 ? '1px solid var(--gray)' : 'none' }}>
                  <div style={{ ...SUB_LABEL, marginBottom: 6 }}>{s.who}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: 'var(--black)' }}>{s.text}</div>
                </div>
              ))}
            </div>

            {/* Sintomi associati */}
            <div style={{ ...SUB_LABEL, fontSize: 14, padding: '14px 20px', borderBottom: '1px solid var(--gray)', background: 'var(--primary)', color: 'var(--white)' }}>
              {L ? 'Sintomi associati' : 'Associated symptoms'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--gray)' }}>
              {[
                { catKey: 'particulates', label: L ? 'Particolato (PM2.5/PM10)' : 'Particulates' },
                { catKey: 'gaseous', label: L ? 'Gas irritanti (NO₂/SO₂/O₃)' : 'Gaseous irritants' },
                { catKey: 'systemic', label: L ? 'Sistemici (CO/NH₃/C₆H₆)' : 'Systemic' },
              ].map(({ catKey, label }, i, arr) => {
                const s = SYMPTOMS[catKey][lv.key];
                if (!s) return null;
                return (
                  <div key={catKey} style={{ padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--gray)' : 'none' }}>
                    <div style={{ ...SUB_LABEL, marginBottom: 8 }}>{label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--black)', lineHeight: 1.5 }}>
                        <span style={{ ...SUB_LABEL, fontSize: 9, marginRight: 6 }}>Gen</span>{s.gen}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--black)', lineHeight: 1.5 }}>
                        <span style={{ ...SUB_LABEL, fontSize: 9, marginRight: 6 }}>Sen</span>{s.sen}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scala AQI */}
            <div style={{ ...SUB_LABEL, fontSize: 14, padding: '14px 20px', borderBottom: '1px solid var(--gray)', background: 'var(--primary)', color: 'var(--white)' }}>
              {L ? 'Scala AQI' : 'AQI Scale'}
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {LEVELS.map((l) => (
                  <div
                    key={l.key}
                    style={{
                      flex: 1, height: 8,
                      background: l.color,
                      opacity: l.key === lv.key ? 1 : 0.35,
                      outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                      outlineOffset: 2,
                    }}
                    title={L ? l.it : l.en}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...SUB_LABEL }}>
                <span>1 — {L ? 'Buono' : 'Good'}</span>
                <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
