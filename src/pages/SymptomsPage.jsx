import { useState, useEffect, useRef, useMemo } from 'react';
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
  mind:    '17%',
  eyes:    '25%',
  throat:  '40%',
  chest:   '53%',
  stomach: '73%',
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

const SAGOME = Object.keys(import.meta.glob('/public/assets/sagome/*.png')).map(
  p => p.replace('/public', '')
);

const panelW    = 'calc(100vw / 6 * 1.5)';
const BOX       = { background: 'var(--white)', padding: '12px 14px', pointerEvents: 'auto' };
const timelineH = 58;

const ZONE_POS = {
  mind:    { x: 38, y: 17 },
  eyes:    { x: 38, y: 25 },
  throat:  { x: 38, y: 40 },
  chest:   { x: 38, y: 53 },
  stomach: { x: 38, y: 73 },
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
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id="blob-mid" x="-100%" y="-80%" width="300%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="blob-core" x="-60%" y="-40%" width="220%" height="180%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* outer diffuse halo — 2 levels below */}
      <g filter="url(#blob-halo)" opacity="0.28">
        {entries.map(([zoneKey, zone]) => {
          const lvIdx = categoryLevels[zone.primary];
          const pos = ZONE_POS[zoneKey];
          return <ellipse key={zoneKey} cx={pos.x} cy={pos.y} rx={30} ry={38} fill={LEVELS[Math.max(0, lvIdx - 2)].color} />;
        })}
      </g>

      {/* warm mid ring — 1 level below */}
      <g filter="url(#blob-mid)" opacity="0.6">
        {entries.map(([zoneKey, zone]) => {
          const lvIdx = categoryLevels[zone.primary];
          const pos = ZONE_POS[zoneKey];
          return <ellipse key={zoneKey} cx={pos.x} cy={pos.y} rx={16} ry={22} fill={LEVELS[Math.max(0, lvIdx - 1)].color} />;
        })}
      </g>

      {/* hot core — current level */}
      <g filter="url(#blob-core)" opacity="0.85">
        {entries.map(([zoneKey, zone]) => {
          const lvIdx = categoryLevels[zone.primary];
          const pos = ZONE_POS[zoneKey];
          return <ellipse key={zoneKey} cx={pos.x} cy={pos.y} rx={6} ry={8} fill={LEVELS[lvIdx].color} />;
        })}
      </g>
    </svg>
  );
}

