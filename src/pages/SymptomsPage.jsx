import { useState, useEffect, useRef, useMemo } from 'react';
import { LEVELS } from '../data/levels';
import { POLLUTANTS } from '../data/pollutants';
import { SENSORS } from '../data/sensors';
import { SYMPTOMS, ORGAN_SYMPTOMS, SUGGESTIONS } from '../data/symptoms';
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
const BOX    = { background: 'var(--white)', padding: '12px 14px' };
const PANEL  = { ...BOX, width: panelW, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--gray)' };

function BodySvg() {
  return (
    <svg
      viewBox="0 0 198.1 275.1"
      preserveAspectRatio="xMidYMin meet"
      style={{ height: '100%', width: 'auto', aspectRatio: '198.1 / 466.3', pointerEvents: 'none' }}
    >
      <path
        d="M195.9,250.2c-2.7-1.3-5.4-4.4-6.5-6.3-1.1-1.9-1.9-2.3-1.9-2.3,0,0,1.5,12.3,1.9,16,.5,4.1,2,9.8-.1,10.4-2.4.7-3-2.5-3.4-4.9s-2.8-14.1-3.6-14.8c-1-.9-.5.5-.3,3.3,0,.9.4,5.7.9,8.8.5,3,2,9.9-1.2,9.5-3.3-.4-4.1-18.8-4.6-20.1s-1-.8-.7,2.5c.1,1,1.8,13.4,1.2,15.9s-3,2.1-3.8-1.1-1.6-16.2-2.1-17.1c-.5-.9-.7.8-.5,3.1.1,1.7,1.1,11.1-.8,11.5s-2.6-.8-3.2-7.6c-.5-6-.5-9.3-.8-13.2-.3-3.8-.7-15.1,1.2-18.5,0,0-2.3-11.6-7.2-21.6-4.8-10-12-27.5-11.7-36.1.3-7.1-5.7-32-8-40.3-.2,2.1-.5,4.3-1,6.6-2.2,11.2-5.5,24.9-5,33.3.5,8.4,1.4,21.3,2.3,26.3s6.6,24.4,6.4,48.3c0,11.1-.8,23.1-1.7,33.3h-38.2c-1.8-14.6-3.2-29.8-2.4-36.6l-1.7-.2-1.7.2c.8,6.8-.6,22-2.4,36.6h-38.2c-.9-10.3-1.7-22.3-1.7-33.3,0-23.9,5.5-43.3,6.4-48.3s1.9-17.8,2.3-26.3c.5-8.4-2.8-22-5-33.3-.4-2.3-.8-4.5-1-6.6-2.2,8.4-8.2,33.2-8,40.3.3,8.6-6.9,26.1-11.7,36.1-4.8,10-7.2,21.6-7.2,21.6,1.9,3.4,1.5,14.7,1.2,18.5s-.4,7.2-.8,13.2c-.5,6.9-1.3,8-3.2,7.6-1.9-.4-.9-9.8-.8-11.5.1-2.3,0-4.1-.5-3.1-.6.9-1.3,13.9-2.1,17.1-.8,3.2-3.2,3.6-3.8,1.1-.6-2.5,1.1-14.8,1.2-15.9.3-3.3-.2-3.8-.7-2.5s-1.3,19.7-4.6,20.1c-3.3.4-1.7-6.4-1.2-9.5.5-3,.8-7.8.9-8.8.2-2.8.6-4.2-.3-3.3-.8.7-3.2,12.3-3.6,14.8-.4,2.4-1,5.6-3.4,4.9-2.2-.6-.6-6.2-.1-10.4.4-3.7,1.9-16,1.9-16,0,0-.8.5-1.9,2.3-1.1,1.9-3.8,5-6.5,6.3C.2,251.5,0,248.7,1.5,246.9c1.3-1.6,3.9-7.7,5.1-9.8,1.2-2,5.5-8.9,8.9-12.1.8-.8,1.7-1.4,2.4-1.8,2.4-5.6,5.4-28,7.1-45.1,1.8-18,7.5-25.2,7.5-25.2-.8-14.8,4.1-30.1,3.9-33.8-.2-3.6,0-15,0-15,.9-18.6,10.7-22.2,21.4-25.6,10.7-3.4,23.8-10,25.7-11.7,1.9-1.7,1.9-4.5,2-9.1,0-4.5-1.8-9.2-3.4-14.6-4.1,0-6.6-12.5-4.5-13.7.7-.4,1.3-.4,1.7-.3-.7-6.3-.4-13.5,2.7-19C87.3-.4,98.6,0,98.6,0h1s11.2-.4,17,10.2c3,5.5,3.3,12.7,2.7,19,.4-.1,1-.1,1.7.3,2.1,1.1-.4,13.6-4.5,13.7-1.5,5.4-3.4,10.2-3.4,14.6s0,7.4,2,9.1,15,8.3,25.7,11.7c10.7,3.4,20.5,7,21.4,25.6,0,0,.2,11.3,0,15-.1,3.6,4.8,19,4,33.8,0,0,5.7,7.1,7.5,25.2,1.7,17.1,4.6,39.5,7,45.1.8.4,1.6,1,2.5,1.8,3.4,3.2,7.7,10.1,8.9,12.1s3.8,8.2,5.1,9.8h0c1.5,1.9,1.3,4.6-1.4,3.3h.1Z"
        fill="var(--white)"
        stroke="var(--primary)"
        strokeWidth="3"
      />
    </svg>
  );
}

