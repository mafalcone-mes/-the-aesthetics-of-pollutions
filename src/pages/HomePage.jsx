import { useState, useEffect, useRef } from 'react';
import { LEVELS } from '../data/levels';
import { SENSORS } from '../data/sensors';
import { SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI } from '../utils/aqi';
import MapPage from './MapPage';
import SymptomsPage from './SymptomsPage';
import ArchivePage from './ArchivePage';

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

const NAV_BUTTONS = [
  { id: 'map',      it: 'Mappa',    en: 'Map' },
  { id: 'symptoms', it: 'Sintomi',  en: 'Symptoms' },
  { id: 'archive',  it: 'Archivio', en: 'Archive' },
];

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

export default function HomePage({ lang, setPage, setSelectedSensor, onHeroVisible }) {
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const lvl = LEVELS[globalAQI];
  const L = lang === 'it';

  const heroRef = useRef(null);
  const previewRef = useRef(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [previewScale, setPreviewScale] = useState(0.25);

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

  useEffect(() => {
    const update = () => {
      if (previewRef.current) {
        setPreviewScale(previewRef.current.offsetWidth / window.innerWidth);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div>
      {/* HERO */}
      <div ref={heroRef} style={{ background: 'var(--primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* TOP: title + subtitle + buttons */}
        <div style={{ padding: '48px 40px 0' }}>
          <div style={{
            fontFamily: 'var(--font-title)',
            fontSize: 'clamp(64px, 8vw, 120px)',
            fontWeight: 400, textTransform: 'uppercase',
            lineHeight: 0.9, letterSpacing: '-0.02em',
            color: 'var(--white)', marginBottom: 20,
          }}>
            ARIA BENE<br />COMUNE
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 16,
            lineHeight: 1.55, color: 'rgba(255,255,255,0.7)',
            maxWidth: 520, marginBottom: 40,
          }}>
            {L
              ? "Monitoraggio civico della qualità dell'aria a Taranto. Dati in tempo reale dai sensori installati dai cittadini."
              : 'Civic air quality monitoring in Taranto. Real-time data from citizen-installed sensors.'}
          </div>

          {/* Buttons: left · center · right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 32 }}>
            {NAV_BUTTONS.map(n => (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                onMouseEnter={() => setHoveredButton(n.id)}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  padding: '10px 32px',
                  border: '1.5px solid rgba(255,255,255,0.75)',
                  background: hoveredButton === n.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                {L ? n.it : n.en}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: health rec or live page preview */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px 48px' }}>
          <div ref={previewRef} style={{ width: 400 }}>
            {hoveredButton ? (
              <div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden', background: 'var(--white)' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100vw',
                  transformOrigin: 'top left',
                  transform: `scale(${previewScale})`,
                  pointerEvents: 'none', userSelect: 'none',
                  background: 'var(--white)',
                }}>
                  {hoveredButton === 'map'      && <MapPage      lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} />}
                  {hoveredButton === 'symptoms' && <SymptomsPage lang={lang} setPage={setPage} />}
                  {hoveredButton === 'archive'  && <ArchivePage  lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} />}
                </div>
              </div>
            ) : (
              <div style={{ background: lvl.color, padding: '24px 28px', textAlign: 'center' }}>
                <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.65)', marginBottom: 10 }}>
                  {L ? "QUALITÀ DELL'ARIA" : 'AIR QUALITY'} — {L ? lvl.it : lvl.en}
                </div>
                <div style={{
                  fontFamily: 'Epilogue', fontSize: 48, fontWeight: 400,
                  textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 20,
                }}>
                  {L ? lvl.it : lvl.en}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.65)', marginBottom: 5 }}>
                    {L ? 'Popolazione generale' : 'General population'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: '#fff' }}>
                    {SUGGESTIONS[lvl.key]?.gen}
                  </div>
                </div>
                <div>
                  <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.65)', marginBottom: 5 }}>
                    {L ? 'Popolazione sensibile' : 'Sensitive population'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: '#fff' }}>
                    {SUGGESTIONS[lvl.key]?.sen}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INFO ITEMS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {INFO_ITEMS.map((item, i) => (
          <div key={i} style={{
            padding: '24px 28px',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.15)' : 'none',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            background: 'var(--primary)',
          }}>
            <div style={{
              fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 400,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 10, color: 'var(--white)',
            }}>
              {L ? item.title_it : item.title_en}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)' }}>
              {L ? item.body_it : item.body_en}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
