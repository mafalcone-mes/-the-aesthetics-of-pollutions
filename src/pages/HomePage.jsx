import { useState, useEffect, useRef, useMemo } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { HOURLY_DATA } from '../data/timeseries';
import { SENSORS } from '../data/sensors';
import { getSensorAQI } from '../utils/aqi';
import BwFilmstrip from '../components/BwFilmstrip';
import HeroDots from '../components/HeroDots';
import MapPage from './MapPage';

const SAGOME = Object.keys(import.meta.glob('/public/assets/sagome/*.png')).map(
  p => p.replace('/public', '')
);

const SENSOR_PHOTOS = [
  '/assets/DSC01743.jpg',
  '/assets/Piazza-Fontana-1.jpg',
  '/assets/DSC01848.jpg',
  '/assets/DSC01743.jpg',
  '/assets/Piazza-Fontana-1.jpg',
  '/assets/DSC01848.jpg',
];
const CAROUSEL_ARROW = {
  flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: 'var(--white)', border: '1px solid var(--gray)',
  fontSize: 18, lineHeight: 1, cursor: 'pointer', color: 'var(--black)',
};
const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};


const SENSOR_GUIDE_URL = 'https://abcsensorguide.netlify.app/';

export default function HomePage({ lang, onHeroVisible, setPage, setSelectedSensor, reportsControl }) {
  const L = lang === 'it';
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const heroRef = useRef(null);
  const [hoveredSensor, setHoveredSensor] = useState(null);
  const [activeCard, setActiveCard] = useState(0);
  const carouselRef = useRef(null);
  const cardRefs = useRef([]);

  const centerCard = (idx) => {
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };
  const goToCard = (idx) => {
    const clamped = Math.max(0, Math.min(SENSORS.length - 1, idx));
    setActiveCard(clamped);
    centerCard(clamped);
  };

  // Keep activeCard in sync with whichever card the user has scrolled/swiped to —
  // only recompute once scrolling has settled, so cards don't flicker through
  // the active/scaled state while still in transit.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let settleTimer = null;
    const onScroll = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        let closest = 0, closestDist = Infinity;
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const r = card.getBoundingClientRect();
          const dist = Math.abs((r.left + r.width / 2) - center);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        setActiveCard(closest);
      }, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(settleTimer); };
  }, []);

  // Max AQI per hour (0–23) for the latest day in the dataset
  const hourlyAQI = useMemo(() => {
    if (!HOURLY_DATA.length) return Array(24).fill(0);
    const last = HOURLY_DATA[HOURLY_DATA.length - 1];
    const ly = last.dateObj.getFullYear();
    const lm = last.dateObj.getMonth();
    const ld = last.dateObj.getDate();
    const dayRows = HOURLY_DATA.filter(r => {
      const d = r.dateObj;
      return d.getFullYear() === ly && d.getMonth() === lm && d.getDate() === ld;
    });
    return Array.from({ length: 24 }, (_, h) => {
      const hrs = dayRows.filter(r => r.hour === h);
      return hrs.length ? Math.max(...hrs.map(r => r.aqi)) : null;
    });
  }, []);

  const currentHour = new Date().getHours();
  const currentAQI = hourlyAQI[currentHour] ?? globalAQI;

  // Per-sensor readings for the current hour of the latest day
  const currentHourSensors = useMemo(() => {
    if (!HOURLY_DATA.length) return SENSORS;
    const last = HOURLY_DATA[HOURLY_DATA.length - 1];
    const ly = last.dateObj.getFullYear();
    const lm = last.dateObj.getMonth();
    const ld = last.dateObj.getDate();
    return SENSORS.map(s => {
      const row = HOURLY_DATA.find(r =>
        r.sensorId === s.id &&
        r.dateObj.getFullYear() === ly &&
        r.dateObj.getMonth() === lm &&
        r.dateObj.getDate() === ld &&
        r.hour === currentHour
      );
      if (!row) return s;
      return { ...s, pm25: row.pm25, pm10: row.pm10, no2: row.no2, o3: row.o3, so2: row.so2, co: row.co, nh3: row.nh3, c6h6: row.c6h6 };
    });
  }, [currentHour]);

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
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        {/* Background layer — filter lives here only, so it doesn't affect
            the dots/title/etc. drawn on top of it */}
        <div className="home-hero-bg-drift" style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/assets/cielo.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          filter: 'saturate(1.6)',
          zIndex: -1,
        }} />

        <HeroDots level={globalAQI} />

        {/* Pollution-level circle, centered on the same point as the title */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '38%',
          transform: 'translate(-50%, -50%)',
          width: 'min(42vw, 48vh)',
          height: 'min(42vw, 48vh)',
          borderRadius: '50%',
          background: LEVELS[currentAQI].color,
          zIndex: 1,
        }} />

        {/* Title — centered on the same point as the circle, independent of the health rec below it */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '38%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          textAlign: 'center',
          width: '100%',
          padding: '0 40px',
          boxSizing: 'border-box',
        }}>
          <div className="home-hero-title-in" style={{
            fontFamily: "'Ronzino Variable', sans-serif",
            fontVariationSettings: `"BLND" ${Math.max(50, currentAQI * 200)}`,
            fontSize: 'clamp(64px, 14vw, 520px)',
            textTransform: 'uppercase',
            lineHeight: 0.88,
            letterSpacing: '-0.02em',
            color: 'var(--white)',
            WebkitTextStroke: '6px var(--primary)',
            paintOrder: 'stroke fill',
            whiteSpace: 'nowrap',
          }}>
            ARIA BENE<br />COMUNE
          </div>
        </div>

      </div>

      <BwFilmstrip />

      {/* STATEMENT */}
      <div style={{ background: 'var(--white)', padding: '100px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64 }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(24px, 3.6vw, 56px)',
          lineHeight: 1.15,
          color: 'var(--black)',
          maxWidth: '23em',
          textAlign: 'center',
        }}>
          {L
            ? "Aria Bene Comune è una piattaforma per il libero accesso ai dati sulla qualità dell'aria a Taranto. I dati sono prodotti da una rete di sensori di proprietà dei cittadini tarantini."
            : 'Aria Bene Comune is a platform for the free access to Air Quality data in Taranto. Data is produced by a community owned network of air quality sensors.'}
        </div>
      </div>

      {/* SENSORI ATTIVI — map-popup-style card carousel, right after the statement.
          The centered card scales up; its neighbours shrink and dim. */}
      <div style={{
        backgroundImage: "url('/assets/cielo.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div>

          {/* Carousel of map-popup-style cards, with prev/next arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '36px 24px' }}>
            <button
              type="button"
              onClick={() => goToCard(activeCard - 1)}
              aria-label={L ? 'Sensore precedente' : 'Previous sensor'}
              style={CAROUSEL_ARROW}
            >
              ‹
            </button>

            <div ref={carouselRef} className="about-sensor-carousel" style={{
              display: 'flex', alignItems: 'center', gap: 28,
              overflowX: 'auto', overflowY: 'hidden',
              scrollSnapType: 'x mandatory', scrollBehavior: 'smooth',
              flex: 1, padding: '64px calc(50% - 150px)',
            }}>
              {currentHourSensors.map((s, i) => {
                const aqiIdx = getSensorAQI(s);
                const lv = LEVELS[aqiIdx];
                const hovered = hoveredSensor === i;
                const isActive = i === activeCard;
                return (
                  <div
                    key={s.id}
                    ref={el => (cardRefs.current[i] = el)}
                    onClick={() => { setSelectedSensor?.(s); setPage?.('record'); }}
                    style={{
                      width: 300, flexShrink: 0, scrollSnapAlign: 'center',
                      background: 'var(--white)', border: '1px solid var(--gray)',
                      position: 'relative', overflow: 'hidden', cursor: 'pointer',
                      transform: `scale(${isActive ? 1.15 : 0.85})`,
                      opacity: isActive ? 1 : 0.5,
                      zIndex: isActive ? 2 : 1,
                      transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease',
                    }}
                    onMouseEnter={() => setHoveredSensor(i)}
                    onMouseLeave={() => setHoveredSensor(null)}
                  >
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--gray)' }}>
                      <span style={{ ...SUB_LABEL, color: 'var(--black)' }}>{s.name}</span>
                    </div>

                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: L ? 'Sensore' : 'Sensor',     value: s.name },
                          { label: L ? 'Posizione' : 'Location', value: s.location },
                        ].map((item, idx) => (
                          <div key={idx}>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>
                              {item.label}
                            </div>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.01em', color: 'var(--black)' }}>
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
                        {Object.keys(POLLUTANTS).map(k => (
                          <div key={k}>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>
                              {POLLUTANTS[k].name}
                            </div>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 400, letterSpacing: '-0.01em', color: 'var(--black)' }}>
                              {s[k] != null ? Number(s[k]).toFixed(1) : '—'}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 5 }}>
                          {L ? 'Scala AQI' : 'AQI Scale'}
                        </div>
                        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                          {LEVELS.map(l => (
                            <div key={l.key} style={{
                              flex: 1, height: 6, background: l.color,
                              outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                              outlineOffset: 1,
                              opacity: l.key === lv.key ? 1 : 0.4,
                            }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)' }}>
                          <span>1 — {L ? 'Buono' : 'Good'}</span>
                          <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Photo */}
                    <div style={{ aspectRatio: '3 / 2', overflow: 'hidden' }}>
                      <img
                        src={SENSOR_PHOTOS[i % SENSOR_PHOTOS.length]}
                        alt=""
                        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: 'center bottom' }}
                      />
                    </div>

                    {/* Hover takeover: whole card → gray, sagome silhouette, name in black, CTA in primary */}
                    {hovered && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'var(--gray)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 14, padding: 24, textAlign: 'center',
                      }}>
                        <img src={SAGOME[i % SAGOME.length]} alt="" style={{ width: '55%', maxHeight: '50%', objectFit: 'contain' }} />
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>
                          {s.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)' }}>
                          {L ? 'Apri record →' : 'Open record →'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => goToCard(activeCard + 1)}
              aria-label={L ? 'Sensore successivo' : 'Next sensor'}
              style={CAROUSEL_ARROW}
            >
              ›
            </button>
          </div>

          {/* CTA — after the cards, same cielo.png background as the carousel above */}
          <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
            <a
              href={SENSOR_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '22px 48px',
                background: 'var(--primary)',
                color: 'var(--white)',
                fontFamily: 'var(--font-title)',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {L ? 'Crea il tuo sensore' : 'Create your sensor'}
            </a>
          </div>
        </div>
      </div>

      {/* MAP — entire Map page, embedded after the last divider */}
      <MapPage lang={lang} setPage={setPage} setSelectedSensor={setSelectedSensor} reportsControl={reportsControl} />

    </div>
  );
}
