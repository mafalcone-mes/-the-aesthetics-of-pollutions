import { useState, useEffect, useRef, useMemo } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { HOURLY_DATA } from '../data/timeseries';
import { SENSORS } from '../data/sensors';
import { getSensorAQI } from '../utils/aqi';
import { SUGGESTIONS } from '../data/symptoms';

const SAGOME = Object.keys(import.meta.glob('/public/assets/sagome/*.png')).map(
  p => p.replace('/public', '')
);

const THRESHOLD_CATS = [
  { key: 'particulates', it: 'Particolato',   en: 'Particulates',  pollutants: ['pm25', 'pm10'] },
  { key: 'gaseous',      it: 'Gas irritanti', en: 'Gaseous',        pollutants: ['no2', 'o3', 'so2'] },
  { key: 'systemic',     it: 'Sistemici',     en: 'Systemic',       pollutants: ['co', 'nh3', 'c6h6'] },
];

const LEVEL_DESCS = {
  buono:                 { it: 'Nessun rischio significativo per la salute.',                                    en: 'No significant health risk.' },
  sufficiente:           { it: 'Rischio molto basso; la popolazione sensibile può avvertire lievi effetti.',     en: 'Very low risk; sensitive groups may experience mild effects.' },
  mediocre:              { it: 'Rischio moderato; le persone sensibili possono avvertire effetti sulla salute.',  en: 'Moderate risk; sensitive people may experience health effects.' },
  scarso:                { it: 'La salute può risentirne; raccomandata prudenza per tutti.',                      en: 'Health may be affected; caution recommended for everyone.' },
  'molto-scarso':        { it: "Effetti sulla salute probabili; limitare le attività all'aperto.",               en: 'Health effects likely; limit outdoor activities.' },
  'estremamente-scarso': { it: "Emergenza sanitaria; evitare le attività all'aperto.",                           en: 'Health emergency; avoid outdoor activities.' },
};

const POLLUTANT_DESCS = {
  pm25:  { it: "Particolato fine (⌀ < 2.5 µm). Penetra nei polmoni e nel flusso sanguigno; principale causa di malattie cardiovascolari e respiratorie.", en: "Fine particulate matter (⌀ < 2.5 µm). Penetrates deep into lungs and bloodstream; a leading cause of pollution-related cardiovascular and respiratory disease." },
  pm10:  { it: "Particolato (⌀ < 10 µm). Emesso da traffico e industrie; irrita le vie respiratorie superiori.", en: "Particulate matter (⌀ < 10 µm). Emitted by traffic and industry; irritates the upper airways." },
  no2:   { it: "Biossido di azoto. Da traffico e combustioni; irrita le vie respiratorie e precursore dell'ozono.", en: "Nitrogen dioxide. From traffic and combustion; irritates airways and is a precursor to ground-level ozone." },
  o3:    { it: "Ozono troposferico. Formato per reazione fotochemica; causa irritazione polmonare e riduzione della funzione respiratoria.", en: "Tropospheric ozone. Forms via photochemical reaction; causes lung irritation and reduced respiratory function." },
  so2:   { it: "Biossido di zolfo. Emesso da impianti industriali — fonte storica a Taranto; irrita le vie respiratorie.", en: "Sulphur dioxide. Emitted by industrial plants; irritates airways and contributes to acid rain." },
  co:    { it: "Monossido di carbonio. Gas inodore da combustione incompleta; riduce il trasporto di ossigeno nel sangue.", en: "Carbon monoxide. Odourless gas from incomplete combustion; reduces oxygen transport in the blood." },
  nh3:   { it: "Ammoniaca. Emessa da allevamenti e fertilizzanti; contribuisce alla formazione di particolato secondario.", en: "Ammonia. From livestock farming and fertilisers; contributes to secondary particulate formation." },
  c6h6:  { it: "Benzene. Idrocarburo aromatico nei fumi industriali; cancerogeno di gruppo 1 IARC senza soglia di sicurezza nota.", en: "Benzene. Aromatic hydrocarbon in industrial emissions; IARC Group 1 carcinogen with no known safe threshold." },
};

const fRange = ([lo, hi]) => `${lo}–${hi >= 999 ? '∞' : hi}`;

