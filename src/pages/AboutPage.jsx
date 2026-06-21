import { useState, useRef, useEffect } from 'react';
import { SENSORS } from '../data/sensors';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { getSensorAQI } from '../utils/aqi';
import BwFilmstrip from '../components/BwFilmstrip';

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

const fRange = ([lo, hi]) => `${lo}–${hi >= 999 ? '∞' : hi}`;

// Ported from guida-eng.html / guida.html into a real bilingual page — same
// TopBar, same Ronzino-Variable hero treatment, same SECTION/PANEL rules as
// every other page. See CHAPTERS below for the full structure.
const CHAPTERS = [
  { id: 's1', it: 'Introduzione', en: 'Introduction' },
  { id: 's2', it: 'I componenti', en: 'The Components' },
  { id: 's3', it: 'Costruire il nodo (ESP32)', en: 'Building the Node (ESP32)' },
  { id: 's4', it: 'Configurare il server (Raspberry Pi)', en: 'Setting Up the Server (Raspberry Pi)' },
  { id: 's5', it: 'Prima accensione, calibrazione e problemi', en: 'First Boot, Calibration & Troubleshooting' },
  { id: 's6', it: 'La custodia fai-da-te', en: 'The DIY Enclosure' },
];

const COMPONENTS = [
  { img: 'RaspberryPi.png',  name: 'Raspberry Pi',
    role_it: 'Server + dashboard', role_en: 'Server + dashboard',
    detail_it: 'Pi 4 o Pi Zero 2 W con Raspberry Pi OS', detail_en: 'Pi 4 or Pi Zero 2 W with Raspberry Pi OS' },
  { img: 'ESP32-DevKit.png', name: 'ESP32 DevKit',
    role_it: 'Nodo sensore', role_en: 'Sensor node',
    detail_it: 'Legge gas e ambiente, invia JSON via USB', detail_en: 'Reads gases and environment, sends JSON via USB' },
  { img: 'SDS011.png', name: 'SDS011',
    role_it: 'Particolato', role_en: 'Particulate matter',
    detail_it: 'PM2.5 e PM10, collegato al Pi via adattatore USB', detail_en: 'PM2.5 and PM10, connected to Pi via USB adapter' },
  { img: 'MiCS-6814.png', name: 'MiCS-6814',
    role_it: 'Gas multipli', role_en: 'Multiple gases',
    detail_it: 'NH₃, CO, NO₂ — uscite analogiche verso ESP32', detail_en: 'NH₃, CO, NO₂ — analogue outputs to ESP32' },
  { img: 'BME680.png', name: 'BME680',
    role_it: 'Ambiente + VOC', role_en: 'Environment + VOC',
    detail_it: 'Temperatura, umidità, pressione, gas (kΩ) via I²C', detail_en: 'Temperature, humidity, pressure, gas (kΩ) via I²C' },
  { img: 'USBcable.png', name: '2× cavo USB',
    role_it: 'Connessioni dati', role_en: 'Data connections',
    detail_it: 'ESP32→Pi e SDS011→Pi', detail_en: 'ESP32→Pi and SDS011→Pi' },
  { img: 'Breadboard.png', name: 'Breadboard + jumper',
    role_it: 'Cablaggio', role_en: 'Wiring',
    detail_it: 'Per collegare MiCS-6814 e BME680 all’ESP32', detail_en: 'To connect MiCS-6814 and BME680 to the ESP32' },
  { img: 'PowerSupply.png', name: 'Alimentatore',
    role_it: 'Alimentazione', role_en: 'Power',
    detail_it: 'Alimentatore ufficiale Raspberry Pi', detail_en: 'Official Raspberry Pi power adapter' },
];

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

function btnStyle(primary) {
  return {
    display: 'inline-block', fontFamily: 'var(--font-title)', fontWeight: 700,
    fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
    textDecoration: 'none', padding: '10px 18px', cursor: 'pointer',
    border: '1px solid var(--primary)',
    background: primary ? 'var(--primary)' : 'transparent',
    color: primary ? '#fff' : 'var(--primary)',
  };
}

function SectionLabel({ num, title }) {
  return (
    <div id={`s${num}`} className="guide-section-label" style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 18px', borderBottom: '1px solid var(--gray)',
      background: 'var(--primary)', scrollMarginTop: 80,
    }}>
      <span style={{ fontFamily: 'var(--font-title)', fontSize: 17, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff' }}>
        {String(num).padStart(2, '0')}
      </span>
      <span style={{ fontFamily: 'var(--font-title)', fontSize: 17, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff' }}>
        {title}
      </span>
    </div>
  );
}

function SubHeading({ children, first }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-title)', fontSize: 13, fontWeight: 400,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)',
      margin: first ? '0 0 10px' : '40px 0 10px',
      clear: 'right',
    }}>
      {children}
    </h3>
  );
}

function P({ children }) {
  return (
    <p style={{
      fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 1vw, 17px)', lineHeight: 1.7, color: 'var(--black)',
      margin: '0 calc(50% - 50vw) 16px', width: '100vw', boxSizing: 'border-box',
      padding: '0 28px', clear: 'right',
    }}>{children}</p>
  );
}

function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 22, marginBottom: 16 }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 1vw, 17px)', lineHeight: 1.7, color: 'var(--black)', marginBottom: 8 }}>{it}</li>
      ))}
    </ul>
  );
}

function OL({ items }) {
  return (
    <ol style={{ paddingLeft: 22, marginBottom: 16 }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 1vw, 17px)', lineHeight: 1.7, color: 'var(--black)', marginBottom: 8 }}>{it}</li>
      ))}
    </ol>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', margin: '16px 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-title)', fontWeight: 400, fontSize: 13, minWidth: 480 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                textAlign: 'left', padding: '10px 13px',
                fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--gray2)', background: 'var(--gray)',
                borderRight: i < headers.length - 1 ? '1px solid var(--white)' : 'none',
                borderBottom: '1px solid var(--gray)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '12px 13px', verticalAlign: 'top', lineHeight: 1.6,
                  borderBottom: ri < rows.length - 1 ? '1px solid var(--gray)' : 'none',
                  borderRight: ci < row.length - 1 ? '1px solid var(--gray)' : 'none',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Widths for the floated, right-column Diagram/CodeBlock variants.
const FLOAT_SIZES = {
  sm: 'min(280px, 36%)',
  md: 'min(360px, 44%)',
  lg: 'min(440px, 52%)',
};

// One-time fade+slide-in the first time a floated element scrolls into view.
function useRevealed() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Diagram({ src, alt, caption, size = 'md', shift = false, full = false }) {
  const [ref, visible] = useRevealed();
  const layoutStyle = full
    ? { margin: '16px calc(50% - 50vw)', width: '100vw', clear: 'right' }
    : { float: 'right', clear: 'right', width: FLOAT_SIZES[size], margin: `0 ${shift ? 'clamp(20px, 6vw, 60px)' : 0} 16px 24px` };
  return (
    <div ref={ref} style={{
      ...layoutStyle,
      padding: 'clamp(12px, 3vw, 24px)', background: 'url(/assets/cielo.png) center / cover no-repeat',
      boxSizing: 'border-box',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : `translateX(${full ? 0 : 48}px)`,
      transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
    }}>
      <div style={{ textAlign: 'center', border: '1px solid var(--gray)', padding: 20, background: 'var(--white)' }}>
        <img src={src} alt={alt} style={{ width: '100%', maxWidth: 480, height: 'auto' }} />
        {caption && (
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 12, fontWeight: 400, letterSpacing: '0.04em', color: 'var(--gray2)', marginTop: 12 }}>
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}

function SchemaBox({ children }) {
  return (
    <div style={{ border: '1px solid var(--gray)', padding: '16px 20px', margin: '16px 0', background: 'var(--gray)' }}>
      <pre style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre', margin: 0, overflowX: 'auto' }}>
        {children}
      </pre>
    </div>
  );
}

function Callout({ label, children }) {
  return (
    <div style={{ padding: '14px 18px', margin: '16px 0', background: 'color-mix(in srgb, var(--primary) 9%, var(--white))', borderLeft: '3px solid var(--primary)', clear: 'right', boxSizing: 'border-box' }}>
      <div style={{ ...SUB_LABEL, color: 'var(--primary)', marginBottom: 6 }}>{label}</div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 0.95vw, 16px)', lineHeight: 1.68, color: 'var(--black)', margin: 0 }}>{children}</p>
    </div>
  );
}

// Jargon helper — dotted underline, hover/focus to read the definition.
function Term({ title, children }) {
  return (
    <span title={title} style={{ borderBottom: '1px dotted var(--gray2)', cursor: 'help' }}>
      {children}
    </span>
  );
}