function SymptomCards({ categoryLevels, lang, embedded }) {
  const L = lang === 'it';
  return (
    <div style={embedded ? {
      width: '100%', flexShrink: 1, display: 'flex', flexWrap: 'wrap', gap: 2,
    } : {
      width: 680, height: '90%', alignSelf: 'center', flexShrink: 0,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 1fr)', gap: 2,
    }}>
      {Object.entries(ZONE_CATS).map(([key, z]) => {
        const lv = LEVELS[categoryLevels[z.primary]];
        const sym = ORGAN_SYMPTOMS[key][lv.key];
        const noSym = !sym || (!sym.gen && !sym.sen);
        return (
          <div key={key} style={embedded
            ? { flex: '1 1 200px', minWidth: 200, minHeight: 220, overflow: 'hidden', background: lv.color, padding: '20px 24px' }
            : { minHeight: 0, overflow: 'hidden', background: lv.color, padding: '14px 18px' }
          }>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>
              {L ? 'SINTOMI' : 'SYMPTOMS'} — {L ? lv.it : lv.en}
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: embedded ? 22 : 'clamp(13px, 1.4vw, 20px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 6 }}>
              {L ? z.label_it : z.label_en}
            </div>
            {noSym ? (
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
                {L ? 'Nessun sintomo atteso a questo livello.' : 'No symptoms expected at this level.'}
              </div>
            ) : (
              [
                { who: L ? 'Popolazione generale' : 'General population', text: L ? sym.gen?.it : sym.gen?.en },
                { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: L ? sym.sen?.it : sym.sen?.en },
              ].filter(s => s.text).map((s, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? 5 : 0 }}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{s.who}</div>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 12, lineHeight: 1.45, color: '#fff' }}>{s.text}</div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SymptomsPage({ lang, liveRows, timeControl, sensorControl, embedded, hideHero, hideMatrixReport, hideReport }) {
  // When `sensorControl` is passed (e.g. embedded under MapPage), the sensor
  // command is shared with the parent instead of duplicating its own control.
  const [activeSensorInt, setActiveSensorInt] = useState('all');
  const activeSensor    = sensorControl ? sensorControl.selectedSensorId : activeSensorInt;
  const setActiveSensor = sensorControl ? sensorControl.setSelectedSensorId : setActiveSensorInt;
  const L = lang === 'it';

  const availableDays = [...new Set(HOURLY_DATA.map(r => toISO(r.dateObj)))].sort();
  const latestDay = availableDays[availableDays.length - 1] ?? '';
  const firstDay  = availableDays[0] ?? '';

  // When `timeControl` is passed (e.g. embedded under MapPage), the time/date
  // command is shared with the parent instead of duplicating its own control.
  const [timeModeInt,       setTimeModeInt]       = useState('single');
  const [selectedDateInt,   setSelectedDateInt]   = useState(latestDay);
  const [selectedHourInt,   setSelectedHourInt]   = useState(23);
  const [rangeDateStartInt, setRangeDateStartInt] = useState(firstDay);
  const [rangeDateEndInt,   setRangeDateEndInt]   = useState(latestDay);
  const [playheadInt,       setPlayheadInt]       = useState(0);
  const [isPlayingInt,      setIsPlayingInt]      = useState(false);

  const timeMode         = timeControl ? timeControl.timeMode         : timeModeInt;
  const setTimeMode      = timeControl ? timeControl.setTimeMode      : setTimeModeInt;
  const selectedDate     = timeControl ? timeControl.selectedDate     : selectedDateInt;
  const setSelectedDate  = timeControl ? timeControl.setSelectedDate  : setSelectedDateInt;
  const selectedHour     = timeControl ? timeControl.selectedHour     : selectedHourInt;
  const setSelectedHour  = timeControl ? timeControl.setSelectedHour  : setSelectedHourInt;
  const rangeDateStart    = timeControl ? timeControl.rangeDateStart    : rangeDateStartInt;
  const setRangeDateStart = timeControl ? timeControl.setRangeDateStart : setRangeDateStartInt;
  const rangeDateEnd      = timeControl ? timeControl.rangeDateEnd      : rangeDateEndInt;
  const setRangeDateEnd   = timeControl ? timeControl.setRangeDateEnd   : setRangeDateEndInt;
  const playhead          = timeControl ? timeControl.playhead          : playheadInt;
  const setPlayhead       = timeControl ? timeControl.setPlayhead       : setPlayheadInt;
  const isPlaying         = timeControl ? timeControl.isPlaying         : isPlayingInt;
  const setIsPlaying      = timeControl ? timeControl.setIsPlaying      : setIsPlayingInt;

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
      : hourRows.filter(r => r.sensorId === activeSensor);
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

  const overallLevelIndex = Math.max(...Object.values(categoryLevels));
  const lvSuggestion = LEVELS[overallLevelIndex];

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

      {!hideHero && (
      <>
      {/* Standalone: title + body-zone row share a fixed viewport height
          (same fit mechanism as RecordPage's standalone layout — see
          App.jsx's fitHeight on RecordPage) so the row gets a real, stable
          height instead of a guessed vh, and the cards size like Record
          page's. Matrix + Report render after this, in normal scrolling flow. */}
      <div style={embedded ? undefined : {
        height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {!embedded && (
          <div style={{ flexShrink: 0, padding: '24px 24px 0 24px' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(40px, 5.5vw, 88px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '-0.02em', color: 'var(--black)' }}>
              {L ? 'Sintomi' : 'Symptoms'}
            </div>
          </div>
        )}
        {/* SYMPTOMS BY BODY ZONE — tight bordered row, same PANEL+CONTENT rules
            as RecordPage/ArchivePage. Hidden when embedded: MapPage's own panel
            (Time/Sensor/Health rec, shared via timeControl/sensorControl)
            already covers this. */}
        <div style={embedded ? {
          display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)',
        } : {
          display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--gray)',
          flex: 1, minHeight: 0, overflow: 'hidden',
        }}>

        {!embedded && (
          <div style={PANEL}>
            <div style={{ ...SUB_LABEL, color: 'var(--black)', marginBottom: 0 }}>{L ? 'Sintomi' : 'Symptoms'}</div>

            {liveRows ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ ...SUB_LABEL, color: '#22c55e' }}>{L ? 'DATI IN TEMPO REALE' : 'LIVE DATA'}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--gray2)', lineHeight: 1.5 }}>
                  {L ? 'Sensore Raspberry Pi · aggiornamento ogni 30 s' : 'Raspberry Pi sensor · updates every 30 s'}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>{L ? 'Tempo' : 'Time'}</div>
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

                      <div style={SUB_LABEL}>{L ? 'Timeline' : 'Timeline'}</div>
                      <input type="range" min={0} max={Math.max(0, rangeDates.length - 1)} value={playhead}
                        onChange={e => { setIsPlaying(false); setPlayhead(Number(e.target.value)); }}
                        style={{ width: '100%', accentColor: 'var(--primary)', margin: 0, cursor: 'pointer' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(0,0,0,0.45)', fontFamily: 'Epilogue', fontSize: 9 }}>{rangeDateStart}</span>
                        <span style={{ color: 'rgba(0,0,0,0.45)', fontFamily: 'Epilogue', fontSize: 9 }}>{rangeDateEnd}</span>
                      </div>
                      <div style={{
                        background: 'var(--primary)', color: '#fff', fontFamily: 'Epilogue',
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', letterSpacing: '0.05em',
                        textAlign: 'center',
                      }}>
                        {displayDate}
                      </div>

                      <button onClick={() => setIsPlaying(p => !p)} style={{ ...pillStyleWhite(isPlaying), width: '100%', textAlign: 'center' }}>
                        {isPlaying ? (L ? '⏸ Pausa' : '⏸ Pause') : (L ? '▶ Anima' : '▶ Play')}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ ...SUB_LABEL, color: 'var(--gray2)', marginBottom: 8 }}>{L ? 'Sensore' : 'Sensor'}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <span style={pillStyleWhite(activeSensor === 'all')} onClick={() => setActiveSensor('all')}>
                      {L ? 'Tutti' : 'All'}
                    </span>
                    {SENSORS.map(s => (
                      <span key={s.id} style={pillStyleWhite(activeSensor === s.id)}
                        onClick={() => setActiveSensor(s.id)}>
                        {s.name.replace('Taranto - ', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div style={{ background: lvSuggestion.color, padding: '12px 14px', margin: '0 -14px -14px' }}>
              <div style={{ ...SUB_LABEL, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
                {L ? "QUALITÀ DELL'ARIA" : 'AIR QUALITY'}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, textTransform: 'uppercase', color: '#fff', lineHeight: 1.0, marginBottom: 8 }}>
                {L ? lvSuggestion.it : lvSuggestion.en}
              </div>
              {[
                { who: L ? 'Popolazione generale' : 'General population', text: L ? SUGGESTIONS[lvSuggestion.key]?.gen?.it : SUGGESTIONS[lvSuggestion.key]?.gen?.en },
                { who: L ? 'Popolazione sensibile' : 'Sensitive population', text: L ? SUGGESTIONS[lvSuggestion.key]?.sen?.it : SUGGESTIONS[lvSuggestion.key]?.sen?.en },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
                  <div style={{ ...SUB_LABEL, fontSize: 9, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{s.who}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: '#fff' }}>{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!embedded && (
          <div style={{ flex: 1, height: '90%', alignSelf: 'center', position: 'relative', overflow: 'hidden', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BodySvg />
          </div>
        )}

        <SymptomCards categoryLevels={categoryLevels} lang={lang} embedded={embedded} />
        </div>
      </div>
      </>
      )}

      {!hideMatrixReport && (
      <>
      <div style={{ padding: '40px 24px 0', ...SUB_LABEL, color: 'var(--gray2)' }}>
        {L ? 'Matrice dei sintomi per livello' : 'Symptom matrix by level'}
      </div>

      {/* SYMPTOMS MATRIX */}
      <div className="symptoms-matrix-section">
        {CATS.map((cat) => {
          const lvIdx = categoryLevels[cat.key];
          const catLv = LEVELS[lvIdx];
          return (
            <div key={cat.key} className="symptoms-matrix-cat">

              {/* Category header */}
              <div className="symptoms-matrix-cat-header">
                <span className="symptoms-matrix-cat-title">
                  {L ? cat.it.split(' (')[0] : cat.en.split(' (')[0]}
                </span>
                <span className="symptoms-matrix-cat-sub">
                  {cat.key === 'particulates' ? 'PM2.5 · PM10' : cat.key === 'gaseous' ? 'NO₂ · SO₂ · O₃' : 'CO · NH₃ · C₆H₆'}
                </span>
                <div className="symptoms-matrix-current-badge" style={{ background: catLv.color }}>
                  {lvIdx + 1} — {L ? catLv.it : catLv.en}
                </div>
              </div>

              {/* 6-column grid — one cell per level */}
              <div className="symptoms-matrix-levels">
                {LEVELS.map((lv) => {
                  const sym = SYMPTOMS[cat.key][lv.key];
                  const isCurrent = lvIdx === lv.index;
                  const noSym = !sym || (!sym.gen && !sym.sen);
                  return (
                    <div key={lv.key} className={`symptoms-matrix-cell${isCurrent ? ' current' : ''}`}>
                      <div className="symptoms-matrix-level-badge" style={{ background: lv.color }}>
                        {lv.index + 1}&nbsp;{L ? lv.it : lv.en}
                      </div>
                      {noSym ? (
                        <span className="symptoms-matrix-none">—</span>
                      ) : (
                        <>
                          {sym.gen && (
                            <div className="symptoms-matrix-row">
                              <span className="symptoms-matrix-who">GEN</span>
                              <span className="symptoms-matrix-text">{L ? sym.gen.it : sym.gen.en}</span>
                            </div>
                          )}
                          {sym.sen && (
                            <div className="symptoms-matrix-row">
                              <span className="symptoms-matrix-who">SEN</span>
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
      {!hideReport && (
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
      )}
      </>
      )}
    </div>
  );
}
