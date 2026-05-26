import { useState, useEffect, useRef } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
import { HOURLY_DATA } from '../data/timeseries';
import { getPollLevel } from '../utils/aqi';

const ZONE_CATS = {
  mind:    { primary: 'systemic',     label_it: 'Testa / Mente',  label_en: 'Head / Mind', desc_it: 'Mal di testa, confusione, vertigini',       desc_en: 'Headache, confusion, dizziness' },
  eyes:    { primary: 'gaseous',      label_it: 'Occhi',           label_en: 'Eyes',        desc_it: 'Lacrimazione, bruciore, arrossamento',       desc_en: 'Tearing, burning, redness' },
  throat:  { primary: 'gaseous',      label_it: 'Gola',            label_en: 'Throat',      desc_it: 'Secchezza, irritazione, tosse secca',        desc_en: 'Dryness, irritation, dry cough' },
  chest:   { primary: 'particulates', label_it: 'Torace / Petto', label_en: 'Chest',       desc_it: 'Difficoltà respiratorie, affanno',           desc_en: 'Breathing difficulty, chest tightness' },
  stomach: { primary: 'systemic',     label_it: 'Stomaco',         label_en: 'Stomach',     desc_it: 'Nausea, vomito (esposizioni acute)',         desc_en: 'Nausea, vomiting (acute exposure)' },
};

const CATS = [
  { key: 'particulates', it: 'Particolato (PM2.5/PM10)',    en: 'Particulates (PM2.5/PM10)' },
  { key: 'gaseous',      it: 'Gas irritanti (NO₂/SO₂/O₃)', en: 'Gaseous (NO₂/SO₂/O₃)' },
  { key: 'systemic',     it: 'Sistemici (CO/NH₃/C₆H₆)',    en: 'Systemic (CO/NH₃/C₆H₆)' },
];

const ZONE_Y = {
  mind:    '8%',
  eyes:    '12%',
  throat:  '23%',
  chest:   '40%',
  stomach: '58%',
};

const SUB_LABEL = {
  fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

const SEL_STYLE = {
  width: '100%',
  border: '1.5px solid rgba(0,0,0,0.22)',
  background: 'transparent',
  color: 'var(--black)',
  fontFamily: 'Epilogue', fontSize: 11, fontWeight: 400,
  letterSpacing: '0.05em', padding: '5px 8px', cursor: 'pointer',
};

function pillStyleWhite(active) {
  return {
    padding: '5px 14px',
    border: '1.5px solid ' + (active ? 'var(--primary)' : 'rgba(0,0,0,0.22)'),
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--black)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
  };
}

/* ── Report form constants ── */
const DISTRICTS = [...new Set(SENSORS.map((s) => s.district))].sort((a, b) => a.localeCompare(b));

const SYMPTOM_OPTIONS = [
  { key: 'cough',     it: 'Tosse',                     en: 'Cough' },
  { key: 'breath',    it: 'Difficoltà respiratorie',    en: 'Breathing difficulty' },
  { key: 'eyes',      it: 'Irritazione agli occhi',     en: 'Eye irritation' },
  { key: 'throat',    it: 'Bruciore / gola secca',      en: 'Throat burning / dryness' },
  { key: 'headache',  it: 'Mal di testa',               en: 'Headache' },
  { key: 'nausea',    it: 'Nausea',                     en: 'Nausea' },
  { key: 'dizziness', it: 'Vertigini',                  en: 'Dizziness' },
  { key: 'fatigue',   it: 'Stanchezza / affaticamento', en: 'Fatigue' },
  { key: 'chest',     it: 'Oppressione al petto',       en: 'Chest tightness' },
  { key: 'other',     it: 'Altro',                      en: 'Other' },
];

const EMPTY_FORM = { name: '', district: '', symptoms: new Set(), note: '' };

function formatReportTime(date) {
  return (
    date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' +
    date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
}

const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid rgba(0,0,0,0.22)',
  background: 'transparent', color: 'var(--black)',
  fontFamily: 'var(--font-body)', fontSize: 14,
  padding: '7px 10px', outline: 'none',
};

function reportPill(active) {
  return {
    padding: '5px 14px',
    border: '1.5px solid ' + (active ? 'var(--primary)' : 'rgba(0,0,0,0.22)'),
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--black)',
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
  };
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const panelW = 'calc(100vw / 6 * 1.5)';
const BOX = { background: 'var(--white)', padding: '12px 14px', pointerEvents: 'auto' };
const timelineH = 58;

