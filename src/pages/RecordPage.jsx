import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { MapContainer, TileLayer, CircleMarker, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { ORGAN_SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI, getPollLevel } from '../utils/aqi';
import MultiLineChart from '../components/charts/MultiLineChart';
import HeatMap from '../components/charts/HeatMap';

const LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(0,0,0,0.4)', marginBottom: 3,
};
const VALUE = {
  fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 400,
  lineHeight: 1.05, letterSpacing: '-0.01em', color: 'var(--black)',
};

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 400,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--black)',
};

const pill = (active, color) => ({
  padding: '5px 14px',
  border: '1.5px solid ' + (active ? color : 'rgba(0,0,0,0.22)'),
  background: active ? color : 'transparent',
  color: active ? '#fff' : 'var(--black)',
  fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: active ? 700 : 400,
  letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
});

const INSTALL_DATES = {
  19: { it: 'Marzo 2022',     en: 'March 2022' },
  20: { it: 'Giugno 2022',    en: 'June 2022' },
  21: { it: 'Gennaio 2023',   en: 'January 2023' },
  22: { it: 'Aprile 2023',    en: 'April 2023' },
  37: { it: 'Settembre 2023', en: 'September 2023' },
  38: { it: 'Febbraio 2024',  en: 'February 2024' },
  999: { it: '28 Maggio 2026', en: 'May 28, 2026' },
};

function MapillaryPhoto({ lat, lon, imgStyle }) {
  const [url, setUrl] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = import.meta.env.VITE_MAPILLARY_TOKEN;
    if (!token || token === 'YOUR_MAPILLARY_ACCESS_TOKEN_HERE') {
      setStatus('nokey');
      return;
    }
    fetch(
      `https://graph.mapillary.com/images?fields=id,thumb_1024_url&closeto=${lon},${lat}&radius=150&limit=1&access_token=${token}`
    )
      .then(r => r.json())
      .then(data => {
        const img = data?.data?.[0];
        if (img?.thumb_1024_url) { setUrl(img.thumb_1024_url); setStatus('ok'); }
        else setStatus('notfound');
      })
      .catch(() => setStatus('error'));
  }, [lat, lon]);

  const placeholder = (text) => (
    <div style={{ ...imgStyle, background: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-title)', fontSize: 11, color: 'var(--gray2)', textAlign: 'center', padding: 12 }}>{text}</span>
    </div>
  );

  if (status === 'loading') return placeholder('…');
  if (status === 'nokey')   return placeholder('Add VITE_MAPILLARY_TOKEN to .env');
  if (status !== 'ok')      return placeholder('No street photo found nearby');
  return <img src={url} alt="" style={imgStyle} />;
}

const REC_BODY_IMG = '/assets/sagome/DSC01848.png';
const SENSOR_GUIDE_URL = 'https://abcsensorguide.netlify.app/';
const REC_ZONE_CATS = {
  mind:    { primary: 'systemic',     label_it: 'Testa / Mente', label_en: 'Head / Mind' },
  eyes:    { primary: 'gaseous',      label_it: 'Occhi',         label_en: 'Eyes' },
  throat:  { primary: 'gaseous',      label_it: 'Gola',          label_en: 'Throat' },
  chest:   { primary: 'particulates', label_it: 'Torace',        label_en: 'Chest' },
  stomach: { primary: 'systemic',     label_it: 'Stomaco',       label_en: 'Stomach' },
};
const REC_ZONE_Y   = { mind: '12%', eyes: '21%', throat: '33%', chest: '53%', stomach: '73%' };
const REC_ZONE_POS = {
  mind:    { x: 25, y: 12 }, eyes:    { x: 25, y: 21 },
  throat:  { x: 25, y: 33 }, chest:   { x: 25, y: 53 },
  stomach: { x: 25, y: 73 },
};

