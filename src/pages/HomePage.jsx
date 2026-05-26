import { useState, useEffect, useRef } from 'react';
import { LEVELS } from '../data/levels';
import { SENSORS } from '../data/sensors';
import { HOURLY_DATA } from '../data/timeseries';
import { SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI } from '../utils/aqi';
import MapPage from './MapPage';
import SymptomsPage from './SymptomsPage';
import ArchivePage from './ArchivePage';

const ALL_SVG_NUMS = Array.from({ length: 57 }, (_, i) => i + 5);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const NUM_SVG = 3;
const CYCLE_DURATION = 21000;
const STAGES = [
  { aS: 0.00, aE: 0.10, dS: 0.26, dE: 0.36 },
  { aS: 0.36, aE: 0.46, dS: 0.62, dE: 0.72 },
  { aS: 0.72, aE: 0.82, dS: 0.92, dE: 1.00 },
];

function svgState(p, { aS, aE, dS, dE }) {
  if (p < aS) return { scale: 1, opacity: 0 };
  if (p <= aE) { const t = (p - aS) / (aE - aS); return { scale: 1 - t, opacity: t }; }
  if (dS === null) return { scale: 0, opacity: 1 };
  if (p <= dS) return { scale: 0, opacity: 1 };
  if (p <= dE) { const t = (p - dS) / (dE - dS); return { scale: t, opacity: 1 - t }; }
  return { scale: 1, opacity: 0 };
}

function randomSvgPos() {
  return {
    left:  `${4  + Math.random() * 56}%`,
    top:   `${4  + Math.random() * 58}%`,
    width: `${18 + Math.random() * 28}%`,
  };
}

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