const ZONE_POS = {
  mind:    { x: 50, y: 8 },
  eyes:    { x: 50, y: 12 },
  throat:  { x: 50, y: 23 },
  chest:   { x: 50, y: 40 },
  stomach: { x: 50, y: 58 },
};

function BodyBlobOverlay({ categoryLevels }) {
  const entries = Object.entries(ZONE_CATS);

  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'hidden', mixBlendMode: 'multiply', zIndex: 5,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="blob-halo" x="-200%" y="-150%" width="500%" height="400%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="blob-mid" x="-100%" y="-80%" width="300%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="blob-core" x="-60%" y="-40%" width="220%" height="180%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>

      {/* outer diffuse halo */}
      <g filter="url(#blob-halo)" opacity="0.28">
        {entries.map(([zoneKey, zone]) => {
          const lvIdx = categoryLevels[zone.primary];
          const pos = ZONE_POS[zoneKey];
          return <ellipse key={zoneKey} cx={pos.x} cy={pos.y} rx={18} ry={22} fill={LEVELS[lvIdx].color} />;
        })}
      </g>

      {/* warm mid ring */}
      <g filter="url(#blob-mid)" opacity="0.55">
        {entries.map(([zoneKey, zone]) => {
          const lvIdx = categoryLevels[zone.primary];
          const pos = ZONE_POS[zoneKey];
          return <ellipse key={zoneKey} cx={pos.x} cy={pos.y} rx={10} ry={13} fill={LEVELS[lvIdx].color} />;
        })}
      </g>

      {/* hot core */}
      <g filter="url(#blob-core)" opacity="0.85">
        {entries.map(([zoneKey, zone]) => {
          const lvIdx = categoryLevels[zone.primary];
          const pos = ZONE_POS[zoneKey];
          return <ellipse key={zoneKey} cx={pos.x} cy={pos.y} rx={4} ry={5} fill={LEVELS[lvIdx].color} />;
        })}
      </g>
    </svg>
  );
}