// Code block with a one-click copy button — for terminal commands / config
// snippets in the ESP32 + Raspberry Pi setup chapters.
function CodeBlock({ children, size = 'md', shift = false, full = false }) {
  const [copied, setCopied] = useState(false);
  const code = Array.isArray(children) ? children.join('') : children;
  const [ref, visible] = useRevealed();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const layoutStyle = full
    ? { margin: '16px calc(50% - 50vw)', width: '100vw', clear: 'right' }
    : { float: 'right', clear: 'right', width: FLOAT_SIZES[size], margin: `0 ${shift ? 'clamp(20px, 6vw, 60px)' : 0} 16px 24px` };

  return (
    <div ref={ref} style={{
      ...layoutStyle,
      padding: 'clamp(12px, 3vw, 24px)', background: 'url(/assets/cielo.png) center / cover no-repeat',
      boxSizing: 'border-box',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : `translateX(${full ? 0 : 48}px)`,
      transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
    }}>
      <div className="guide-copy-btn-wrap" style={{ position: 'relative' }}>
        <button onClick={copy} className="guide-copy-btn" style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 10,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          background: 'var(--white)', color: 'var(--black)',
          border: '1px solid var(--gray2)', cursor: 'pointer', padding: '6px 10px',
        }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre style={{
          background: '#1d1a18', color: '#ECE7DE', padding: '18px 20px', margin: 0,
          overflowX: 'auto', fontSize: 13, lineHeight: 1.7,
          fontFamily: "'Courier New', Courier, monospace",
          borderLeft: '3px solid var(--primary)', whiteSpace: 'pre',
        }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// Prev/Next links at the bottom of a section — null disables that side
// (first chapter has no prev, last has no next).
function ChapterNav({ prev, next, L }) {
  return (
    <nav className="guide-chapter-nav" aria-label={L ? 'Navigazione capitoli' : 'Chapter navigation'}
      style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 28, maxWidth: 640, clear: 'right' }}>
      {prev ? (
        <a href={`#${prev.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', border: '1px solid var(--gray)', background: 'var(--white)', padding: '14px 16px' }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 4 }}>
            {L ? '← Precedente' : '← Previous'}
          </span>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{prev.title}</span>
        </a>
      ) : <div style={{ flex: 1 }} />}
      {next ? (
        <a href={`#${next.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', border: '1px solid var(--gray)', background: 'var(--white)', padding: '14px 16px', textAlign: 'right' }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 4 }}>
            {L ? 'Successivo →' : 'Next →'}
          </span>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{next.title}</span>
        </a>
      ) : <div style={{ flex: 1 }} />}
    </nav>
  );
}

function ComponentGrid({ L }) {
  return (
    <div style={{ clear: 'right', margin: '16px calc(50% - 50vw)', width: '100vw', padding: 'clamp(12px, 3vw, 24px)', background: 'url(/assets/cielo.png) center / cover no-repeat', boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {COMPONENTS.map((c) => (
          <div key={c.name} style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--white)', border: '1px solid var(--gray)' }}>
            <img src={`/assets/components/${c.img}`} alt={c.name} style={{ width: '100%', maxHeight: 100, objectFit: 'contain', marginBottom: 14 }} />
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--black)', marginBottom: 4 }}>
              {c.name}
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', marginBottom: 8 }}>
              {L ? c.role_it : c.role_en}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--gray2)' }}>
              {L ? c.detail_it : c.detail_en}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ L }) {
  return (
    <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.7, color: 'var(--gray2)', fontStyle: 'italic' }}>
      {L ? 'Contenuto in arrivo.' : 'Content coming soon.'}
    </p>
  );
}

const FACTS = [
  { k_it: 'Tempo', k_en: 'Time', v_it: 'Un weekend, senza fretta', v_en: 'A weekend, taken slowly' },
  { k_it: 'Livello', k_en: 'Skill level', v_it: 'Principiante — nessuna esperienza richiesta', v_en: 'Beginner — no experience needed' },
  { k_it: 'Cosa serve fare', k_en: 'Involves', v_it: 'Un po’ di saldatura e alcuni passaggi al computer', v_en: 'A little soldering & a few computer steps' },
  { k_it: 'Costo', k_en: 'Cost', v_it: 'Circa il prezzo della lista componenti', v_en: 'Roughly the price of the parts list' },
];

function StartHere({ L }) {
  return (
    <section aria-label={L ? 'Inizia da qui' : 'Start here'} style={{
      padding: '22px 28px', background: 'color-mix(in srgb, var(--primary) 7%, var(--white))', borderBottom: '1px solid var(--gray)',
    }}>
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 14 }}>
        {L ? 'Inizia da qui' : 'Start here'}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {FACTS.map((f) => (
          <div key={f.k_en} style={{ flex: '1 1 160px', border: '1px solid var(--gray)', background: 'var(--white)', padding: '12px 14px' }}>
            <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 4 }}>{L ? f.k_it : f.k_en}</div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{L ? f.v_it : f.v_en}</div>
          </div>
        ))}
      </div>
      <P>
        {L
          ? 'Questa guida è scritta per essere seguita da chiunque, anche senza esperienza di elettronica. Due passaggi sono un po’ più pratici: saldare una fila di pin e digitare qualche comando sul Raspberry Pi. Li spieghiamo entrambi, un passo alla volta.'
          : 'This guide is written so anyone can follow it, even if you have never touched electronics. Two parts of the build are a bit more hands-on: soldering a row of pins, and typing a few commands on the Raspberry Pi. We explain both, one step at a time.'}
      </P>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 1vw, 17px)', lineHeight: 1.7, color: 'var(--black)', borderLeft: '3px solid var(--primary)', paddingLeft: 14, fontStyle: 'italic', marginBottom: 0 }}>
        {L
          ? <>Non devi farlo da solo. È un bel progetto da costruire <strong>con qualcuno</strong> — un nipote, un vicino, un amico, o in un makerspace locale. Se un passaggio sembra troppo tecnico, è il momento di farlo insieme, non di rinunciare.</>
          : <>You don't have to do it alone. This is a lovely project to build <strong>with someone</strong> — a grandchild, a neighbour, a friend, or at a local makerspace or fab lab. If a step feels technical, that's the moment to do it together, not to give up.</>}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        <a href="#s1" style={btnStyle(true)}>{L ? "Inizia con l'introduzione" : 'Begin with the introduction'}</a>
        <button type="button" onClick={() => window.print()} style={{ ...btnStyle(false), border: '1px solid var(--primary)' }}>
          {L ? 'Stampa / salva come PDF' : 'Print / save as PDF'}
        </button>
      </div>
    </section>
  );
}

