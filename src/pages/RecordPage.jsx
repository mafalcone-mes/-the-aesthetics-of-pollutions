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

const pill = (active, color) => ({
  padding: '5px 14px',
  border: '1.5px solid ' + (active ? color : 'rgba(0,0,0,0.22)'),
  background: active ? color : 'transparent',
  color: active ? '#fff' : 'var(--black)',
  fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
  letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
});

export default function RecordPage({ lang, sensor }) {
  const [activePollutant, setActivePollutant] = useState('pm25');
  const [chartView, setChartView] = useState('line');

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

  const chartViews = [
    { key: 'line',  label: L ? 'Andamento' : 'Trend' },
    { key: 'heat',  label: 'Heatmap' },
    { key: 'multi', label: L ? 'Confronto' : 'Compare' },
  ];

  return (
    <div className="record-page">

      {/* TITLE */}
      <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid var(--gray)' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {sensor.name}
        </span>
      </div>

      {/* AQI BOXES — horizontal row */}
      <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--white)', borderBottom: '1px solid var(--gray)', flexWrap: 'wrap' }}>

        {/* AQI quality + recommendations */}
        <div style={{ flex: '1 1 180px', background: lv.color, padding: '12px 14px' }}>
          <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
            {L ? "QUALITÀ DELL'ARIA" : 'AIR QUALITY'}
          </div>
          <div style={{ fontFamily: 'Epilogue', fontSize: 32, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 10 }}>
            {L ? lv.it : lv.en}
          </div>
          {[
            { who: L ? 'Popolazione generale' : 'General population', text: SUGGESTIONS[lv.key]?.gen },
            { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: SUGGESTIONS[lv.key]?.sen },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
              <div style={{ ...SUB_LABEL, fontSize: 9, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.who}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
            </div>
          ))}
        </div>

        {/* Category symptom boxes */}
        {[
          { catKey: 'particulates', label: L ? 'Particolato · PM2.5/PM10' : 'Particulates · PM2.5/PM10' },
          { catKey: 'gaseous',      label: L ? 'Gas irritanti · NO₂/SO₂/O₃' : 'Gaseous · NO₂/SO₂/O₃' },
          { catKey: 'systemic',     label: L ? 'Sistemici · CO/NH₃/C₆H₆' : 'Systemic · CO/NH₃/C₆H₆' },
        ].map(({ catKey, label }) => {
          const sym = SYMPTOMS[catKey][lv.key];
          if (!sym || (!sym.gen && !sym.sen)) return null;
          const catLevel = Math.max(...Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === catKey).map(k => getPollLevel(k, sensor[k] || 0)));
          const catLv = LEVELS[catLevel];
          return (
            <div key={catKey} style={{ flex: '1 1 140px', background: catLv.color, padding: '12px 14px' }}>
              <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>{label}</div>
              {[
                { who: L ? 'Generale' : 'General', text: L ? sym.gen?.it : sym.gen?.en },
                { who: L ? 'Sensibile' : 'Sensitive', text: L ? sym.sen?.it : sym.sen?.en },
              ].filter(s => s.text).map((s, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? 6 : 0 }}>
                  <div style={{ ...SUB_LABEL, fontSize: 9, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.who}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
                </div>
              ))}
            </div>
          );
        })}

        {/* AQI Scale */}
        <div style={{ flex: '1 1 120px', background: 'var(--white)', padding: '12px 14px' }}>
          <div style={{ ...SUB_LABEL, marginBottom: 10 }}>{L ? 'Scala AQI' : 'AQI Scale'}</div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
            {LEVELS.map((l) => (
              <div key={l.key} style={{ flex: 1, height: 8, background: l.color, opacity: l.key === lv.key ? 1 : 0.4, outline: l.key === lv.key ? `2px solid ${l.color}` : 'none', outlineOffset: 2 }} title={L ? l.it : l.en} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...SUB_LABEL }}>
            <span>1 — {L ? 'Buono' : 'Good'}</span>
            <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
          </div>
        </div>

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
              const sai = getSensorAQI(s);
              const slv = LEVELS[sai];
              const isCurrent = s.id === sensor.id;
              return (
                <CircleMarker
                  key={s.id}
                  center={[s.lat, s.lon]}
                  radius={isCurrent ? 14 : 7}
                  pathOptions={{
                    fillColor: slv.color,
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
        {/* Pollutant pills + chart view switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16, borderBottom: '1px solid var(--gray)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(POLLUTANTS).map(([key, p]) => {
              const val = sensor[key] || 0;
              const li = getPollLevel(key, val);
              const lvc = LEVELS[li];
              const isActive = key === activePollutant;
              return (
                <button key={key} onClick={() => setActivePollutant(key)} style={pill(isActive, lvc.color)}>
                  {p.name}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {chartViews.map(({ key, label }) => (
              <button key={key} onClick={() => setChartView(key)} style={pill(chartView === key, 'var(--black)')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {chartView === 'line' && (
          <>
            <div className="chart-title">{poll.name} {poll.unit} — {L ? 'ultime 24 ore' : 'last 24 hours'}</div>
            <MultiLineChart
              data={histRows}
              pollutants={[activePollutant]}
              mode="pollutant"
              width={900}
              height={220}
              pollutantColors={{ [activePollutant]: activeLv.color }}
            />
          </>
        )}
        {chartView === 'heat' && (
          <>
            <div className="chart-title">{L ? `Heatmap ${poll.name} — ultima settimana` : `${poll.name} Heatmap — last week`}</div>
            <HeatMap readings={sensorRows} lang={lang} pollutantKey={activePollutant} showLegend={false} dailyView={true} />
          </>
        )}
        {chartView === 'multi' && (
          <>
            <div className="chart-title">{L ? 'Confronto inquinanti — ultime 24 ore' : 'Pollutant comparison — last 24 hours'}</div>
            <MultiLineChart
              data={histRows}
              pollutants={Object.keys(POLLUTANTS)}
              mode="pollutant"
              width={900}
              height={220}
            />
          </>
        )}
      </div>

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

    </div>
  );
}