function RecordBlobOverlay({ categoryLevels }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', mixBlendMode: 'multiply', zIndex: 5 }}
      viewBox="0 0 100 100" preserveAspectRatio="none">
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

export default function RecordPage({ lang, sensor, liveHistory, hideAqiRow, hideMap, titleStyle, fitViewport, fitHeight }) {
  // `hideAqiRow` picks this layout's shape (info + body figure + symptom grid
  // merged into one row); `fit` separately controls whether that row is
  // squeezed to fit a fixed, non-scrolling viewport so everything is visible
  // without scrolling. PiApp's kiosk shell already gives this a definite
  // 100%-resolvable height, so it keeps the '100%' default; the standalone
  // site has a TopBar + footer around it, so it passes an explicit
  // viewport-relative `fitHeight` instead.
  const fit = fitViewport ?? hideAqiRow;
  const fitHeightValue = fitHeight ?? '100%';
  const [activePollutant, setActivePollutant] = useState('pm25');
  const [chartView, setChartView]             = useState(hideAqiRow ? 'multi' : 'line');
  const [activeZone, setActiveZone]           = useState(null);

  if (!sensor) {
    return <div style={{ padding: 40, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gray2)' }}>Nessun sensore selezionato.</div>;
  }

  const L  = lang === 'it';
  const ai = getSensorAQI(sensor);
  const lv = LEVELS[ai];

  const poll      = POLLUTANTS[activePollutant] || POLLUTANTS.pm25;
  const activeVal = sensor[activePollutant] || 0;
  const activeLi  = getPollLevel(activePollutant, activeVal);
  const activeLv  = LEVELS[activeLi];

  const recCatLevels = {
    particulates: Math.max(0, ...Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === 'particulates').map(k => getPollLevel(k, sensor[k] || 0))),
    gaseous:      Math.max(0, ...Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === 'gaseous').map(k => getPollLevel(k, sensor[k] || 0))),
    systemic:     Math.max(0, ...Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === 'systemic').map(k => getPollLevel(k, sensor[k] || 0))),
  };
  const recZoneColors = Object.fromEntries(
    Object.entries(REC_ZONE_CATS).map(([k, z]) => [k, LEVELS[recCatLevels[z.primary]].color])
  );

  const sensorRows    = liveHistory ?? HOURLY_DATA.filter(r => r.sensorId === sensor.id);
  const histRows      = liveHistory ? liveHistory.slice(-120) : sensorRows.slice(-24);
  const chartTimeLabel = liveHistory
    ? (L ? 'ultime misurazioni' : 'recent readings')
    : (L ? 'ultime 24 ore' : 'last 24 hours');

  const chartViews = [
    { key: 'line',  label: L ? 'Andamento' : 'Trend' },
    { key: 'heat',  label: 'Heatmap' },
    { key: 'multi', label: L ? 'Confronto' : 'Compare' },
  ];

  const displayPollutantKeys = hideAqiRow
    ? Object.keys(POLLUTANTS).filter(k => !['o3', 'so2', 'c6h6'].includes(k))
    : Object.keys(POLLUTANTS);

  const metaItems = [
    { label: L ? 'Sensore'        : 'Sensor',    value: sensor.name },
    { label: L ? 'Posizione'      : 'Location',  value: sensor.location },
    { label: L ? 'Quartiere'      : 'District',  value: sensor.district },
    { label: L ? 'Installazione'  : 'Installed', value: INSTALL_DATES[sensor.id]?.[L ? 'it' : 'en'] ?? '—' },
  ];

  return (
    <div className="record-page" style={fit ? { height: fitHeightValue, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : undefined}>

      {/* TITLE — same treatment as the home page hero, blended by this sensor's own AQI */}
      <div style={{ flexShrink: 0, padding: hideAqiRow ? '10px 32px' : '36px 36px', borderBottom: '1px solid var(--gray)', textAlign: 'left' }}>
        <span style={{
          fontFamily: "'Ronzino Variable', sans-serif",
          fontVariationSettings: `"BLND" ${Math.max(50, ai * 200)}`,
          fontSize: 'clamp(48px, 6vw, 96px)', textTransform: 'uppercase',
          lineHeight: 0.92, letterSpacing: '-0.02em',
          color: 'var(--white)', WebkitTextStroke: '6px var(--primary)', paintOrder: 'stroke fill',
          ...titleStyle,
        }}>
          {sensor.name}
        </span>
      </div>

      {/* PI-STYLE: MAP + INFO + HEALTH REC */}
      {!hideAqiRow && !hideMap && (
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)', minHeight: '55vh', gap: 24, padding: 24, background: 'var(--white)' }}>

          {/* Info + Health rec */}
          <div style={{ width: 460, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--white)' }}>

            {/* Labels + AQI scale */}
            <div style={{ flex: 1, padding: '32px 32px', borderBottom: '1px solid var(--gray)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {metaItems.map((item, i) => (
                  <div key={i}>
                    <div style={LABEL}>{item.label}</div>
                    <div style={VALUE}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* AQI scale */}
              <div style={{ marginTop: 28 }}>
                <div style={{ ...LABEL, marginBottom: 6 }}>{L ? 'Scala AQI' : 'AQI Scale'}</div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                  {LEVELS.map(l => (
                    <div key={l.key} style={{
                      flex: 1, height: 8, background: l.color,
                      outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                      outlineOffset: 2, opacity: l.key === lv.key ? 1 : 0.4,
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...LABEL, marginBottom: 0 }}>
                  <span>1 — {L ? 'Buono' : 'Good'}</span>
                  <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
                </div>
              </div>
            </div>

            {/* Health rec — level color, split gen / sen */}
            <div style={{ flex: 1, background: lv.color, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                  {L ? `Qualità dell'aria — ${lv.it}` : `Air Quality — ${lv.en}`}
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 5 }}>
                  {L ? 'Popolazione generale' : 'General population'}
                </div>
                {SUGGESTIONS[lv.key]?.gen && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: '#fff' }}>
                    {L ? SUGGESTIONS[lv.key].gen.it : SUGGESTIONS[lv.key].gen.en}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, padding: '24px 32px' }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 5 }}>
                  {L ? 'Popolazione sensibile' : 'Sensitive population'}
                </div>
                {SUGGESTIONS[lv.key]?.sen && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: '#fff' }}>
                    {L ? SUGGESTIONS[lv.key].sen.it : SUGGESTIONS[lv.key].sen.en}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sensor street photo via Mapillary */}
          <div style={{ width: 480, flexShrink: 0, overflow: 'hidden' }}>
            <MapillaryPhoto
              lat={sensor.lat}
              lon={sensor.lon}
              imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Map */}
          <div style={{ flex: 3, minHeight: 0, overflow: 'hidden' }}>
            <MapContainer
              key={sensor.id}
              center={[sensor.lat, sensor.lon]}
              zoom={15}
              style={{ height: '100%', width: '100%', minHeight: '55vh' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
              <ZoomControl position="bottomright" />
              {SENSORS.map(s => {
                const sai = getSensorAQI(s);
                const slv = LEVELS[sai];
                const isCurrent = s.id === sensor.id;
                return (
                  <CircleMarker
                    key={s.id}
                    center={[s.lat, s.lon]}
                    radius={isCurrent ? 14 : 7}
                    pathOptions={{ fillColor: slv.color, fillOpacity: isCurrent ? 0.9 : 0.45, color: '#111010', weight: isCurrent ? 2.5 : 1 }}
                  />
                );
              })}
            </MapContainer>
          </div>

        </div>
      )}

      {/* BODY FIGURE + SYMPTOMS */}
      {!hideAqiRow && (
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)', minHeight: '80vh', padding: 24 }}>

          {/* Symptom cards — same width as info column */}
          <div style={{ width: 460, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(REC_ZONE_CATS).map(([key, zone]) => {
              const levelIndex = recCatLevels[zone.primary];
              const zlv = LEVELS[levelIndex];
              const sym = ORGAN_SYMPTOMS[key][zlv.key];
              const noSym = !sym || (!sym.gen && !sym.sen);
              return (
                <div key={key} style={{ minHeight: '10vh', overflow: 'hidden', background: zlv.color, padding: '14px 18px' }}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>
                    {L ? 'SINTOMI' : 'SYMPTOMS'} — {L ? zlv.it : zlv.en}
                  </div>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(13px, 1.4vw, 20px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 6 }}>
                    {L ? zone.label_it : zone.label_en}
                  </div>
                  {noSym ? (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
                      {L ? 'Nessun sintomo atteso a questo livello.' : 'No symptoms expected at this level.'}
                    </div>
                  ) : (
                    [
                      { who: L ? 'Popolazione generale' : 'General population', text: L ? sym.gen?.it : sym.gen?.en },
                      { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: L ? sym.sen?.it : sym.sen?.en },
                    ].filter(s => s.text).map((s, i) => (
                      <div key={i} style={{ marginBottom: i === 0 ? 5 : 0 }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{s.who}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.45, color: '#fff' }}>{s.text}</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Body figure with blobs + callout lines/dots */}
          <div
            style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--white)' }}
            onClick={() => setActiveZone(null)}
          >
            <img
              src={REC_BODY_IMG} alt=""
              style={{ position: 'absolute', right: '4%', left: 'auto', top: '0', height: '110%', width: 'auto', zIndex: 1, pointerEvents: 'none', objectFit: 'contain' }}
            />
            <RecordBlobOverlay categoryLevels={recCatLevels} />
            {Object.entries(REC_ZONE_CATS).map(([key]) => {
              const color = recZoneColors[key];
              return (
                <div key={key}>
                  <div style={{ position: 'absolute', left: '25%', top: REC_ZONE_Y[key], transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: color, zIndex: 12, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: '25%', right: '28%', top: REC_ZONE_Y[key], transform: 'translateY(-50%)', height: 1.5, background: color, opacity: 0.7, zIndex: 10, pointerEvents: 'none' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PI LAYOUT: info/AQI/health-rec + symptom cards + body figure, merged into a single row */}
      {hideAqiRow && (
        <div style={{
          display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)', padding: 24,
          ...(fit ? { flex: 1, minHeight: 0, overflow: 'hidden' } : { height: '75vh' }),
        }}>

          {/* Info + AQI scale + health rec — content height, not stretched */}
          <div style={{ width: 460, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--gray)', paddingRight: 24, marginRight: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {metaItems.map((item, i) => (
                <div key={i}>
                  <div style={LABEL}>{item.label}</div>
                  <div style={VALUE}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{ ...LABEL, marginBottom: 6 }}>{L ? 'Scala AQI' : 'AQI Scale'}</div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                {LEVELS.map(l => (
                  <div key={l.key} style={{
                    flex: 1, height: 8, background: l.color,
                    outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                    outlineOffset: 2, opacity: l.key === lv.key ? 1 : 0.4,
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...LABEL, marginBottom: 0 }}>
                <span>1 — {L ? 'Buono' : 'Good'}</span>
                <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
              </div>
            </div>

            <div style={{ background: lv.color, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                {L ? `Qualità dell'aria — ${lv.it}` : `Air Quality — ${lv.en}`}
              </div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 5 }}>
                {L ? 'Popolazione generale' : 'General population'}
              </div>
              {SUGGESTIONS[lv.key]?.gen && (
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 13, lineHeight: 1.5, color: '#fff', marginBottom: 12 }}>
                  {L ? SUGGESTIONS[lv.key].gen.it : SUGGESTIONS[lv.key].gen.en}
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 5 }}>
                {L ? 'Popolazione sensibile' : 'Sensitive population'}
              </div>
              {SUGGESTIONS[lv.key]?.sen && (
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 13, lineHeight: 1.5, color: '#fff' }}>
                  {L ? SUGGESTIONS[lv.key].sen.it : SUGGESTIONS[lv.key].sen.en}
                </div>
              )}
            </div>
          </div>

          {/* Body figure */}
          <div
            style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--white)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
            onClick={() => setActiveZone(null)}
          >
            <img
              src={REC_BODY_IMG} alt=""
              style={{ marginTop: '-3%', height: '105%', width: 'auto', zIndex: 1, pointerEvents: 'none', objectFit: 'contain' }}
            />
          </div>

          {/* Symptom cards — two columns so each card gets more height */}
          <div style={{ width: 680, flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: 2 }}>
            {Object.entries(REC_ZONE_CATS).map(([key, zone]) => {
              const levelIndex = recCatLevels[zone.primary];
              const zlv = LEVELS[levelIndex];
              const sym = ORGAN_SYMPTOMS[key][zlv.key];
              const noSym = !sym || (!sym.gen && !sym.sen);
              return (
                <div key={key} style={{ minHeight: 0, overflow: 'hidden', background: zlv.color, padding: '14px 18px' }}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>
                    {L ? 'SINTOMI' : 'SYMPTOMS'} — {L ? zlv.it : zlv.en}
                  </div>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(13px, 1.4vw, 20px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 6 }}>
                    {L ? zone.label_it : zone.label_en}
                  </div>
                  {noSym ? (
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
                      {L ? 'Nessun sintomo atteso a questo livello.' : 'No symptoms expected at this level.'}
                    </div>
                  ) : (
                    [
                      { who: L ? 'Popolazione generale' : 'General population', text: L ? sym.gen?.it : sym.gen?.en },
                      { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: L ? sym.sen?.it : sym.sen?.en },
                    ].filter(s => s.text).map((s, i) => (
                      <div key={i} style={{ marginBottom: i === 0 ? 5 : 0 }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{s.who}</div>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 12, lineHeight: 1.45, color: '#fff' }}>{s.text}</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}

            {/* 6th grid cell — 5 symptom cards leave this one empty, use it as a CTA */}
            <div style={{ minHeight: 0, overflow: 'hidden', padding: '14px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(13px, 1.4vw, 20px)', fontWeight: 400, textTransform: 'uppercase', color: 'var(--black)', lineHeight: 1.0, textAlign: 'center' }}>
                {L ? 'Crea il tuo sensore' : 'Create your sensor'}
              </div>
              <div style={{ background: '#fff', padding: 8, lineHeight: 0, flexShrink: 0, border: '1px solid var(--gray)' }}>
                <QRCode value={SENSOR_GUIDE_URL} size={96} style={{ display: 'block', width: 96, height: 96 }} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* CHART + TABLE side by side */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)', flexShrink: 0, padding: 24 }}>

        {/* POLLUTANT TABLE */}
        <div style={{ width: 460, flexShrink: 0, overflowX: 'auto', borderRight: '1px solid var(--gray)' }}>
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
              {displayPollutantKeys.map(key => {
                const p = POLLUTANTS[key];
                const val = sensor[key] || 0;
                const li  = getPollLevel(key, val);
                const lvc = LEVELS[li];
                const isActive = !hideAqiRow && key === activePollutant;
                return (
                  <tr key={key} onClick={hideAqiRow ? undefined : () => setActivePollutant(key)} style={{ background: isActive ? lvc.color : undefined, cursor: hideAqiRow ? 'default' : 'pointer' }}>
                    <td style={{ fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: isActive ? '#fff' : 'var(--black)' }}>
                      {p.name}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 13, color: isActive ? '#fff' : lvc.color }}>
                      {val}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: hideAqiRow ? 'var(--font-title)' : 'var(--font-body)', fontSize: 11, color: isActive ? 'rgba(255,255,255,0.65)' : 'var(--black)' }}>
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

        {/* CHART */}
        <div className="chart-area" style={{ flex: 1 }}>
          {!hideAqiRow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16, borderBottom: '1px solid var(--gray)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {displayPollutantKeys.map(key => {
                  const p = POLLUTANTS[key];
                  const val = sensor[key] || 0;
                  const li  = getPollLevel(key, val);
                  const lvc = LEVELS[li];
                  return (
                    <button key={key} onClick={() => setActivePollutant(key)} style={pill(key === activePollutant, lvc.color)}>
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
          )}

          {chartView === 'line' && (
            <>
              <div className="chart-title">{poll.name} {poll.unit} — {chartTimeLabel}</div>
              <MultiLineChart data={histRows} pollutants={[activePollutant]} mode="pollutant" width={900} height={hideAqiRow ? 130 : 280} pollutantColors={{ [activePollutant]: activeLv.color }} />
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
              <MultiLineChart data={histRows} pollutants={displayPollutantKeys} mode="pollutant" width={900} height={hideAqiRow ? 130 : 280} dotRadius={hideAqiRow ? 1.5 : undefined} dotStroke={!hideAqiRow} />
            </>
          )}
        </div>

      </div>

    </div>
  );
}
