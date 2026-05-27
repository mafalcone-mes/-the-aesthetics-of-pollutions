import { useState, useEffect, useRef, useMemo } from 'react';
import { LEVELS } from '../data/levels';
import { SENSORS } from '../data/sensors';
import { getSensorAQI } from '../utils/aqi';
import { SUGGESTIONS } from '../data/symptoms';
import HeroDots from '../components/HeroDots';
import MapPage from './MapPage';
import SymptomsPage from './SymptomsPage';
import ArchivePage from './ArchivePage';

const SAGOME = Object.keys(import.meta.glob('/public/assets/sagome/*.png')).map(
  p => p.replace('/public', '')
);

const INFO_ITEMS = [
  {
    title_it: 'Chi siamo', title_en: 'About us',
    body_it: "Aria Bene Comune è un'infrastruttura di proprietà collettiva per rivendicare la sovranità dei dati sulla qualità dell'aria di Taranto.",
    body_en: 'Aria Bene Comune is community-owned infrastructure to reclaim data sovereignty for the city of Taranto.',
  },
  {
    title_it: 'I sensori', title_en: 'The sensors',
    body_it: 'Sensori indipendenti installati dai cittadini. PM2.5, PM10, NO2, O3, SO2, CO, NH3 e C6H6 — misurati ogni 10 minuti.',
    body_en: 'Independent sensors installed by citizens. PM2.5, PM10, NO2, O3, SO2, CO, NH3, C6H6 — measured every 10 minutes.',
  },
  {
    title_it: 'Il rischio', title_en: 'The risk',
    body_it: 'A Taranto ogni 10 μg/m³ di PM10 in più corrisponde a un aumento della mortalità più che doppio rispetto alla media nazionale. (EpiAir2)',
    body_en: 'In Taranto, every 10 μg/m³ increase in PM10 doubles the mortality rate compared to the national average. (EpiAir2)',
  },
];

const NAV_STRIPS = [
  {
    id: 'map',
    it: 'Mappa', en: 'Map',
    desc_it: 'Sensori in tempo reale sulla città',
    desc_en: 'Real-time sensors across the city',
  },
  {
    id: 'symptoms',
    it: 'Sintomi', en: 'Symptoms',
    desc_it: 'Effetti sulla salute per zona e inquinante',
    desc_en: 'Health effects by zone and pollutant',
  },
  {
    id: 'archive',
    it: 'Archivio', en: 'Archive',
    desc_it: 'Serie storiche e dati scaricabili',
    desc_en: 'Historical series and downloadable data',
  },
];

export default function HomePage({ lang, setPage, setSelectedSensor, onHeroVisible }) {
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const L         = lang === 'it';
  const heroImg   = useMemo(() => SAGOME[Math.floor(Math.random() * SAGOME.length)], []);

  const heroRef    = useRef(null);
  const previewRef = useRef(null);
  const [hoveredStrip, setHoveredStrip] = useState(null);
  const [previewScale, setPreviewScale] = useState(0.4);

  useEffect(() => {
    const update = () => {
      if (previewRef.current)
        setPreviewScale(previewRef.current.offsetWidth / window.innerWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!onHeroVisible) return;
    onHeroVisible(true);
    const handleScroll = () => {
      if (!heroRef.current) return;
      onHeroVisible(heroRef.current.getBoundingClientRect().bottom > 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onHeroVisible]);

  return (
    <div>
      {/* HERO */}
      <div
        ref={heroRef}
        style={{
          backgroundImage: "url('/assets/cielo.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <HeroDots level={globalAQI} />

        {/* Page preview — appears on right half when hovering a strip */}
        {hoveredStrip && (
          <div
            ref={previewRef}
            style={{
              position: 'absolute',
              top: '65%', left: '72%',
              transform: 'translate(-50%, -50%)',
              width: '38%', height: '55vh',
              overflow: 'hidden', zIndex: 3, pointerEvents: 'none',
            }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: '100vw',
              transformOrigin: 'top left',
              transform: `scale(${previewScale})`,
              pointerEvents: 'none', userSelect: 'none',
              background: 'var(--white)',
            }}>
              {hoveredStrip === 'map'      && <MapPage      lang={lang} setPage={() => {}} setSelectedSensor={() => {}} />}
              {hoveredStrip === 'symptoms' && <SymptomsPage lang={lang} setPage={() => {}} />}
              {hoveredStrip === 'archive'  && <ArchivePage  lang={lang} setPage={() => {}} setSelectedSensor={() => {}} />}
            </div>
          </div>
        )}

        {/* Hero photo */}
        <img
          src={heroImg}
          alt=""
          style={{
            position: 'absolute',
            top: '2%', right: 0, bottom: '2%',
            height: '96%',
            width: 'auto',
            objectFit: 'cover',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, padding: '48px 40px 40px' }}>

          {/* Title */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13vw',
            fontWeight: 400,
            textTransform: 'uppercase',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--white)',
          }}>
            <div>ARIA BENE</div>
            <div>COMUNE</div>
          </div>

          {/* subtitle */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(14px, 1.4vw, 20px)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.5,
            }}>
              {L
                ? "Monitoraggio civico della qualità dell'aria a Taranto. Dati in tempo reale dai sensori installati dai cittadini."
                : 'Civic air quality monitoring in Taranto. Real-time data from citizen-installed sensors.'}
            </div>
          </div>

          {/* Nav strips + health rec */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', marginTop: 32, alignItems: 'stretch' }}>

            {/* Strips */}
            <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
            {NAV_STRIPS.map((n, i) => {
              const isHov = hoveredStrip === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  onMouseEnter={() => setHoveredStrip(n.id)}
                  onMouseLeave={() => setHoveredStrip(null)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 24px 0 96px',
                    background: isHov ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.22)',
                    borderBottom: i === NAV_STRIPS.length - 1 ? '1px solid rgba(255,255,255,0.22)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    width: '28%',
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(28px, 4vw, 60px)',
                      fontWeight: 400,
                      textTransform: 'uppercase',
                      letterSpacing: '-0.01em',
                      color: 'var(--white)',
                      lineHeight: 1,
                      marginBottom: 5,
                    }}>
                      {L ? n.it : n.en}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1,
                    }}>
                      {L ? n.desc_it : n.desc_en}
                    </div>
                  </div>
                </button>
              );
            })}
            </div>

            {/* Health recommendation */}
            {(() => {
              const lv = LEVELS[globalAQI];
              const sug = SUGGESTIONS[lv.key];
              return (
                <div style={{
                  width: 340, flexShrink: 0, alignSelf: 'flex-start',
                  marginLeft: '10%',
                  background: lv.color, padding: '16px 18px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  textAlign: 'center', alignItems: 'center',
                }}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
                    {L ? "Qualità dell'aria" : 'Air Quality'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
                    {L ? lv.it : lv.en}
                  </div>
                  {[
                    { who: L ? 'Popolazione generale' : 'General population', text: sug?.gen },
                    { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: sug?.sen },
                  ].map((s, i) => s.text && (
                    <div key={i}>
                      <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>{s.who}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {/* INFO ITEMS — editorial */}
      <div style={{ background: 'var(--primary)', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        {INFO_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: '0 80px',
              alignItems: 'start',
              padding: '52px 40px',
              borderBottom: i < INFO_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3vw, 52px)',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              lineHeight: 1.05,
              color: 'var(--white)',
            }}>
              {L ? item.title_it : item.title_en}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(16px, 1.4vw, 22px)',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.72)',
            }}>
              {L ? item.body_it : item.body_en}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