function BodyFigure({ activeZone, onSelectZone, zoneColors, categoryLevels, lang }) {
  const L = lang === 'it';
  return (
    <div className="body-callout-wrap">
      <svg
        viewBox="0 0 198.15 466.33"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          height: '130%',
          top: '8%',
          width: 'auto',
          zIndex: 1,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
      >
        <path d="M197.2,246.89c-1.3-1.6-3.93-7.74-5.1-9.77-1.17-2.03-5.55-8.89-8.91-12.09-.83-.79-1.66-1.35-2.45-1.76-2.43-5.58-5.38-28.01-7.05-45.08-1.76-18.05-7.5-25.2-7.5-25.2.82-14.77-4.1-30.13-3.95-33.76.16-3.63,0-14.97,0-14.97-.86-18.6-10.71-22.2-21.41-25.63-10.71-3.44-23.76-10-25.71-11.72-1.95-1.72-1.95-4.53-2.03-9.14-.08-4.46,1.82-9.22,3.36-14.62,4.14-.1,6.59-12.54,4.53-13.67-.74-.41-1.3-.44-1.71-.3.65-6.33.38-13.46-2.66-19C110.82-.39,99.57,0,99.57,0h-.99s-11.25-.39-17.04,10.16c-3.04,5.55-3.31,12.68-2.66,19-.41-.14-.97-.11-1.71.3-2.06,1.13.39,13.58,4.53,13.67,1.54,5.4,3.44,10.16,3.36,14.62-.08,4.61-.08,7.42-2.03,9.14-1.95,1.72-15.01,8.28-25.71,11.72s-20.55,7.03-21.41,25.63c0,0-.16,11.33,0,14.97.16,3.63-4.77,18.99-3.95,33.76,0,0-5.74,7.15-7.5,25.2-1.66,17.06-4.62,39.5-7.05,45.08-.79.4-1.62.97-2.45,1.76-3.36,3.2-7.74,10.06-8.91,12.09s-3.8,8.17-5.1,9.77c-1.52,1.88-1.31,4.64,1.41,3.34,2.7-1.29,5.41-4.44,6.51-6.31,1.09-1.88,1.88-2.34,1.88-2.34,0,0-1.45,12.29-1.86,16.02-.45,4.14-2.01,9.81.14,10.39,2.36.64,2.97-2.5,3.36-4.92.39-2.42,2.82-14.07,3.59-14.77.96-.87.54.48.32,3.28-.07.95-.39,5.71-.86,8.75-.47,3.05-2.03,9.85,1.25,9.46,3.28-.39,4.06-18.76,4.61-20.09.55-1.33,1.02-.78.7,2.5-.1,1.04-1.8,13.36-1.17,15.87.63,2.5,3.05,2.11,3.83-1.09.78-3.2,1.56-16.18,2.11-17.12.55-.94.7.78.55,3.13-.11,1.72-1.09,11.1.78,11.49,1.88.39,2.64-.76,3.16-7.62.46-6.01.52-9.34.83-13.17.31-3.83.7-15.08-1.17-18.52,0,0,2.34-11.57,7.19-21.57,4.85-10,12.04-27.51,11.72-36.11-.26-7.14,5.73-31.95,7.95-40.34.21,2.09.52,4.31.96,6.58,2.19,11.25,5.47,24.85,5,33.29-.47,8.44-1.41,21.26-2.34,26.26-.94,5-6.56,24.38-6.41,48.3s3.44,52.13,5,58.07c1.56,5.94,2.01,11.83,1.54,15.89-.47,4.06-1.39,13.1-.45,19.2,0,0-3.75,15.94-.78,37.67,2.97,21.73,8.28,45.64,8.28,48.14v.99c-.26,1.17-.54,2.33-.79,3.49-.31,1.41-.52,2.82-.56,4.27-.04,1.43.04,2.85.07,4.28.02,1-.01,2-.11,3-.72,1.46-1.58,2.86-2.47,4.2-1.21,1.82-2.57,3.53-3.95,5.21-1.4,1.7-2.83,3.38-4.16,5.13-.66.87-1.3,1.76-1.9,2.68-.63.95-1.33,1.96-1.56,3.1-.21,1.05.09,2.11,1.1,2.61.2.1.41.16.63.19-.03.32,0,.65.09.99.34,1.24,1.61,2.14,2.88,2.18.17.59.61,1.04,1.29,1.24.83.24,1.73-.01,2.47-.44.04.19.1.38.19.55.46.9,1.49,1.29,2.46,1.26,1.15-.03,2.12-.71,2.88-1.52.4-.42.75-.87,1.11-1.31-.15.6-.16,1.23.06,1.82.42,1.09,1.6,1.64,2.7,1.8,1.04.15,2.08-.06,3.02-.53.36-.18.72-.41,1.06-.67.64-.31,1.22-.77,1.72-1.26,1.1-1.09,1.86-2.46,2.44-3.89,1.27-3.17,1.68-6.62,2.34-9.95.12-.63.25-1.26.4-1.89.08.06.21.05.32-.06,1.42-1.44,1.97-3.78,2.14-5.73.21-2.4-.16-4.78-.6-7.13-.47-2.49-.94-4.97-1.23-7.5-.29-2.52-.46-5.05-.58-7.58-.07-1.39-.13-2.78-.19-4.17,0-.1-.01-.2-.01-.31.28-3.86.61-7.63.99-10.85,1.56-13.44,7.03-35.79,5.63-47.36-1.41-11.57.31-41.11,1.8-49.55,1.49-8.44,8.68-55.96,7.11-69.56l1.74-.16,1.74.16c-1.56,13.6,5.62,61.12,7.11,69.56,1.49,8.44,3.2,37.98,1.8,49.55s4.06,33.92,5.63,47.36c.37,3.22.7,6.98.99,10.85,0,.1-.01.2-.01.31-.06,1.39-.12,2.78-.19,4.17-.12,2.53-.28,5.06-.58,7.58-.29,2.52-.76,5-1.23,7.5-.44,2.35-.81,4.74-.6,7.13.17,1.95.72,4.29,2.14,5.73.11.11.24.12.32.06.14.63.27,1.26.4,1.89.66,3.33,1.07,6.77,2.34,9.95.57,1.43,1.33,2.79,2.44,3.89.5.49,1.08.95,1.72,1.26.34.27.71.5,1.06.67.93.47,1.98.67,3.02.53,1.09-.16,2.28-.71,2.7-1.8.22-.59.21-1.22.06-1.82.36.45.72.89,1.11,1.31.76.81,1.73,1.48,2.88,1.52.97.03,2-.36,2.46-1.26.09-.18.15-.37.19-.55.74.43,1.64.68,2.47.44.68-.19,1.11-.64,1.29-1.24,1.28-.04,2.54-.93,2.88-2.18.09-.34.11-.67.09-.99.21-.03.42-.09.63-.19,1-.5,1.3-1.56,1.1-2.61-.22-1.14-.93-2.15-1.56-3.1-.6-.92-1.24-1.8-1.9-2.68-1.33-1.75-2.76-3.43-4.16-5.13-1.39-1.68-2.75-3.39-3.95-5.21-.89-1.34-1.75-2.74-2.47-4.2-.1-.99-.12-1.99-.11-3,.02-1.43.1-2.85.07-4.28-.04-1.45-.25-2.86-.56-4.27-.26-1.17-.54-2.33-.79-3.49v-.99c0-2.5,5.31-26.42,8.28-48.14,2.97-21.73-.78-37.67-.78-37.67.94-6.1.02-15.14-.45-19.2-.47-4.06-.02-9.95,1.54-15.89,1.56-5.94,4.85-34.15,5-58.07.16-23.92-5.47-43.3-6.41-48.3-.94-5-1.88-17.82-2.34-26.26-.47-8.44,2.81-22.04,5-33.29.44-2.27.75-4.49.96-6.58,2.22,8.39,8.21,33.21,7.95,40.34-.31,8.6,6.88,26.1,11.72,36.11s7.19,21.57,7.19,21.57c-1.88,3.44-1.48,14.69-1.17,18.52.31,3.83.37,7.16.83,13.17.52,6.86,1.28,8.01,3.16,7.62,1.88-.39.9-9.77.78-11.49-.16-2.34,0-4.06.55-3.13.55.94,1.33,13.91,2.11,17.12.78,3.2,3.2,3.6,3.83,1.09.63-2.5-1.07-14.83-1.17-15.87-.31-3.28.16-3.83.7-2.5.55,1.33,1.33,19.69,4.61,20.09s1.72-6.41,1.25-9.46c-.47-3.05-.79-7.81-.86-8.75-.22-2.8-.64-4.16.32-3.28.77.7,3.2,12.35,3.59,14.77.39,2.42,1,5.57,3.36,4.92,2.15-.59.59-6.25.14-10.39-.41-3.73-1.86-16.02-1.86-16.02,0,0,.78.47,1.88,2.34,1.09,1.88,3.81,5.02,6.51,6.31,2.72,1.3,2.93-1.47,1.41-3.34Z" />
      </svg>

      <BodyBlobOverlay categoryLevels={categoryLevels} />

      {Object.entries(ZONE_CATS).map(([key, z]) => {
        const isActive = activeZone === key;
        const color = zoneColors[key];
        return (
          <button
            key={key}
            className={`body-callout-dot${isActive ? ' active' : ''}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: ZONE_Y[key],
              transform: 'translate(-50%, -50%)',
              borderColor: color,
              background: isActive ? color : 'transparent',
              zIndex: 10,
            }}
            onClick={(e) => { e.stopPropagation(); onSelectZone(key); }}
            aria-label={L ? z.label_it : z.label_en}
          />
        );
      })}
    </div>
  );
}

export default function SymptomsPage({ lang }) {
  const [activeZone, setActiveZone] = useState(null);
  const [activeSensor, setActiveSensor] = useState('all');
  const L = lang === 'it';

  const availableDays = [...new Set(HOURLY_DATA.map(r => toISO(r.dateObj)))].sort();
  const latestDay = availableDays[availableDays.length - 1] ?? '';
  const firstDay  = availableDays[0] ?? '';

  const [timeMode,       setTimeMode]       = useState('single');
  const [selectedDate,   setSelectedDate]   = useState(latestDay);
  const [selectedHour,   setSelectedHour]   = useState(23);
  const [rangeDateStart, setRangeDateStart] = useState(firstDay);
  const [rangeDateEnd,   setRangeDateEnd]   = useState(latestDay);
  const [playhead,       setPlayhead]       = useState(0);
  const [isPlaying,      setIsPlaying]      = useState(false);

  const rangeDates = availableDays.filter(d => d >= rangeDateStart && d <= rangeDateEnd);
  const displayDate = timeMode === 'range' ? (rangeDates[playhead] ?? rangeDateStart) : selectedDate;
  const displayHour = selectedHour;

  useEffect(() => {
    setPlayhead(h => Math.min(Math.max(h, 0), Math.max(0, rangeDates.length - 1)));
  }, [rangeDates.length]);

  useEffect(() => {
    if (!isPlaying || timeMode !== 'range') return;
    const id = setInterval(() => {
      setPlayhead(h => {
        if (h >= rangeDates.length - 1) { setIsPlaying(false); return 0; }
        return h + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [isPlaying, timeMode, rangeDates.length]);

  const hourRows = HOURLY_DATA.filter(r => toISO(r.dateObj) === displayDate && r.hour === displayHour);
  const scopedRows = activeSensor === 'all'
    ? hourRows
    : hourRows.filter(r => r.sensorId === Number(activeSensor));
  const rowsForCalc = scopedRows.length ? scopedRows : hourRows;

  const getCategoryLevel = (catKey) => {
    const keys = Object.keys(POLLUTANTS).filter(k => POLLUTANTS[k].category === catKey);
    if (!keys.length) return 0;
    return Math.max(...keys.map(pollutantKey => {
      const peak = Math.max(...rowsForCalc.map(row => row[pollutantKey] || 0));
      return getPollLevel(pollutantKey, peak);
    }));
  };

  const categoryLevels = {
    particulates: getCategoryLevel('particulates'),
    gaseous:      getCategoryLevel('gaseous'),
    systemic:     getCategoryLevel('systemic'),
  };

  const zoneColors = Object.fromEntries(
    Object.entries(ZONE_CATS).map(([zoneKey, zone]) => [
      zoneKey,
      LEVELS[categoryLevels[zone.primary]].color,
    ])
  );

  const overallLevelIndex = Math.max(...Object.values(categoryLevels));
  const lvSuggestion = LEVELS[overallLevelIndex];

  const handleSelectZone = (key) => setActiveZone(prev => prev === key ? null : key);
  const fmtHour = h => `${String(h).padStart(2, '0')}:00`;

  /* report form */
  const [form, setForm] = useState(EMPTY_FORM);
  const [reports, setReports] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleSymptom = (key) => {
    const next = new Set(form.symptoms);
    next.has(key) ? next.delete(key) : next.add(key);
    setForm((f) => ({ ...f, symptoms: next }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.district || !form.symptoms.size) return;
    setReports((prev) => [{ id: Date.now(), name: form.name.trim(), district: form.district, symptoms: [...form.symptoms], note: form.note.trim(), time: new Date() }, ...prev].slice(0, 10));
    setForm(EMPTY_FORM);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const validForm = form.name.trim() && form.district && form.symptoms.size > 0;

  return (
    <div className="symptoms-page">

      {/* TITLE */}
      <div style={{ padding: '24px 24px 0 24px' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
          {L ? 'Mappa Sintomi' : 'Symptoms Map'}
        </span>
      </div>

      {/* BODY PHOTO AREA */}
      <div style={{ position: 'relative', height: 'calc(100vh - 160px)', overflow: 'hidden' }} onClick={() => setActiveZone(null)}>

        <BodyFigure activeZone={activeZone} onSelectZone={handleSelectZone} zoneColors={zoneColors} categoryLevels={categoryLevels} lang={lang} />

        {/* LEFT PANEL */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 20,
            width: panelW, display: 'flex', flexDirection: 'column',
            gap: 8, padding: 12, overflowY: 'auto', pointerEvents: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* BOX 1 — Time controls */}
          <div style={BOX}>
            <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>
              {L ? 'Tempo' : 'Time'}
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {['single', 'range'].map(m => (
                <span key={m}
                  style={{ ...pillStyleWhite(timeMode === m), flex: 1, textAlign: 'center', display: 'block' }}
                  onClick={() => { setTimeMode(m); setIsPlaying(false); }}>
                  {m === 'single' ? (L ? 'Giorno' : 'Day') : (L ? 'Intervallo' : 'Range')}
                </span>
              ))}
            </div>

            {timeMode === 'single' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={SEL_STYLE}>
                  {availableDays.map(d => (
                    <option key={d} value={d}>
                      {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ ...SUB_LABEL, color: 'var(--gray2)' }}>{L ? 'Ora' : 'Hour'}</div>
                  <div style={{ ...SUB_LABEL, color: 'var(--black)' }}>{fmtHour(selectedHour)}</div>
                </div>
                <input type="range" min={0} max={23} value={selectedHour}
                  onChange={e => setSelectedHour(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', margin: 0 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(0,0,0,0.35)', fontFamily: 'Epilogue', fontSize: 9 }}>00:00</span>
                  <span style={{ color: 'rgba(0,0,0,0.35)', fontFamily: 'Epilogue', fontSize: 9 }}>23:00</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 4 }}>{L ? 'Da' : 'From'}</div>
                    <select value={rangeDateStart} onChange={e => setRangeDateStart(e.target.value)} style={SEL_STYLE}>
                      {availableDays.filter(d => d <= rangeDateEnd).map(d => (
                        <option key={d} value={d}>
                          {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 4 }}>{L ? 'A' : 'To'}</div>
                    <select value={rangeDateEnd} onChange={e => setRangeDateEnd(e.target.value)} style={SEL_STYLE}>
                      {availableDays.filter(d => d >= rangeDateStart).map(d => (
                        <option key={d} value={d}>
                          {new Date(d + 'T12:00:00').toLocaleDateString(L ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ ...SUB_LABEL, color: 'var(--gray2)' }}>{L ? 'Ora fissa' : 'Fixed hour'}</div>
                  <div style={{ ...SUB_LABEL, color: 'var(--black)' }}>{fmtHour(selectedHour)}</div>
                </div>
                <input type="range" min={0} max={23} value={selectedHour}
                  onChange={e => setSelectedHour(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', margin: 0 }} />
              </div>
            )}
          </div>

          {/* BOX 2 — Sensor */}
          <div style={BOX}>
            <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>
              {L ? 'Sensore' : 'Sensor'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <span style={pillStyleWhite(activeSensor === 'all')} onClick={() => setActiveSensor('all')}>
                {L ? 'Tutti' : 'All'}
              </span>
              {SENSORS.map(s => (
                <span key={s.id} style={pillStyleWhite(activeSensor === String(s.id))} onClick={() => setActiveSensor(String(s.id))}>
                  {s.name.replace('Taranto - ', '')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* TOP-RIGHT — AQI health recommendation + organ symptoms */}
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 20,
          width: panelW, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
        }}>
          <div style={{ background: lvSuggestion.color, padding: '12px 14px', pointerEvents: 'auto' }}>
            <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
              {L ? "QUALITÀ DELL'ARIA" : 'AIR QUALITY'}
            </div>
            <div style={{ fontFamily: 'Epilogue', fontSize: 32, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 10 }}>
              {L ? lvSuggestion.it : lvSuggestion.en}
            </div>
            {[
              { who: L ? 'Popolazione generale' : 'General population', text: SUGGESTIONS[lvSuggestion.key]?.gen },
              { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: SUGGESTIONS[lvSuggestion.key]?.sen },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
                <div style={{ ...SUB_LABEL, fontSize: 9, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.who}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
              </div>
            ))}
          </div>

          {activeZone && (() => {
            const zone = ZONE_CATS[activeZone];
            const catKey = zone.primary;
            const levelIndex = categoryLevels[catKey];
            const lv = LEVELS[levelIndex];
            const sym = SYMPTOMS[catKey][lv.key];
            const noSym = !sym || (!sym.gen && !sym.sen);
            return (
              <div style={{ background: lv.color, padding: '12px 14px', pointerEvents: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)' }}>
                    {L ? 'SINTOMI' : 'SYMPTOMS'} — {L ? lv.it : lv.en}
                  </div>
                  <button onClick={() => setActiveZone(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ fontFamily: 'Epilogue', fontSize: 32, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 12 }}>
                  {L ? zone.label_it : zone.label_en}
                </div>
                {noSym ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
                    {L ? 'Nessun sintomo atteso a questo livello.' : 'No symptoms expected at this level.'}
                  </div>
                ) : (
                  [
                    { who: L ? 'Popolazione generale' : 'General population', text: L ? sym.gen?.it : sym.gen?.en },
                    { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: L ? sym.sen?.it : sym.sen?.en },
                  ].filter(s => s.text).map((s, i) => (
                    <div key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
                      <div style={{ ...SUB_LABEL, fontSize: 9, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.who}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
                    </div>
                  ))
                )}
                <button
                  style={{ marginTop: 12, width: '100%', padding: '7px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                  onClick={() => document.getElementById('report-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {L ? 'SEGNALA UN SINTOMO →' : 'REPORT A SYMPTOM →'}
                </button>
              </div>
            );
          })()}
        </div>

        {/* BOTTOM TIMELINE — range mode only */}
        {timeMode === 'range' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
            height: timelineH, background: 'var(--white)',
            padding: '10px 16px 12px', boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>
              <button onClick={() => setIsPlaying(p => !p)} style={{
                background: 'none', border: '1.5px solid rgba(0,0,0,0.3)',
                color: 'var(--black)', width: 28, height: 28, cursor: 'pointer',
                fontFamily: 'Epilogue', fontSize: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <span style={{ color: 'rgba(0,0,0,0.45)', fontFamily: 'Epilogue', fontSize: 10, flexShrink: 0 }}>
                {rangeDateStart}
              </span>
              <div style={{ flex: 1, position: 'relative' }}>
                <input type="range" min={0} max={Math.max(0, rangeDates.length - 1)} value={playhead}
                  onChange={e => { setIsPlaying(false); setPlayhead(Number(e.target.value)); }}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, pointerEvents: 'none' }}>
                  {rangeDates.map((d, i) => (
                    <div key={d} style={{
                      width: 1, height: i === playhead ? 8 : 4,
                      background: i === playhead ? 'var(--black)' : 'rgba(0,0,0,0.2)', flexShrink: 0,
                    }} />
                  ))}
                </div>
              </div>
              <span style={{ color: 'rgba(0,0,0,0.45)', fontFamily: 'Epilogue', fontSize: 10, flexShrink: 0 }}>
                {rangeDateEnd}
              </span>
              <div style={{
                background: 'var(--primary)', color: '#fff', fontFamily: 'Epilogue',
                fontSize: 11, fontWeight: 700, padding: '3px 10px', flexShrink: 0,
                letterSpacing: '0.05em',
              }}>
                {displayDate}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SYMPTOMS MATRIX */}
      <div className="symptoms-matrix-section">
        {CATS.map((cat) => {
          const lvIdx = categoryLevels[cat.key];
          const catLv = LEVELS[lvIdx];
          return (
            <div key={cat.key} className="symptoms-matrix-cat" style={{ borderLeft: `5px solid ${catLv.color}` }}>
              <div
                className="symptoms-matrix-cat-header"
                style={{ background: `color-mix(in srgb, ${catLv.color} 14%, var(--white))` }}
              >
                <span className="symptoms-matrix-cat-title">{L ? cat.it.split(' (')[0] : cat.en.split(' (')[0]}</span>
                <span className="symptoms-matrix-cat-sub">
                  {cat.key === 'particulates' ? 'PM2.5 · PM10' : cat.key === 'gaseous' ? 'NO₂ · SO₂ · O₃' : 'CO · NH₃ · C₆H₆'}
                </span>
                <span className="symptoms-matrix-current-badge" style={{ background: catLv.color }}>
                  <span>{lvIdx + 1}</span>
                  <span>{L ? catLv.it : catLv.en}</span>
                </span>
              </div>
              <div className="symptoms-matrix-levels">
                {LEVELS.map((lv) => {
                  const sym = SYMPTOMS[cat.key][lv.key];
                  const isCurrent = categoryLevels[cat.key] === lv.index;
                  const noSym = !sym || (!sym.gen && !sym.sen);
                  return (
                    <div key={lv.key} className={`symptoms-matrix-cell${isCurrent ? ' current' : ''}`} style={{ borderTop: `3px solid ${lv.color}` }}>
                      <div className="symptoms-matrix-level-badge" style={{ background: lv.color }}>
                        <span>{lv.index + 1}</span>
                        <span>{L ? lv.it : lv.en}</span>
                      </div>
                      {noSym ? (
                        <div className="symptoms-matrix-none">—</div>
                      ) : (
                        <>
                          {sym.gen && (
                            <div className="symptoms-matrix-row">
                              <span className="symptoms-matrix-who">{L ? 'Gen.' : 'Gen.'}</span>
                              <span className="symptoms-matrix-text">{L ? sym.gen.it : sym.gen.en}</span>
                            </div>
                          )}
                          {sym.sen && (
                            <div className="symptoms-matrix-row">
                              <span className="symptoms-matrix-who">{L ? 'Sen.' : 'Sen.'}</span>
                              <span className="symptoms-matrix-text">{L ? sym.sen.it : sym.sen.en}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* REPORT SECTION */}
      <div id="report-section" style={{ borderTop: '1px solid var(--gray)' }}>

        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--gray)' }}>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
            {L ? 'Segnala un Sintomo' : 'Report a Symptom'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>

          {/* FORM */}
          <form onSubmit={handleSubmit} noValidate style={{ borderRight: '1px solid var(--gray)' }}>

            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={SUB_LABEL}>{L ? 'Nome o pseudonimo' : 'Name or pseudonym'}</div>
              <input type="text" placeholder={L ? 'Es. Mario R.' : 'E.g. Mario R.'} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={60} style={{ ...SEL_STYLE, fontFamily: 'var(--font-body)', fontSize: 13, padding: '7px 10px' }} />
            </div>

            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={SUB_LABEL}>{L ? 'Zona / Sensore' : 'Zone / Sensor'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {SENSORS.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setForm((f) => ({ ...f, district: s.name }))}
                    style={pillStyleWhite(form.district === s.name)}>
                    {s.name.replace('Taranto - ', '')}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={SUB_LABEL}>{L ? 'Sintomi avvertiti' : 'Symptoms experienced'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {SYMPTOM_OPTIONS.map((s) => (
                  <button key={s.key} type="button" onClick={() => toggleSymptom(s.key)}
                    aria-pressed={form.symptoms.has(s.key)} style={pillStyleWhite(form.symptoms.has(s.key))}>
                    {s.it}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--gray)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={SUB_LABEL}>{L ? 'Note aggiuntive (facoltativo)' : 'Additional notes (optional)'}</div>
              <textarea rows={4}
                placeholder={L ? 'Descrivi quando e come hai avvertito i disturbi...' : 'Describe when and how you experienced the discomfort...'}
                value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                maxLength={500}
                style={{ ...SEL_STYLE, resize: 'vertical', minHeight: 96, fontFamily: 'var(--font-body)', fontSize: 13, padding: '7px 10px' }} />
            </div>

            <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="submit" disabled={!validForm}
                style={{ ...pillStyleWhite(validForm), opacity: validForm ? 1 : 0.4, cursor: validForm ? 'pointer' : 'not-allowed' }}>
                {L ? 'INVIA SEGNALAZIONE →' : 'SUBMIT REPORT →'}
              </button>
              {submitted && (
                <span style={{ ...SUB_LABEL, color: lvSuggestion.color }}>
                  ✓ {L ? 'Segnalazione inviata. Grazie.' : 'Report submitted. Thank you.'}
                </span>
              )}
            </div>
          </form>

          {/* HISTORY */}
          <div>
            <div style={{ ...SUB_LABEL, padding: '14px 28px', borderBottom: '1px solid var(--gray)' }}>
              {reports.length === 0
                ? (L ? 'Segnalazioni recenti' : 'Recent reports')
                : (L ? `Ultime ${reports.length} segnalazioni` : `Last ${reports.length} reports`)}
            </div>
            {reports.length === 0 ? (
              <div style={{ padding: '32px 28px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gray2)', lineHeight: 1.6 }}>
                {L ? 'Le segnalazioni inviate in questa sessione appariranno qui.' : 'Reports submitted in this session will appear here.'}
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} style={{ padding: '16px 28px', borderBottom: '1px solid var(--gray)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-title)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.name}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontStyle: 'italic', color: 'var(--gray2)' }}>{r.district}</span>
                    <span style={{ ...SUB_LABEL, color: 'var(--gray2)', marginLeft: 'auto' }}>{formatReportTime(r.time)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {r.symptoms.map((k) => {
                      const opt = SYMPTOM_OPTIONS.find((o) => o.key === k);
                      return opt ? <span key={k} style={pillStyleWhite(false)}>{opt.it}</span> : null;
                    })}
                  </div>
                  {r.note && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, fontStyle: 'italic' }}>{r.note}</div>}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