export default function AboutPage({ lang }) {
  const L = lang === 'it';
  const globalAQI = Math.max(...SENSORS.map(getSensorAQI));
  const videoRef = useRef(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Before the first play, show a frame from the middle of the film as the
  // static preview instead of frame zero — purely cosmetic, doesn't affect
  // where playback actually starts.
  const showMidFrame = (e) => {
    const v = e.currentTarget;
    if (!videoPlaying && v.duration) v.currentTime = v.duration / 2;
  };

  const startVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setVideoPlaying(true);
  };

  return (
    <div>
      {/* TITLE — same treatment as Map's title block */}
      <div style={{ padding: '24px 24px 0 24px' }}>
        <span style={{
          fontFamily: "'Ronzino Variable', sans-serif",
          fontVariationSettings: `"BLND" ${Math.max(50, globalAQI * 200)}`,
          fontSize: 'clamp(56px, 8vw, 140px)', textTransform: 'uppercase',
          lineHeight: 0.95, letterSpacing: '-0.01em',
          color: 'var(--white)', WebkitTextStroke: '5px var(--primary)', paintOrder: 'stroke fill',
        }}>
          {L ? 'Chi Siamo' : 'About'}
        </span>
      </div>

      {/* VIDEO + STATEMENT — share one continuous cielo.png background */}
      <div style={{ background: "url('/assets/cielo.png') center / cover no-repeat" }}>
        <div style={{ position: 'relative' }}>
          <video
            ref={videoRef}
            src="/assets/GliIncappucciati_MatteoFalcone.mov"
            controls={videoPlaying}
            playsInline
            preload="metadata"
            onLoadedMetadata={showMidFrame}
            style={{ width: '100%', display: 'block' }}
          />
          {!videoPlaying && (
            <button
              type="button"
              onClick={startVideo}
              aria-label={L ? 'Avvia il video' : 'Play the video'}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              }}
            >
              <span style={{
                width: 0, height: 0,
                borderTop: 'clamp(20px, 3vw, 36px) solid transparent',
                borderBottom: 'clamp(20px, 3vw, 36px) solid transparent',
                borderLeft: 'clamp(32px, 4.6vw, 56px) solid #fff',
              }} />
            </button>
          )}
        </div>

        <div style={{ padding: 'clamp(32px, 6vw, 64px) 48px', display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 360px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(19px, 2.4vw, 28px)', fontWeight: 400, lineHeight: 1.5, color: 'var(--black)', maxWidth: 860, margin: 0 }}>
              {L
                ? <>Questo progetto è pensato in particolare per chi resiste nelle <strong>Sacrifice Zones</strong> del mondo, come strumento per contrastare la recinzione dell'informazione. Aria Bene Comune è stato realizzato da Matteo Falcone e dagli hacker etici del gruppo Linux Jonix Group. L'idea nasce come risposta al bisogno dei tarantini di informazioni affidabili e pulite sull'aria che respiriamo. Unisciti alla comunità, costruisci il tuo sensore e diventa un nodo attivo!</>
                : <>This project is especially aimed at people resisting in <strong>Sacrifice Zones</strong> of the world, as a tool to counter the information enclosure. Aria Bene Comune has been realized by Matteo Falcone and the ethical hackers of the group Linux Jonix Group. The idea starts as an answer to the needs of tarantinian of trustworthy and clean information about the air we breath. Join the community, build your own sensor and be an active node!</>}
            </p>
          </div>
          <img
            src="/assets/DSC3330.jpg"
            alt=""
            style={{ width: 'clamp(240px, 32vw, 420px)', aspectRatio: '2 / 3', objectFit: 'cover', flexShrink: 0 }}
          />
        </div>
      </div>

      {/* THRESHOLD EXPLANATION — what the AQI levels and pollutant limits mean,
          placed right before the sensor guide starts. Same title/body/table
          rules as the rest of the page; rectangular level/pollutant swatches
          instead of circles, in the site's sharp-cornered visual language. */}
      <div style={{ borderBottom: '1px solid var(--gray)' }}>

        <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) 16px', borderBottom: '1px solid var(--gray)' }}>
          <span style={{
            fontFamily: "'Ronzino Variable', sans-serif",
            fontVariationSettings: `"BLND" ${Math.max(50, globalAQI * 200)}`,
            fontSize: 'clamp(48px, 6vw, 96px)', textTransform: 'uppercase',
            lineHeight: 0.92, letterSpacing: '-0.02em',
            color: 'var(--white)', WebkitTextStroke: '6px var(--primary)', paintOrder: 'stroke fill',
          }}>
            {L ? 'Limiti Inquinanti' : 'Pollutant Thresholds'}
          </span>
        </div>

        <div style={{ padding: '22px 28px 28px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(18px, 1.8vw, 24px)', lineHeight: 1.6, color: 'var(--black)', marginBottom: 16, maxWidth: 860 }}>
            {L
              ? "Le soglie si basano sulle linee guida WHO (2021), adattate a un sistema a 6 livelli. Il livello complessivo è determinato dall'inquinante con il valore più critico. I limiti usati puntano a proteggere la salute umana, ma non riflettono i limiti legali italiani o europei, che sono più alti e obsoleti rispetto alle evidenze scientifiche più recenti."
              : 'Thresholds are based on WHO Air Quality Guidelines (2021), adapted into a 6-level system. The overall level is set by the single worst-performing pollutant. The thresholds used aim to protect human health, but do not reflect Italian or European legal limits, which are higher and outdated compared to the latest scientific evidence.'}
          </p>

          <SubHeading>{L ? 'Scala cromatica' : 'Colour scale'}</SubHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {LEVELS.map(lv => (
              <div key={lv.key} style={{ flex: '1 1 150px', background: lv.color, padding: '14px 16px' }}>
                <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>{lv.index + 1}</div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 17, fontWeight: 400, textTransform: 'uppercase', color: '#fff', marginBottom: 6 }}>
                  {L ? lv.it : lv.en}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.45, color: 'rgba(255,255,255,0.85)' }}>
                  {L ? LEVEL_DESCS[lv.key].it : LEVEL_DESCS[lv.key].en}
                </div>
              </div>
            ))}
          </div>

          {/* Tables + pollutant types — same matrix component the Symptoms page uses:
              category header (title + pollutant list) above a 6-column grid, one
              cell per AQI level, each cell listing that level's threshold per pollutant. */}
          <SubHeading>{L ? 'Soglie per inquinante' : 'Thresholds by pollutant'}</SubHeading>
          <div className="symptoms-matrix-section" style={{ borderTop: '1px solid var(--gray)', marginBottom: 16 }}>
            {THRESHOLD_CATS.map(cat => (
              <div key={cat.key} className="symptoms-matrix-cat">
                <div className="symptoms-matrix-cat-header">
                  <span className="symptoms-matrix-cat-title">{L ? cat.it : cat.en}</span>
                  <span className="symptoms-matrix-cat-sub">
                    {cat.pollutants.map(k => `${POLLUTANTS[k].name} (${POLLUTANTS[k].unit})`).join(' · ')}
                  </span>
                </div>
                <div className="symptoms-matrix-levels">
                  {LEVELS.map((lv, i) => (
                    <div key={lv.key} className="symptoms-matrix-cell">
                      <div className="symptoms-matrix-level-badge" style={{ background: lv.color }}>
                        {lv.index + 1}&nbsp;{L ? lv.it : lv.en}
                      </div>
                      {cat.pollutants.map(k => (
                        <div key={k} className="symptoms-matrix-row">
                          <span className="symptoms-matrix-who">{POLLUTANTS[k].name}</span>
                          <span className="symptoms-matrix-text">{fRange(POLLUTANTS[k].ranges[i])} {POLLUTANTS[k].unit}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GUIDE — existing chapter content, now appended after the new
          About/Sensori-Attivi sections rather than being the page's lede */}
      <div id="guide-start" style={{ scrollMarginTop: 80 }}>

      <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) 16px', borderBottom: '1px solid var(--gray)' }}>
        <span style={{
          fontFamily: "'Ronzino Variable', sans-serif",
          fontVariationSettings: `"BLND" ${Math.max(50, globalAQI * 200)}`,
          fontSize: 'clamp(48px, 6vw, 96px)', textTransform: 'uppercase',
          lineHeight: 0.92, letterSpacing: '-0.02em',
          color: 'var(--white)', WebkitTextStroke: '6px var(--primary)', paintOrder: 'stroke fill',
        }}>
          {L ? 'Guida al Sensore' : 'Sensor Guide'}
        </span>
      </div>

      <StartHere L={L} />

      {/* CONTENT — full width, no chapter index sidebar */}
      <div style={{ borderBottom: '1px solid var(--gray)' }}>

        <main style={{ background: 'var(--white)' }}>

          {/* Sensor photo */}
          <div style={{ padding: 'clamp(16px, 4vw, 24px)', textAlign: 'center', background: 'url(/assets/cielo.png) center / cover no-repeat' }}>
            <img src="/assets/Sensore.png" alt={L ? 'Il sensore assemblato dentro la custodia' : 'The finished sensor assembled inside its enclosure'}
              style={{ maxWidth: '100%', maxHeight: 420, height: 'auto' }} />
          </div>

          {/* 01 — INTRODUCTION */}
          <SectionLabel num={1} title={L ? 'Introduzione' : 'Introduction'} />
          <div style={{ padding: '22px 28px 28px', display: 'flow-root' }}>
            <SubHeading first>{L ? '1.1 Perché monitorare dal basso' : '1.1 Why monitoring from below'}</SubHeading>
            <P>
              {L
                ? <>Questa guida ti accompagna passo per passo nella costruzione del sensore per la qualità dell'aria <strong>"Aria Bene Comune"</strong>. È pensata per chi parte da zero: non serve esperienza di elettronica o programmazione. Useremo materiali semplici, codice aperto e un linguaggio chiaro. Sperimentiamo e impariamo insieme!</>
                : <>This guide walks you step by step through building the <strong>"Aria Bene Comune"</strong> air quality sensor. It is written for people starting from scratch: no experience with electronics or programming is needed. We will use simple materials, open code, and plain language. Let's experiment and learn together!</>}
            </P>
            <UL items={L ? [
              <><strong>Particolato PM2.5 e PM10</strong> — le polveri sottili sospese nell'aria.</>,
              <><strong>Ammoniaca (NH₃), monossido di carbonio (CO) e biossido di azoto (NO₂)</strong> — gas legati a traffico, combustioni e attività agricole.</>,
              <><strong>Composti organici volatili (VOC)</strong> — vapori di vernici, solventi, detergenti.</>,
              <><strong>Temperatura, umidità e pressione atmosferica</strong> — le condizioni ambientali di base.</>,
            ] : [
              <><strong>Particulate matter PM2.5 and PM10</strong> — fine dust particles suspended in the air.</>,
              <><strong>Ammonia (NH₃), carbon monoxide (CO), and nitrogen dioxide (NO₂)</strong> — gases linked to traffic, combustion, and agricultural activity.</>,
              <><strong>Volatile organic compounds (VOC)</strong> — vapours from paints, solvents, and cleaning products.</>,
              <><strong>Temperature, humidity, and atmospheric pressure</strong> — the basic environmental conditions.</>,
            ]} />

            <SubHeading>{L ? '1.2 Il tuo ruolo nella rete' : '1.2 Your role in the network'}</SubHeading>
            <P>
              {L
                ? <>Costruendo e attivando questo sensore, diventi uno dei nodi della rete. Ogni nodo ha un proprio identificativo (nello <Term title={L ? 'Lo sketch è il piccolo programma che carichi sulla scheda ESP32.' : 'The sketch is the small program you load onto the ESP32 board.'}>sketch</Term> è il campo <strong>sensor_id</strong>, ad es. "S1"): è ciò che permette di distinguere i dati provenienti dai diversi sensori della comunità.</>
                : <>By building and activating this sensor, you become one of the network's nodes. Every node has its own identifier (in the <Term title="The sketch is the small program you load onto the ESP32 board.">sketch</Term>, it is the <strong>sensor_id</strong> field, e.g. "S1"): this is what allows data from different community sensors to be distinguished.</>}
            </P>
            <CodeBlock full>{'// config.h\n#define SENSOR_ID "S1"\n#define WIFI_SSID "your-network"\n#define WIFI_PASS "your-password"'}</CodeBlock>
            <Callout label={L ? 'In breve' : 'In short'}>
              {L
                ? 'Il tuo sensore funziona perfettamente da solo, ma è pensato per contribuire, insieme a molti altri, a un quadro condiviso e continuamente aggiornato dell’aria che respiriamo.'
                : 'Your sensor works perfectly on its own, but it is designed to contribute, together with many others, to a shared and continuously updated picture of the air we breathe.'}
            </Callout>
            <ChapterNav L={L} prev={null} next={{ id: 's2', title: `02 · ${L ? CHAPTERS[1].it : CHAPTERS[1].en}` }} />
          </div>

          {/* 02 — THE COMPONENTS */}
          <SectionLabel num={2} title={L ? 'I componenti' : 'The Components'} />
          <div style={{ padding: '22px 28px 28px', display: 'flow-root' }}>
            <SubHeading first>{L ? '2.1 Cosa comprare' : '2.1 What to buy'}</SubHeading>
            <ComponentGrid L={L} />

            <SubHeading>{L ? "2.2 Cos'è una breadboard" : '2.2 What a breadboard is'}</SubHeading>
            <P>
              {L
                ? "Se non hai mai usato una breadboard, questa sezione è per te. Andremo con calma, perché una volta capita un'idea semplice, tutto il resto diventa facile."
                : "If you have never used a breadboard, this section is for you. We'll go slowly, because once you understand one simple idea, everything else becomes easy."}
            </P>
            <P>
              {L
                ? "Una breadboard è una tavoletta di plastica piena di piccoli foretti che permette di collegare componenti elettronici senza saldare. Basta spingere fili e pin nei foretti. La parte intelligente è che molti di quei foretti sono già collegati tra loro all'interno della tavoletta, tramite strisce metalliche nascoste. Quindi quando inserisci due fili in due foretti collegati internamente, quei due fili sono elettricamente connessi — come se li avessi attorcigliati insieme."
                : 'A breadboard is a plastic board full of small holes that lets you connect electronic parts together without soldering. You just push wires and pins into the holes. The clever part is that many of those holes are already connected to each other inside the board, by hidden metal strips. So when you put two wires into two holes that are internally joined, those two wires are electrically connected — as if you had twisted them together.'}
            </P>
            <Diagram src="/assets/diagrams/breadboard_basics.svg" full
              alt={L ? 'Schema di una breadboard: ogni colonna numerata di cinque foretti è collegata verticalmente, e le due guide laterali corrono in orizzontale per alimentazione e massa.' : 'Diagram of a breadboard showing that each numbered column of five holes is joined vertically inside, and the two long side rails run horizontally for power and ground.'} />
            <P>{L ? 'Ci sono solo due schemi da ricordare:' : 'There are only two patterns to remember:'}</P>
            <UL items={L ? [
              <><strong>Le colonne numerate (l'area centrale):</strong> ogni colonna di 5 foretti è collegata verticalmente. La metà superiore (righe a–e) e quella inferiore (righe f–j) sono separate dal canale centrale. Quindi i foretti a, b, c, d, e della colonna 6 sono tutti lo stesso punto elettrico; ma i foretti f–j della colonna 6 sono un punto diverso.</>,
              <><strong>Le due guide laterali (contrassegnate + e −):</strong> corrono per tutta la lunghezza in orizzontale e distribuiscono alimentazione (+) e massa (−) a molti componenti insieme. Sono come due linee di alimentazione condivise.</>,
            ] : [
              <><strong>The numbered columns (the main middle area):</strong> each column of 5 holes is joined together vertically. The top half (rows a–e) and the bottom half (rows f–j) are separate, divided by the channel in the middle. So holes a, b, c, d, e of column 6 are all the same electrical point; but the f–j holes of column 6 are a different point.</>,
              <><strong>The two long side rails (marked + and −):</strong> these run the whole length horizontally and are used to distribute power (+) and ground (−) to many parts at once. They're like two shared supply lines.</>,
            ]} />
            <Callout label={L ? 'In breve' : 'In short'}>
              {L
                ? 'Due pin sono collegati solo se si trovano in foretti uniti internamente. Per collegare due cose, inseriscile nella stessa colonna oppure usa un jumper da una colonna all’altra. Per NON collegarle, tienile in colonne diverse.'
                : 'Two pins are connected only if they sit in holes that are internally joined. To connect two things, you either put them in the same column, or you run a jumper wire from one column to another. To NOT connect things, keep them in different columns.'}
            </Callout>

            <SubHeading>{L ? '2.3 Riconoscere i jumper' : '2.3 Identifying your jumper wires'}</SubHeading>
            <UL items={L ? [
              <><strong>Maschio–maschio (M–M):</strong> un pin metallico su entrambe le estremità. Usato breadboard-breadboard, o breadboard-pin header.</>,
              <><strong>Maschio–femmina (M–F):</strong> un pin su un'estremità, una piccola presa sull'altra. Usato per andare da un foretto della breadboard al pin di una scheda, o direttamente tra pin.</>,
              <><strong>Femmina–femmina (F–F):</strong> una presa su entrambe le estremità. Usato per collegare due pin direttamente, senza breadboard.</>,
            ] : [
              <><strong>Male–male (M–M):</strong> a metal pin on both ends. Used breadboard-to-breadboard, or breadboard to a pin header.</>,
              <><strong>Male–female (M–F):</strong> a pin on one end, a little socket on the other. Used to go from a breadboard hole to a board's pin, or directly between pins.</>,
              <><strong>Female–female (F–F):</strong> a socket on both ends. Used to connect two pins directly, no breadboard needed.</>,
            ]} />
            <Callout label={L ? 'Quale usare qui' : 'Which to use here'}>
              {L
                ? 'Se saldi i pin header sulle tue schede e usi la breadboard, i fili maschio–maschio collegano le colonne della breadboard tra loro e alle guide. Il colore del filo non significa nulla elettricamente — serve solo per orientarti; per convenzione si usa il rosso per + e il nero per la massa.'
                : "If you solder header pins onto your boards and use the breadboard, male–male wires connect breadboard columns to each other and to the rails. The wire colour means nothing electrically — it's only to help you keep track; by convention people use red for + and black for ground."}
            </Callout>

            <SubHeading>{L ? '2.4 Ordine di montaggio consigliato' : '2.4 Recommended assembly order'}</SubHeading>
            <P>{L ? 'Procedere a piccoli passi, controllando dopo ognuno, rende molto più facile trovare eventuali errori:' : 'Proceeding in small steps, checking after each one, makes it much easier to find any mistakes:'}</P>
            <OL items={L ? [
              "Con l'ESP32 scollegato, cabla il BME680 (3V3, GND, SDA→GPIO12, SCL→GPIO13).",
              'Cabla il MiCS-6814 (5V, GND, e le tre uscite gas verso GPIO1, GPIO2, GPIO3).',
              'Ricontrolla ogni filo rispetto allo schema di cablaggio del capitolo 3 (sezione 3.2): in particolare controlla le tensioni (BME680 a 3,3 V, MiCS-6814 a 5 V) e che tutte le masse GND siano comuni.',
              <>Carica lo sketch sull'ESP32 e apri il Serial Monitor a 115200 baud: verifica che appaia "BME680 OK" e poi le righe JSON. Questo confirma che i sensori sono cablati correttamente.</>,
              "Collega l'ESP32 al Raspberry Pi via USB, e collega anche l'SDS011.",
              <>Avvia il server sul Pi e apri <code>/api/status</code> nel browser: se entrambe le schede risultano connesse, l'assemblaggio elettronico è completo.</>,
              'Solo a questo punto, posiziona tutto nella custodia (capitolo 6).',
            ] : [
              'With the ESP32 unplugged, wire the BME680 (3V3, GND, SDA→GPIO12, SCL→GPIO13).',
              'Wire the MiCS-6814 (5V, GND, and the three gas outputs to GPIO1, GPIO2, GPIO3).',
              'Re-check every wire against the wiring diagram in chapter 3 (section 3.2): in particular check the voltages (BME680 at 3.3 V, MiCS-6814 at 5 V) and that all GND grounds are common.',
              <>Upload the sketch to the ESP32 and open the Serial Monitor at 115200 baud: check that "BME680 OK" appears and then the JSON lines. This confirms the sensors are wired correctly.</>,
              'Connect the ESP32 to the Raspberry Pi via USB, and connect the SDS011 too.',
              <>Start the server on the Pi and open <code>/api/status</code> in the browser: if both boards show as connected, the electronic assembly is complete.</>,
              'Only at this point, place everything in the enclosure (chapter 6).',
            ]} />
            <Callout label={L ? 'Controlla prima di chiudere la scatola' : 'Check before closing the box'}>
              {L
                ? 'È meglio fare tutti questi controlli con i componenti ancora "a vista", facili da raggiungere. Una volta che tutto funziona, passare alla custodia è molto meno stressante. Se qualcosa non funziona, il capitolo 5 (Risoluzione dei problemi) elenca le cause più comuni.'
                : "It's best to do all these checks with the components still \"out in the open\", easy to reach. Once everything works, moving to the enclosure is much less stressful. If something doesn't work, chapter 5 (Troubleshooting) lists the most common causes."}
            </Callout>

            <ChapterNav L={L}
              prev={{ id: 's1', title: `01 · ${L ? CHAPTERS[0].it : CHAPTERS[0].en}` }}
              next={{ id: 's3', title: `03 · ${L ? CHAPTERS[2].it : CHAPTERS[2].en}` }} />
          </div>

          {/* 03 — BUILDING THE SENSOR NODE (ESP32) */}
          <SectionLabel num={3} title={L ? 'Costruire il nodo sensore (ESP32)' : 'Building the Sensor Node (ESP32)'} />
          <div style={{ padding: '22px 28px 28px', display: 'flow-root' }}>
            <SubHeading first>{L ? '3.1 Saldare i pin header' : '3.1 Soldering header pins'}</SubHeading>
            <OL items={L ? [
              'Procurati strisce di "pin header maschio" (le economiche file di pin che si tagliano a misura). Stacca un pezzo con il numero giusto di pin per ogni fila di foretti della scheda.',
              'Spingi i pin attraverso i foretti della scheda dal lato inferiore, in modo che le estremità lunghe puntino verso il basso (quelle vanno nella breadboard) e le estremità corte stiano sul lato dei componenti.',
              'Un trucco per tenerli dritti: inserisci prima le estremità lunghe nella breadboard, poi appoggia la scheda sopra. La breadboard mantiene i pin perfettamente allineati mentre saldi.',
              'Scalda ogni pin e il suo foro con il saldatore per un secondo, poi tocca con lo stagno così che fluisca attorno al giunto, formando un piccolo cono lucido. Ripeti per ogni pin.',
              'Lascia raffreddare. La tua scheda ora ha i pin e si comporta come un modulo compatibile con la breadboard.',
            ] : [
              'Get strips of "male header pins" (the cheap rows of pins you snap to length). Snap off a piece with the right number of pins for each board\'s hole row.',
              "Push the pins through the board's holes from the underside, so the long ends point down (those go into the breadboard) and the short ends sit on the component side.",
              'A trick to hold them straight: push the long ends into the breadboard first, then sit the board on top. The breadboard keeps the pins perfectly aligned while you solder.',
              'Heat each pin and its hole with the soldering iron for a second, then touch the solder so it flows around the joint, forming a small shiny cone. Repeat for every pin.',
              'Let it cool. Your board now has pins and behaves like a breadboard-friendly module.',
            ]} />
            <Callout label={L ? 'Sicurezza' : 'Safety'}>
              {L
                ? "Un saldatore raggiunge oltre 300°C. Lavora su una superficie resistente al calore, in uno spazio ventilato, non toccare mai la punta metallica, e scollegalo quando hai finito. Degli occhiali di protezione sono una buona idea. Se non hai mai saldato, questo è un ottimo primo progetto da fare con un amico più esperto o in un makerspace."
                : "A soldering iron reaches over 300 °C. Work on a heat-proof surface, in a ventilated space, never touch the metal tip, and unplug it when you're done. Safety glasses are a good idea. If you've never soldered, this is a great first project to do with a more experienced friend or at a makerspace."}
            </Callout>

            <SubHeading>{L ? "3.2 Cablare i sensori all'ESP32" : '3.2 Wiring the sensors to the ESP32'}</SubHeading>
            <P>
              {L
                ? "Il modo più rapido per capire i collegamenti è guardarli. Lo schema sotto mostra l'ESP32 al centro, il BME680 a sinistra e il MiCS-6814 a destra, con ogni filo colorato che va dal pin del sensore al pin giusto dell'ESP32. In basso, la legenda collega ogni filo alla riga di codice corrispondente."
                : 'The quickest way to understand the connections is to look at them. The diagram below shows the ESP32 in the centre, the BME680 on the left, and the MiCS-6814 on the right, with each coloured wire going from the sensor pin to the correct ESP32 pin. At the bottom, the legend links each wire to the corresponding line of code.'}
            </P>
            <Diagram src="/assets/diagrams/wired_breadboard.svg" full
              alt={L ? "Schema di cablaggio del nodo sensore: l'ESP32 al centro con il BME680 e il MiCS-6814 ai lati, e fili jumper colorati da ogni pin del sensore al pin corrispondente dell'ESP32." : 'Wiring diagram of the sensor node: the ESP32 in the centre with the BME680 and MiCS-6814 either side, and colour-coded jumper wires from each sensor pin to its matching ESP32 pin.'}
              caption={L ? 'Schema di cablaggio del nodo sensore. I colori dei fili sono solo un aiuto visivo: ciò che conta è che ogni pin vada dove indicato.' : 'Wiring diagram of the sensor node. The wire colours are just a visual aid: what matters is that each pin goes where indicated.'} />
            <Callout label={L ? 'Sicurezza' : 'Safety'}>
              {L
                ? 'Spegni sempre l’ESP32 (scollega l’USB) durante il cablaggio. Il BME680 funziona a 3,3 V; il MiCS-6814 a 5 V. Tutte le masse (GND) devono condividere un riferimento comune.'
                : 'Always power off the ESP32 (unplug the USB) while wiring. The BME680 runs at 3.3 V; the MiCS-6814 at 5 V. All grounds (GND) must share a common reference.'}
            </Callout>
            <P>
              {L
                ? "Si presume che il tuo ESP32 ed entrambi i sensori abbiano ora i pin header e siano inseriti nella breadboard, ciascuno a cavallo del canale centrale in modo che le due file di pin finiscano in colonne separate. Posiziona l'ESP32 verso un'estremità e i due sensori più avanti, lasciando alcune colonne libere tra loro. Poi fai i collegamenti un filo alla volta. Dopo ogni filo, fermati e controllalo rispetto allo schema sopra."
                : 'This assumes your ESP32 and both sensors now have header pins and are pushed into the breadboard, each straddling the central channel so their two pin rows land in separate columns. Place the ESP32 toward one end and the two sensors further along, leaving a few free columns between them. Then make the connections one wire at a time. After each wire, pause and check it against the diagram above.'}
            </P>
            <OL items={L ? [
              <><strong>Imposta le guide di alimentazione.</strong> Fai un filo maschio–maschio dalla colonna del pin 3V3 dell'ESP32 alla guida rossa (+), e uno da una colonna GND dell'ESP32 alla guida blu (−). Ora tutta la lunghezza di quelle due guide porta 3,3 V e massa.</>,
              <><strong>Alimenta il BME680.</strong> Dalla guida rossa (+), porta un filo alla colonna con il pin VCC del BME680. Dalla guida blu (−), porta un filo alla colonna GND del BME680. (Il BME680 funziona a 3,3 V, ciò che abbiamo messo sulla guida rossa.)</>,
              <><strong>Linee dati del BME680.</strong> Porta un filo dalla colonna SDA del BME680 alla colonna GPIO12 dell'ESP32. Porta un altro filo dalla colonna SCL del BME680 alla colonna GPIO13 dell'ESP32.</>,
              <><strong>Alimenta il MiCS-6814.</strong> Il MiCS-6814 richiede 5 V, NON 3,3 V. Quindi non usare la guida rossa per esso. Porta invece un filo direttamente dalla colonna 5V (VIN) dell'ESP32 alla colonna VCC del MiCS-6814. Per la massa, puoi usare normalmente la guida blu (−) (la massa è condivisa da tutti).</>,
              <><strong>Uscite gas del MiCS-6814.</strong> Porta tre fili: colonna NH₃ → ESP32 GPIO1; colonna NO₂ → ESP32 GPIO2; colonna CO → ESP32 GPIO3.</>,
              <><strong>Controllo finale.</strong> Conta i tuoi fili rispetto allo schema sopra. Conferma che il BME680 sia alimentato a 3,3 V, il MiCS-6814 a 5 V, e che ogni GND finisca sulla guida blu (la massa comune).</>,
            ] : [
              <><strong>Set up the power rails.</strong> Run one male–male wire from the ESP32's 3V3 pin's column to the red (+) rail, and one from an ESP32 GND pin's column to the blue (−) rail. Now the whole length of those two rails carries 3.3 V and ground.</>,
              <><strong>Power the BME680.</strong> From the red (+) rail, run a wire to the column holding the BME680's VCC pin. From the blue (−) rail, run a wire to the BME680's GND column. (The BME680 runs at 3.3 V, which is what we put on the red rail.)</>,
              <><strong>BME680 data lines.</strong> Run a wire from the BME680's SDA column to the ESP32's GPIO12 column. Run another from the BME680's SCL column to the ESP32's GPIO13 column.</>,
              <><strong>Power the MiCS-6814.</strong> The MiCS-6814 needs 5 V, NOT 3.3 V. So do not use the red rail for it. Instead run a wire straight from the ESP32's 5V (VIN) column to the MiCS-6814's VCC column. For ground, you can use the blue (−) rail as normal (ground is shared by everything).</>,
              <><strong>MiCS-6814 gas outputs.</strong> Run three wires: NH₃ column → ESP32 GPIO1; NO₂ column → ESP32 GPIO2; CO column → ESP32 GPIO3.</>,
              <><strong>Final check.</strong> Count your wires against the diagram above. Confirm the BME680 is fed from 3.3 V, the MiCS-6814 from 5 V, and that every GND ends up on the blue rail (the common ground).</>,
            ]} />
            <Callout label={L ? 'Gli errori più comuni dei principianti' : 'The most common beginner mistakes'}>
              <UL items={L ? [
                'Inserire un filo una colonna più in là, finendo su un punto vicino — conta sempre le colonne due volte.',
                'Alimentare il BME680 con 5 V invece di 3,3 V — controlla due volte il filo di alimentazione.',
                'Dimenticare la massa comune — il GND di ogni scheda deve arrivare alla guida blu.',
                'Inserire un filo nel canale centrale — i fili vanno nei foretti con lettera, non nello spazio vuoto.',
              ] : [
                'Putting a wire one column off, so it lands on a neighbouring point — always count columns twice.',
                'Feeding the BME680 with 5 V instead of 3.3 V — double-check the power wire.',
                'Forgetting the common ground — every board\'s GND must reach the blue rail.',
                'Pushing a wire into the central channel — wires go into the lettered holes, not the gap.',
              ]} />
            </Callout>

            <SubHeading>{L ? "3.3 Configurare l'Arduino IDE" : '3.3 Setting up the Arduino IDE'}</SubHeading>
            <OL items={L ? [
              'Scarica e installa l’Arduino IDE da arduino.cc.',
              <>In <em>File → Preferenze</em>, aggiungi l'URL del pacchetto board ESP32 nel campo "URL aggiuntivi gestione schede".</>,
              <>In <em>Strumenti → Board → Gestore Schede</em>, cerca "esp32" e installa il pacchetto.</>,
              <>Seleziona <em>Strumenti → Board → ESP32 Dev Module</em>.</>,
              <>Dal Gestore Librerie installa: <strong>Adafruit BME680</strong>, <strong>Adafruit Unified Sensor</strong>, e <strong>ArduinoJson</strong> (di Benoit Blanchon).</>,
            ] : [
              'Download and install the Arduino IDE from arduino.cc.',
              <>In <em>File → Preferences</em>, add the ESP32 board package URL in the "Additional boards manager URLs" field.</>,
              <>In <em>Tools → Board → Boards Manager</em>, search for "esp32" and install the package.</>,
              <>Select <em>Tools → Board → ESP32 Dev Module</em>.</>,
              <>From the Library Manager install: <strong>Adafruit BME680</strong>, <strong>Adafruit Unified Sensor</strong>, and <strong>ArduinoJson</strong> (by Benoit Blanchon).</>,
            ]} />

            <SubHeading>{L ? "3.4 Lo sketch dell'ESP32" : '3.4 The ESP32 sketch'}</SubHeading>
            <P>
              {L
                ? 'Collega l’ESP32 al tuo computer con un cavo USB-C. Poi copia il codice sotto e caricalo sull’ESP32 usando l’Arduino IDE.'
                : 'Connect the ESP32 to your laptop with a USB-C cable. Then copy the code below and upload it to the ESP32 using the Arduino IDE.'}
            </P>
            <CodeBlock full>{`#include <Wire.h>
#include <ArduinoJson.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>

const char* SENSOR_ID = "S1";
const int PIN_NH3 = 1;
const int PIN_NO2 = 2;
const int PIN_CO  = 3;

// Sampling: 5 close readings, one burst every 5 minutes
const int  BURST_SAMPLES   = 5;       // readings per burst
const long SAMPLE_GAP_MS   = 2000;   // gap between readings (2 s)
const long CYCLE_PERIOD_MS = 300000; // interval between bursts (5 min)

Adafruit_BME680 bme;
bool bmeFound = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(12, 13);
  if (bme.begin(0x76, &Wire)) {
    bme.setTemperatureOversampling(BME680_OS_8X);
    bme.setHumidityOversampling(BME680_OS_2X);
    bme.setPressureOversampling(BME680_OS_4X);
    bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
    bme.setGasHeater(320, 150);
    bmeFound = true;
    Serial.println("BME680 OK.");
  } else {
    Serial.println("BME680 not found - sending gas sensors only.");
  }
  Serial.println("Waiting 30s for MICS-6814 heaters...");
  delay(30000);
  Serial.println("Starting.");
}

void loop() {
  double nh3Sum=0, no2Sum=0, coSum=0;
  double tSum=0, hSum=0, pSum=0, gSum=0;
  int gasCount=0, bmeCount=0;

  for (int i = 0; i < BURST_SAMPLES; i++) {
    nh3Sum += (analogRead(PIN_NH3) / 4095.0) * 100.0;
    no2Sum += (analogRead(PIN_NO2) / 4095.0) * 100.0;
    coSum  += (analogRead(PIN_CO)  / 4095.0) * 100.0;
    gasCount++;
    if (bmeFound && bme.performReading()) {
      tSum += bme.temperature;
      hSum += bme.humidity;
      pSum += bme.pressure / 100.0;
      gSum += bme.gas_resistance / 1000.0;
      bmeCount++;
    }
    if (i < BURST_SAMPLES - 1) delay(SAMPLE_GAP_MS);
  }

  StaticJsonDocument<300> doc;
  doc["sensor_id"] = SENSOR_ID;
  doc["samples"]   = gasCount;
  doc["nh3"] = nh3Sum / gasCount;
  doc["no2"] = no2Sum / gasCount;
  doc["co"]  = coSum  / gasCount;
  if (bmeCount > 0) {
    doc["temperature"] = tSum / bmeCount;
    doc["humidity"]    = hSum / bmeCount;
    doc["pressure"]    = pSum / bmeCount;
    doc["gas_kohm"]    = gSum / bmeCount;
  }

  String payload;
  serializeJson(doc, payload);
  Serial.println(payload);

  long burstElapsed = (long)(BURST_SAMPLES - 1) * SAMPLE_GAP_MS;
  long wait = CYCLE_PERIOD_MS - burstElapsed;
  if (wait < 0) wait = 0;
  delay(wait);
}`}</CodeBlock>

            <SubHeading>{L ? 'Note sul codice' : 'Code notes'}</SubHeading>
            <UL items={L ? [
              <><strong>Riscaldamento integrato:</strong> il <code>delay(30000)</code> nel setup attende 30 secondi per stabilizzare i riscaldatori del MiCS-6814.</>,
              <><strong>Raffica di 5 letture:</strong> mediare più letture riduce il rumore tipico dei sensori di gas, dando un valore più stabile.</>,
              <><strong>Una trasmissione ogni 5 minuti:</strong> il campo <code>samples</code> nel JSON indica quante letture compongono la media (normalmente 5).</>,
              <><strong>Valori dei gas:</strong> <code>nh3</code>, <code>no2</code> e <code>co</code> sono la lettura ADC come percentuale (0–100), non ancora concentrazioni reali.</>,
              <><strong>Robustezza:</strong> se il BME680 non viene trovato, lo sketch continua a inviare solo i dati dei gas.</>,
            ] : [
              <><strong>Built-in warm-up:</strong> the <code>delay(30000)</code> in setup waits 30 seconds to stabilise the MiCS-6814 heaters.</>,
              <><strong>Burst of 5 readings:</strong> averaging multiple readings reduces the noise typical of gas sensors, giving a more stable value.</>,
              <><strong>One transmission every 5 minutes:</strong> the <code>samples</code> field in the JSON indicates how many readings make up the average (normally 5).</>,
              <><strong>Gas values:</strong> <code>nh3</code>, <code>no2</code>, and <code>co</code> are the ADC reading as a percentage (0–100), not yet real concentrations.</>,
              <><strong>Robustness:</strong> if the BME680 is not found, the sketch continues sending gas data only.</>,
            ]} />
            <Callout label={L ? 'Verifica rapida' : 'Quick check'}>
              {L
                ? <>Dopo aver caricato lo sketch, apri il Serial Monitor a 115200 baud: vedrai messaggi di avvio, poi una riga ogni 5 minuti come<br /><code>{'{"sensor_id":"S1","samples":5,"nh3":21.3,...}'}</code><br />Per i test iniziali, abbassa temporaneamente <code>CYCLE_PERIOD_MS</code> a 15000 (15 s).</>
                : <>After uploading the sketch, open the Serial Monitor at 115200 baud: you will see startup messages, then one line every 5 minutes such as<br /><code>{'{"sensor_id":"S1","samples":5,"nh3":21.3,...}'}</code><br />For initial testing, temporarily lower <code>CYCLE_PERIOD_MS</code> to 15000 (15 s).</>}
            </Callout>

            <ChapterNav L={L}
              prev={{ id: 's2', title: `02 · ${L ? CHAPTERS[1].it : CHAPTERS[1].en}` }}
              next={{ id: 's4', title: `04 · ${L ? CHAPTERS[3].it : CHAPTERS[3].en}` }} />
          </div>

          {/* 04 — SETTING UP THE SERVER (RASPBERRY PI) */}
          <SectionLabel num={4} title={L ? 'Configurare il server (Raspberry Pi)' : 'Setting Up the Server (Raspberry Pi)'} />
          <div style={{ padding: '22px 28px 28px', display: 'flow-root' }}>
            <SubHeading first>{L ? '4.1 Collegamenti USB' : '4.1 USB connections'}</SubHeading>
            <P>
              {L
                ? 'Sul Raspberry Pi non c’è cablaggio su breadboard: due dispositivi si collegano via USB.'
                : 'On the Raspberry Pi there is no breadboard wiring: two devices are connected via USB.'}
            </P>
            <UL items={L ? [
              <>Il sensore <strong>SDS011</strong>, tramite il suo adattatore USB, di solito appare come <code>/dev/ttyUSB0</code>.</>,
              <>L'<strong>ESP32</strong>, collegato via cavo USB, di solito appare come <code>/dev/ttyACM0</code>.</>,
            ] : [
              <>The <strong>SDS011</strong> sensor, via its USB adapter, usually appears as <code>/dev/ttyUSB0</code>.</>,
              <>The <strong>ESP32</strong>, connected via USB cable, usually appears as <code>/dev/ttyACM0</code>.</>,
            ]} />
            <P>{L ? 'Se i nomi non corrispondono, esegui nel Terminale:' : 'If the names do not match, run in the Terminal:'}</P>
            <CodeBlock full>ls /dev/ttyUSB* /dev/ttyACM*</CodeBlock>
            <P>
              {L
                ? <>e aggiorna le variabili <code>SDS011_PORT</code> e <code>ESP_PORT</code> in cima al programma.</>
                : <>and update the <code>SDS011_PORT</code> and <code>ESP_PORT</code> variables at the top of the program.</>}
            </P>

            <SubHeading>{L ? '4.2 Installare il software' : '4.2 Installing the software'}</SubHeading>
            <P>
              {L
                ? 'Installa Raspberry Pi OS sulla microSD con Raspberry Pi Imager, poi apri un Terminale ed esegui:'
                : 'Install Raspberry Pi OS on the microSD with Raspberry Pi Imager, then open a Terminal and run:'}
            </P>
            <CodeBlock full>{`sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip
pip3 install flask flask-cors pyserial`}</CodeBlock>
            <P>
              {L
                ? <>Copia il file del server sul Pi e, se presente, la cartella <code>dist/</code> con la dashboard React. Poi aggiungi il tuo utente al gruppo della porta seriale:</>
                : <>Copy the server file to the Pi and, if present, the <code>dist/</code> folder with the React dashboard. Then add your user to the serial port group:</>}
            </P>
            <CodeBlock full>{`sudo usermod -a -G dialout $USER
sudo reboot`}</CodeBlock>

            <SubHeading>{L ? '4.3 Come funziona il programma del Pi' : '4.3 How the Pi program works'}</SubHeading>
            <Table
              headers={L ? ['Componente del programma', 'Cosa fa'] : ['Program component', 'What it does']}
              rows={L ? [
                [<strong>Lettore SDS011</strong>, 'Legge i pacchetti dal sensore di particolato ed estrae PM2.5 e PM10.'],
                [<strong>Lettore ESP32</strong>, 'Legge le righe JSON dall’ESP32 ed estrae i dati di gas e ambiente.'],
                [<strong>Ciclo di unione</strong>, 'Ogni 30 secondi unisce le ultime letture in un unico "snapshot".'],
                [<strong>Media oraria</strong>, 'Accumula gli snapshot dell’ora corrente e, al cambio di ogni ora, calcola e archivia la media.'],
                [<strong>Salvataggio</strong>, <>Scrive i dati su file CSV e la storia su <code>history.json</code> e <code>hourly.json</code>.</>],
                [<strong>Simulazione</strong>, 'Se una scheda è assente, genera dati realistici al suo posto.'],
                [<strong>Server web (Flask)</strong>, 'Pubblica gli endpoint API e serve la dashboard sulla porta 5050.'],
              ] : [
                [<strong>SDS011 reader</strong>, 'Reads packets from the particulate sensor and extracts PM2.5 and PM10.'],
                [<strong>ESP32 reader</strong>, 'Reads JSON lines from the ESP32 and extracts gas and environmental data.'],
                [<strong>Merge loop</strong>, 'Every 30 seconds merges the latest readings into a single "snapshot".'],
                [<strong>Hourly average</strong>, 'Accumulates snapshots for the current hour and, at the turn of each hour, calculates and archives the average.'],
                [<strong>Saving</strong>, <>Writes data to CSV files and history to <code>history.json</code> and <code>hourly.json</code>.</>],
                [<strong>Simulation</strong>, 'If a board is missing, generates realistic data in its place.'],
                [<strong>Web server (Flask)</strong>, 'Publishes the API endpoints and serves the dashboard on port 5050.'],
              ]} />

            <SubHeading>{L ? 'Endpoint disponibili' : 'Available endpoints'}</SubHeading>
            <Table
              headers={L ? ['Indirizzo', 'Cosa restituisce'] : ['Address', 'What it returns']}
              rows={[
                ['/api/live', L ? "L'ultimo snapshot unito di tutti i valori." : 'The latest merged snapshot of all values.'],
                ['/api/history', L ? 'La storia delle ultime 24 ore.' : 'The history of the last 24 hours.'],
                ['/api/hourly', L ? 'Le medie orarie (i dati mostrati dalla piattaforma).' : 'The hourly averages (the data displayed by the platform).'],
                ['/api/status', L ? 'Stato di connessione di entrambe le schede.' : 'Connection status of both boards.'],
                ['/api/pm', L ? 'Le ultime 50 letture di particolato.' : 'The last 50 particulate readings.'],
                ['/api/mean', L ? 'Le ultime 50 letture ESP32, mediate per sensore.' : 'The last 50 ESP32 readings, averaged by sensor.'],
                ['/data (POST)', L ? 'Permette a un ESP32 di inviare dati via Wi-Fi invece che USB.' : 'Allows an ESP32 to send data via Wi-Fi instead of USB.'],
              ]} />

            <SubHeading>{L ? 'Dal campione alla media oraria' : 'From sample to hourly average'}</SubHeading>
            <OL items={L ? [
              "L'ESP32 prende 5 letture vicine e ne invia la media: un valore ogni 5 minuti (circa 12 valori all'ora).",
              "Il Raspberry Pi riceve questi valori e, insieme al particolato dell'SDS011, li accumula per l'ora corrente.",
              <>Al cambio di ogni nuova ora, il server calcola la media di tutti i valori raccolti nell'ora appena conclusa e la archivia in <code>hourly.json</code>.</>,
              <>La <strong>media oraria</strong> è il dato esposto su <code>/api/hourly</code> — quello che la piattaforma comunitaria mostra ai cittadini.</>,
            ] : [
              'The ESP32 takes 5 close readings and sends their average: one value every 5 minutes (about 12 values per hour).',
              'The Raspberry Pi receives these values and, together with the particulate from the SDS011, accumulates them for the current hour.',
              <>At the turn of each new hour, the server calculates the average of all values collected in the just-completed hour and archives it in <code>hourly.json</code>.</>,
              <>The <strong>hourly average</strong> is the data exposed at <code>/api/hourly</code> — what the community platform shows to citizens.</>,
            ]} />

            <SubHeading>{L ? 'Avviare il server' : 'Starting the server'}</SubHeading>
            <CodeBlock full>{L
              ? `cd ~/aria-bene-comune     # la cartella dove hai messo il file
python3 server.py          # usa il vero nome del tuo file`
              : `cd ~/aria-bene-comune     # the folder where you put the file
python3 server.py          # use the actual name of your file`}</CodeBlock>
            <P>{L ? "Trova l'indirizzo IP del Pi con:" : "Find the Pi's IP address with:"}</P>
            <CodeBlock full>hostname -I</CodeBlock>
            <P>
              {L
                ? <>Da qualsiasi dispositivo sulla stessa rete, apri un browser su <code>http://INDIRIZZO-IP:5050</code> per vedere la dashboard.</>
                : <>From any device on the same network, open a browser at <code>http://IP-ADDRESS:5050</code> to see the dashboard.</>}
            </P>

            <ChapterNav L={L}
              prev={{ id: 's3', title: `03 · ${L ? CHAPTERS[2].it : CHAPTERS[2].en}` }}
              next={{ id: 's5', title: `05 · ${L ? CHAPTERS[4].it : CHAPTERS[4].en}` }} />
          </div>

          {/* 05 — FIRST BOOT, CALIBRATION & TROUBLESHOOTING */}
          <SectionLabel num={5} title={L ? 'Prima accensione, calibrazione e risoluzione dei problemi' : 'First Boot, Calibration & Troubleshooting'} />
          <div style={{ padding: '22px 28px 28px', display: 'flow-root' }}>
            <SubHeading first>{L ? '5.1 Prima accensione e collaudo' : '5.1 First boot and testing'}</SubHeading>
            <OL items={L ? [
              "Collega l'SDS011 e l'ESP32 alle porte USB del Pi.",
              'Per i primi test, alimenta il Raspberry Pi dalla rete elettrica: è più stabile mentre verifichi che tutto funzioni.',
              "Accendi il Raspberry Pi e attendi l'avvio del sistema.",
              'Avvia il server come mostrato nel capitolo 4.',
              'Lascia tutto in funzione per 10–15 minuti: è il tempo di riscaldamento dei sensori di gas.',
              'Apri la dashboard in un browser e controlla che i valori cambino nel tempo.',
              <>Apri <code>/api/status</code> per verificare che entrambe le schede risultino connesse (<code>true</code>).</>,
            ] : [
              "Connect the SDS011 and the ESP32 to the Pi's USB ports.",
              'For the first tests, power the Raspberry Pi from mains power: it is more stable while you verify everything works.',
              'Power on the Raspberry Pi and wait for the system to boot.',
              'Start the server as shown in chapter 4.',
              'Leave everything running for 10–15 minutes: this is the warm-up time for the gas sensors.',
              'Open the dashboard in a browser and check that values change over time.',
              <>Open <code>/api/status</code> to verify that both boards show as connected (<code>true</code>).</>,
            ]} />
            <Callout label={L ? 'Come capire se sta simulando' : 'How to tell if it is simulating'}>
              {L
                ? <>Se <code>/api/status</code> mostra una scheda come <code>false</code> ma vedi comunque dei valori, quei valori sono simulati. Controlla i collegamenti USB e i nomi delle porte.</>
                : <>If <code>/api/status</code> shows a board as <code>false</code> but you still see values, those values are simulated. Check the USB connections and port names.</>}
            </Callout>

            <SubHeading>{L ? '5.2 Riscaldamento' : '5.2 Warm-up'}</SubHeading>
            <P>
              {L
                ? "Lo sketch dell'ESP32 attende già 30 secondi all'avvio per i riscaldatori del MiCS-6814. Per letture davvero affidabili, però, è meglio lasciare il dispositivo acceso in aria pulita per almeno 10–15 minuti prima di registrare dati seri."
                : 'The ESP32 sketch already waits 30 seconds on startup for the MiCS-6814 heaters. For truly reliable readings, however, it is best to leave the device powered on in clean air for at least 10–15 minutes before recording serious data.'}
            </P>

            <SubHeading>{L ? '5.3 Calibrazione di base' : '5.3 Basic calibration'}</SubHeading>
            <UL items={L ? [
              <><strong>PM2.5 e PM10:</strong> l'SDS011 restituisce già µg/m³, quindi è praticamente pronto all'uso.</>,
              <><strong>Gas (NH₃, CO, NO₂):</strong> nello sketch questi valori sono la lettura ADC come percentuale (0–100), non concentrazioni reali. Annota i valori in aria pulita come "base". Convertirli in concentrazioni reali richiede applicare le curve del produttore del MiCS-6814.</>,
              <><strong>VOC (<code>gas_kohm</code>):</strong> è una resistenza in kΩ. In aria pulita il valore è più alto; scende in presenza di vapori. Più che il numero assoluto, conta come varia rispetto alla base.</>,
            ] : [
              <><strong>PM2.5 and PM10:</strong> the SDS011 already outputs µg/m³, so it is essentially ready to use.</>,
              <><strong>Gases (NH₃, CO, NO₂):</strong> in the sketch these values are the ADC reading as a percentage (0–100), not real concentrations. Note the values in clean air as a "baseline". Converting them to actual concentrations requires applying the MiCS-6814 manufacturer's curves.</>,
              <><strong>VOC (<code>gas_kohm</code>):</strong> this is a resistance in kΩ. In clean air the value is higher; it drops in the presence of vapours. Rather than the absolute number, what matters is how it varies relative to the baseline.</>,
            ]} />
            <Callout label={L ? 'Da tenere a mente' : 'Keep in mind'}>
              {L
                ? 'Un sensore amatoriale indica tendenze (se la qualità dell’aria migliora o peggiora) più che misure di precisione da laboratorio. Per uso domestico ed educativo è perfettamente adatto.'
                : 'A hobbyist sensor indicates trends (whether air quality is improving or worsening) rather than laboratory-precision measurements. For home and educational use it is perfectly suitable.'}
            </Callout>

            <SubHeading>{L ? '5.4 Risoluzione dei problemi' : '5.4 Troubleshooting'}</SubHeading>
            <Table
              headers={L ? ['Problema', 'Possibile causa', 'Cosa fare'] : ['Problem', 'Possible cause', 'What to do']}
              rows={L ? [
                ['"unavailable" all’avvio', 'Porta USB errata', <>Controlla i nomi delle porte con <code>ls /dev/ttyUSB* /dev/ttyACM*</code> e aggiorna le variabili</>],
                ['Permission denied sulla seriale', 'Utente non nel gruppo dialout', <>Esegui <code>usermod -a -G dialout</code> e riavvia</>],
                ['Dati sempre identici', 'Sensori non riscaldati o simulazione attiva', <>Attendi 10–15 min; controlla <code>/api/status</code></>],
                ['La dashboard non si apre', 'IP errato o porta chiusa', <>Verifica l'IP con <code>hostname -I</code>; usa la porta <code>:5050</code></>],
                ['ESP32 non riconosciuto', 'Driver USB mancante', 'Installa i driver CP210x/CH340 sul tuo sistema'],
                ['JSON non letto', 'Baud rate o formato diverso', 'Assicurati che lo sketch usi 115200 e i nomi dei campi corretti'],
              ] : [
                ['"unavailable" on startup', 'Wrong USB port', <>Check port names with <code>ls /dev/ttyUSB* /dev/ttyACM*</code> and update the variables</>],
                ['Permission denied on serial', 'User not in the dialout group', <>Run <code>usermod -a -G dialout</code> and reboot</>],
                ['Data always identical', 'Sensors not warmed up or simulation active', <>Wait 10–15 min; check <code>/api/status</code></>],
                ['Dashboard does not open', 'Wrong IP or closed port', <>Verify IP with <code>hostname -I</code>; use port <code>:5050</code></>],
                ['ESP32 not recognised', 'Missing USB driver', 'Install CP210x/CH340 drivers on your system'],
                ['JSON not read', 'Different baud rate or format', 'Make sure the sketch uses 115200 and the correct field names'],
              ]} />

            <ChapterNav L={L}
              prev={{ id: 's4', title: `04 · ${L ? CHAPTERS[3].it : CHAPTERS[3].en}` }}
              next={{ id: 's6', title: `06 · ${L ? CHAPTERS[5].it : CHAPTERS[5].en}` }} />
          </div>

          {/* 06 — THE DIY ENCLOSURE */}
          <SectionLabel num={6} title={L ? 'La custodia fai-da-te' : 'The DIY Enclosure'} />
          <div style={{ padding: '22px 28px 28px', display: 'flow-root' }}>
            <P>
              {L
                ? <>Una delle idee centrali di <strong>"Aria Bene Comune"</strong> è che il sensore sia davvero accessibile a tutti: open source e costruito con <strong>materiali di recupero</strong>. Non serve una custodia acquistata o stampata in 3D. Va bene qualsiasi contenitore impermeabile che hai già in casa: una scatola di biscotti, un contenitore per alimenti, una cassetta degli attrezzi di plastica.</>
                : <>One of the core ideas behind <strong>"Aria Bene Comune"</strong> is that the sensor is truly accessible to everyone: open source and built with <strong>salvaged materials</strong>. There is no need for a bought or 3D-printed enclosure. Any waterproof container you already have at home will do: a biscuit tin, a food storage container, a plastic toolbox.</>}
            </P>
            <Callout label={L ? 'Principio guida' : 'Guiding principle'}>
              {L
                ? <>La custodia deve <strong>proteggere l'elettronica dalla pioggia</strong>, permettendo però <strong>all'aria di circolare liberamente</strong> verso i sensori.</>
                : <>The enclosure must <strong>protect the electronics from rain</strong> while also <strong>allowing air to flow freely</strong> to the sensors.</>}
            </Callout>

            <SubHeading>{L ? '6.1 Cosa serve per la custodia' : '6.1 What you need for the enclosure'}</SubHeading>
            <UL items={L ? [
              'Un contenitore impermeabile con coperchio.',
              'Un attrezzo per fare i foretti: una lesina, un trapano, o un chiodo e un martello.',
              'Nastro adesivo resistente o una pistola per colla a caldo per fissare e sigillare.',
              'Nastro isolante elettrico (utile se la scatola è metallica).',
              <><em>Opzionale:</em> rete fine (zanzariera) per coprire i foretti d'aria.</>,
              <><em>Opzionale:</em> fascette per fissare la scatola.</>,
            ] : [
              'A waterproof container with a lid.',
              'A tool for making holes: a bradawl, a drill, or a nail and hammer.',
              'Strong adhesive tape or a hot glue gun to fix and seal.',
              'Electrical insulating tape (useful if the box is metal).',
              <><em>Optional:</em> fine mesh (fly screen) to cover the air holes.</>,
              <><em>Optional:</em> cable ties to secure the box.</>,
            ]} />

            <SubHeading>{L ? "6.2 Foretti per l'aria" : '6.2 Air holes'}</SubHeading>
            <UL items={L ? [
              'Fai un gruppo di foretti vicino ai sensori (SDS011 e BME680).',
              'Posiziona i foretti sui lati o sul fondo, mai verso l’alto: raccoglierebbero la pioggia.',
              "Bastano pochi foretti larghi alcuni millimetri: tanti piccoli foretti sono meglio di un'unica grande apertura.",
              'Copri i foretti con rete fine per tenere fuori insetti e sporco.',
            ] : [
              'Make a cluster of holes near the sensors (SDS011 and BME680).',
              'Put holes on the sides or bottom, never facing upward: they would collect rain.',
              'A few holes a few millimetres wide are enough: many small holes are better than one large opening.',
              'Cover the holes with fine mesh to keep out insects and dirt.',
            ]} />
            <Callout label={L ? 'Importante per il particolato' : 'Important for particulate sensing'}>
              {L
                ? "Il sensore SDS011 ha una propria presa d'aria con una piccola ventola. Posiziona la scatola così che la presa sia il più vicino possibile a un gruppo di foretti, e che né la rete né i cavi la ostruiscano."
                : "The SDS011 sensor has its own air intake with a small fan. Position the box so that intake is as close as possible to a cluster of holes, and that neither mesh nor cables obstruct it."}
            </Callout>

            <SubHeading>{L ? "6.3 Il foro per i cavi e l'ansa antigoccia" : '6.3 The cable hole and drip loop'}</SubHeading>
            <UL items={L ? [
              'Fai un solo foro per i cavi, il più piccolo possibile, su un lato che guarda verso il basso.',
              'Sigilla intorno con colla a caldo o nastro, lasciando il cavo libero di muoversi leggermente.',
              <>Crea un'ansa a U rovesciata nel cavo appena fuori dal foro (un'ansa che punta verso il basso): la pioggia gocciola via prima di arrivare al foro. Questa tecnica si chiama <strong>ansa antigoccia</strong> (drip loop).</>,
            ] : [
              'Make a single hole for the cables, as small as possible, on a side that faces downward.',
              'Seal around it with hot glue or tape, leaving the cable free to move slightly.',
              <>Create an inverted-U loop in the cable just outside the hole (a loop pointing downward): rain drips off before reaching the hole. This technique is called a <strong>drip loop</strong>.</>,
            ]} />

            <SubHeading>{L ? '6.4 Alimentazione: pannello solare e power bank' : '6.4 Power: solar panel and power bank'}</SubHeading>
            <SchemaBox>{L
              ? `[ Pannello solare ]
        |  (ricarica)
        v
[ Power bank ]  <-- batteria buffer
        |  (USB)
        v
[ Raspberry Pi ] --> ESP32 e sensori`
              : `[ Solar panel ]
        |  (charging)
        v
[ Power bank ]  <-- buffer battery
        |  (USB)
        v
[ Raspberry Pi ] --> ESP32 & sensors`}</SchemaBox>
            <P>
              {L
                ? 'Il pannello solare ricarica il power bank, e il power bank alimenta il Raspberry Pi. La batteria funge da "riserva": accumula energia quando c’è sole e continua ad alimentare il sistema quando non c’è.'
                : 'The solar panel charges the power bank, and the power bank powers the Raspberry Pi. The battery acts as a "reservoir": it accumulates energy when there is sun and continues to power the system when there is none.'}
            </P>
            <Callout label={L ? 'Requisito essenziale del power bank' : 'Essential power bank requirement'}>
              {L
                ? <>Deve supportare la <strong>"ricarica passthrough"</strong>: la capacità di caricarsi dal pannello mentre alimenta contemporaneamente il Pi. Molti power bank economici si spengono quando vengono caricati — questi <strong>non funzioneranno</strong>.</>
                : <>It must support <strong>"passthrough charging"</strong>: the ability to charge from the panel while simultaneously powering the Pi. Many cheap power banks shut off when being charged — these <strong>will not work</strong>.</>}
            </Callout>

            <SubHeading>{L ? '6.5 Disporre i componenti nella scatola' : '6.5 Arranging components inside the box'}</SubHeading>
            <UL items={L ? [
              <>Se la scatola è metallica, <strong>rivesti l'interno con nastro isolante</strong>: il metallo conduce elettricità e un contatto accidentale può causare un corto circuito.</>,
              'Posiziona il Raspberry Pi e il power bank nel punto più riparato, lontano dai foretti d’aria.',
              'Posiziona i sensori (SDS011 e BME680) vicino ai foretti d’aria, senza toccare le pareti.',
              'Appoggia l’elettronica su un piccolo supporto (un tappo di bottiglia, della gommapiuma) per tenerla sollevata dal fondo.',
              <>Metti una <strong>bustina di gel di silice</strong> nella scatola per assorbire l'umidità in eccesso.</>,
            ] : [
              <>If the box is metal, <strong>line the inside with insulating tape</strong>: metal conducts electricity and accidental contact can cause a short circuit.</>,
              'Place the Raspberry Pi and power bank in the most sheltered spot, away from the air holes.',
              'Position the sensors (SDS011 and BME680) close to the air holes, without touching the walls.',
              'Rest the electronics on a small support (a bottle cap, foam) to keep them off the bottom.',
              <>Put a <strong>silica gel sachet</strong> in the box to absorb excess moisture.</>,
            ]} />

            <SubHeading>{L ? '6.6 Installazione esterna' : '6.6 Outdoor installation'}</SubHeading>
            <UL items={L ? [
              'Posiziona il sensore in un punto ben ventilato, lontano da fonti di calore diretto o fumo.',
              <>L'altezza tipica per misurazioni comparabili è circa <strong>1,5–3 metri</strong> da terra.</>,
              "Evita angoli senza circolazione d'aria: l'aria deve poter circolare intorno alla scatola.",
              'Fissa saldamente la scatola (fascette a una ringhiera) così il vento non la sposta.',
              "Orienta il pannello solare verso sud, inclinato così che non trattenga l'acqua.",
            ] : [
              'Place the sensor in a well-ventilated spot, away from direct heat sources or smoke.',
              <>The typical height for comparable measurements is about <strong>1.5–3 metres above ground</strong>.</>,
              'Avoid corners with no air circulation: air must be able to circulate around the box.',
              'Secure the box firmly (cable ties to a railing) so the wind cannot move it.',
              'Orient the solar panel facing south, tilted so it does not retain water.',
            ]} />

            <ChapterNav L={L}
              prev={{ id: 's5', title: `05 · ${L ? CHAPTERS[4].it : CHAPTERS[4].en}` }}
              next={null} />
          </div>

          {/* CLOSING */}
          <div style={{ padding: '40px 28px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-title)', fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)' }}>
              {L ? 'Buona costruzione!' : 'Happy building!'}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.7, color: 'var(--black)', maxWidth: 520, margin: '14px auto 0' }}>
              {L
                ? "Sei arrivato alla fine. Quando il tuo sensore sarà acceso, avrai aggiunto una voce a un quadro condiviso e vivo dell'aria. Costruiscilo, miglioralo, e passa la guida a qualcun altro."
                : "You've reached the end. When your sensor is switched on, you've added a voice to a shared, living picture of the air. Build it, improve it, and pass the guide on."}
            </p>
            <div style={{ marginTop: 18 }}>
              <button type="button" onClick={() => window.print()} style={btnStyle(false)}>
                {L ? 'Stampa / salva questa guida come PDF' : 'Print / save this guide as PDF'}
              </button>
            </div>
          </div>

        </main>
      </div>

      </div>
    </div>
  );
}
