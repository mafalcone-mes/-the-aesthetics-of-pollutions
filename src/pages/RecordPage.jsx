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

const REC_BODY_IMG = '/assets/sagome/DSC01848.png';

const REC_ZONE_CATS = {
  mind:    { primary: 'systemic',     label_it: 'Testa / Mente', label_en: 'Head / Mind' },
  eyes:    { primary: 'gaseous',      label_it: 'Occhi',          label_en: 'Eyes' },
  throat:  { primary: 'gaseous',      label_it: 'Gola',           label_en: 'Throat' },
  chest:   { primary: 'particulates', label_it: 'Torace',         label_en: 'Chest' },
  stomach: { primary: 'systemic',     label_it: 'Stomaco',        label_en: 'Stomach' },
};

const REC_ZONE_Y = { mind: '17%', eyes: '25%', throat: '40%', chest: '53%', stomach: '73%' };
const REC_ZONE_POS = {
  mind:    { x: 52, y: 17 },
  eyes:    { x: 52, y: 25 },
  throat:  { x: 52, y: 40 },
  chest:   { x: 52, y: 53 },
  stomach: { x: 52, y: 73 },
};

function RecordBlobOverlay({ categoryLevels }) {
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', mixBlendMode: 'multiply', zIndex: 5 }}
      viewBox="0 0 100 100" preserveAspectRatio="none"
    >
      <defs>
        <filter id="rec-halo" x="-200%" y="-150%" width="500%" height="400%"><feGaussianBlur stdDeviation="13" /></filter>
        <filter id="rec-mid"  x="-100%" y="-80%"  width="300%" height="260%"><feGaussianBlur stdDeviation="5"  /></filter>
        <filter id="rec-core" x="-60%"  y="-40%"  width="220%" height="180%"><feGaussianBlur stdDeviation="2"  /></filter>
      </defs>
      <g filter="url(#rec-halo)" opacity="0.28">
        {Object.entries(REC_ZONE_CATS).map(([key, zone]) => {
          const pos = REC_ZONE_POS[key];
          return <ellipse key={key} cx={pos.x} cy={pos.y} rx={30} ry={38} fill={LEVELS[Math.max(0, categoryLevels[zone.primary] - 2)].color} />;
        })}
      </g>
      <g filter="url(#rec-mid)" opacity="0.6">
        {Object.entries(REC_ZONE_CATS).map(([key, zone]) => {
          const pos = REC_ZONE_POS[key];
          return <ellipse key={key} cx={pos.x} cy={pos.y} rx={16} ry={22} fill={LEVELS[Math.max(0, categoryLevels[zone.primary] - 1)].color} />;
        })}
      </g>
      <g filter="url(#rec-core)" opacity="0.85">
        {Object.entries(REC_ZONE_CATS).map(([key, zone]) => {
          const pos = REC_ZONE_POS[key];
          return <ellipse key={key} cx={pos.x} cy={pos.y} rx={6} ry={8} fill={LEVELS[categoryLevels[zone.primary]].color} />;
        })}
      </g>
    </svg>
  );
}