export default function HomePage({ lang, setPage, setSelectedSensor, onHeroVisible }) {
  const L = lang === 'it';
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const [hoveredSensor, setHoveredSensor] = useState(null);
  const heroRef = useRef(null);

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
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: "url('/assets/cielo.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Title */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '40px 40px 40px',
        }}>
          <div style={{
            fontFamily: 'var(--font-title)',
            fontSize: 'clamp(56px, 11vw, 160px)',
            fontWeight: 400,
            textTransform: 'uppercase',
            lineHeight: 0.88,
            letterSpacing: '-0.02em',
            color: 'var(--white)',
          }}>
            ARIA BENE COMUNE
          </div>
        </div>

        {/* 24-hour columns — fills the rest of the hero */}
        <div style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
        }}>
          {hourlyAQI.map((aqiIdx, h) => {
            const levelColor = aqiIdx !== null ? LEVELS[aqiIdx].color : 'var(--gray)';
            const isCurrent = h === currentHour;
            return (
              <div
                key={h}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: `linear-gradient(to bottom, ${levelColor} 0%, ${levelColor} 70%, var(--primary) 100%)`,
                  borderRight: h < 23 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                  paddingTop: 10,
                  boxSizing: 'border-box',
                  filter: isCurrent ? 'none' : 'saturate(0.6) brightness(0.85)',
                  transition: 'filter 0.3s',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-title)',
                  fontSize: 'clamp(6px, 0.75vw, 11px)',
                  fontWeight: isCurrent ? 700 : 600,
                  color: isCurrent ? '#fff' : 'rgba(255,255,255,0.55)',
                  letterSpacing: '0.02em',
                  userSelect: 'none',
                }}>
                  {String(h).padStart(2, '0') + ':00'}
                </span>
                {isCurrent && (
                  <div style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#fff',
                    marginTop: 5,
                    opacity: 0.9,
                  }} />
                )}
              </div>
            );
          })}

          {/* Health recommendation circle — current hour AQI */}
          {(() => {
            const currentAQI = hourlyAQI[currentHour] ?? globalAQI;
            const lv = LEVELS[currentAQI];
            const sug = SUGGESTIONS[lv.key];
            return (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 380,
                height: 380,
                borderRadius: '50%',
                background: lv.color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textAlign: 'center',
                padding: '36px',
                boxSizing: 'border-box',
                zIndex: 4,
                pointerEvents: 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                  {L ? "Qualità dell'aria" : 'Air Quality'}
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 28, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
                  {L ? lv.it : lv.en}
                </div>
                <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.25)', margin: '2px 0' }} />
                {sug?.gen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                      {L ? 'Tutti' : 'Everyone'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.9)' }}>
                      {sug.gen}
                    </div>
                  </div>
                )}
                {sug?.sen && sug.sen !== sug.gen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                      {L ? 'Soggetti sensibili' : 'Sensitive groups'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.9)' }}>
                      {sug.sen}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </div>

      {/* STATEMENT */}
      <div style={{ background: 'var(--white)', padding: '100px 48px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(36px, 5.5vw, 88px)',
          lineHeight: 1.15,
          color: 'var(--black)',
          maxWidth: '16em',
          textAlign: 'center',
        }}>
          {L
            ? "Aria Bene Comune è una piattaforma per il libero accesso ai dati sulla qualità dell'aria a Taranto. I dati sono prodotti da una rete di sensori di proprietà dei cittadini tarantini."
            : 'Aria Bene Comune is a platform for the free access to Air Quality data in Taranto. Data is produced by a community owned network of air quality sensors.'}
        </div>
      </div>

      {/* SENSOR GRID */}
      {(() => {
        const SENSOR_PHOTOS = [
          '/assets/DSC01743.jpg',
          '/assets/Piazza-Fontana-1.jpg',
          '/assets/DSC01848.jpg',
          '/assets/DSC01743.jpg',
          '/assets/Piazza-Fontana-1.jpg',
          '/assets/DSC01848.jpg',
        ];
        const INSTALL_DATES = {
          19: { it: 'Marzo 2022', en: 'March 2022' },
          20: { it: 'Giugno 2022', en: 'June 2022' },
          21: { it: 'Gennaio 2023', en: 'January 2023' },
          22: { it: 'Aprile 2023', en: 'April 2023' },
          37: { it: 'Settembre 2023', en: 'September 2023' },
          38: { it: 'Febbraio 2024', en: 'February 2024' },
        };
        const POLL_KEYS = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co'];
        const POLL_LABELS = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', o3: 'O₃', so2: 'SO₂', co: 'CO' };
        return (
          <div style={{ background: 'var(--white)', borderTop: '1px solid var(--gray)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
              padding: 24,
            }}>
              {SENSORS.map((s, i) => {
                const aqiIdx = getSensorAQI(s);
                const lv = LEVELS[aqiIdx];
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSensor(s); setPage('record'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      background: 'var(--white)',
                      border: '1px solid var(--gray)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray)'; setHoveredSensor(i); }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; setHoveredSensor(null); }}
                  >
                    {/* Photo */}
                    <div style={{
                      width: 360,
                      flexShrink: 0,
                      overflow: 'hidden',
                      position: 'relative',
                      minHeight: 260,
                    }}>
                      <img
                        src={hoveredSensor === i ? SAGOME[i % SAGOME.length] : SENSOR_PHOTOS[i]}
                        alt=""
                        style={{
                          width: '100%', height: '100%', display: 'block',
                          objectFit: hoveredSensor === i ? 'contain' : 'cover',
                          objectPosition: 'center bottom',
                          transition: 'opacity 0.2s',
                          background: hoveredSensor === i ? 'var(--gray)' : 'transparent',
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                      {/* Top: meta + pollutants + AQI scale */}
                      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderBottom: `1px solid var(--gray)` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {[
                            { label: L ? 'Sensore' : 'Sensor',          value: s.name },
                            { label: L ? 'Posizione' : 'Location',      value: s.location },
                            { label: L ? 'Quartiere' : 'District',      value: s.district },
                            { label: L ? 'Installazione' : 'Installed', value: INSTALL_DATES[s.id]?.[L ? 'it' : 'en'] ?? '—' },
                          ].map((item, idx) => (
                            <div key={idx}>
                              <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>
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
                              <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>
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
                          <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 6 }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)' }}>
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
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 400, lineHeight: 1.4, color: '#fff' }}>
                              {SUGGESTIONS[lv.key].gen}
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '14px 28px' }}>
                          <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                            {L ? 'Popolazione sensibile' : 'Sensitive population'}
                          </div>
                          {SUGGESTIONS[lv.key]?.sen && (
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 400, lineHeight: 1.4, color: '#fff' }}>
                              {SUGGESTIONS[lv.key].sen}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* VIDEO */}
      <div style={{ background: 'var(--white)', padding: '48px 40px' }}>
        <video
          src="/assets/Video_PreAudio.mov"
          controls
          playsInline
          style={{ width: '100%', display: 'block' }}
        />
      </div>

      {/* THRESHOLD LIMITS */}
      <div style={{ background: 'var(--white)', borderTop: '1px solid var(--gray)' }}>

        {/* Header */}
        <div style={{ padding: '52px 40px', borderBottom: '1px solid var(--gray)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--black)', marginBottom: 24 }}>
            {L ? 'Limiti Inquinanti' : 'Pollutant Thresholds'}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(18px, 1.6vw, 26px)', lineHeight: 1.65, color: 'var(--black)', maxWidth: 860 }}>
            {L
              ? "Le soglie si basano sulle linee guida WHO (2021), adattate a un sistema a 6 livelli. Il livello complessivo è determinato dall'inquinante con il valore più critico. I limiti usati puntano a proteggere la salute umana, ma non riflettono i limiti legali italiani o europei, che sono più alti e obsoleti rispetto alle evidenze scientifiche più recenti."
              : 'Thresholds are based on WHO Air Quality Guidelines (2021), adapted into a 6-level system. The overall level is set by the single worst-performing pollutant. The thresholds used aim to protect human health, but do not reflect Italian or European legal limits, which are higher and outdated compared to the latest scientific evidence.'}
          </div>
        </div>

        {/* Colour scale */}
        <div style={{ padding: '40px 40px', borderBottom: '1px solid var(--gray)' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 28 }}>
            {L ? 'Scala cromatica' : 'Colour scale'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {LEVELS.map(lv => (
              <div key={lv.key} style={{
                width: 'clamp(130px, 14vw, 200px)',
                height: 'clamp(130px, 14vw, 200px)',
                borderRadius: '50%',
                background: lv.color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '20px',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  {lv.index + 1}
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(13px, 1.3vw, 18px)', fontWeight: 400, color: '#fff', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 6 }}>
                  {L ? lv.it : lv.en}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(9px, 0.75vw, 11px)', lineHeight: 1.4, color: 'rgba(255,255,255,0.85)' }}>
                  {L ? LEVEL_DESCS[lv.key].it : LEVEL_DESCS[lv.key].en}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threshold tables with pollutant circles grouped by category */}
        {THRESHOLD_CATS.map(cat => (
          <div key={cat.key} style={{ borderBottom: '1px solid var(--gray)' }}>

              <div style={{ padding: '40px 40px' }}>

              {/* Category label */}
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 20 }}>
                {L ? cat.it : cat.en}
              </div>

              {/* Circles + table in the same row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>

                {/* Pollutant circles */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 'clamp(14px, calc(3.2vw - 16px), 48px)' }}>
                  {cat.pollutants.map((k, i) => {
                    const size = 'clamp(130px, 14vw, 200px)';
                    return (
                      <div key={k} style={{
                        width: size, height: size, flexShrink: 0,
                        borderRadius: '50%', background: 'var(--primary)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', padding: '20px',
                        boxSizing: 'border-box', overflow: 'hidden',
                      }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                          {POLLUTANTS[k].unit}
                        </div>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(13px, 1.3vw, 18px)', fontWeight: 400, color: '#fff', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 6 }}>
                          {POLLUTANTS[k].name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(9px, 0.75vw, 11px)', lineHeight: 1.4, color: 'rgba(255,255,255,0.85)' }}>
                          {L ? POLLUTANT_DESCS[k].it : POLLUTANT_DESCS[k].en}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Threshold table */}
                <div style={{ flex: 1, overflowX: 'auto' }}>
                  <table className="about-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>{L ? 'Livello' : 'Level'}</th>
                        {cat.pollutants.map(k => (
                          <th key={k}>{POLLUTANTS[k].name}<br /><span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{POLLUTANTS[k].unit}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {LEVELS.map((lv, i) => (
                        <tr key={lv.key}>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: lv.color, flexShrink: 0, display: 'inline-block' }} />
                              {lv.index + 1} — {L ? lv.it : lv.en}
                            </span>
                          </td>
                          {cat.pollutants.map(k => (
                            <td key={k}>{fRange(POLLUTANTS[k].ranges[i])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
