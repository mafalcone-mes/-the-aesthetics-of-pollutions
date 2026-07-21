import { useState, useEffect, useRef, useMemo } from 'react';
import { LEVELS } from '../data/levels';
import { HOURLY_DATA } from '../data/timeseries';
import { SENSORS } from '../data/sensors';
import { SUGGESTIONS } from '../data/symptoms';
import { getSensorAQI } from '../utils/aqi';
import Dither from '../components/Dither';
import ScrollReveal from '../components/ScrollReveal';

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
const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};
const POLL_KEYS = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co'];
const POLL_LABELS = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', o3: 'O₃', so2: 'SO₂', co: 'CO' };


const SENSOR_GUIDE_URL = 'https://abcsensorguide.netlify.app/';

export default function HomePage({ lang, onHeroVisible, setPage, setSelectedSensor }) {
  const L = lang === 'it';
  const heroRef = useRef(null);
  const [hoveredSensor, setHoveredSensor] = useState(null);

  const currentHour = new Date().getHours();

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
      {/* HERO BACKDROP — pinned behind everything for the whole page scroll
          (parallax: background + Dither stay put, content scrolls over it).
          z-index:0 here + the foreground wrapper below at z-index:1 is what
          actually guarantees stacking order — a negative z-index here gets
          painted behind body's own background instead of above it. */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        backgroundImage: "url('/assets/cielo.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}>
        <Dither
          waveColor={[0.9764705882352941, 0.45098039215686275, 0.08627450980392157]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.3}
          colorNum={16}
          pixelSize={1}
          waveAmplitude={0.3}
          waveFrequency={2}
          waveSpeed={0.5}
        />
      </div>

      {/* FOREGROUND — everything that scrolls over the fixed backdrop above.
          position:relative + z-index:1 pins it above the backdrop regardless
          of DOM/paint-order quirks with the fixed layer. */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* HERO SPACER — reserves the backdrop's height in normal flow so the
          rest of the page starts below it, then scrolls up and over it. Holds
          the title, which scrolls away with the rest of the content. */}
      <div ref={heroRef} style={{ minHeight: '100vh', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '96px',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          width: '100%',
          padding: '0 48px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            fontFamily: "'Ronzino Variable', sans-serif",
            fontVariationSettings: '"BLND" 100',
            fontSize: 'clamp(36px, 9.5vw, 260px)',
            textTransform: 'uppercase',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--white)',
            WebkitTextStroke: '3px var(--primary)',
            paintOrder: 'stroke fill',
            whiteSpace: 'nowrap',
          }}>
            ARIA BENE COMUNE
          </div>
        </div>
      </div>

      {/* STATEMENT */}
      <div style={{ background: 'var(--gray)', padding: '100px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64 }}>
        <ScrollReveal
          baseOpacity={0.1}
          enableBlur
          baseRotation={3}
          blurStrength={4}
          containerClassName="home-statement"
          textClassName="home-statement-text"
        >
          {L
            ? "Aria Bene Comune è una piattaforma per il libero accesso ai dati sulla qualità dell'aria a Taranto. I dati sono prodotti da una rete di sensori di proprietà dei cittadini tarantini."
            : 'Aria Bene Comune is a platform for the free access to Air Quality data in Taranto. Data is produced by a community owned network of air quality sensors.'}
        </ScrollReveal>
      </div>

      {/* SENSORI ATTIVI — all sensors visible at once in a grid, right after the statement. */}
      <div style={{
        backgroundImage: "url('/assets/cielo.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div>

          {/* Grid of map-popup-style cards — every sensor visible, no scrolling.
              Fixed two per row on desktop, image left / info right, collapsing to
              one column on narrow viewports (see .home-sensor-grid in index.css). */}
          <div className="home-sensor-grid" style={{
            display: 'grid',
            gap: 24,
            padding: 24,
          }}>
            {currentHourSensors.map((s, i) => {
              const aqiIdx = getSensorAQI(s);
              const lv = LEVELS[aqiIdx];
              const hovered = hoveredSensor === i;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`${L ? 'Apri record per' : 'Open record for'} ${s.name}`}
                  className="home-sensor-card"
                  onClick={() => { setSelectedSensor?.(s); setPage?.('record'); }}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    background: hovered ? 'var(--gray)' : 'var(--white)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={() => setHoveredSensor(i)}
                  onMouseLeave={() => setHoveredSensor(null)}
                  onFocus={() => setHoveredSensor(i)}
                  onBlur={() => setHoveredSensor(null)}
                >
                  {/* Photo — swaps to the sagome silhouette on hover */}
                  <div style={{ width: 360, flexShrink: 0, overflow: 'hidden', position: 'relative', minHeight: 260 }}>
                    <img
                      src={hovered ? SAGOME[i % SAGOME.length] : SENSOR_PHOTOS[i % SENSOR_PHOTOS.length]}
                      alt=""
                      style={{
                        width: '100%', height: '100%', display: 'block',
                        objectFit: hovered ? 'contain' : 'cover',
                        objectPosition: 'center bottom',
                        transition: 'opacity 0.2s',
                        background: hovered ? 'var(--gray)' : 'transparent',
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* Top: meta + pollutants + AQI scale */}
                    <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderBottom: '1px solid var(--gray)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                          { label: L ? 'Sensore' : 'Sensor',     value: s.name },
                          { label: L ? 'Posizione' : 'Location', value: s.location },
                          { label: L ? 'Quartiere' : 'District', value: s.district },
                        ].map((item, idx) => (
                          <div key={idx}>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 2 }}>
                              {item.label}
                            </div>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.01em', color: 'var(--black)' }}>
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pollutant values */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', marginTop: 20 }}>
                        {POLL_KEYS.map(k => (
                          <div key={k}>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 2 }}>
                              {POLL_LABELS[k]}
                            </div>
                            <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 400, letterSpacing: '-0.01em', color: 'var(--black)' }}>
                              {s[k] != null ? Number(s[k]).toFixed(1) : '—'}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AQI scale */}
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 6 }}>
                          {L ? 'Scala AQI' : 'AQI Scale'}
                        </div>
                        <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                          {LEVELS.map(l => (
                            <div key={l.key} style={{
                              flex: 1, height: 8, background: l.color,
                              outline: l.key === lv.key ? `2px solid ${l.color}` : 'none',
                              outlineOffset: 2,
                              opacity: l.key === lv.key ? 1 : 0.4,
                            }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray2)' }}>
                          <span>1 — {L ? 'Buono' : 'Good'}</span>
                          <span>6 — {L ? 'Estremo' : 'Extreme'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: health rec in level color */}
                    <div style={{ background: lv.color, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '14px 28px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                          {L ? `Qualità dell'aria — ${lv.it}` : `Air Quality — ${lv.en}`}
                          <br />{L ? 'Popolazione generale' : 'General population'}
                        </div>
                        {SUGGESTIONS[lv.key]?.gen && (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 400, lineHeight: 1.4, color: 'var(--white)' }}>
                            {L ? SUGGESTIONS[lv.key].gen.it : SUGGESTIONS[lv.key].gen.en}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '14px 28px' }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                          {L ? 'Popolazione sensibile' : 'Sensitive population'}
                        </div>
                        {SUGGESTIONS[lv.key]?.sen && (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 400, lineHeight: 1.4, color: 'var(--white)' }}>
                            {L ? SUGGESTIONS[lv.key].sen.it : SUGGESTIONS[lv.key].sen.en}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA — after the cards, same cielo.png background as the grid above */}
          <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
            <a
              href={SENSOR_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="home-cta-link"
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

      </div>
    </div>
  );
}