function BodyFigure({ activeZone, onSelectZone, zoneColors, categoryLevels, lang, bodyImg }) {
  const L = lang === 'it';
  return (
    <div className="body-callout-wrap">
      <img
        src={bodyImg}
        alt=""
        style={{
          position: 'absolute',
          right: '18%',
          left: 'auto',
          transform: 'none',
          height: '88%',
          top: '8%',
          width: 'auto',
          zIndex: 1,
          pointerEvents: 'none',
          objectFit: 'contain',
        }}
      />

      <BodyBlobOverlay categoryLevels={categoryLevels} />

      {Object.entries(ZONE_CATS).map(([key, z]) => {
        const isActive = activeZone === key;
        const color = zoneColors[key];
        return (
          <button
            key={key}
            onClick={(e) => { e.stopPropagation(); onSelectZone(key); }}
            aria-label={L ? z.label_it : z.label_en}
            style={{
              position: 'absolute',
              left: '36vw',
              right: '42%',
              top: ZONE_Y[key],
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: '10px 0',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <div style={{
              width: isActive ? 20 : 14,
              height: isActive ? 20 : 14,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
              transition: 'all 0.15s',
              boxShadow: isActive ? `0 0 0 3px rgba(255,255,255,0.5)` : 'none',
            }} />
            <div style={{
              flex: 1,
              height: 1.5,
              background: color,
              opacity: isActive ? 1 : 0.7,
              transition: 'opacity 0.15s',
            }} />
          </button>
        );
      })}
    </div>
  );
}

export default function SymptomsPage({ lang, liveRows }) {
  const [activeZone, setActiveZone] = useState(null);
  const [activeSensor, setActiveSensor] = useState('all');
  const L = lang === 'it';
  const bodyImg = useMemo(() => SAGOME[Math.floor(Math.random() * SAGOME.length)], []);

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

  const rowsForCalc = useMemo(() => {
    if (liveRows && liveRows.length > 0) return liveRows;
    const hourRows = HOURLY_DATA.filter(r => toISO(r.dateObj) === displayDate && r.hour === displayHour);
    const scopedRows = activeSensor === 'all'
      ? hourRows
      : hourRows.filter(r => r.sensorId === Number(activeSensor));
    return scopedRows.length ? scopedRows : hourRows;
  }, [liveRows, displayDate, displayHour, activeSensor]);

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

      {/* BODY FIGURE — full viewport */}
      <div style={{ position: 'relative', height: '95vh', overflow: 'hidden', backgroundImage: "url('/assets/cielo.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} onClick={() => setActiveZone(null)}>

        {/* Floating title */}
        <div style={{ position: 'absolute', top: 48, left: 12, zIndex: 21, pointerEvents: 'none' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.5vw, 56px)',
            fontWeight: 400,
            textTransform: 'uppercase',
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
            color: 'var(--white)',
          }}>
            {L ? 'Mappa Sintomi' : 'Symptoms Map'}
          </div>
        </div>

        {/* Hint — top right */}
        <div style={{
          position: 'absolute', top: 48, right: 28, zIndex: 21,
          fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.5vw, 40px)', fontWeight: 400,
          letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 1.4,
          color: 'var(--white)', opacity: 1,
          textAlign: 'left', pointerEvents: 'none', maxWidth: '18vw',
        }}>
          {L ? 'Premi su un pallino per scoprire i sintomi' : 'Press a dot to discover the symptoms'}
        </div>

        <BodyFigure activeZone={activeZone} onSelectZone={handleSelectZone} zoneColors={zoneColors} categoryLevels={categoryLevels} lang={lang} bodyImg={bodyImg} />

        {/* LEFT COLUMN — stacked floating boxes, MapPage style */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 20,
            width: panelW, display: 'flex', flexDirection: 'column',
            gap: 8, padding: 12, paddingTop: 120, overflowY: 'auto', pointerEvents: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* BOX 1 — Live indicator (Pi mode) or time controls */}
          {liveRows && (
            <div style={BOX}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span style={{ ...SUB_LABEL, color: '#22c55e' }}>
                  {L ? 'DATI IN TEMPO REALE' : 'LIVE DATA'}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--gray2)', lineHeight: 1.5 }}>
                {L ? 'Sensore Raspberry Pi · aggiornamento ogni 30 s' : 'Raspberry Pi sensor · updates every 30 s'}
              </div>
            </div>
          )}
          {!liveRows && <div style={BOX}>
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
          </div>}

          {/* BOX 2 — Sensor (hidden in live mode) */}
          {!liveRows && <div style={BOX}>
            <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>
              {L ? 'Sensore' : 'Sensor'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <span style={pillStyleWhite(activeSensor === 'all')} onClick={() => setActiveSensor('all')}>
                {L ? 'Tutti' : 'All'}
              </span>
              {SENSORS.map(s => (
                <span key={s.id} style={pillStyleWhite(activeSensor === String(s.id))}
                  onClick={() => setActiveSensor(String(s.id))}>
                  {s.name.replace('Taranto - ', '')}
                </span>
              ))}
            </div>
          </div>}

          {/* BOX 3 — Health recommendation */}
          <div style={{ ...BOX, background: lvSuggestion.color }}>
            <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
              {L ? "QUALITÀ DELL'ARIA" : 'AIR QUALITY'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 10 }}>
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
              <div style={{ ...BOX, background: lv.color }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)' }}>
                    {L ? 'SINTOMI' : 'SYMPTOMS'} — {L ? lv.it : lv.en}
                  </div>
                  <button onClick={() => setActiveZone(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 12 }}>
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

        {/* BOTTOM TIMELINE — range mode only, hidden in live mode */}
        {!liveRows && timeMode === 'range' && (
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
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em' }}>
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
