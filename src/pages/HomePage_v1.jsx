import { LEVELS } from '../data/levels';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI } from '../utils/aqi';
import HeroDots from '../components/HeroDots';
import MapPage from './MapPage';

const INFO_ITEMS = [
  {
    title_it: 'Chi siamo', title_en: 'About us',
    body_it: "Aria Bene Comune e un'infrastruttura di proprieta collettiva per rivendicare la sovranita dei dati sulla qualita dell'aria di Taranto.",
    body_en: 'Aria Bene Comune is community-owned infrastructure to reclaim data sovereignty for the city of Taranto.',
  },
  {
    title_it: 'I sensori', title_en: 'The sensors',
    body_it: 'Sensori indipendenti installati dai cittadini. PM2.5, PM10, NO2, O3, SO2, CO, NH3 e C6H6 - misurati ogni 10 minuti.',
    body_en: 'Independent sensors installed by citizens. PM2.5, PM10, NO2, O3, SO2, CO, NH3, C6H6 - measured every 10 minutes.',
  },
  {
    title_it: 'Il rischio', title_en: 'The risk',
    body_it: 'A Taranto ogni 10 ug/m3 di PM10 in piu corrisponde a un aumento della mortalita piu che doppio rispetto alla media nazionale. (EpiAir2)',
    body_en: 'In Taranto, every 10 ug/m3 increase in PM10 doubles the mortality rate compared to the national average. (EpiAir2)',
  },
];

export default function HomePage({ lang, setPage, setSelectedSensor }) {
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const lvl = LEVELS[globalAQI];
  const L = lang === 'it';
  const latestTs = [...new Set(HOURLY_DATA.map(r => r.dateObj.getTime()))].sort().at(-1);
  const latestRows = HOURLY_DATA.filter(r => r.dateObj.getTime() === latestTs);
  const avgTemp = latestRows.length
    ? Math.round(latestRows.reduce((sum, r) => sum + (r.temp || 0), 0) / latestRows.length)
    : 0;
  const avgHum = latestRows.length
    ? Math.round(latestRows.reduce((sum, r) => sum + (r.hum || 0), 0) / latestRows.length)
    : 0;
  const dayLabel = latestTs
    ? new Date(latestTs).toLocaleDateString(L ? 'it-IT' : 'en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    })
    : '';

  return (
    <div>
      <div className="home-hero">
        <HeroDots level={globalAQI} />
        <div className="home-hero-content">

            <div className="home-hero-main">
              <div className="home-hero-left">
                <div className="home-hero-copy">
                  <div className="hero-tagline">
                    {L
                      ? (
                        <>
                          <span className="tagline-lead">ARIA BENE <br /> COMUNE</span>
                        </>
                      )
                      : (
                        <>
                          <span className="tagline-lead">TARANTO</span>
                          <span className="tagline-rest">AIR</span>
                          <span className="tagline-rest">TODAY</span>
                        </>
                      )}
                  </div>
                </div>
              </div>

              <div className="home-hero-middle">
                <div className="hero-center-art-wrap">
                    <img className="hero-center-art" src="/assets/TARASVIVE.png" alt="TARASVIVE logo" />
                </div>
              </div>

            <div className="home-hero-right">
              <div className="hero-meta-row">
                <span className="hero-meta-pill hero-meta-pill-primary">{L ? 'GIORNO' : 'Day'}: {dayLabel}</span>
                <span className="hero-meta-pill hero-meta-pill-primary">{L ? 'TEMPERATURA' : 'Temperature'}: {avgTemp}°C</span>
                <span className="hero-meta-pill hero-meta-pill-primary">{L ? 'UMIDITA' : 'Humidity'}: {avgHum}%</span>
                <span className="hero-meta-pill hero-meta-pill-primary">{L ? 'SENSORI ATTIVI' : 'Active sensors'}: {SENSORS.length}/8</span>
                <div className="hero-meta-gap" style={{ height: '40px' }} />
                <span className="hero-meta-pill hero-meta-pill-level" style={{ backgroundColor: lvl.color, color: 'var(--white)' }}>
                  {L ? "LIVELLO QUALITA DELL'ARIA" : 'Air quality level'}: {L ? lvl.it : lvl.en}
                </span>
                <div className="hero-meta-reco" style={{ backgroundColor: lvl.color, color: 'var(--white)' }}>
                  <div className="hero-meta-reco-body">
                    <div className="hero-meta-reco-item">
                      <span className="hero-meta-reco-label">{L ? 'PER POPOLAZIONE GENERALE:' : 'For general population:'}</span>
                      <span className="hero-meta-reco-value">{SUGGESTIONS[lvl.key]?.gen}</span>
                    </div>
                    <div className="hero-meta-reco-item">
                      <span className="hero-meta-reco-label">{L ? 'PER POPOLAZIONE SENSIBILE:' : 'For sensitive population:'}</span>
                      <span className="hero-meta-reco-value">{SUGGESTIONS[lvl.key]?.sen}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--gray)' }}>
        {INFO_ITEMS.map((item, i) => (
          <div key={i} style={{ padding: '24px 28px', borderRight: i < 2 ? '1px solid var(--gray)' : 'none', background: 'var(--primary)' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--white)' }}>
              {L ? item.title_it : item.title_en}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--white)' }}>
              {L ? item.body_it : item.body_en}
            </div>
          </div>
        ))}
      </div>

      <MapPage lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} />

      <section className="home-video-section" aria-label={L ? 'Video informativo' : 'Informational video'}>
        <video controls playsInline preload="metadata">
          <source src="/assets/Video_PreAudio.mov" type="video/mp4" />
          {L ? 'Il tuo browser non supporta il tag video.' : 'Your browser does not support the video tag.'}
        </video>
      </section>
    </div>
  );
}
