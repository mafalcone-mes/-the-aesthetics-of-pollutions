import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI, getPollLevel } from '../utils/aqi';
import Sparkline from '../components/charts/Sparkline';
import MiniChart from '../components/charts/MiniChart';
import HeroDots from '../components/HeroDots';

// Network-average PM2.5 for the last 24 hourly timestamps
const allTimestamps = [...new Set(HOURLY_DATA.map(r => r.dateObj.getTime()))].sort();
const last24Ts = allTimestamps.slice(-24);
const SPARK = last24Ts.map(ts => {
  const rows = HOURLY_DATA.filter(r => r.dateObj.getTime() === ts);
  return Math.round(rows.reduce((s, r) => s + r.pm25, 0) / rows.length);
});
const SPARK_LABELS = last24Ts.map(ts => {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':00';
});

const INFO_ITEMS = [
  {
    title_it: 'Chi siamo', title_en: 'About us',
    body_it: "Aria Bene Comune è un'infrastruttura di proprietà collettiva per rivendicare la sovranità dei dati sulla qualità dell'aria di Taranto.",
    body_en: 'Aria Bene Comune is community-owned infrastructure to reclaim data sovereignty for the city of Taranto.',
  },
  {
    title_it: 'I sensori', title_en: 'The sensors',
    body_it: 'Sensori indipendenti installati dai cittadini. PM2.5, PM10, NO₂, O₃, SO₂, CO, NH₃ e C₆H₆ — misurati ogni 10 minuti.',
    body_en: 'Independent sensors installed by citizens. PM2.5, PM10, NO₂, O₃, SO₂, CO, NH₃, C₆H₆ — measured every 10 minutes.',
  },
  {
    title_it: 'Il rischio', title_en: 'The risk',
    body_it: 'A Taranto ogni 10 μg/m³ di PM10 in più corrisponde a un aumento della mortalità più che doppio rispetto alla media nazionale. (EpiAir2)',
    body_en: 'In Taranto, every 10 μg/m³ increase in PM10 doubles the mortality rate compared to the national average. (EpiAir2)',
  },
];

export default function HomePage({ lang, setPage, setSelectedSensor }) {
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const lvl = LEVELS[globalAQI];
  const L = lang === 'it';

  const STATUS = [
    { val: `${SENSORS.length}/8`, label: L ? 'Sensori attivi' : 'Active sensors' },
    { val: '8',                    label: L ? 'Inquinanti'     : 'Pollutants' },
    { val: 'Live',                 label: L ? 'Aggiornamento'  : 'Update' },
  ];

  return (
    <div>
      <div className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-left">
            <HeroDots level={globalAQI} />
            <div className="home-hero-copy">
              <div className="hero-tagline">
                {L
                  ? (
                    <>
                      <span className="tagline-lead">ARIA BENE</span>
                      <span className="hero-subtitle">Rete indipendente di monitoraggio della qualità dell'aria. Dati in tempo reale dai sensori della comunità.</span>
                      <span className="tagline-rest">COMUNE</span>
                    </>
                  )
                  : (
                    <>
                      <span className="tagline-lead">TARANTO</span>
                      <span className="hero-subtitle">Independent air quality monitoring network. Real-time data from community sensors.</span>
                      <span className="tagline-rest">AIR TODAY</span>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">
        <span className="section-label-text">
          {L ? 'Rete sensori' : 'Sensor Network'} — {SENSORS.length} {L ? 'stazioni attive' : 'active stations'}
        </span>
        <span className="section-label-action" onClick={() => setPage('map')}>
          {L ? 'Vedi mappa →' : 'View map →'}
        </span>
      </div>

      <div className="home-sensors-layout">
        <aside className="home-current-status">
          <div className="home-current-status-title">{L ? 'Stato generale' : 'General status'}</div>
          <div className="hero-aqi-block">
            <div className="hero-aqi-num" style={{ color: lvl.color }}>{globalAQI + 1}</div>
            <div className="hero-aqi-label" style={{ color: lvl.color }}>{L ? lvl.it : lvl.en}</div>
            <div>
              <div className="chart-title" style={{ marginBottom: 8 }}>
                {L ? 'PM2.5 — ultimi 24h (media rete)' : 'PM2.5 — last 24h (network avg)'}
              </div>
              <div style={{ height: 80 }}><Sparkline data={SPARK} color={lvl.color} labels={SPARK_LABELS} /></div>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--black)', marginTop: 12, lineHeight: 1.65, maxWidth: 420 }}>
              {SUGGESTIONS[lvl.key]?.gen}
            </div>
          </div>
          <div className="hero-status-bar">
            {STATUS.map((s, i) => (
              <div className="hero-status-item" key={i}>
                <div className="hero-status-val">{s.val}</div>
                <div className="hero-status-key">{s.label}</div>
              </div>
            ))}
          </div>
        </aside>

        <div className="home-sensors">
          {SENSORS.map((s) => {
            const ai = getSensorAQI(s);
            const lv = LEVELS[ai];
            const sensorRows = HOURLY_DATA.filter(r => r.sensorId === s.id);
            const sparkVals = sensorRows.slice(-7).map(r => r.pm25);
            return (
              <div key={s.id} className="sensor-card" onClick={() => { setSelectedSensor(s); setPage('record'); }}>
                <div className="sensor-card-top">
                  <div>
                    <div className="sensor-name">{s.name}</div>
                    <div className="sensor-location">{s.location}</div>
                  </div>
                  <div className="sensor-aqi-badge" style={{ background: lv.color }}>{ai + 1}</div>
                </div>
                <MiniChart color={lv.color} values={sparkVals} />
                <div className="sensor-pollutants">
                  {['pm25', 'pm10', 'no2', 'co', 'nh3', 'c6h6'].map((k) => {
                    const li = getPollLevel(k, s[k] || 0);
                    return (
                      <div key={k} className="pollutant-chip">
                        <div className="pollutant-chip-name">{POLLUTANTS[k].name}</div>
                        <div className="pollutant-chip-val" style={{ color: LEVELS[li].color }}>{s[k]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '2px solid #111010' }}>
        {INFO_ITEMS.map((item, i) => (
          <div key={i} style={{ padding: '24px 28px', borderRight: i < 2 ? '2px solid #111010' : 'none' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--black)' }}>
              {L ? item.title_it : item.title_en}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65 }}>
              {L ? item.body_it : item.body_en}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