export default function RecordPage({ lang, sensor, liveHistory, afterTitle, hideAqiRow, hideMap, titleStyle }) {
  const [activePollutant, setActivePollutant] = useState('pm25');
  const [chartView, setChartView] = useState('line');
  const [activeZone, setActiveZone] = useState(null);

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

  const recCatLevels = {
    particulates: Math.max(0, ...Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === 'particulates').map(k => getPollLevel(k, sensor[k] || 0))),
    gaseous:      Math.max(0, ...Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === 'gaseous').map(k => getPollLevel(k, sensor[k] || 0))),
    systemic:     Math.max(0, ...Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === 'systemic').map(k => getPollLevel(k, sensor[k] || 0))),
  };
  const recZoneColors = Object.fromEntries(
    Object.entries(REC_ZONE_CATS).map(([k, z]) => [k, LEVELS[recCatLevels[z.primary]].color])
  );

  const sensorRows = liveHistory ?? HOURLY_DATA.filter(r => r.sensorId === sensor.id);
  const histRows = liveHistory ? liveHistory.slice(-120) : sensorRows.slice(-24);
  const chartTimeLabel = liveHistory
    ? (L ? 'ultime misurazioni' : 'recent readings')
    : (L ? 'ultime 24 ore' : 'last 24 hours');

  const chartViews = [
    { key: 'line',  label: L ? 'Andamento' : 'Trend' },
    { key: 'heat',  label: 'Heatmap' },
    { key: 'multi', label: L ? 'Confronto' : 'Compare' },
  ];

  return (
    <div className="record-page">

      {/* TITLE */}
      <div style={{ padding: hideAqiRow ? '10px 32px' : '24px 24px 16px 24px', borderBottom: afterTitle ? 'none' : '1px solid var(--gray)', textAlign: 'left' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: hideAqiRow ? 'clamp(64px, 8vw, 128px)' : 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em', ...titleStyle }}>
          {sensor.name}
        </span>
      </div>
      {afterTitle}

      {/* AQI BOXES — horizontal row */}
      {!hideAqiRow && <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--white)', borderBottom: '1px solid var(--gray)', flexWrap: 'wrap' }}>

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

      </div>}

      {/* MAP */}
      {!hideMap && <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray)' }}>
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
      </div>}

      {/* BODY FIGURE — Pi mode */}
      {hideAqiRow && (
        <div
          style={{ position: 'relative', height: '35vh', overflow: 'hidden', background: 'var(--white)', borderBottom: '1px solid var(--gray)' }}
          onClick={() => setActiveZone(null)}
        >
          <img src={REC_BODY_IMG} alt=""
            style={{ position: 'absolute', left: '4%', top: '7%', height: '90%', width: 'auto', zIndex: 1, pointerEvents: 'none', objectFit: 'contain' }} />

          <RecordBlobOverlay categoryLevels={recCatLevels} />

          {Object.entries(REC_ZONE_CATS).map(([key, zone]) => {
            const color = recZoneColors[key];
            return (
              <div
                key={key}
                style={{
                  position: 'absolute', left: '30%', right: '48vw', top: REC_ZONE_Y[key],
                  transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', flexDirection: 'row-reverse',
                  pointerEvents: 'none', zIndex: 10,
                }}
              >
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1.5, background: color, opacity: 0.7 }} />
              </div>
            );
          })}

          {/* Left info panel — all zones always visible */}
          <div
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 20, width: 'calc(100vw / 6 * 1.5)', display: 'flex', flexDirection: 'column', justifyContent: 'stretch', gap: 4, padding: 8, overflow: 'hidden' }}
          >
            {Object.entries(REC_ZONE_CATS).map(([key, zone]) => {
              const levelIndex = recCatLevels[zone.primary];
              const lv = LEVELS[levelIndex];
              const sym = SYMPTOMS[zone.primary][lv.key];
              const noSym = !sym || (!sym.gen && !sym.sen);
              return (
                <div key={key} style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: lv.color, padding: '8px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
                    {L ? 'SINTOMI' : 'SYMPTOMS'} — {L ? lv.it : lv.en}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 2vw, 26px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 8 }}>
                    {L ? zone.label_it : zone.label_en}
                  </div>
                  {noSym ? (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
                      {L ? 'Nessun sintomo atteso a questo livello.' : 'No symptoms expected at this level.'}
                    </div>
                  ) : (
                    [
                      { who: L ? 'Popolazione generale' : 'General population', text: L ? sym.gen?.it : sym.gen?.en },
                      { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: L ? sym.sen?.it : sym.sen?.en },
                    ].filter(s => s.text).map((s, i) => (
                      <div key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.who}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              <button key={key} onClick={() => setChartView(key)} style={pill(chartView === key, 'var(--primary)')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {chartView === 'line' && (
          <>
            <div className="chart-title">{poll.name} {poll.unit} — {chartTimeLabel}</div>
            <MultiLineChart
              data={histRows}
              pollutants={[activePollutant]}
              mode="pollutant"
              width={900}
              height={hideAqiRow ? 130 : 280}
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
            <div className="chart-title">{L ? `Confronto inquinanti — ${chartTimeLabel}` : `Pollutant comparison — ${chartTimeLabel}`}</div>
            <MultiLineChart
              data={histRows}
              pollutants={Object.keys(POLLUTANTS)}
              mode="pollutant"
              width={900}
              height={hideAqiRow ? 130 : 280}
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