export default function HomePage({ lang, setPage, setSelectedSensor, hoveredNav, onHeroVisible }) {
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const lvl = LEVELS[globalAQI];
  const L = lang === 'it';

  const heroRef = useRef(null);

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

  const [progress, setProgress] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);
  const totalTimeRef = useRef(0);
  const prevCycleRef = useRef(0);

  const [svgPositions, setSvgPositions] = useState(() => [0, 1, 2].map(randomSvgPos));
  useEffect(() => { setSvgPositions([0, 1, 2].map(randomSvgPos)); }, [cycleIndex]);

  const [svgPool] = useState(() => {
    const pool = [];
    while (pool.length < 120) pool.push(...shuffle(ALL_SVG_NUMS));
    return pool;
  });

  useEffect(() => {
    let prev;
    let raf;
    const tick = (now) => {
      if (prev !== undefined) totalTimeRef.current += now - prev;
      prev = now;
      const t = totalTimeRef.current;
      const cycle = Math.floor(t / CYCLE_DURATION);
      setProgress((t % CYCLE_DURATION) / CYCLE_DURATION);
      if (cycle !== prevCycleRef.current) {
        prevCycleRef.current = cycle;
        setCycleIndex(cycle);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const items = [0, 1, 2].map(i => ({
    svgNum: svgPool[(cycleIndex * NUM_SVG + i) % svgPool.length],
  }));

  return (
    <div>
      {/* HERO */}
      <div ref={heroRef} style={{
        position: 'relative',
        height: '95vh',
        overflow: 'hidden',
        backgroundColor: 'var(--primary)',
        backgroundImage: "url('/assets/DSC01743.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }}>
        {/* SVG particle animations */}
        {items.map((item, i) => {
          const { scale, opacity } = svgState(progress, STAGES[i]);
          const pos = svgPositions[i];
          return (
            <div key={`${cycleIndex}-${i}`} style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              width: pos.width,
              height: pos.height,
              pointerEvents: 'none',
              zIndex: 1,
            }}>
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                  <filter id={`assemble-${i}`} x="-0.5" y="-0.5" width="2" height="2" colorInterpolationFilters="sRGB">
                    <feTurbulence type="turbulence" baseFrequency="0.75" numOctaves="4" seed={i * 11 + 3} result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale * 160}
                      xChannelSelector="R" yChannelSelector="G" result="displaced" />
                    <feColorMatrix in="displaced" type="matrix"
                      values="0.282 0 0 0 0.718  0.745 0 0 0 0.255  0.945 0 0 0 0.055  -0.33 -0.33 -0.33 1 0" />
                  </filter>
                </defs>
              </svg>
              <img
                src={`/assets/bw/Risorsa%20${item.svgNum}.svg`}
                alt=""
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: `url(#assemble-${i})`,
                  opacity,
                  display: 'block',
                }}
              />
            </div>
          );
        })}

        {/* Health rec / hover preview panel */}
        <div style={{
          position: 'absolute',
          top: '57%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          width: 'calc(100% / 6 * 1.5)',
          overflow: 'hidden',
        }}>
          {hoveredNav ? (
            <div style={{ position: 'relative', width: '100%', height: '250px', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100vw',
                transformOrigin: 'top left',
                transform: 'scale(0.1667)',
                pointerEvents: 'none',
                userSelect: 'none',
                background: 'var(--white)',
              }}>
                {hoveredNav === 'map'      && <MapPage lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} />}
                {hoveredNav === 'symptoms' && <SymptomsPage lang={lang} setPage={setPage} />}
                {hoveredNav === 'archive'  && <ArchivePage lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} />}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: lvl.color, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.65)', marginBottom: 4,
              }}>
                {L ? "QUALITÀ DELL'ARIA — " : 'AIR QUALITY — '}{L ? lvl.it : lvl.en}
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.65)', marginBottom: 3,
                }}>
                  {L ? 'PER POPOLAZIONE GENERALE:' : 'For general population:'}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.4, color: '#fff' }}>
                  {SUGGESTIONS[lvl.key]?.gen}
                </div>
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.65)', marginBottom: 3,
                }}>
                  {L ? 'PER POPOLAZIONE SENSIBILE:' : 'For sensitive population:'}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.4, color: '#fff' }}>
                  {SUGGESTIONS[lvl.key]?.sen}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hero nav buttons */}
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          gap: 8,
        }}>
          {[
            { id: 'map',      it: 'Mappa',    en: 'Map' },
            { id: 'archive',  it: 'Archivio', en: 'Archive' },
            { id: 'symptoms', it: 'Sintomi',  en: 'Symptoms' },
          ].map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              padding: '10px 24px',
              border: '1.5px solid rgba(255,255,255,0.75)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.9)',
              fontFamily: 'var(--font-title)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}>
              {L ? n.it : n.en}
            </button>
          ))}
        </div>
      </div>

      {/* Title / subtitle above video */}
      <section style={{ background: 'var(--primary)', padding: '56px 40px 40px' }}>
        <div style={{
          fontFamily: 'var(--font-title)',
          fontSize: 'clamp(48px, 7vw, 96px)',
          fontWeight: 400,
          textTransform: 'uppercase',
          lineHeight: 0.92,
          letterSpacing: '-0.02em',
          color: 'var(--white)',
          marginBottom: 24,
        }}>
          ARIA BENE<br />COMUNE
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 18,
          lineHeight: 1.55,
          color: 'rgba(255,255,255,0.75)',
          maxWidth: 600,
        }}>
          {L
            ? "Monitoraggio civico della qualità dell'aria a Taranto. Dati in tempo reale dai sensori installati dai cittadini."
            : 'Civic air quality monitoring in Taranto. Real-time data from citizen-installed sensors.'}
        </div>
      </section>

      {/* Video placeholder */}
      <section className="home-video-section" style={{ background: 'var(--primary)' }}>
        <div style={{
          width: '100%',
          maxHeight: 640,
          height: '56.25vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <span style={{
            fontFamily: 'var(--font-title)',
            fontSize: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}>
            {L ? 'Video — aggiungi /assets/Video_PreAudio.mov' : 'Video — add /assets/Video_PreAudio.mov'}
          </span>
        </div>
      </section>

      {/* Info items */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--gray)' }}>
        {INFO_ITEMS.map((item, i) => (
          <div key={i} style={{
            padding: '24px 28px',
            borderRight: i < 2 ? '1px solid var(--gray)' : 'none',
            background: 'var(--primary)',
          }}>
            <div style={{
              fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 400,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 10, color: 'var(--white)',
            }}>
              {L ? item.title_it : item.title_en}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--white)' }}>
              {L ? item.body_it : item.body_en}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
